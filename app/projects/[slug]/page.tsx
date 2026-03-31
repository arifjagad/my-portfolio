import { createSupabaseServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
};

// Fungsi helper untuk render text dengan baris baru (newline ke <br/>)
function renderText(text?: string | null) {
  if (!text) return null;
  return text.split('\n').map((line, i) => (
    <span key={i}>
      {line}
      <br />
    </span>
  ));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select("title, tagline, description, image_url")
    .eq("slug", slug)
    .single();

  if (!project) return {};

  return {
    title: `${project.title} — Portfolio`,
    description: project.tagline || project.description.substring(0, 150),
    openGraph: {
      title: project.title,
      description: project.tagline || project.description.substring(0, 150),
      type: "article",
      images: project.image_url ? [project.image_url] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description: project.tagline || project.description.substring(0, 150),
      images: project.image_url ? [project.image_url] : [],
    },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  
  // Karena ini public page, kita bisa pakai createSupabaseServerClient yang sudah kita buat
  const supabase = await createSupabaseServerClient();
  
  // Ambil project berdasarkan slug, relasikan dengan project_details
  const { data: project } = await supabase
    .from("projects")
    .select("*, project_details(*)")
    .eq("slug", slug)
    .single();

  if (!project) {
    notFound();
  }

  const details = project.project_details;

  return (
    <div className="min-h-screen bg-navy-950 text-slate-200 font-sans selection:bg-forest-500/30 selection:text-forest-200 pb-20">
      
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-navy-800 bg-navy-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <Link 
            href="/" 
            className="group flex w-fit items-center gap-2 text-sm font-medium text-slate-400 hover:text-forest-200 transition-colors"
          >
            <span className="transform transition-transform group-hover:-translate-x-1">←</span>
            Kembali ke Portfolio
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 pt-12">
        {/* Header Section */}
        <header className="mb-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-200 mb-4 tracking-tight">
                {project.title}
              </h1>
              <p className="text-lg md:text-xl text-slate-400 leading-relaxed">
                {project.tagline}
              </p>
            </div>
            
            {/* Links */}
            <div className="flex flex-wrap items-center gap-4">
              {project.link_website && (
                <a 
                  href={project.link_website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full bg-forest-700 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(149,213,178,0.2)] hover:bg-forest-500 transition-all border border-forest-600"
                >
                  Visit Website ↗
                </a>
              )}
              {project.link_github && (
                <a 
                  href={project.link_github} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-navy-700 bg-navy-900 px-6 py-2.5 text-sm font-medium text-slate-300 hover:border-forest-700 hover:text-forest-200 hover:bg-forest-700/10 transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                  Repository
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Cover Image */}
        {project.image_url && (
          <div className="relative mb-16 h-[300px] sm:h-[400px] md:h-[500px] w-full overflow-hidden rounded-2xl border border-navy-800 bg-navy-900 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={project.image_url} 
              alt={project.title}
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />
          </div>
        )}

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Content (Left Column) */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Description */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-slate-200 flex items-center gap-2">
                <span className="w-8 h-px bg-forest-700/50"></span>
                Tentang Project
              </h2>
              <div className="text-slate-400 leading-relaxed space-y-4">
                {renderText(project.description)}
              </div>
            </section>

            {/* Case Study */}
            {details && (
              <>
                {details.problem && (
                  <section>
                    <h2 className="text-2xl font-semibold mb-4 text-slate-200 flex items-center gap-2">
                      <span className="w-8 h-px bg-forest-700/50"></span>
                      Problem
                    </h2>
                    <div className="rounded-xl bg-navy-900/50 border border-navy-800 p-6 text-slate-400 leading-relaxed font-mono text-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-900/50"></div>
                      {renderText(details.problem)}
                    </div>
                  </section>
                )}

                {details.solution && (
                  <section>
                    <h2 className="text-2xl font-semibold mb-4 text-slate-200 flex items-center gap-2">
                      <span className="w-8 h-px bg-forest-700/50"></span>
                      Solution
                    </h2>
                    <div className="rounded-xl bg-navy-900/50 border border-navy-800 p-6 text-slate-400 leading-relaxed font-mono text-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-900/50"></div>
                      {renderText(details.solution)}
                    </div>
                  </section>
                )}

                {details.result && (
                  <section>
                    <h2 className="text-2xl font-semibold mb-4 text-slate-200 flex items-center gap-2">
                      <span className="w-8 h-px bg-forest-700/50"></span>
                      Result
                    </h2>
                    <div className="rounded-xl bg-navy-900/50 border border-navy-800 p-6 text-slate-400 leading-relaxed font-mono text-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-forest-700/50"></div>
                      {renderText(details.result)}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>

          {/* Sidebar (Right Column) */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Tech Stack */}
            {project.tech_stack && project.tech_stack.length > 0 && (
              <div className="rounded-xl border border-navy-800 bg-navy-900/50 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {project.tech_stack.map((tech: string) => (
                    <span 
                      key={tech}
                      className="rounded-lg bg-navy-950 px-3 py-1.5 text-xs font-medium text-forest-400 border border-navy-800/60"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Info */}
            <div className="rounded-xl border border-navy-800 bg-navy-900/50 p-6 space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">Informasi</h3>
              
              {details?.role && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Role</p>
                  <p className="text-sm font-medium text-slate-300">{details.role}</p>
                </div>
              )}
              
              {details?.duration && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Durasi</p>
                  <p className="text-sm font-medium text-slate-300">{details.duration}</p>
                </div>
              )}

              {/* Tampilkan kalau detailnya kosong dan tidak ada role/duration */}
              {!details?.role && !details?.duration && (
                <p className="text-sm text-slate-500 italic">Detail informasi tidak tersedia.</p>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
