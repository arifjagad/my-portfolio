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
    <section id="testimonials" className="py-20 border-t border-navy-900 overflow-hidden relative">
      <div className="section-container relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-12 flex items-end justify-between gap-4"
        >
          <div>
            <p className="mb-2 font-mono text-xs tracking-widest text-forest-200">
              — KATA MEREKA
            </p>
            <h2 className="text-2xl font-bold text-slate-200">Testimoni</h2>
          </div>

          {/* Navigasi Desktop (sembunyi di mobile, pakai yang bawah) */}
          {testimonials.length > 0 && (
            <div className="hidden sm:flex gap-3">
              <button
                onClick={scrollPrev}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-navy-800 bg-navy-900 text-slate-400 transition-all hover:border-forest-700 hover:text-forest-200"
              >
                ←
              </button>
              <button
                onClick={scrollNext}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-navy-800 bg-navy-900 text-slate-400 transition-all hover:border-forest-700 hover:text-forest-200"
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
            className="rounded-xl border border-navy-800 bg-navy-900 px-6 py-10 text-center text-sm text-slate-500"
          >
            Testimoni akan segera ditambahkan.
          </motion.div>
        ) : (
          <div>
            <div className="overflow-hidden cursor-grab active:cursor-grabbing -mx-4 px-4 sm:mx-0 sm:px-0" ref={emblaRef}>
              <div className="flex -ml-4 sm:-ml-6 backface-hidden touch-pan-y">
                {testimonials.map((item, i) => (
                  <div
                    key={item.id}
                    className="min-w-0 flex-none w-[85vw] sm:w-[400px] pl-4 sm:pl-6 relative"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="flex h-full flex-col gap-4 rounded-xl border border-navy-800 bg-navy-900/50 p-6 sm:p-8 hover:border-forest-700 transition-all duration-300"
                    >
                      {/* Quote mark (Aksen) */}
                      <span className="absolute top-6 right-8 text-6xl leading-none text-navy-800/60 font-serif select-none pointer-events-none">
                        &ldquo;
                      </span>

                      <div className="flex-1 relative z-10">
                        <p className="text-[15px] text-slate-400 leading-relaxed">
                          {item.content}
                        </p>
                      </div>

                      {/* Author */}
                      <div className="mt-8 flex items-center gap-4 relative z-10">
                        {item.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.avatar_url}
                            alt={item.name}
                            className="h-12 w-12 shrink-0 rounded-full object-cover border border-navy-700"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-950 border border-navy-800 text-forest-200 text-lg font-semibold">
                            {item.name[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-slate-200">
                            {item.name}
                          </p>
                          <p className="text-xs font-mono mt-0.5 text-forest-500/80">{item.role}</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigasi Mobile */}
            <div className="mt-6 flex justify-center gap-4 sm:hidden">
              <button
                onClick={scrollPrev}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-navy-800 bg-navy-900 text-slate-400 hover:text-forest-200 active:scale-95"
              >
                ←
              </button>
              <button
                onClick={scrollNext}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-navy-800 bg-navy-900 text-slate-400 hover:text-forest-200 active:scale-95"
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
