import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ProjectCard } from "@/app/components/ProjectsSection";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ScrollToTop from "@/app/components/ScrollToTop";

export const revalidate = 3600;

export default async function AllProjectsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-navy-950 text-slate-200 font-sans selection:bg-forest-500/30 selection:text-forest-200 pb-20 pt-32">
        <main className="mx-auto max-w-7xl px-6">
          <header className="mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-200 mb-4 tracking-tight">
              Semua Project
            </h1>
            <p className="text-lg text-slate-400">
              Arsip portfolio seluruh project sistem dan website yang pernah saya bangun.
            </p>
          </header>

          {projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-navy-800 bg-navy-900 p-12 text-center">
              <p className="text-slate-500 font-mono text-sm mb-4">
                Belum ada project yang ditambahkan.
              </p>
            </div>
          )}
        </main>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}
