"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Project } from "@/lib/supabase";

type Props = {
  projects: Project[];
};

function TechBadge({ tech }: { tech: string }) {
  return (
    <span className="rounded-md bg-forest-700/10 border border-forest-700/20 px-2.5 py-1 font-mono text-[10px] sm:text-[11px] font-medium text-forest-200/80 transition-colors group-hover:bg-forest-700/20 group-hover:text-forest-200 group-hover:border-forest-700/30">
      {tech}
    </span>
  );
}

export function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
      className="group relative flex flex-col rounded-2xl border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:border-forest-700/50 hover:shadow-[0_8px_30px_-12px_rgba(149,213,178,0.25)] hover:-translate-y-1.5"
    >
      {/* Image placeholder / thumbnail */}
      <Link
        href={`/projects/${project.slug}`}
        className="relative w-full overflow-hidden bg-navy-950/80 h-56 block border-b border-navy-800/50"
      >
        {project.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.image_url}
            alt={project.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1e3a4a" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
        )}

        {/* Gradient overlay: Blends white backgrounds smoothly into the dark card */}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/10 to-transparent opacity-80 group-hover:opacity-40 transition-opacity duration-500" />

        {project.is_featured && (
          <div className="absolute top-4 left-4 z-10">
            <span className="rounded-full bg-forest-200/90 backdrop-blur-md px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-navy-950 shadow-lg">
              Featured
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <Link href={`/projects/${project.slug}`}>
            <h3 className="mb-2 text-lg font-semibold text-slate-200 group-hover:text-forest-200 transition-colors duration-300">
              {project.title}
            </h3>
          </Link>
          <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed line-clamp-2">
            {project.description}
          </p>
        </div>

        {/* Tech stack */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {project.tech_stack.slice(0, 4).map((tech) => (
            <TechBadge key={tech} tech={tech} />
          ))}
          {project.tech_stack.length > 4 && (
            <TechBadge tech={`+${project.tech_stack.length - 4}`} />
          )}
        </div>

        {/* Links */}
        <div className="mt-auto flex items-center gap-3 pt-5 border-t border-navy-800/60">
          <Link
            href={`/projects/${project.slug}`}
            id={`link-detail-${project.slug}`}
            className="group/btn inline-flex items-center gap-2 rounded-full bg-forest-700/10 px-4 py-1.5 text-xs font-semibold text-forest-200 transition-all duration-300 hover:bg-forest-700 hover:text-white"
          >
            Case study
            <span className="transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
          </Link>
          {project.link_website && (
            <a
              href={project.link_website}
              target="_blank"
              rel="noopener noreferrer"
              id={`link-live-${project.slug}`}
              className="text-xs font-mono text-slate-500 hover:text-forest-200 transition-colors ml-auto"
            >
              Live ↗
            </a>
          )}
          {project.link_github && (
            <a
              href={project.link_github}
              target="_blank"
              rel="noopener noreferrer"
              id={`link-repo-${project.slug}`}
              className="text-xs font-mono text-slate-500 hover:text-forest-200 transition-colors"
            >
              Repo ↗
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ProjectsSection({ projects }: Props) {
  const displayProjects = projects.slice(0, 6);

  return (
    <section id="projects" className="relative py-24 border-t border-navy-900 overflow-hidden">

      {/* ── Symmetrical connecting bridge (Top Half) ── */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* Main glow crossing from About */}
        <div className="absolute -top-[175px] -right-[70px] h-[350px] w-[350px] rounded-full bg-forest-700/10 blur-3xl" />
        
        {/* Ring bridge crossing from About */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="absolute -top-[175px] -right-[70px] h-[350px] w-[350px] rounded-full border border-forest-700/30"
        />
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute -top-[105px] -right-[30px] h-[210px] w-[210px] rounded-full border border-forest-200/10"
        />
        {/* Matching tiny filled dot accent opposite to About */}
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="absolute top-[15px] right-[170px] h-1.5 w-1.5 rounded-full bg-forest-700/60"
        />
      </div>

      <div className="section-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-14 flex items-end justify-between"
        >
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-forest-200/70">
              — PORTOFOLIO
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 leading-tight">
              Project{" "}
              <span className="text-forest-200">Pilihan</span>
            </h2>
          </div>
          <Link
            href="/projects"
            className="group flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-forest-200 transition-colors"
          >
            Lihat Semua <span className="transform transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </motion.div>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-navy-800 bg-navy-900 p-12 text-center">
            <p className="text-slate-500 font-mono text-sm">
              Project akan segera ditambahkan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {displayProjects.map((project, idx) => (
              <ProjectCard key={project.id} project={project} index={idx} />
            ))}
          </div>
        )}

        {projects.length > 6 && (
          <div className="mt-12 flex justify-center">
            <Link
              href="/projects"
              className="rounded-full border border-forest-700/50 bg-forest-700/10 px-8 py-3 text-sm font-medium text-forest-200 hover:bg-forest-700 hover:text-white transition-all shadow-[0_0_15px_rgba(149,213,178,0.1)]"
            >
              Lihat Semua Project
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
