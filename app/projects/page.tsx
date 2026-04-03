import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ProjectCard } from "@/app/components/ProjectsSection";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ScrollToTop from "@/app/components/ScrollToTop";
import Link from "next/link";
import type { Project } from "@/lib/supabase";

export const revalidate = 3600;

export default async function AllProjectsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true });

  const projectList = (projects ?? []) as Project[];
  const totalProjects = projectList.length;
  const featuredProjects = projectList.filter((project) => project.is_featured).length;
  const uniqueTechnologies = new Set(projectList.flatMap((project) => project.tech_stack ?? [])).size;

  return (
    <>
      <Navbar />
      <div className="relative min-h-screen overflow-x-hidden bg-navy-950 pb-24 pt-32 font-sans text-slate-200 selection:bg-forest-500/30 selection:text-forest-200">

        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <svg
            className="absolute -right-24 -top-24 opacity-[0.04] text-forest-300"
            width="560"
            height="560"
            viewBox="0 0 560 560"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="280" cy="280" r="278" stroke="currentColor" strokeWidth="1" />
            <circle cx="280" cy="280" r="212" stroke="currentColor" strokeWidth="0.8" />
            <circle cx="280" cy="280" r="146" stroke="currentColor" strokeWidth="0.8" />
            <circle cx="280" cy="280" r="6" fill="currentColor" />
            <line x1="0" y1="280" x2="560" y2="280" stroke="currentColor" strokeWidth="0.5" />
            <line x1="280" y1="0" x2="280" y2="560" stroke="currentColor" strokeWidth="0.5" />
          </svg>

          <svg
            className="absolute -bottom-24 -left-10 opacity-[0.035] text-forest-300"
            width="220"
            height="480"
            viewBox="0 0 220 480"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="2" y="2" width="216" height="476" rx="108" stroke="currentColor" strokeWidth="1" />
            <rect x="32" y="30" width="156" height="420" rx="78" stroke="currentColor" strokeWidth="0.8" />
            <line x1="110" y1="0" x2="110" y2="480" stroke="currentColor" strokeWidth="0.4" />
            <line x1="0" y1="240" x2="220" y2="240" stroke="currentColor" strokeWidth="0.4" />
            <circle cx="110" cy="28" r="3" fill="currentColor" opacity="0.7" />
          </svg>

          <div className="absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,rgba(149,213,178,0.08),transparent_55%)]" />
        </div>

        <main className="relative mx-auto max-w-7xl px-6">
          <header className="mb-12 md:mb-14">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-forest-200/70">
              Arsip Portfolio
            </p>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-200 md:text-5xl">
              Semua Project
            </h1>
            <p className="text-lg text-slate-400">
              Arsip portfolio seluruh project sistem dan website yang pernah saya bangun.
            </p>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-navy-800/70 bg-navy-900/60 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Project</p>
                <p className="mt-1 text-xl font-semibold text-slate-100">{totalProjects}</p>
              </div>
              <div className="rounded-xl border border-navy-800/70 bg-navy-900/60 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Featured</p>
                <p className="mt-1 text-xl font-semibold text-slate-100">{featuredProjects}</p>
              </div>
              <div className="rounded-xl border border-navy-800/70 bg-navy-900/60 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tech Stack</p>
                <p className="mt-1 text-xl font-semibold text-slate-100">{uniqueTechnologies}</p>
              </div>
            </div>
          </header>

          {totalProjects > 0 ? (
            <div className={totalProjects < 3 ? "mx-auto max-w-6xl" : ""}>
              <div className="mb-5 flex items-center justify-between rounded-xl border border-navy-800/70 bg-navy-900/50 px-4 py-3">
                <p className="text-xs font-medium text-slate-400">
                  Menampilkan <span className="font-semibold text-slate-200">{totalProjects}</span> project.
                </p>
                <Link
                  href="/#projects"
                  className="text-xs font-medium text-forest-300 transition-colors hover:text-forest-200"
                >
                  Kembali ke highlight →
                </Link>
              </div>

              <div className={`grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3 ${totalProjects < 3 ? "justify-items-center" : ""}`}>
                {projectList.map((project, index) => (
                  <div key={project.id} className={totalProjects < 3 ? "w-full max-w-105" : "w-full"}>
                    <ProjectCard project={project} index={index} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-navy-800 bg-navy-900/70 p-12 text-center backdrop-blur-sm">
              <p className="mb-4 font-mono text-sm text-slate-500">
                Belum ada project yang ditambahkan.
              </p>
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-forest-700/40 bg-forest-700/10 px-5 py-2 text-xs font-semibold text-forest-200 transition-colors hover:bg-forest-700 hover:text-white"
              >
                Kembali ke beranda
              </Link>
            </div>
          )}
        </main>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}
