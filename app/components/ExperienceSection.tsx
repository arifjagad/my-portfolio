"use client";

import { motion } from "framer-motion";
import { Experience } from "@/lib/supabase";

type Props = {
  experiences: Experience[];
};

function formatPeriod(start: string, end: string | null, isCurrent: boolean): string {
  const startDate = new Date(start);
  const startStr = startDate.toLocaleDateString("id-ID", {
    month: "short",
    year: "numeric",
  });

  if (isCurrent || !end) {
    return `${startStr} — Sekarang`;
  }

  const endDate = new Date(end);
  const endStr = endDate.toLocaleDateString("id-ID", {
    month: "short",
    year: "numeric",
  });
  return `${startStr} — ${endStr}`;
}

export default function ExperienceSection({ experiences }: Props) {
  return (
    <section id="experience" className="relative py-24 border-t border-navy-900 overflow-hidden">
      {/* ── Section Decoration — The Chrono-Dial ── */}
      <div className="pointer-events-none absolute -right-24 top-24 -z-10 flex select-none opacity-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
          className="relative h-[600px] w-[600px]"
        >
          {/* Main Dial Outer Ring */}
          <div className="absolute inset-0 rounded-full border border-forest-700/20" />
          <div className="absolute inset-8 rounded-full border border-forest-700/10" />
          
          {/* Dial Ticks (Procedural lines) */}
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 h-full w-px -translate-x-1/2 -translate-y-1/2"
              style={{ transform: `translate(-50%, -50%) rotate(${i * 15}deg)` }}
            >
              <div className="absolute top-0 h-4 w-px bg-forest-700/40" />
              <div className="absolute bottom-0 h-4 w-px bg-forest-700/40" />
            </div>
          ))}

          {/* Inner Accent Orbs */}
          <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-forest-200/20 blur-[1px]" />
        </motion.div>
      </div>

      {/* Floating Star Accent */}
      <div className="pointer-events-none absolute left-1/4 bottom-1/4 -z-10 opacity-10">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="text-[200px] text-forest-200"
        >
          ✦
        </motion.div>
      </div>

      <div className="section-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-14"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-forest-200/70">
            — PERJALANAN
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100 leading-tight">
            Pengalaman <span className="text-forest-200">Karir</span>
          </h2>
        </motion.div>

        {experiences.length === 0 ? (
          <div className="rounded-xl border border-navy-800 bg-navy-900 p-12 text-center">
            <p className="text-slate-500 font-mono text-sm">
              Data pengalaman akan segera ditambahkan.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical glow line */}
            <div className="absolute left-[7px] top-2 bottom-4 w-px bg-linear-to-b from-forest-700/50 via-navy-800 to-navy-800/20 hidden sm:block" />

            <div className="flex flex-col gap-8 sm:gap-12">
              {experiences.map((exp, i) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, x: -20, y: 10 }}
                  whileInView={{ opacity: 1, x: 0, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
                  className="relative sm:pl-12 group"
                >
                  {/* Timeline Dot */}
                  <div
                    className={`absolute left-[-2px] top-6 h-5 w-5 rounded-full border-4 hidden sm:flex items-center justify-center transition-colors duration-500 z-10 ${
                      exp.is_current
                        ? "bg-navy-950 border-forest-200 group-hover:shadow-[0_0_15px_rgba(149,213,178,0.5)]"
                        : "bg-navy-950 border-navy-700 group-hover:border-forest-700/50"
                    }`}
                  >
                    {exp.is_current && (
                      <span className="h-1.5 w-1.5 rounded-full bg-forest-200 animate-pulse" />
                    )}
                  </div>

                  {/* Card Container */}
                  <div className="relative rounded-2xl border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm p-6 sm:p-8 transition-all duration-500 hover:border-forest-700/50 hover:shadow-[0_8px_30px_-12px_rgba(149,213,178,0.2)] hover:-translate-y-1">
                    
                    {/* Header: Role & Context */}
                    <div className="mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-100 group-hover:text-forest-200 transition-colors duration-300">
                          {exp.position}
                        </h3>
                        <p className="text-sm font-medium text-forest-200 mt-1">
                          {exp.company}
                          {exp.employment_type && (
                            <span className="text-slate-500 font-normal">
                              {" "}· {exp.employment_type}
                            </span>
                          )}
                        </p>
                      </div>
                      
                      <div className="flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-1.5">
                        <span className="font-mono text-xs font-medium text-slate-400">
                          {formatPeriod(exp.period_start, exp.period_end, exp.is_current)}
                        </span>
                        {exp.is_current && (
                          <span className="rounded-full bg-forest-700/20 border border-forest-700/30 px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-forest-200 shadow-[0_0_10px_rgba(149,213,178,0.1)]">
                            AKTIF
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description Paragraphs/Lists */}
                    {exp.description && (
                      <div className="text-[15px] text-slate-400 leading-relaxed whitespace-pre-line group-hover:text-slate-300 transition-colors duration-300">
                        {exp.description}
                      </div>
                    )}

                    {/* Skills Badges */}
                    {exp.skills && exp.skills.length > 0 && (
                      <div className="mt-6 flex flex-wrap gap-2 pt-5 border-t border-navy-800/60">
                        {exp.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-md bg-forest-700/10 border border-forest-700/20 px-2.5 py-1 font-mono text-[11px] font-medium text-forest-200/80 transition-colors duration-300 group-hover:bg-forest-700/20 group-hover:text-forest-200 group-hover:border-forest-700/30 cursor-default"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
