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
      className="relative min-h-screen flex flex-col justify-center overflow-hidden"
    >
      {/* Background subtle grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(30, 58, 74, 0.25) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30, 58, 74, 0.25) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glow orb top-right */}
      <div
        className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-5"
        style={{
          background: "radial-gradient(circle, #95d5b2 0%, transparent 70%)",
        }}
      />

      <div className="section-container relative z-10 py-32">
        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-200 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-forest-200" />
          </span>
          <span className="text-sm font-mono text-slate-500">
            Available for work
          </span>
        </motion.div>

        {/* Greeting */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-3 font-mono text-forest-200 text-base tracking-widest"
        >
          Halo, saya
        </motion.p>

        {/* Name */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-4 text-5xl font-bold leading-tight text-slate-200 sm:text-6xl lg:text-7xl"
        >
          {profile?.name || "Arif Jagad"}
        </motion.h1>

        {/* Role tagline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-6 text-2xl font-medium text-slate-500 sm:text-3xl"
        >
          {profile?.role || "Fullstack Developer"}{" "}
          <span className="text-slate-200">{profile?.location || "berbasis di Medan"}</span>
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mb-10 max-w-xl text-slate-500 text-base leading-relaxed"
        >
          {profile?.short_bio || "Saya membangun aplikasi web yang berfungsi dengan baik dan tampak menarik — dari backend hingga frontend. Fokus pada efisiensi, kualitas kode, dan hasil nyata untuk bisnis."}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center gap-4"
        >
          <Link
            href="#projects"
            id="cta-lihat-project"
            className="inline-flex items-center gap-2 rounded-lg bg-forest-200 px-6 py-3 text-sm font-semibold text-navy-950 transition-all duration-200 hover:opacity-90 hover:shadow-lg glow-accent"
            style={{ boxShadow: "0 0 24px rgba(149,213,178,0.15)" }}
          >
            Lihat Project
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 8h10M8 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          {profile?.cv_url && (
            <a
              href={profile.cv_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-navy-800 bg-navy-900 px-6 py-3 text-sm font-semibold text-slate-200 transition-all duration-200 hover:bg-navy-800 hover:border-navy-700 hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-16 flex items-center gap-6"
        >
          <a
            href="https://github.com/arifjagad"
            target="_blank"
            rel="noopener noreferrer"
            id="link-github-hero"
            className="text-slate-500 transition-colors hover:text-slate-200"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
          <span className="h-4 w-px bg-navy-800" />
          <span className="font-mono text-xs text-slate-500">
            arifjagad
          </span>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="font-mono text-xs text-slate-500">scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="h-4 w-px bg-slate-500"
        />
      </motion.div>
    </section>
  );
}
