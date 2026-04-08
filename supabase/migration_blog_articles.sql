-- ============================================================
-- MIGRATION: Blog CMS sederhana ala WordPress (dengan SEO fields)
-- Tujuan:
-- 1) Artikel dengan status draft/published/scheduled
-- 2) SEO field ala Yoast (focus keyword, meta title, meta description, canonical, noindex)
-- 3) Featured image + multiple images (bucket: article-image)
-- 4) Category + tag
-- ============================================================

-- Extension untuk gen_random_uuid()
create extension if not exists pgcrypto;

-- ============================================================
-- ENUMS
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'blog_post_status') then
    create type blog_post_status as enum ('draft', 'scheduled', 'published', 'archived');
  end if;
end $$;

-- ============================================================
-- TABLE: blog_categories
-- ============================================================
create table if not exists blog_categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text,
  is_visible    boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint blog_categories_name_len check (char_length(name) between 2 and 100)
);

-- ============================================================
-- TABLE: blog_tags
-- ============================================================
create table if not exists blog_tags (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint blog_tags_name_len check (char_length(name) between 2 and 60)
);

-- ============================================================
-- TABLE: blog_posts
-- Note: content_json dipakai editor Tiptap
--       content_html dipakai render cepat / fallback SSR
-- ============================================================
create table if not exists blog_posts (
  id                      uuid primary key default gen_random_uuid(),

  -- Konten utama
  title                   text not null,
  slug                    text not null unique,
  excerpt                 text,
  content_json            jsonb not null default '{}'::jsonb,
  content_html            text,

  -- Relasi
  category_id             uuid references blog_categories(id) on delete set null,

  -- Publish workflow
  status                  blog_post_status not null default 'draft',
  published_at            timestamptz,
  scheduled_at            timestamptz,

  -- Author info (opsional)
  author_name             text default 'Arif Jagad',

  -- Featured image
  featured_image_path     text,    -- contoh: post-slug/hero.webp
  featured_image_url      text,    -- public URL
  featured_image_alt      text,

  -- SEO ala Yoast
  seo_title               text,
  seo_description         text,
  focus_keyword           text,
  seo_keywords            text[] not null default '{}',  -- keyword turunan (short/middle/long)
  canonical_url           text,
  robots_index            boolean not null default true,
  robots_follow           boolean not null default true,

  -- OpenGraph/Twitter override (opsional)
  og_title                text,
  og_description          text,
  og_image_url            text,

  -- Estimasi reading time (menit)
  reading_time_minutes    integer not null default 1,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint blog_posts_title_len check (char_length(title) between 8 and 180),
  constraint blog_posts_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint blog_posts_excerpt_len check (excerpt is null or char_length(excerpt) <= 320),
  constraint blog_posts_seo_title_len check (seo_title is null or char_length(seo_title) <= 70),
  constraint blog_posts_seo_desc_len check (seo_description is null or char_length(seo_description) <= 170),
  constraint blog_posts_featured_alt_len check (featured_image_alt is null or char_length(featured_image_alt) <= 160),
  constraint blog_posts_reading_time_positive check (reading_time_minutes >= 1)
);

-- ============================================================
-- TABLE: blog_post_tags (many-to-many)
-- ============================================================
create table if not exists blog_post_tags (
  post_id        uuid not null references blog_posts(id) on delete cascade,
  tag_id         uuid not null references blog_tags(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (post_id, tag_id)
);

-- ============================================================
-- TABLE: blog_post_images (multi image gallery)
-- Untuk image di dalam artikel (bukan featured)
-- ============================================================
create table if not exists blog_post_images (
  id             uuid primary key default gen_random_uuid(),
  post_id        uuid not null references blog_posts(id) on delete cascade,
  storage_path   text not null,      -- contoh: post-slug/gallery-01.webp
  image_url      text not null,
  alt_text       text,
  caption        text,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint blog_post_images_alt_len check (alt_text is null or char_length(alt_text) <= 160)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_blog_posts_status on blog_posts(status);
create index if not exists idx_blog_posts_published_at on blog_posts(published_at desc);
create index if not exists idx_blog_posts_category_id on blog_posts(category_id);
create index if not exists idx_blog_posts_focus_keyword on blog_posts(focus_keyword);
create index if not exists idx_blog_posts_keywords_gin on blog_posts using gin(seo_keywords);
create index if not exists idx_blog_post_images_post_id on blog_post_images(post_id);
create index if not exists idx_blog_categories_visible on blog_categories(is_visible);

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================
create or replace function set_updated_at_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_blog_categories_updated_at on blog_categories;
create trigger trg_blog_categories_updated_at
before update on blog_categories
for each row execute function set_updated_at_timestamp();

drop trigger if exists trg_blog_tags_updated_at on blog_tags;
create trigger trg_blog_tags_updated_at
before update on blog_tags
for each row execute function set_updated_at_timestamp();

drop trigger if exists trg_blog_posts_updated_at on blog_posts;
create trigger trg_blog_posts_updated_at
before update on blog_posts
for each row execute function set_updated_at_timestamp();

drop trigger if exists trg_blog_post_images_updated_at on blog_post_images;
create trigger trg_blog_post_images_updated_at
before update on blog_post_images
for each row execute function set_updated_at_timestamp();

-- ============================================================
-- RLS
-- Public: hanya boleh SELECT post published + indexable
-- Admin (authenticated): full CRUD
-- ============================================================
alter table blog_categories enable row level security;
alter table blog_tags enable row level security;
alter table blog_posts enable row level security;
alter table blog_post_tags enable row level security;
alter table blog_post_images enable row level security;

-- Clear policy jika pernah ada
DROP POLICY IF EXISTS "Public read visible categories" ON blog_categories;
DROP POLICY IF EXISTS "Public read tags" ON blog_tags;
DROP POLICY IF EXISTS "Public read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Public read tags relation for published posts" ON blog_post_tags;
DROP POLICY IF EXISTS "Public read images for published posts" ON blog_post_images;
DROP POLICY IF EXISTS "Auth full access categories" ON blog_categories;
DROP POLICY IF EXISTS "Auth full access tags" ON blog_tags;
DROP POLICY IF EXISTS "Auth full access posts" ON blog_posts;
DROP POLICY IF EXISTS "Auth full access post tags" ON blog_post_tags;
DROP POLICY IF EXISTS "Auth full access post images" ON blog_post_images;

create policy "Public read visible categories"
on blog_categories for select
using (is_visible = true);

create policy "Public read tags"
on blog_tags for select
using (true);

create policy "Public read published posts"
on blog_posts for select
using (
  status = 'published'
  and robots_index = true
  and (published_at is null or published_at <= now())
);

create policy "Public read tags relation for published posts"
on blog_post_tags for select
using (
  exists (
    select 1 from blog_posts p
    where p.id = blog_post_tags.post_id
      and p.status = 'published'
      and p.robots_index = true
      and (p.published_at is null or p.published_at <= now())
  )
);

create policy "Public read images for published posts"
on blog_post_images for select
using (
  exists (
    select 1 from blog_posts p
    where p.id = blog_post_images.post_id
      and p.status = 'published'
      and p.robots_index = true
      and (p.published_at is null or p.published_at <= now())
  )
);

create policy "Auth full access categories"
on blog_categories for all
to authenticated
using (true)
with check (true);

create policy "Auth full access tags"
on blog_tags for all
to authenticated
using (true)
with check (true);

create policy "Auth full access posts"
on blog_posts for all
to authenticated
using (true)
with check (true);

create policy "Auth full access post tags"
on blog_post_tags for all
to authenticated
using (true)
with check (true);

create policy "Auth full access post images"
on blog_post_images for all
to authenticated
using (true)
with check (true);

-- ============================================================
-- SUPABASE STORAGE BUCKET: article-image
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-image',
  'article-image',
  true,
  7340032, -- 7MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = true,
    file_size_limit = 7340032,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

-- RLS untuk storage.objects pada Supabase umumnya sudah aktif by default.
-- Jangan ALTER TABLE di sini karena bisa gagal jika role bukan owner tabel internal.

DROP POLICY IF EXISTS "Public read article-image" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload article-image" ON storage.objects;
DROP POLICY IF EXISTS "Auth update article-image" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete article-image" ON storage.objects;

create policy "Public read article-image"
on storage.objects for select
using (bucket_id = 'article-image');

create policy "Auth upload article-image"
on storage.objects for insert
to authenticated
with check (bucket_id = 'article-image');

create policy "Auth update article-image"
on storage.objects for update
to authenticated
using (bucket_id = 'article-image');

create policy "Auth delete article-image"
on storage.objects for delete
to authenticated
using (bucket_id = 'article-image');

-- ============================================================
-- Seed kategori awal (opsional)
-- ============================================================
insert into blog_categories (name, slug, description, sort_order)
values
  ('SEO Website', 'seo-website', 'Tips optimasi SEO untuk website bisnis', 1),
  ('Web Development', 'web-development', 'Teknis pembuatan website dan aplikasi web', 2),
  ('Studi Kasus', 'studi-kasus', 'Case study project real client', 3),
  ('Bisnis Lokal Medan', 'bisnis-lokal-medan', 'Strategi digital untuk UMKM dan bisnis lokal Medan', 4)
on conflict (slug) do nothing;

-- ============================================================
-- Contoh query fetch untuk frontend blog listing
-- select * from blog_posts
-- where status = 'published' and robots_index = true
-- order by coalesce(published_at, created_at) desc;
-- ============================================================
