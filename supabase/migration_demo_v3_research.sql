-- ============================================================
-- MIGRATION: Demo bisnis v3 — riset otomatis & Brand Brief
-- Jalankan di Supabase SQL Editor setelah migration_demo_v2.sql
--
-- research_brief : hasil riset Google + arah desain (lib/brand-brief.ts)
-- researched_at  : waktu riset terakhir
-- brand_images   : gambar opsional (URL https / data URL kecil) untuk palet
-- ============================================================

ALTER TABLE demo_businesses
  ADD COLUMN IF NOT EXISTS research_brief jsonb,
  ADD COLUMN IF NOT EXISTS researched_at  timestamptz,
  ADD COLUMN IF NOT EXISTS brand_images   text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_demo_researched_at ON demo_businesses(researched_at);
