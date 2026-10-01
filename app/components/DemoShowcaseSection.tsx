"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export type DemoShowcaseItem = {
  slug: string;
  nama_bisnis: string;
  kategori: string;
  rating: number | null;
  jumlah_ulasan: number | null;
};

function DemoCard({ demo, index = 0 }: { demo: DemoShowcaseItem; index?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.12, ease: "easeOut" }}
      className="group relative flex flex-col rounded-2xl border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:border-amber-300/40 hover:shadow-[0_8px_30px_-12px_rgba(252,211,77,0.22)] hover:-translate-y-1.5"
    >
      {/* Thumbnail */}
      <a
        href={`/demo/${demo.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="relative w-full overflow-hidden bg-navy-950/80 h-56 block border-b border-navy-800/50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/demo-thumbs/${demo.slug}.webp`}
          alt={`Demo website ${demo.nama_bisnis}`}
          loading="lazy"
          className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/10 to-transparent opacity-80 group-hover:opacity-40 transition-opacity duration-500" />

        <div className="absolute top-4 left-4 z-10">
          <span className="rounded-full bg-amber-300/90 backdrop-blur-md px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-navy-950 shadow-lg">
            Demo Konsep
          </span>
        </div>
      </a>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div>
          <h3 className="mb-1.5 text-lg font-semibold text-slate-200 group-hover:text-amber-200 transition-colors duration-300">
            {demo.nama_bisnis}
          </h3>
          <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
            {demo.kategori}
            {typeof demo.rating === "number" && (
              <span className="text-slate-500">
                {" "}• ⭐ {demo.rating.toFixed(1)}
                {(demo.jumlah_ulasan ?? 0) > 0 &&
                  ` (${demo.jumlah_ulasan!.toLocaleString("id-ID")} ulasan)`}
              </span>
            )}
          </p>
        </div>

        {/* Links */}
        <div className="mt-auto flex items-center gap-3 pt-4 border-t border-navy-800/60">
          <a
            href={`/demo/${demo.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group/btn inline-flex items-center gap-2 rounded-full bg-amber-300/10 px-4 py-1.5 text-xs font-semibold text-amber-200 transition-all duration-300 hover:bg-amber-300 hover:text-navy-950"
          >
            Buka Demo
            <span className="transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
          </a>
        </div>
      </div>
    </motion.article>
  );
}

export default function DemoShowcaseSection({ demos }: { demos: DemoShowcaseItem[] }) {
  if (demos.length === 0) return null;

  return (
    <section id="demo" className="relative py-24 border-t border-navy-900 overflow-hidden">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/3 -left-[100px] h-[300px] w-[300px] rounded-full bg-amber-300/5 blur-3xl" />
      </div>

      <div className="section-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-14 flex items-end justify-between gap-6"
        >
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/70">
              — DEMO KONSEP
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 leading-tight">
              Demo Website untuk <span className="text-amber-200">Bisnis Lokal</span>
            </h2>
            <p className="mt-4 text-sm md:text-base text-slate-400 leading-relaxed">
              Konsep website yang saya rancang proaktif untuk bisnis lokal di Medan.
              Setiap demo unik, disesuaikan dengan karakter dan keunggulan bisnisnya —
              bukan template. Punya usaha? Bisa jadi giliran bisnismu berikutnya.
            </p>
          </div>
          <Link
            href="/demos"
            className="group hidden sm:flex shrink-0 items-center gap-2 text-sm font-medium text-slate-400 hover:text-amber-200 transition-colors"
          >
            Lihat Semua <span className="transform transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {demos.map((demo, idx) => (
            <DemoCard key={demo.slug} demo={demo} index={idx} />
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/demos"
            className="rounded-full border border-amber-300/40 bg-amber-300/10 px-8 py-3 text-sm font-medium text-amber-200 hover:bg-amber-300 hover:text-navy-950 transition-all shadow-[0_0_15px_rgba(252,211,77,0.08)]"
          >
            Lihat Semua Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
