"use client";

import { motion } from "framer-motion";
import { TechStack } from "@/lib/supabase";
import Image from "next/image";

type Props = {
  skills: TechStack[];
};

type MarqueeRowProps = {
  items: TechStack[];
  direction?: "left" | "right";
  speed?: number;
};

function MarqueeRow({ items, direction = "left", speed = 30 }: MarqueeRowProps) {
  // Triple clone untuk seamless loop
  const loopItems = [...items, ...items, ...items];
  const isLeft = direction === "left";

  return (
    // Menggunakan trik mask-image yang jauh lebih presisi dan clean dibanding div absolute bergradasi
    <div className="relative flex w-full overflow-hidden mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] py-2">
      <motion.div
        className="flex flex-nowrap gap-4 sm:gap-6"
        animate={{ x: isLeft ? ["0%", "-33.333%"] : ["-33.333%", "0%"] }}
        transition={{
          ease: "linear",
          duration: speed,
          repeat: Infinity,
        }}
      >
        {loopItems.map((skill, index) => (
          <div
            key={`${skill.id}-${index}`}
            className="group flex flex-none items-center gap-3.5 rounded-full border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm px-6 py-3 transition-all duration-300 hover:border-forest-700/50 hover:bg-forest-700/10 hover:-translate-y-1 hover:shadow-[0_8px_20px_-6px_rgba(149,213,178,0.2)] cursor-default"
          >
            {skill.image_url ? (
              <div className="relative flex h-6 w-6 shrink-0 items-center justify-center opacity-70 grayscale transition-all duration-500 group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:opacity-100 group-hover:grayscale-0">
                <Image
                  src={skill.image_url}
                  alt={skill.name}
                  width={24}
                  height={24}
                  className="object-contain drop-shadow-sm max-h-full max-w-full"
                />
              </div>
            ) : (
              <div className="h-6 w-6 shrink-0 rounded-full bg-navy-800/80 border border-navy-700 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase transition-all duration-300 group-hover:border-forest-700/50 group-hover:text-forest-200 group-hover:scale-110">
                {skill.name.substring(0, 1)}
              </div>
            )}
            <span className="font-mono text-sm font-medium text-slate-400 group-hover:text-forest-200 transition-colors duration-300 whitespace-nowrap tracking-wide">
              {skill.name}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default function TechStackSection({ skills }: Props) {
  if (!skills || skills.length === 0) return null;

  // Bagi skills menjadi 3 group, setiap row punya konten berbeda
  const total = skills.length;
  const perRow = Math.ceil(total / 3);

  const row1 = skills.slice(0, perRow);
  const row2 = skills.slice(perRow, perRow * 2);
  const row3 = skills.slice(perRow * 2);

  // Fallback: jika item terlalu sedikit, semua row pakai semua skills
  const r1 = row1.length > 0 ? row1 : skills;
  const r2 = row2.length > 0 ? row2 : skills;
  const r3 = row3.length > 0 ? row3 : skills;

  return (
    <section id="tech-stack" className="relative py-24 border-t border-navy-900 overflow-hidden bg-navy-950">
      
      {/* ── Background Depth Orb ── */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[400px] w-full max-w-4xl rounded-[100%] bg-forest-700/5 blur-[120px]" />
      </div>

      <div className="section-container pb-14">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-forest-200/70">
            — ALAT & TEKNOLOGI
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100 leading-tight">
            Tech <span className="text-forest-200">Stack</span>
          </h2>
          <p className="mt-5 text-[15px] text-slate-400 max-w-lg mx-auto leading-relaxed">
            Teknologi dan framework yang sering saya gunakan untuk membangun aplikasi yang skalabel, aman, dan berkinerja tinggi.
          </p>
        </motion.div>
      </div>

      {/* 3 Marquee Rows */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="flex flex-col gap-5 sm:gap-6"
      >
        {/* Row 1 — kiri, cepat */}
        <MarqueeRow items={r1} direction="left" speed={30} />
        {/* Row 2 — kanan, sedang */}
        <MarqueeRow items={r2} direction="right" speed={40} />
        {/* Row 3 — kiri, agak lambat */}
        <MarqueeRow items={r3} direction="left" speed={35} />
      </motion.div>
    </section>
  );
}
