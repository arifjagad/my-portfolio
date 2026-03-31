-- ============================================================
-- PORTFOLIO SCHEMA — Jalankan di Supabase SQL Editor
-- Urutan wajib diikuti karena ada foreign key dependency
-- ============================================================

-- ============================================================
-- TABEL 1: projects
-- ============================================================
CREATE TABLE projects (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug         text UNIQUE NOT NULL,
  title        text NOT NULL,
  tagline      text NOT NULL,
  description  text NOT NULL,
  tech_stack   text[] NOT NULL DEFAULT '{}',
  image_url    text,
  link_website text,
  link_github  text,
  is_featured  boolean DEFAULT false,
  sort_order   integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- TABEL 2: project_details (1-to-1 dengan projects)
-- ============================================================
CREATE TABLE project_details (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE UNIQUE NOT NULL,
  problem     text NOT NULL DEFAULT '',
  solution    text NOT NULL DEFAULT '',
  result      text NOT NULL DEFAULT '',
  images      text[] DEFAULT '{}',
  duration    text,
  role        text,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- TABEL 3: experiences
-- Catatan: period_start & period_end pakai TEXT (contoh: "Jan 2023")
-- lebih fleksibel daripada DATE untuk tampilan portfolio
-- ============================================================
CREATE TABLE experiences (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company      text NOT NULL,
  position     text NOT NULL,
  description  text,
  period_start text NOT NULL,
  period_end text,
  employment_type TEXT DEFAULT 'Full-time',
  skills TEXT[] DEFAULT '{}',
  is_current BOOLEAN DEFAULT false,
  sort_order   integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- TABEL 4: testimonials
-- ============================================================
CREATE TABLE testimonials (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  role        text NOT NULL,
  content     text NOT NULL,
  avatar_url  text,
  project_id  uuid REFERENCES projects(id) ON DELETE SET NULL,
  is_visible  boolean DEFAULT true,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- TABEL 5: tech_stacks
-- ============================================================
CREATE TABLE tech_stacks (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  image_url   text,
  is_visible  boolean DEFAULT true,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- TABEL 6: profiles
-- ============================================================
CREATE TABLE profiles (
  id          integer PRIMARY KEY DEFAULT 1,
  name        text NOT NULL DEFAULT 'Arif Jagad',
  role        text NOT NULL DEFAULT 'Fullstack Developer',
  location    text NOT NULL DEFAULT 'berbasis di Medan',
  short_bio   text NOT NULL DEFAULT 'Saya merancang dan membangun... (silakan ubah di admin)',
  about_text  text,
  cv_url      text,
  photo_url   text,
  updated_at  timestamptz DEFAULT now()
);

-- ============================================================
-- INDEX untuk performa
-- ============================================================
CREATE INDEX idx_projects_slug       ON projects(slug);
CREATE INDEX idx_projects_featured   ON projects(is_featured);
CREATE INDEX idx_testimonials_visible ON testimonials(is_visible);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Public bisa READ projects, experiences, testimonials
-- Write hanya via authenticated user (admin panel)
-- ============================================================

-- Aktifkan RLS
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences     ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_stacks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;

-- Policy: semua orang bisa baca
CREATE POLICY "Public read projects"
  ON projects FOR SELECT USING (true);

CREATE POLICY "Public read project_details"
  ON project_details FOR SELECT USING (true);

CREATE POLICY "Public read experiences"
  ON experiences FOR SELECT USING (true);

CREATE POLICY "Public read testimonials"
  ON testimonials FOR SELECT USING (is_visible = true);

CREATE POLICY "Public read tech_stacks"
  ON tech_stacks FOR SELECT USING (is_visible = true);

CREATE POLICY "Public read profiles"
  ON profiles FOR SELECT USING (true);

-- Policy: hanya user yang login (admin) bisa write
CREATE POLICY "Auth users can insert projects"
  ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update projects"
  ON projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete projects"
  ON projects FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can insert project_details"
  ON project_details FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update project_details"
  ON project_details FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete project_details"
  ON project_details FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can insert experiences"
  ON experiences FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update experiences"
  ON experiences FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete experiences"
  ON experiences FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can insert testimonials"
  ON testimonials FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update testimonials"
  ON testimonials FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete testimonials"
  ON testimonials FOR DELETE TO authenticated USING (true);
CREATE POLICY "Auth users can read all testimonials"
  ON testimonials FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can insert tech_stacks"
  ON tech_stacks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update tech_stacks"
  ON tech_stacks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete tech_stacks"
  ON tech_stacks FOR DELETE TO authenticated USING (true);
CREATE POLICY "Auth users can read all tech_stacks"
  ON tech_stacks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can insert profiles"
  ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update profiles"
  ON profiles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete profiles"
  ON profiles FOR DELETE TO authenticated USING (true);
CREATE POLICY "Auth users can read all profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

-- ============================================================
-- BUCKET & STORAGE RLS
-- Tambahan untuk mengelola hak akses upload file ke Supabase Storage
-- ============================================================

-- Otomatis buat bucket `portfolio_images` sebagai public (kalau belum ada)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio_images', 
  'portfolio_images', 
  true, 
  5242880, -- Batas 5MB optional 
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Aktifkan RLS di tabel file object Supabase (meski biasanya bawaan sudah nyala)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Semua orang (public) boleh melihat image
CREATE POLICY "Bebas dilihat public"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'portfolio_images' );

-- Policy: Hanya user yang login (Admin) yang boleh upload / insert file baru
CREATE POLICY "Admin boleh upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'portfolio_images' );

-- Policy: Hanya user yang login (Admin) yang boleh edit/update file
CREATE POLICY "Admin boleh update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING ( bucket_id = 'portfolio_images' );

-- Policy: Hanya user yang login (Admin) yang boleh menghapus file
CREATE POLICY "Admin boleh delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING ( bucket_id = 'portfolio_images' );

