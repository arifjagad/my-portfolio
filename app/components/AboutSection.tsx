"use client";

import { motion } from "framer-motion";
import { Profile } from "@/lib/supabase";
import Image from "next/image";

type Props = {
  profile?: Profile | null;
};

const skills = [
  "Laravel", "Next.js", "React", "TypeScript",
  "WordPress", "RESTful API", "Supabase", "MySQL", "SEO",
];

const stats = [
  { value: "3+", label: "Tahun Pengalaman" },
  { value: "20+", label: "Proyek Selesai" },
  { value: "100%", label: "Klien Puas" },
];

export default function AboutSection({ profile }: Props) {
  if (!profile?.about_text && !profile?.photo_url) return null;

  return (
    <section id="about" className="relative py-28 overflow-hidden border-t border-navy-900">
      {/* Background decorative orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-forest-700/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-navy-950/40 blur-3xl" />
        
        {/* ── Symmetrical connecting bridge (Bottom Half) ── */}
        <div className="absolute -bottom-[175px] -right-[70px] h-[350px] w-[350px] rounded-full bg-forest-700/10 blur-3xl" />
        
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="absolute -bottom-[175px] -right-[70px] h-[350px] w-[350px] rounded-full border border-forest-700/30"
        />
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute -bottom-[105px] -right-[30px] h-[210px] w-[210px] rounded-full border border-forest-200/10"
        />
        {/* Tiny filled dot accent */}
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="absolute bottom-[15px] right-[100px] h-3 w-3 rounded-full bg-forest-200/40"
        />
      </div>

      <div className="section-container">
        <div className="flex flex-col lg:flex-row gap-14 xl:gap-24 items-center">

          {/* ── Photo column ── */}
          {profile.photo_url && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="relative shrink-0 group"
            >
              {/* Glow ring behind photo */}
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-forest-700/30 via-transparent to-forest-200/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              {/* Outer decorative ring */}
              <div className="absolute -inset-1 rounded-[22px] border border-forest-700/30" />

              {/* Corner accent dots */}
              <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-forest-200 ring-4 ring-navy-950 z-10" />
              <span className="absolute -bottom-2 -left-2 h-3 w-3 rounded-full bg-forest-700 ring-4 ring-navy-950 z-10" />

              <div className="relative w-full aspect-square max-w-[280px] sm:max-w-sm md:w-72 md:h-72 mx-auto rounded-2xl overflow-hidden border border-navy-700 shadow-2xl">
                <Image
                  src={profile.photo_url}
                  alt={profile.name ?? "Profile"}
                  fill
                  priority
                  className="object-cover transition-all duration-700 grayscale group-hover:grayscale-0 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 288px"
                />
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-transparent" />
              </div>

              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-forest-700/40 bg-navy-900/90 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-forest-200 shadow-lg"
              >
                ✦ {profile.status_text || "Open to Work"}
              </motion.div>
            </motion.div>
          )}

          {/* ── Text column ── */}
          {profile.about_text && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
              className="flex-1 min-w-0"
            >
              {/* Section label */}
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-forest-200/70">
                Tentang Saya
              </p>

              <h2 className="mb-6 text-3xl md:text-4xl font-bold text-slate-100 leading-tight">
                Menghadirkan Solusi Digital{" "}
                <span className="text-forest-200">untuk Bisnis Anda</span>
              </h2>

              {/* Bio text */}
              <div className="space-y-3 text-slate-400 leading-relaxed text-[15px] mb-8">
                {profile.about_text.split("\n").filter(Boolean).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              {/* Skill pills */}
              <div className="flex flex-wrap gap-2 mb-8">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-navy-700 bg-navy-800/60 px-3 py-1 text-xs font-medium text-slate-300 hover:border-forest-700/60 hover:text-forest-200 transition-colors duration-200 cursor-default"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-navy-800">
                {stats.map(({ value, label }) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="text-center md:text-left"
                  >
                    <p className="text-2xl font-bold text-forest-200">{value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </section>
  );
}
