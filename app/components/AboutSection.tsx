"use client";

import { motion } from "framer-motion";
import { Profile } from "@/lib/supabase";
import Image from "next/image";

type Props = {
  profile?: Profile | null;
};

export default function AboutSection({ profile }: Props) {
  if (!profile?.about_text && !profile?.photo_url) return null;

  return (
    <section id="about" className="py-24 border-t border-navy-900 bg-navy-950/50">
      <div className="section-container">
        <div className="flex flex-col md:flex-row gap-12 lg:gap-20 items-center">
          
          {/* Foto Profil (kalau ada) */}
          {profile.photo_url && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="w-48 h-48 md:w-64 md:h-64 shrink-0 relative rounded-2xl overflow-hidden border border-navy-800 shadow-2xl"
              style={{ boxShadow: "0 0 40px rgba(149,213,178,0.05)" }}
            >
              <Image 
                src={profile.photo_url} 
                alt={profile.name ?? "Profile"} 
                fill 
                className="object-cover transition-transform duration-500 hover:scale-110 grayscale hover:grayscale-0"
                sizes="(max-width: 768px) 192px, 256px"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none"></div>
            </motion.div>
          )}

          {/* Teks "About Me" */}
          {profile.about_text && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-slate-200 mb-6 flex items-center gap-3">
                <span className="text-forest-200 text-lg">✦</span> Tentang Saya
              </h2>
              <div className="space-y-4 text-slate-400 leading-relaxed text-[15px]">
                {profile.about_text.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </section>
  );
}
