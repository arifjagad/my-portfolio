"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Profile } from "@/lib/supabase";

type Props = {
  profile?: Profile | null;
};

export default function HeroSection({ profile }: Props) {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-navy-950"
    >
      {/* ── Background Subtle Grid with Fade Mask ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(circle at center, black 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 40%, transparent 80%)",
        }}
      />

      {/* ── Giant Center Glow Orb ── */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 flex -translate-x-1/2 -translate-y-1/2">
        <div className="h-[600px] w-[800px] rounded-[100%] bg-forest-700/10 blur-[150px]" />
      </div>

      <div className="section-container relative z-10 py-32 mt-10">
        
        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2.5 rounded-full border border-forest-700/30 bg-forest-700/10 backdrop-blur-sm px-4 py-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-200 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-forest-200" />
            </span>
            <span className="font-mono text-xs font-semibold text-forest-200 uppercase tracking-widest">
              Available for new projects
            </span>
          </div>
        </motion.div>

        {/* Greeting */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="mb-4 font-mono text-forest-200 text-sm font-semibold tracking-[0.2em] uppercase"
        >
          Halo, saya
        </motion.p>

        {/* Name */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="mb-6 text-6xl font-extrabold tracking-tight text-slate-100 sm:text-7xl lg:text-8xl drop-shadow-sm"
        >
          {profile?.name || "Arif Jagad"}
        </motion.h1>

        {/* Role tagline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mb-8 text-2xl font-medium text-slate-400 sm:text-3xl lg:text-4xl max-w-3xl leading-snug"
        >
          <span className="text-slate-200 font-semibold">{profile?.role || "Fullstack Developer"}</span>{" "}
          berbasis di {profile?.location?.replace("berbasis di ", "") || "Medan"}.
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
          className="mb-12 max-w-xl text-slate-400 text-lg leading-relaxed"
        >
          {profile?.short_bio || "Saya merancang dan membangun aplikasi web yang elegan, berkinerja tinggi, dan fungsional. Menjembatani desain dan kode untuk menciptakan pengalaman digital yang sempurna."}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="flex flex-wrap items-center gap-5"
        >
          <Link
            href="#projects"
            id="cta-lihat-project"
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-full bg-forest-200 px-8 py-4 text-[15px] font-bold text-navy-950 transition-all duration-500 hover:bg-forest-100 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(149,213,178,0.4)]"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-navy-950/20 blur-xs group-hover:blur-sm transition-all" />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 transition-transform duration-300 group-hover:translate-x-1">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            Lihat Karya Saya
          </Link>

          {profile?.cv_url && (
            <a
              href={profile.cv_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-full border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm px-8 py-4 text-[15px] font-bold text-slate-300 transition-all duration-500 hover:border-forest-700/50 hover:bg-forest-700/10 hover:text-forest-200 hover:-translate-y-1 hover:shadow-[0_8px_30px_-12px_rgba(149,213,178,0.2)]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Unduh CV
            </a>
          )}
        </motion.div>

        {/* Social links bawah */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="mt-20 flex items-center gap-6"
        >
          <a
            href="https://github.com/arifjagad"
            target="_blank"
            rel="noopener noreferrer"
            id="link-github-hero"
            className="group flex flex-col items-center gap-2 text-slate-500 transition-colors hover:text-forest-200"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-forest-700/50 group-hover:shadow-[0_0_15px_rgba(149,213,178,0.2)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
            <span className="font-mono text-[10px] font-semibold tracking-widest uppercase opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              GitHub
            </span>
          </a>
          <a
            href="https://linkedin.com/in/arifjagad"
            target="_blank"
            rel="noopener noreferrer"
            id="link-linkedin-hero"
            className="group flex flex-col items-center gap-2 text-slate-500 transition-colors hover:text-forest-200"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-forest-700/50 group-hover:shadow-[0_0_15px_rgba(149,213,178,0.2)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </div>
            <span className="font-mono text-[10px] font-semibold tracking-widest uppercase opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              LinkedIn
            </span>
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-500">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="h-6 w-[2px] rounded-full bg-forest-200/50"
        />
      </motion.div>
    </section>
  );
}
