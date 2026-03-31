# CLAUDE.md — Panduan Project: Portfolio + Demo Page Generator

> **Baca file ini sebelum melakukan apapun.** File ini berisi konteks lengkap project, arsitektur, dan urutan pengerjaan yang harus diikuti.

---

## Gambaran Besar Project

Ini adalah **website portfolio pribadi** sekaligus **demo page generator** untuk keperluan bisnis jasa web development di Medan.

Strateginya:
1. Punya data 609 bisnis lokal Medan hasil scraping Google Maps
2. **361 bisnis di antaranya belum punya website** — ini target market
3. Untuk setiap calon customer, dibuat 1 halaman demo unik di `domain.com/demo/[slug-bisnis]`
4. Demo page di-generate oleh AI (Gemini API) — setiap bisnis dapat tampilan berbeda sesuai kategorinya
5. Link demo dikirim via WhatsApp sebagai bahan pitch: *"Pak, saya sudah buatkan preview website untuk bisnis Anda..."*

---

## Identitas Developer

- **GitHub username:** `arifjagad`
- **Role:** Fullstack Developer
- **Target portfolio:** Showcase project dengan case study mendalam, bukan sekedar tampil nama

---

## Data Bisnis

**Statistik data:**
- Total bisnis: 609
- Target (belum punya website): 361
- Sudah punya website: 248

**Keyword scraping yang dipakai:**
`toko baju`, `salon`, `apotek`, `bengkel motor`, `minimarket`, `toko oleh-oleh`, `klinik`, `optik`, `restoran`, `rumah makan`, `cafe`, `barbershop`, `hotel`

**Kolom data per bisnis:**
```
Keyword | Nama Bisnis | Kategori | Rating | Jumlah Ulasan |
Nomor Telepon | Punya Website? | Link Website | Alamat | Link Google Maps
```

**Top kategori (target prioritas):**
| Kategori | Jumlah |
|---|---|
| Tempat Cukur Rambut | 47 |
| Apotek | 44 |
| Toko Optik | 39 |
| Klinik Medis | 34 |
| Salon Kecantikan | 33 |
| Toko Pakaian | 25 |
| Bengkel Sepeda Motor | 25 |
| Kafe | 25 |
| Restoran | 24 |

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Styling | Tailwind CSS |
| Animasi | Framer Motion |
| Database | **Supabase** (PostgreSQL) |
| AI Generator | **Google Gemini API** (gemini-1.5-flash — gratis tier tersedia) |
| GitHub Stats | GitHub REST API v3 (public, no auth needed) |
| Deploy | Vercel |
| Slug utility | `slugify` package |
| Admin auth | Middleware Next.js + env secret |

**Install dependencies:**
```bash
npm install framer-motion slugify @google/generative-ai @supabase/supabase-js
```

---

## Struktur Folder

```
/
├── app/
│   ├── layout.tsx                      # Root layout (font, metadata global)
│   ├── page.tsx                        # Homepage portfolio
│   │
│   ├── projects/
│   │   └── [slug]/
│   │       └── page.tsx               # Halaman detail project (case study)
│   │
│   ├── demo/
│   │   └── [slug]/
│   │       ├── page.tsx               # Handler semua demo page
│   │       └── loading.tsx            # Skeleton saat generate
│   │
│   ├── admin/
│   │   ├── layout.tsx                 # Layout admin (cek auth)
│   │   ├── page.tsx                   # Dashboard list bisnis
│   │   └── [slug]/
│   │       └── page.tsx               # Form enrichment per bisnis
│   │
│   └── api/
│       ├── enrich/route.ts            # POST: simpan enrichment ke Supabase
│       └── generate/route.ts          # POST: trigger generate/regenerate HTML
│
├── lib/
│   ├── supabase.ts                    # Supabase client (server & browser)
│   ├── ai-generator.ts               # Generate HTML via Gemini API
│   ├── github.ts                      # Fetch GitHub stats via API
│   └── slug-utils.ts                  # Convert nama bisnis → URL slug
│
├── middleware.ts                       # Proteksi route /admin
├── CLAUDE.md                          # File ini
└── .env.local
```

---

## Database: Supabase

Semua data disimpan di Supabase. Tidak ada lagi file JSON atau file HTML di filesystem.

### Schema SQL Lengkap

Jalankan query ini di Supabase SQL Editor (dalam urutan ini):

```sql
-- ============================================================
-- TABEL 1: projects
-- Data ringkas project untuk tampil di homepage (card)
-- ============================================================
CREATE TABLE projects (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  title       text NOT NULL,
  tagline     text NOT NULL,                    -- 1 kalimat deskripsi singkat
  description text NOT NULL,                   -- max 100 karakter, untuk card homepage
  tech_stack  text[] NOT NULL DEFAULT '{}',     -- ['Next.js', 'Supabase', 'Tailwind']
  image_url   text,                             -- screenshot utama (Supabase Storage)
  link_website text,                            -- URL live project (nullable)
  link_github  text,                            -- URL repo GitHub (nullable)
  is_featured  boolean DEFAULT false,           -- tampil di hero/highlight
  sort_order   integer DEFAULT 0,               -- urutan manual di homepage
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- TABEL 2: project_details
-- Konten case study lengkap — relasi 1-to-1 dengan projects
-- Dipisah agar query homepage tidak fetch konten panjang yang tidak perlu
-- ============================================================
CREATE TABLE project_details (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE UNIQUE NOT NULL,
  problem     text NOT NULL,   -- apa masalah yang diselesaikan
  solution    text NOT NULL,   -- bagaimana kamu menyelesaikannya
  result      text NOT NULL,   -- apa hasilnya / dampaknya
  images      text[] DEFAULT '{}',  -- URL screenshot tambahan
  duration    text,            -- contoh: "2 minggu", "1 bulan"
  role        text,            -- contoh: "Fullstack Developer", "Solo Project"
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- TABEL 3: experiences
-- Perjalanan karir / pengalaman kerja
-- ============================================================
CREATE TABLE experiences (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company      text NOT NULL,
  position     text NOT NULL,
  description  text,
  period_start date NOT NULL,
  period_end   date,                     -- NULL jika masih aktif
  is_current   boolean DEFAULT false,
  sort_order   integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- TABEL 4: testimonials
-- Review / testimoni dari klien atau kolega
-- ============================================================
CREATE TABLE testimonials (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  role        text NOT NULL,             -- contoh: "Owner, Zazi Shop"
  content     text NOT NULL,
  avatar_url  text,
  project_id  uuid REFERENCES projects(id) ON DELETE SET NULL,  -- opsional, kaitkan ke project
  is_visible  boolean DEFAULT true,      -- toggle tanpa hapus data
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- TABEL 5: demo_businesses
-- Data bisnis target + enrichment + HTML hasil generate
-- Gabungan dari businesses.json + enriched/*.json + generated/*.html
-- ============================================================
CREATE TABLE demo_businesses (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug             text UNIQUE NOT NULL,
  
  -- Data mentah dari Excel scraping
  keyword          text,
  nama_bisnis      text NOT NULL,
  kategori         text NOT NULL,
  rating           numeric(2,1),
  jumlah_ulasan    integer DEFAULT 0,
  nomor_telepon    text,
  punya_website    boolean DEFAULT false,
  link_website     text,
  alamat           text,
  link_gmaps       text,
  
  -- Data enrichment (diisi via admin panel)
  enriched_data    jsonb,               -- jam_buka, deskripsi, layanan[], keunggulan[], catatan
  enriched_at      timestamptz,
  
  -- Hasil generate
  generated_html   text,               -- HTML lengkap dari Gemini
  generated_at     timestamptz,
  
  -- Status pitch
  status_pitch     text DEFAULT 'belum_dikirim'
                   CHECK (status_pitch IN ('belum_dikirim','sudah_dikirim','deal','tidak_tertarik')),
  
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Index untuk query yang sering dipakai
CREATE INDEX idx_demo_businesses_slug ON demo_businesses(slug);
CREATE INDEX idx_demo_businesses_punya_website ON demo_businesses(punya_website);
CREATE INDEX idx_demo_businesses_status_pitch ON demo_businesses(status_pitch);
CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_projects_is_featured ON projects(is_featured);
```

### Supabase Client — `lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

// Untuk Server Components & API Routes
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // service role untuk operasi write di server
)

// Untuk Client Components (read-only public data)
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Enriched Data (struktur jsonb di `enriched_data`)

```json
{
  "jam_buka": "Senin–Sabtu: 08.00–17.00 WIB",
  "deskripsi": "Toko seragam terpercaya di Medan sejak 2015.",
  "layanan": ["Seragam Sekolah SD–SMA", "Seragam Kantor", "Bordir Custom"],
  "keunggulan": ["Harga grosir", "Pengerjaan cepat", "Bisa COD"],
  "catatan_internal": "Owner ramah, WA fast response"
}
```

---

## Portfolio — Homepage

### Vibe & Design
- **Tema:** Dark, minimal, tapi detail
- **Tone:** Professional fullstack developer — bukan agensi, bukan freelancer biasa
- **Animasi:** Framer Motion — scroll reveal, hover effects, smooth transition

### Sections Homepage (urut dari atas)

```
1. HERO
   - Nama + tagline singkat
   - Status availability (available for work / not available)
   - Tombol: "Lihat Project" + "Kontak"
   - Animasi: text reveal, subtle background effect

2. GITHUB STATS
   - Fetch dari GitHub API (username: arifjagad)
   - Tampilkan: total commits, total stars, top 3 languages, public repos
   - Contribution graph (buat sendiri dari data API atau embed)
   - Revalidate: setiap 1 jam (Next.js fetch cache)

3. PROJECTS (card grid)
   - Data dari Supabase tabel `projects`
   - Tiap card: image, title, description (crop 100 char), tech stack badge, link website
   - Klik card → /projects/[slug] untuk detail
   - Featured projects tampil lebih besar

4. EXPERIENCE
   - Data dari Supabase tabel `experiences`
   - Timeline vertical, dark style
   - Tampilkan: posisi, perusahaan, periode, deskripsi singkat

5. TESTIMONIALS
   - Data dari Supabase tabel `testimonials`
   - Carousel atau grid sederhana
   - Hanya tampilkan yang `is_visible = true`

6. KONTAK / CTA
   - Tombol WhatsApp + Email
   - Link GitHub, LinkedIn (jika ada)
   - Kalimat simple: "Ada project? Mari ngobrol."
```

---

## Portfolio — Halaman Detail Project

Route: `/projects/[slug]`

**Format case study:**

```
1. Header
   - Judul project
   - Tagline
   - Tech stack badges
   - Link: website live + GitHub repo

2. Screenshot utama (full width)

3. Overview
   - Role, durasi pengerjaan

4. Problem
   → Apa masalah yang diselesaikan?

5. Solution
   → Bagaimana kamu menyelesaikannya?

6. Result
   → Apa hasilnya / dampaknya?

7. Screenshot tambahan (gallery)

8. CTA bawah: "Ada project serupa? Hubungi saya"
```

Data diambil dari Supabase dengan query:
```typescript
const { data: project } = await supabase
  .from('projects')
  .select('*, project_details(*)')
  .eq('slug', slug)
  .single()
```

---

## GitHub Stats — `lib/github.ts`

```typescript
const GITHUB_USERNAME = 'arifjagad'
const BASE = 'https://api.github.com'

export async function getGithubStats() {
  const [userRes, reposRes] = await Promise.all([
    fetch(`${BASE}/users/${GITHUB_USERNAME}`, { next: { revalidate: 3600 } }),
    fetch(`${BASE}/users/${GITHUB_USERNAME}/repos?per_page=100`, { next: { revalidate: 3600 } }),
  ])

  const user = await userRes.json()
  const repos = await reposRes.json()

  const totalStars = repos.reduce((sum: number, r: any) => sum + r.stargazers_count, 0)
  const languages = repos
    .map((r: any) => r.language)
    .filter(Boolean)
    .reduce((acc: Record<string, number>, lang: string) => {
      acc[lang] = (acc[lang] || 0) + 1
      return acc
    }, {})

  return {
    publicRepos: user.public_repos,
    followers: user.followers,
    totalStars,
    topLanguages: Object.entries(languages)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3)
      .map(([lang]) => lang),
  }
}
```

---

## Demo Page Generator

### Request Flow (ganti file system → Supabase)

```
1. User buka /demo/zazi-shop
        ↓
2. page.tsx ambil slug → query Supabase tabel demo_businesses
        ↓
3. Cek apakah generated_html sudah ada di kolom tersebut?
        ↓ Ya                          ↓ Belum
4a. Langsung render HTML         4b. Merge base + enriched_data
        ↓                              ↓
        ↓                        5. Kirim ke Gemini API → generate HTML
        ↓                              ↓
        ↓                        6. UPDATE demo_businesses SET generated_html = ...
        ↓ ←────────────────────────────┘
7. Render via dangerouslySetInnerHTML (fullscreen iframe)
```

### Aturan Generate HTML per Kategori

| Kategori | Vibe | Warna | Komponen Wajib |
|---|---|---|---|
| Salon / Barbershop | Elegan, dark, premium | Hitam, emas, krem | Hero besar, gallery, booking CTA |
| Apotek | Bersih, terpercaya | Putih, hijau, biru | Layanan, jam buka, lokasi |
| Kafe | Warm, cozy, lifestyle | Coklat, krem, hijau sage | Menu highlight, suasana, maps |
| Restoran | Hangat, mengundang | Merah, oranye, krem | Menu, jam buka, reservasi |
| Bengkel | Bold, industrial | Gelap, oranye, abu | Layanan, harga, lokasi |
| Klinik | Profesional, steril | Putih, biru muda | Layanan, dokter, jadwal |
| Toko Optik | Modern, presisi | Navy, silver, putih | Produk, layanan, booking |
| Toko Pakaian | Fashion-forward | Sesuai target pasar | Koleksi, promo, kontak |
| Minimarket | Ramah, lokal | Cerah, friendly | Produk unggulan, jam buka |
| Hotel | Mewah, hangat | Emas, krem, coklat tua | Fasilitas, kamar, booking |

### Template Prompt Gemini

```
Kamu adalah web designer profesional Indonesia spesialis bisnis lokal.

Buat halaman HTML lengkap, modern, dan menarik untuk bisnis berikut:

=== DATA BISNIS ===
Nama: {nama_bisnis}
Kategori: {kategori}
Alamat: {alamat}
Nomor Telepon: {nomor_telepon}
Rating Google: {rating} bintang ({jumlah_ulasan} ulasan)
Kota: Medan, Sumatera Utara

=== DATA TAMBAHAN (jika ada) ===
Jam Buka: {jam_buka | "Hubungi untuk info jam buka"}
Deskripsi: {deskripsi | ""}
Layanan/Produk: {layanan | "Sesuaikan dengan kategori bisnis"}
Keunggulan: {keunggulan | "Sesuaikan dengan kategori bisnis"}

=== INSTRUKSI DESAIN ===
1. Gunakan Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
2. Kategori "{kategori}" → sesuaikan vibe, warna, dan tone secara keseluruhan
3. Wajib ada: hero section, layanan/produk, tentang kami, kontak
4. Tombol WhatsApp wajib: https://wa.me/62{nomor_bersih}?text=Halo%20{nama_encoded}
5. Responsive mobile — gunakan Tailwind responsive prefix
6. Animasi ringan dengan CSS transition atau vanilla JS (scroll reveal, hover effects)
7. JANGAN gunakan gambar dari URL eksternal — pakai gradient, warna solid, atau SVG inline
8. Desain harus UNIK dan tidak generik — hindari template yang terlihat AI-generated
9. Sertakan Google Maps embed placeholder

=== OUTPUT ===
Kembalikan HANYA kode HTML. Tidak ada penjelasan. Tidak ada markdown fence.
Mulai langsung dengan <!DOCTYPE html>
```

---

## Admin Panel

### Proteksi Akses

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const token = req.cookies.get('admin_token')?.value
    if (token !== process.env.ADMIN_SECRET) {
      return NextResponse.redirect(new URL('/admin-login', req.url))
    }
  }
}
```

### Dashboard — `app/admin/page.tsx`

Tabel list bisnis target dengan kolom:

| Nama Bisnis | Kategori | Status | Aksi |
|---|---|---|---|
| Azaryah Medan | Toko Seragam | ✅ Enriched + Generated | Preview / Edit / Regenerate |
| Zazi Shop | Toko Pakaian | ⚡ Generated | Preview / Enrich / Regenerate |
| Nayu Store | Toko Pakaian | ⬜ Belum diproses | Enrich / Generate |

**Status badge logic (dari Supabase):**
- `enriched_data NOT NULL` + `generated_html NOT NULL` → ✅ Enriched + Generated
- `enriched_data IS NULL` + `generated_html NOT NULL` → ⚡ Generated
- `generated_html IS NULL` → ⬜ Belum diproses

**Filter:** Kategori, status pitch, search nama

### Form Enrichment — `app/admin/[slug]/page.tsx`

```
Jam Buka             → input text
Deskripsi Singkat    → textarea
Layanan / Produk     → textarea (satu per baris)
Keunggulan           → textarea (satu per baris)
Link GMaps           → readonly, bisa override
Catatan Internal     → textarea (tidak masuk ke website)
Status Pitch         → dropdown: belum_dikirim / sudah_dikirim / deal / tidak_tertarik
```

**Tombol aksi:**
- `Simpan Enrichment` → UPDATE `enriched_data` di Supabase
- `Simpan & Generate Sekarang` → simpan → call Gemini → UPDATE `generated_html`
- `Buka Preview` → buka `/demo/[slug]` di tab baru

### API Routes

**`POST /api/enrich`**
```typescript
// Body: { slug: string, enrichedData: object }
// Action: UPDATE demo_businesses SET enriched_data = ..., enriched_at = now() WHERE slug = ...
```

**`POST /api/generate`**
```typescript
// Body: { slug: string }
// Action:
//   1. SELECT * FROM demo_businesses WHERE slug = ...
//   2. Merge base data + enriched_data
//   3. Call Gemini API
//   4. UPDATE demo_businesses SET generated_html = ..., generated_at = now()
```

### Workflow Harian

```
Buka /admin → filter "belum diproses"
    ↓
Klik bisnis → buka GMaps mereka (5 menit research)
    ↓
Isi form enrichment
    ↓
Klik "Simpan & Generate Sekarang"
    ↓
Preview → copy link
    ↓
Kirim WA ke pemilik bisnis
    ↓
Update status pitch → "sudah_dikirim"
```

---

## Urutan Pengerjaan (Ikuti Berurutan!)

### FASE 1 — Setup Project

- [ ] `npx create-next-app@latest` dengan opsi: TypeScript ✓, Tailwind ✓, App Router ✓
- [ ] Install: `npm install framer-motion slugify @google/generative-ai @supabase/supabase-js`
- [ ] Buat `.env.local` (lihat bagian Environment Variables)
- [ ] Setup Supabase project → jalankan schema SQL di SQL Editor
- [ ] Import data Excel ke tabel `demo_businesses` via script

### FASE 2 — Utilitas & Data Layer

- [ ] Buat `lib/supabase.ts` — server + browser client
- [ ] Buat `lib/slug-utils.ts` — fungsi `toSlug(nama: string): string`
- [ ] Buat `lib/github.ts` — fetch stats GitHub username `arifjagad`
- [ ] Buat `lib/ai-generator.ts` — generate HTML via Gemini, adaptif enriched/non-enriched

### FASE 3 — Demo Page

- [ ] Buat `app/demo/[slug]/loading.tsx`
- [ ] Buat `app/demo/[slug]/page.tsx`
  - Query `demo_businesses` by slug
  - Cek `generated_html` → serve atau generate dulu
  - Render fullscreen via `dangerouslySetInnerHTML`
  - Banner preview kecil di atas: *"Demo page untuk [Nama Bisnis] — dibuat oleh arifjagad"*

### FASE 4 — Admin Panel

- [ ] Buat `middleware.ts` — proteksi route `/admin`
- [ ] Buat `app/admin/page.tsx` — dashboard dengan filter & search
- [ ] Buat `app/admin/[slug]/page.tsx` — form enrichment
- [ ] Buat `app/api/enrich/route.ts`
- [ ] Buat `app/api/generate/route.ts`

### FASE 5 — Portfolio Homepage

- [ ] Buat `app/page.tsx` dengan sections: Hero → GitHub Stats → Projects → Experience → Testimonials → Kontak
- [ ] Dark theme, Framer Motion scroll reveal
- [ ] GitHub stats fetch dari `lib/github.ts`
- [ ] Projects data dari Supabase tabel `projects`

### FASE 6 — Halaman Detail Project

- [ ] Buat `app/projects/[slug]/page.tsx`
- [ ] Format case study: Problem → Solution → Result
- [ ] Data dari Supabase JOIN `projects` + `project_details`

### FASE 7 — Polish & Deploy

- [ ] Test semua flow
- [ ] Mobile responsiveness
- [ ] Deploy ke Vercel
- [ ] Pastikan `/admin` tidak bisa diakses tanpa password

---

## Catatan Penting

### Supabase Row Level Security (RLS)
- Tabel `projects`, `experiences`, `testimonials` — aktifkan RLS, buat policy SELECT untuk public (read-only)
- Tabel `demo_businesses` — matikan RLS (semua operasi via service role key di server)

### Gemini Rate Limit (Free Tier)
- 15 request per menit, 1.500 per hari
- Generate satu per satu di admin: aman
- Batch generate: tambahkan delay 4 detik antar request

### GitHub API Rate Limit
- Tanpa auth: 60 request/jam — cukup untuk dev
- Gunakan `next: { revalidate: 3600 }` agar tidak fetch ulang tiap render

---

## Environment Variables

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # JANGAN expose ke client!

# Gemini
GEMINI_API_KEY=AIza...

# Admin
ADMIN_SECRET=password_admin_kamu
```

---

## Perintah yang Sering Dipakai

```bash
# Development
npm run dev

# Build
npm run build

# Import Excel ke Supabase (jalankan sekali di awal)
npx tsx scripts/import-excel.ts

# Cek berapa bisnis sudah generated (via Supabase)
# → Lihat di dashboard admin, atau query: SELECT COUNT(*) FROM demo_businesses WHERE generated_html IS NOT NULL
```

---

*File ini dibuat sebagai panduan untuk Claude Code. Update file ini jika ada perubahan arsitektur.*