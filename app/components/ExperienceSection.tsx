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
    <section id="experience" className="py-20 border-t border-navy-900">
      <div className="section-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-12"
        >
          <p className="mb-2 font-mono text-xs tracking-widest text-forest-200">
            — PERJALANAN
          </p>
          <h2 className="text-2xl font-bold text-slate-200">Pengalaman</h2>
        </motion.div>

        {experiences.length === 0 ? (
          <div className="rounded-xl border border-navy-800 bg-navy-900 p-12 text-center">
            <p className="text-slate-500 font-mono text-sm">
              Data pengalaman akan segera ditambahkan.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-0 bottom-0 w-px bg-navy-800 hidden sm:block" />

            <div className="flex flex-col gap-0">
              {experiences.map((exp, i) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative sm:pl-10 pb-10 last:pb-0 group"
                >
                  {/* Dot */}
                  <div
                    className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border hidden sm:flex items-center justify-center ${
                      exp.is_current
                        ? "bg-forest-200 border-forest-200"
                        : "bg-navy-900 border-slate-500"
                    }`}
                  >
                    {exp.is_current && (
                      <span className="h-1.5 w-1.5 rounded-full bg-navy-950" />
                    )}
                  </div>

                  {/* Card */}
                  <div className="rounded-xl border border-navy-800 bg-navy-900 p-5 transition-all duration-300 group-hover:border-forest-700">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-200">
                          {exp.position}
                        </h3>
                        <p className="text-sm text-forest-200">
                          {exp.company}
                          {exp.employment_type && (
                            <span className="text-slate-500 font-normal">
                              {" "}· {exp.employment_type}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-xs text-slate-500">
                          {formatPeriod(exp.period_start, exp.period_end, exp.is_current)}
                        </span>
                        {exp.is_current && (
                          <span className="rounded bg-forest-700/20 border border-forest-700 px-2 py-0.5 font-mono text-xs text-forest-200">
                            Aktif
                          </span>
                        )}
                      </div>
                    </div>
                    {exp.description && (
                      <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line">
                        {exp.description}
                      </p>
                    )}

                    {exp.skills && exp.skills.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5 pt-4 border-t border-navy-800/50">
                        {exp.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded bg-navy-950 border border-navy-800 px-2 py-0.5 font-mono text-[11px] text-slate-400"
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
