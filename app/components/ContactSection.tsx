"use client";

import { motion } from "framer-motion";

export default function ContactSection() {
  return (
    <section id="kontak" className="py-24 border-t border-navy-900">
      <div className="section-container">
        <div className="max-w-2xl">

          {/* ── Header ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-3 font-mono text-xs tracking-widest text-forest-200">
              — KONTAK
            </p>
            <h2 className="mb-4 text-3xl font-bold text-slate-200 sm:text-4xl">
              Ada project?
              <br />
              <span className="text-slate-500">Mari ngobrol.</span>
            </h2>
            <p className="mb-10 text-slate-500 text-base leading-relaxed">
              Saya terbuka untuk project freelance, kolaborasi, maupun diskusi
              santai soal teknologi. Jangan sungkan untuk menghubungi.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 mb-10">
              <a
                href="https://wa.me/6282167565321?text=Halo%20Arif%2C%20saya%20mau%20diskusi%20soal%20project"
                id="cta-whatsapp-kontak"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-lg bg-forest-200 px-6 py-3 text-sm font-semibold text-navy-950 transition-all duration-200 hover:opacity-90"
                style={{ boxShadow: "0 0 24px rgba(149,213,178,0.15)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.102.547 4.079 1.504 5.797L.057 23.776a.5.5 0 00.612.624l6.073-1.432A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.886 0-3.653-.512-5.175-1.405l-.37-.214-3.838.905.878-3.759-.231-.376A9.959 9.959 0 012 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z" />
                </svg>
                WhatsApp
              </a>
              <a
                href="mailto:arifjagad34@gmail.com"
                id="cta-email-kontak"
                className="inline-flex items-center gap-2.5 rounded-lg border border-navy-800 bg-transparent px-6 py-3 text-sm font-semibold text-slate-500 transition-all duration-200 hover:bg-navy-900 hover:text-slate-200 hover:border-forest-700"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Email
              </a>
            </div>

            {/* ── Info Row ─────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-8 border-t border-navy-800/60">
              {/* Availability */}
              <div className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-200 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-forest-200" />
                </span>
                <span className="font-mono text-xs text-slate-500">Tersedia sekarang</span>
              </div>

              <span className="h-3 w-px bg-navy-800 hidden sm:block" />

              <span className="font-mono text-xs text-slate-500">
                📍 Medan · Remote OK
              </span>

              <span className="h-3 w-px bg-navy-800 hidden sm:block" />

              <span className="font-mono text-xs text-slate-500">
                Respon &lt; 24 jam
              </span>
            </div>

            {/* Social links */}
            <div className="mt-6 flex items-center gap-5">
              <a
                href="https://github.com/arifjagad"
                id="link-github-kontak"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-slate-500 hover:text-forest-200 transition-colors"
              >
                GitHub ↗
              </a>
              <span className="h-3 w-px bg-navy-800" />
              <a
                href="https://linkedin.com/in/arifjagad"
                id="link-linkedin-kontak"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-slate-500 hover:text-forest-200 transition-colors"
              >
                LinkedIn ↗
              </a>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
