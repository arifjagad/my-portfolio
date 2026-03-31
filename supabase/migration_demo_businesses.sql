-- ============================================================
-- MIGRATION: Tambah tabel demo_businesses
-- Jalankan di Supabase SQL Editor setelah schema.sql utama
-- ============================================================

CREATE TABLE IF NOT EXISTS demo_businesses (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug                text UNIQUE NOT NULL,

  -- Data mentah dari CSV scraping
  keyword             text,
  nama_bisnis         text NOT NULL,
  kategori            text NOT NULL,
  rating              numeric(3,1),
  jumlah_ulasan       integer DEFAULT 0,
  nomor_telepon       text,
  alamat              text,
  link_gmaps          text,

  -- Data enrichment (diisi via admin panel)
  enriched_data       jsonb,
  enriched_at         timestamptz,

  -- Hasil generate AI
  generated_html      text,
  generated_at        timestamptz,
  generation_version  integer DEFAULT 0,   -- berapa kali pernah di-generate/regenerate

  -- Status pitch ke calon client
  status_pitch        text DEFAULT 'belum_dikirim'
                      CHECK (status_pitch IN ('belum_dikirim','sudah_dikirim','deal','tidak_tertarik')),

  -- Fitur lock: demo tidak bisa diakses publik
  is_locked           boolean DEFAULT false,
  lock_reason         text,

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Index untuk query yang sering dipakai
CREATE INDEX IF NOT EXISTS idx_demo_slug         ON demo_businesses(slug);
CREATE INDEX IF NOT EXISTS idx_demo_kategori     ON demo_businesses(kategori);
CREATE INDEX IF NOT EXISTS idx_demo_status_pitch ON demo_businesses(status_pitch);
CREATE INDEX IF NOT EXISTS idx_demo_is_locked    ON demo_businesses(is_locked);
-- CATATAN: JANGAN buat index pada kolom generated_html (text panjang)
-- PostgreSQL B-tree index maksimal 8191 bytes, HTML bisa sampai 30KB+

-- Trigger untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_demo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_demo_updated_at
  BEFORE UPDATE ON demo_businesses
  FOR EACH ROW EXECUTE FUNCTION update_demo_updated_at();

-- Catatan: TIDAK ada RLS pada tabel ini
-- Semua operasi dilakukan via SUPABASE_SERVICE_ROLE_KEY di server-side
-- Demo page public bisa read karena kita pakai service role key dari server component
