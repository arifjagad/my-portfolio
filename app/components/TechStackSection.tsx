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
    <div className="relative flex w-full overflow-hidden">
      {/* Gradient fade kiri */}
      <div className="absolute inset-y-0 left-0 z-10 w-28 bg-linear-to-r from-navy-950 to-transparent pointer-events-none" />
      {/* Gradient fade kanan */}
      <div className="absolute inset-y-0 right-0 z-10 w-28 bg-linear-to-l from-navy-950 to-transparent pointer-events-none" />

      <motion.div
        className="flex flex-nowrap gap-4 py-3"
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
            className="group flex flex-none items-center gap-3 rounded-full border border-navy-800 bg-navy-900/50 px-5 py-2.5 transition-all duration-300 hover:border-forest-700/50 hover:bg-forest-700/10 hover:scale-105 cursor-default"
          >
            {skill.image_url ? (
              <div className="relative h-5 w-5 shrink-0 grayscale transition-all duration-300 group-hover:grayscale-0">
                <Image
                  src={skill.image_url}
                  alt={skill.name}
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="h-5 w-5 shrink-0 rounded-full bg-navy-800 flex items-center justify-center text-[9px] text-slate-500 font-bold uppercase">
                {skill.name.substring(0, 1)}
              </div>
            )}
            <span className="font-mono text-xs font-medium text-slate-400 group-hover:text-forest-200 transition-colors duration-300 whitespace-nowrap">
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
    <section id="tech-stack" className="py-20 border-t border-navy-900 overflow-hidden bg-navy-950">
      <div className="section-container border-b border-navy-900/50 pb-12 mb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center"
        >
          <p className="mb-2 font-mono text-xs tracking-widest text-forest-200 uppercase">
            — Alat & Teknologi —
          </p>
          <h2 className="text-2xl font-bold text-slate-200">Tech Stack</h2>
          <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Teknologi dan framework yang sering saya gunakan untuk membangun aplikasi yang skalabel, aman, dan berkinerja tinggi.
          </p>
        </motion.div>
      </div>

      {/* 3 Marquee Rows */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex flex-col gap-4"
      >
        {/* Row 1 — kiri, cepat */}
        <MarqueeRow items={r1} direction="left" speed={25} />
        {/* Row 2 — kanan, sedang */}
        <MarqueeRow items={r2} direction="right" speed={35} />
        {/* Row 3 — kiri, lambat */}
        <MarqueeRow items={r3} direction="left" speed={30} />
      </motion.div>
    </section>
  );
}
