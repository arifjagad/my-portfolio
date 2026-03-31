"use client";

import { motion } from "framer-motion";

export default function ContactSection() {
  return (
    <section id="kontak" className="relative py-32 border-t border-navy-900 overflow-hidden bg-navy-950">
      
      {/* ── Background Depth Orb ── */}
      <div className="pointer-events-none absolute right-0 bottom-0 translate-x-1/3 translate-y-1/3 -z-10 flex">
        <div className="h-[600px] w-[600px] rounded-[100%] bg-forest-700/10 blur-[150px]" />
      </div>

      {/* ── Symmetrical connecting bridge (Top Left - Vertical Bar) ── */}
      <div className="pointer-events-none absolute top-0 left-20 z-0 flex">
        <div className="relative h-48 w-24">
          {/* Inner Accent Line */}
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            whileInView={{ opacity: 0.4, scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.2, ease: "circOut" }}
            className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-linear-to-b from-forest-200/40 to-transparent"
          />
          {/* Outer Border (Rounded only at bottom to meet the section above flat) */}
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            whileInView={{ opacity: 1, scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: "circOut" }}
            className="h-full w-full rounded-b-full border-b border-l border-r border-forest-700/20"
          />
          {/* Floating dot */}
          <motion.div
            animate={{ y: [0, 40, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
            className="absolute left-1/2 bottom-4 h-2 w-2 -translate-x-1/2 rounded-full bg-forest-200/30 blur-[2px]"
          />
        </div>
      </div>

      <div className="section-container relative z-10">
        <div className="max-w-3xl">

          {/* ── Header ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <p className="mb-4 font-mono text-[13px] font-semibold tracking-[0.2em] text-forest-200/70 uppercase">
              — KONTAK
            </p>
            <h2 className="mb-6 text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-100 tracking-tight leading-[1.1]">
              Punya ide menarik?
              <br />
              <span className="bg-linear-to-r from-forest-200 to-forest-500 bg-clip-text text-transparent">
                Mari ngobrol.
              </span>
            </h2>
            <p className="mb-12 text-slate-400 text-lg sm:text-xl leading-relaxed max-w-2xl">
              Saya selalu terbuka untuk tawaran <span className="text-slate-300 font-medium">project freelance</span>, kolaborasi kreatif, maupun sekadar diskusi santai tentang dunia teknologi. Jangan sungkan untuk menyapa!
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-5 mb-14">
              <a
                href="https://wa.me/6282167565321?text=Halo%20Arif%2C%20saya%20mau%20diskusi%20soal%20project"
                id="cta-whatsapp-kontak"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 rounded-full bg-forest-200 px-8 py-4 text-[15px] font-bold text-navy-950 transition-all duration-500 hover:bg-forest-100 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(149,213,178,0.4)]"
              >
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-navy-950/20 blur-xs group-hover:blur-sm transition-all" />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="relative z-10 transition-transform duration-300 group-hover:scale-110">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.102.547 4.079 1.504 5.797L.057 23.776a.5.5 0 00.612.624l6.073-1.432A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.886 0-3.653-.512-5.175-1.405l-.37-.214-3.838.905.878-3.759-.231-.376A9.959 9.959 0 012 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z" />
                  </svg>
                </div>
                WhatsApp Saya
              </a>
              <a
                href="mailto:arifjagad34@gmail.com"
                id="cta-email-kontak"
                className="group inline-flex items-center gap-3 rounded-full border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm px-8 py-4 text-[15px] font-bold text-slate-300 transition-all duration-500 hover:border-forest-700/50 hover:bg-forest-700/10 hover:text-forest-200 hover:-translate-y-1 hover:shadow-[0_8px_30px_-12px_rgba(149,213,178,0.2)]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Kirim Email
              </a>
            </div>

            {/* ── Info Row Badges ──────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3 pt-4">
              {/* Availability */}
              <div className="flex items-center gap-2.5 rounded-full border border-forest-700/30 bg-forest-700/10 backdrop-blur-sm px-4 py-2">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-200 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-forest-200" />
                </span>
                <span className="font-mono text-xs font-semibold text-forest-200 uppercase tracking-wide">Available for new projects</span>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 rounded-full border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm px-4 py-2">
                <span className="text-sm">📍</span>
                <span className="font-mono text-xs font-semibold text-slate-400 uppercase tracking-wide">Medan · Remote OK</span>
              </div>

              {/* Response Time */}
              <div className="flex items-center gap-2 rounded-full border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm px-4 py-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-500">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="font-mono text-xs font-semibold text-slate-400 uppercase tracking-wide">Respon &lt; 24 Jam</span>
              </div>
            </div>

            {/* Social links */}
            <div className="mt-12 flex items-center gap-6 border-t border-navy-800/50 pt-8 max-w-lg">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Let's Connect:</span>
              <a
                href="https://github.com/arifjagad"
                id="link-github-kontak"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 font-mono text-xs font-semibold text-slate-400 hover:text-forest-200 transition-colors"
              >
                GitHub
                <span className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
              </a>
              <span className="h-4 w-px bg-navy-800" />
              <a
                href="https://linkedin.com/in/arifjagad"
                id="link-linkedin-kontak"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 font-mono text-xs font-semibold text-slate-400 hover:text-forest-200 transition-colors"
              >
                LinkedIn
                <span className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
              </a>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
