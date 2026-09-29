-- ============================================================
-- MIGRATION: Demo bisnis v2
-- Jalankan di Supabase SQL Editor setelah migration_demo_businesses.sql
--
-- 1. Kunci tabel demo_businesses: hanya service_role (server) yang boleh akses
-- 2. Kolom pitching: pitched_at, visit_count, last_visited_at
-- 3. Tabel demo_generate_logs (pengganti file logs/ai-generate.log)
-- 4. Tabel demo_visits + fungsi record_demo_visit
-- ============================================================

-- ─── 1. Security ────────────────────────────────────────────────────────────
-- RLS aktif tanpa policy = anon & authenticated tidak bisa baca/tulis apa pun.
-- service_role mem-bypass RLS, jadi semua akses lewat server route tetap jalan.
ALTER TABLE demo_businesses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON demo_businesses FROM anon, authenticated;

-- ─── 2. Kolom pitching & kunjungan ──────────────────────────────────────────
ALTER TABLE demo_businesses
  ADD COLUMN IF NOT EXISTS pitched_at      timestamptz,
  ADD COLUMN IF NOT EXISTS visit_count     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visited_at timestamptz;

-- generated_at dipakai sebagai penanda "sudah generate" (tanpa membaca kolom HTML)
UPDATE demo_businesses
SET generated_at = COALESCE(updated_at, now())
WHERE generated_html IS NOT NULL AND generated_at IS NULL;

-- Perkiraan untuk data lama: pakai updated_at sebagai waktu kirim
UPDATE demo_businesses
SET pitched_at = updated_at
WHERE status_pitch <> 'belum_dikirim' AND pitched_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_demo_generated_at ON demo_businesses(generated_at);
CREATE INDEX IF NOT EXISTS idx_demo_pitched_at   ON demo_businesses(pitched_at);

-- ─── 3. Log generate ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demo_generate_logs (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id  text NOT NULL,
  slug        text NOT NULL,
  seq         integer NOT NULL,
  level       text NOT NULL,
  message     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_logs_slug_created ON demo_generate_logs(slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_logs_created      ON demo_generate_logs(created_at);

ALTER TABLE demo_generate_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON demo_generate_logs FROM anon, authenticated;

-- ─── 4. Kunjungan demo ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demo_visits (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        text NOT NULL REFERENCES demo_businesses(slug) ON DELETE CASCADE ON UPDATE CASCADE,
  ip_hash     text,
  user_agent  text,
  referrer    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_visits_slug_created ON demo_visits(slug, created_at DESC);

ALTER TABLE demo_visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON demo_visits FROM anon, authenticated;

-- Catat 1 kunjungan. Kunjungan dari IP yang sama dalam 30 menit dihitung sekali.
CREATE OR REPLACE FUNCTION record_demo_visit(
  p_slug       text,
  p_ip_hash    text,
  p_user_agent text,
  p_referrer   text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM demo_businesses WHERE slug = p_slug) THEN
    RETURN false;
  END IF;

  IF p_ip_hash IS NOT NULL AND EXISTS (
    SELECT 1 FROM demo_visits
    WHERE slug = p_slug
      AND ip_hash = p_ip_hash
      AND created_at > now() - interval '30 minutes'
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO demo_visits (slug, ip_hash, user_agent, referrer)
  VALUES (p_slug, p_ip_hash, left(p_user_agent, 300), left(p_referrer, 300));

  UPDATE demo_businesses
  SET visit_count = visit_count + 1,
      last_visited_at = now()
  WHERE slug = p_slug;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION record_demo_visit(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_demo_visit(text, text, text, text) TO service_role;
