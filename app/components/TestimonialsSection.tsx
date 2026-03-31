"use client";

import { motion } from "framer-motion";
import { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Testimonial } from "@/lib/supabase";

type Props = {
  testimonials: Testimonial[];
};

export default function TestimonialsSection({ testimonials }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", skipSnaps: false },
    [Autoplay({ delay: 5000, stopOnInteraction: true })]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <section id="testimonials" className="relative py-24 border-t border-navy-900 overflow-hidden">
      
      {/* ── Background Depth Orb ── */}
      <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 -z-10 flex">
        <div className="h-[500px] w-[500px] rounded-[100%] bg-forest-700/5 blur-[120px] -translate-x-1/2" />
      </div>

      {/* ── Symmetrical connecting bridge (Bottom Left - Vertical Bar) ── */}
      <div className="pointer-events-none absolute bottom-0 left-20 z-0 flex">
        <div className="relative h-48 w-24">
          {/* Inner Accent Line */}
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            whileInView={{ opacity: 0.4, scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.3, ease: "circOut" }}
            className="absolute left-1/2 bottom-0 h-full w-px -translate-x-1/2 bg-linear-to-t from-forest-200/40 to-transparent"
          />
          {/* Outer Border (Rounded only at top to meet the next section flat) */}
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            whileInView={{ opacity: 1, scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "circOut" }}
            className="h-full w-full rounded-t-full border-t border-l border-r border-forest-700/20"
          />
          {/* Floating dot */}
          <motion.div
            animate={{ y: [0, -40, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute left-1/2 top-4 h-2 w-2 -translate-x-1/2 rounded-full bg-forest-200/30 blur-[2px]"
          />
        </div>
      </div>

      <div className="section-container relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-14 flex items-end justify-between gap-4"
        >
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-forest-200/70">
              — KATA MEREKA
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 leading-tight">
              Testimoni <span className="text-forest-200">Klien</span>
            </h2>
          </div>

          {/* Navigasi Desktop (sembunyi di mobile, pakai yang bawah) */}
          {testimonials.length > 0 && (
            <div className="hidden sm:flex gap-3">
              <button
                onClick={scrollPrev}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm text-slate-400 transition-all duration-300 hover:border-forest-700/50 hover:bg-forest-700/10 hover:text-forest-200 hover:scale-110 active:scale-95 shadow-sm"
              >
                ←
              </button>
              <button
                onClick={scrollNext}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm text-slate-400 transition-all duration-300 hover:border-forest-700/50 hover:bg-forest-700/10 hover:text-forest-200 hover:scale-110 active:scale-95 shadow-sm"
              >
                →
              </button>
            </div>
          )}
        </motion.div>

        {testimonials.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm px-6 py-12 text-center text-sm font-mono text-slate-500"
          >
            Testimoni akan segera ditambahkan.
          </motion.div>
        ) : (
          <div>
            <div className="overflow-hidden cursor-grab active:cursor-grabbing -mx-4 px-4 sm:mx-0 sm:px-0 pb-6 pt-2" ref={emblaRef}>
              <div className="flex -ml-4 sm:-ml-6 backface-hidden touch-pan-y">
                {testimonials.map((item, i) => (
                  <div
                    key={item.id}
                    className="min-w-0 flex-none w-[85vw] sm:w-[420px] pl-4 sm:pl-6 relative"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                      className="group flex h-full flex-col gap-6 rounded-2xl border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm p-7 sm:p-8 transition-all duration-500 hover:border-forest-700/50 hover:shadow-[0_8px_30px_-12px_rgba(149,213,178,0.2)] hover:-translate-y-1 relative overflow-hidden"
                    >
                      {/* Quote mark (Aksen memudar yang bereaksi saat hover) */}
                      <span className="absolute -top-2 right-4 text-8xl leading-none text-navy-800/30 group-hover:text-forest-700/10 transition-colors duration-500 font-serif select-none pointer-events-none">
                        &ldquo;
                      </span>

                      <div className="flex-1 relative z-10 pt-2">
                        <p className="text-[15px] sm:text-[16px] text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors duration-300 italic">
                          "{item.content}"
                        </p>
                      </div>

                      {/* Author */}
                      <div className="mt-4 flex items-center gap-4 relative z-10 border-t border-navy-800/50 pt-6">
                        {item.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.avatar_url}
                            alt={item.name}
                            className="h-12 w-12 shrink-0 rounded-full object-cover border-2 border-navy-800 group-hover:border-forest-700/50 transition-colors duration-300"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-900 border-2 border-navy-800 text-forest-200 text-lg font-bold group-hover:border-forest-700/50 group-hover:shadow-[0_0_15px_rgba(149,213,178,0.2)] transition-all duration-300">
                            {item.name[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-[15px] font-bold text-slate-200 group-hover:text-forest-200 transition-colors duration-300">
                            {item.name}
                          </p>
                          <p className="text-[11px] font-mono mt-0.5 text-forest-200/70 uppercase tracking-widest">{item.role}</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigasi Mobile */}
            <div className="mt-2 flex justify-center gap-4 sm:hidden">
              <button
                onClick={scrollPrev}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm text-slate-400 transition-all duration-300 hover:border-forest-700/50 hover:bg-forest-700/10 hover:text-forest-200 active:scale-95 shadow-sm"
              >
                ←
              </button>
              <button
                onClick={scrollNext}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm text-slate-400 transition-all duration-300 hover:border-forest-700/50 hover:bg-forest-700/10 hover:text-forest-200 active:scale-95 shadow-sm"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
