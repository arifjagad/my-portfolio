This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Security Hardening Plan

Tujuan: project aman dipublish sebagai portfolio publik (termasuk share ke LinkedIn) tanpa risiko kebocoran key dan endpoint sensitif terbuka.

### Checklist Prioritas

1. [x] Proteksi semua endpoint admin API (`/api/demo/*`) dengan validasi session Supabase.
2. [x] Perketat sandbox iframe untuk konten HTML hasil AI (kurangi privilege script/origin).
3. [x] Tambahkan rate limiting pada endpoint generate agar tidak bisa disalahgunakan.
4. [x] Tambahkan HTTP security headers (CSP, X-Content-Type-Options, Referrer-Policy, dll).
5. [x] Audit dan minimalkan penggunaan `SUPABASE_SERVICE_ROLE_KEY` hanya di server path yang wajib.
6. [ ] Verifikasi RLS policy Supabase production sesuai skenario public read vs admin write.
7. [ ] Rotasi semua secret aktif sebelum publish: Supabase service role, Gemini, OpenRouter, Unsplash.

### Catatan Operasional Key

- Jangan pernah commit file `.env.local`.
- Setelah rotasi key, update environment di Vercel/Supabase lalu restart deployment.
- Saat demo ke publik, gunakan key yang baru (bukan key lama yang pernah dipakai lokal).

### Progress Implementasi

- Selesai: item 1, 2, 3, 4, 5.
- Belum selesai (manual di Supabase dashboard): item 6 dan 7.

### Langkah Manual Berikutnya

#### 6) Verifikasi RLS Supabase (wajib sebelum publish)

Jalankan di Supabase SQL Editor:

```sql
-- Cek status RLS per tabel penting
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
	and tablename in (
		'projects',
		'project_details',
		'experiences',
		'testimonials',
		'tech_stacks',
		'profiles',
		'demo_businesses'
	)
order by tablename;

-- Cek policy aktif
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Target hasil:
- Tabel portfolio public (`projects`, `project_details`, `experiences`, `testimonials`, `tech_stacks`, `profiles`) punya RLS aktif dan policy read-only untuk public.
- Tabel `demo_businesses` hanya boleh dipakai aman dari server route yang sudah diautentikasi admin.

#### 7) Rotasi secret sebelum publish

Minimal rotasi:
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`
- `UNSPLASH_ACCESS_KEY`

Checklist setelah rotasi:
1. Update env di Vercel Project Settings.
2. Update env lokal di `.env.local`.
3. Redeploy.
4. Re-test login admin + generate demo.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
