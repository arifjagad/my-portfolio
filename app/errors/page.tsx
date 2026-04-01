import Link from "next/link";

const errorPages = [
  {
    code: "403",
    label: "Akses Ditolak",
    hint: "Autentikasi/otorisasi gagal",
    href: "/errors/403",
    tone: "from-amber-500/20 to-transparent",
  },
  {
    code: "404",
    label: "Halaman Tidak Ditemukan",
    hint: "URL tidak valid atau konten sudah dipindah",
    href: "/errors/404",
    tone: "from-slate-400/20 to-transparent",
  },
  {
    code: "429",
    label: "Terlalu Banyak Request",
    hint: "Rate limit atau quota terlampaui",
    href: "/errors/429",
    tone: "from-sky-500/20 to-transparent",
  },
  {
    code: "500",
    label: "Internal Server Error",
    hint: "Server error dari backend/runtime",
    href: "/errors/500",
    tone: "from-red-500/20 to-transparent",
  },
];

export default function ErrorsIndexPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-navy-950 text-slate-200 px-6 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-b from-forest-500/20 to-transparent blur-3xl" />
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.16) 1px, transparent 0)", backgroundSize: "28px 28px" }} />
      </div>

      <section className="relative mx-auto w-full max-w-4xl rounded-3xl border border-navy-800 bg-navy-900/60 p-8 md:p-10 shadow-[0_20px_90px_rgba(2,8,23,0.55)] backdrop-blur-sm">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-slate-500">System Routes</p>
        <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">Error Pages</h1>
        <p className="mt-3 max-w-2xl text-sm md:text-base text-slate-400 leading-relaxed">
          Koleksi halaman fallback untuk skenario error paling umum. Bisa dipakai untuk redirect manual dari API, middleware, atau route handler.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {errorPages.map((item) => (
            <Link
              key={item.code}
              href={item.href}
              className="group relative overflow-hidden rounded-2xl border border-navy-700 bg-navy-950/50 px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-slate-500/40"
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.tone} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
              <div className="relative">
                <p className="text-xs font-mono text-slate-500">{item.code}</p>
                <p className="mt-1 text-sm font-semibold text-slate-200">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 pt-5 border-t border-navy-800">
          <Link href="/" className="text-sm text-forest-200 hover:text-forest-500 transition-colors">
            Kembali ke Home
          </Link>
        </div>
      </section>
    </main>
  );
}
