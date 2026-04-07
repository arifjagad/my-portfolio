import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ScrollToTop from "@/app/components/ScrollToTop";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Metadata } from "next";
import { LONG_TAIL_KEYWORDS, SHORT_KEYWORDS, absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Demo Website Bisnis Lokal",
  description:
    "Galeri demo website bisnis lokal di Medan untuk kebutuhan promosi digital: klinik, apotek, barbershop, kafe, restoran, dan UMKM.",
  keywords: [
    ...SHORT_KEYWORDS,
    ...LONG_TAIL_KEYWORDS,
    "demo website bisnis lokal",
    "contoh landing page umkm",
    "jasa website untuk usaha kecil",
  ],
  alternates: {
    canonical: absoluteUrl("/demos"),
  },
};

type DemoItem = {
  id: string;
  slug: string;
  nama_bisnis: string;
  kategori: string;
  alamat: string | null;
  rating: number | null;
  jumlah_ulasan: number | null;
  generated_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Belum ada tanggal";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AllDemosPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("demo_businesses")
    .select("id, slug, nama_bisnis, kategori, alamat, rating, jumlah_ulasan, generated_at")
    .not("generated_html", "is", null)
    .eq("is_locked", false)
    .order("generated_at", { ascending: false });

  const demos = (data ?? []) as DemoItem[];
  const totalDemos = demos.length;
  const totalKategori = new Set(demos.map((item) => item.kategori).filter(Boolean)).size;
  const avgRating = totalDemos
    ? demos
        .map((item) => item.rating)
        .filter((v): v is number => typeof v === "number")
        .reduce((sum, rating) => sum + rating, 0) /
      Math.max(
        demos.filter((item) => typeof item.rating === "number").length,
        1
      )
    : 0;

  return (
    <>
      <Navbar />
      <div className="relative min-h-screen overflow-x-hidden bg-navy-950 pb-24 pt-32 font-sans text-slate-200 selection:bg-forest-500/30 selection:text-forest-200">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-forest-700/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-forest-700/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(100%_55%_at_50%_0%,rgba(149,213,178,0.08),transparent_60%)]" />
        </div>

        <main className="relative mx-auto max-w-7xl px-6">
          <header className="mb-12 md:mb-14">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-forest-200/70">
              Showcase Demo
            </p>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-200 md:text-5xl">
              Koleksi Demo Website
            </h1>
            <p className="text-lg text-slate-400">
              Kumpulan landing page demo yang dibuat untuk calon klien bisnis lokal di Medan.
            </p>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-navy-800/70 bg-navy-900/60 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Demo</p>
                <p className="mt-1 text-xl font-semibold text-slate-100">{totalDemos}</p>
              </div>
              <div className="rounded-xl border border-navy-800/70 bg-navy-900/60 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Kategori</p>
                <p className="mt-1 text-xl font-semibold text-slate-100">{totalKategori}</p>
              </div>
              <div className="rounded-xl border border-navy-800/70 bg-navy-900/60 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Rata-Rata Rating</p>
                <p className="mt-1 text-xl font-semibold text-slate-100">{avgRating ? avgRating.toFixed(1) : "-"}</p>
              </div>
            </div>
          </header>

          {totalDemos > 0 ? (
            <div>
              <div className="mb-5 flex items-center justify-between rounded-xl border border-navy-800/70 bg-navy-900/50 px-4 py-3">
                <p className="text-xs font-medium text-slate-400">
                  Menampilkan <span className="font-semibold text-slate-200">{totalDemos}</span> demo yang siap dipreview.
                </p>
                <Link
                  href="/#projects"
                  className="text-xs font-medium text-forest-300 transition-colors hover:text-forest-200"
                >
                  Lihat project utama →
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {demos.map((demo) => (
                  <article
                    key={demo.id}
                    className="group relative overflow-hidden rounded-2xl border border-navy-800/70 bg-navy-900/40 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-forest-700/60 hover:shadow-[0_10px_30px_-16px_rgba(149,213,178,0.28)]"
                  >
                    <div className="absolute -right-10 -top-14 h-28 w-28 rounded-full bg-forest-700/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-70" />

                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="rounded-full border border-forest-700/40 bg-forest-700/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-forest-200">
                        {demo.kategori}
                      </span>
                      <span className="text-[11px] text-slate-500">{formatDate(demo.generated_at)}</span>
                    </div>

                    <h2 className="line-clamp-2 text-lg font-semibold text-slate-100 group-hover:text-forest-200 transition-colors">
                      {demo.nama_bisnis}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                      {demo.alamat || "Medan, Sumatera Utara"}
                    </p>

                    <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                      <span>⭐ {typeof demo.rating === "number" ? demo.rating.toFixed(1) : "-"}</span>
                      <span>•</span>
                      <span>{(demo.jumlah_ulasan || 0).toLocaleString("id-ID")} ulasan</span>
                    </div>

                    <div className="mt-5 border-t border-navy-800/80 pt-4">
                      <a
                        href={`/demo/${demo.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-forest-700/15 px-4 py-1.5 text-xs font-semibold text-forest-200 transition-all hover:bg-forest-700 hover:text-white"
                      >
                        Buka Demo
                        <span className="transition-transform group-hover:translate-x-1">→</span>
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-navy-800 bg-navy-900/70 p-12 text-center backdrop-blur-sm">
              <p className="mb-4 font-mono text-sm text-slate-500">
                Belum ada demo yang tersedia saat ini.
              </p>
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-forest-700/40 bg-forest-700/10 px-5 py-2 text-xs font-semibold text-forest-200 transition-colors hover:bg-forest-700 hover:text-white"
              >
                Kembali ke beranda
              </Link>
            </div>
          )}
        </main>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}
