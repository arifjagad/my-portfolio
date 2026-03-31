"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Project } from "@/lib/supabase";

type Props = {
  projects: Project[];
};

function TechBadge({ tech }: { tech: string }) {
  return (
    <span className="rounded bg-navy-950 border border-navy-800 px-2 py-0.5 font-mono text-xs text-slate-500">
      {tech}
    </span>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55 }}
      whileHover={{ y: -4 }}
      className={`group relative flex flex-col rounded-xl border border-navy-800 bg-navy-900 overflow-hidden transition-all duration-300 hover:border-forest-700`}
    >
      {/* Image placeholder / thumbnail */}
      <Link
        href={`/projects/${project.slug}`}
        className={`relative w-full overflow-hidden bg-navy-950 h-52 block`}
      >
        {project.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.image_url}
            alt={project.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1e3a4a"
              strokeWidth="1"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
        )}

        {project.is_featured && (
          <div className="absolute top-3 left-3">
            <span className="rounded bg-forest-200 px-2 py-0.5 font-mono text-xs font-semibold text-navy-950">
              Featured
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <Link href={`/projects/${project.slug}`}>
            <h3 className="mb-1 text-base font-semibold text-slate-200 group-hover:text-forest-200 transition-colors">
              {project.title}
            </h3>
          </Link>
          <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
            {project.description}
          </p>
        </div>

        {/* Tech stack */}
        <div className="flex flex-wrap gap-1.5">
          {project.tech_stack.slice(0, 4).map((tech) => (
            <TechBadge key={tech} tech={tech} />
          ))}
          {project.tech_stack.length > 4 && (
            <TechBadge tech={`+${project.tech_stack.length - 4}`} />
          )}
        </div>

        {/* Links */}
        <div className="mt-auto flex items-center gap-3 pt-4 border-t border-navy-800">
          <Link
            href={`/projects/${project.slug}`}
            id={`link-detail-${project.slug}`}
            className="group/link inline-flex items-center gap-1.5 rounded-full bg-forest-700/10 px-3 py-1.5 text-xs font-semibold text-forest-200 transition-all hover:bg-forest-700 hover:text-white"
          >
            Case study
            <span className="transition-transform group-hover/link:translate-x-0.5">→</span>
          </Link>
          {project.link_website && (
            <a
              href={project.link_website}
              target="_blank"
              rel="noopener noreferrer"
              id={`link-live-${project.slug}`}
              className="text-xs font-mono text-slate-500 hover:text-slate-200 transition-colors ml-auto"
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
              className="text-xs font-mono text-slate-500 hover:text-slate-200 transition-colors"
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
    <section id="projects" className="py-20 border-t border-navy-900">
      <div className="section-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-12 flex items-end justify-between"
        >
          <div>
            <p className="mb-2 font-mono text-xs tracking-widest text-forest-200">
              — PORTOFOLIO
            </p>
            <h2 className="text-2xl font-bold text-slate-200">Project</h2>
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
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
