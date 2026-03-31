-- ============================================================
-- SEED: tech_stacks
-- Jalankan di Supabase SQL Editor
-- image_url: isi setelah upload SVG ke Storage bucket `portfolio_images`
-- Contoh: 'https://xxx.supabase.co/storage/v1/object/public/portfolio_images/tech/laravel.svg'
-- ============================================================

INSERT INTO tech_stacks (name, image_url, is_visible, sort_order) VALUES

-- ── FRONTEND ────────────────────────────────────────────────
('HTML',           NULL, true,  1),
('CSS',            NULL, true,  2),
('JavaScript',     NULL, true,  3),
('TypeScript',     NULL, true,  4),
('React',          NULL, true,  5),
('Next.js',        NULL, true,  6),
('Tailwind CSS',   NULL, true,  7),

-- ── BACKEND ─────────────────────────────────────────────────
('PHP',            NULL, true,  8),
('Laravel',        NULL, true,  9),
('Node.js',        NULL, true, 10),
('Python',         NULL, true, 11),

-- ── DATABASE ────────────────────────────────────────────────
('MySQL',          NULL, true, 12),
('PostgreSQL',     NULL, true, 13),
('Supabase',       NULL, true, 14),

-- ── TOOLS & INFRA ───────────────────────────────────────────
('Git',            NULL, true, 15),
('GitHub',         NULL, true, 16),
('Docker',         NULL, true, 17),
('Linux',          NULL, true, 18),
('Postman',        NULL, true, 19),
('Figma',          NULL, true, 20);
