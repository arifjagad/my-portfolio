import { createSupabaseServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
};

function renderText(text?: string | null) {
  if (!text) return null;
  return text.split("\n").map((line, i) => (
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
  const supabase = await createSupabaseServerClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*, project_details(*)")
    .eq("slug", slug)
    .single();

  if (!project) notFound();

  const details = project.project_details;

  return (
    <div className="relative min-h-screen bg-navy-950 text-slate-200 selection:bg-forest-500/30 selection:text-forest-200">

      {/* ===================== DECORATIVE BACKGROUND ===================== */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">

        {/* Concentric circles — top right */}
        <svg
          className="absolute -top-32 -right-32 opacity-[0.035] text-forest-300 blur-[1px]"
          width="700" height="700" viewBox="0 0 700 700" fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="350" cy="350" r="348" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="350" cy="350" r="270" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="350" cy="350" r="192" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="350" cy="350" r="114" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="350" cy="350" r="4" fill="currentColor" opacity="0.75" />
          <line x1="0" y1="350" x2="700" y2="350" stroke="currentColor" strokeWidth="0.4" opacity="0.45" />
          <line x1="350" y1="0" x2="350" y2="700" stroke="currentColor" strokeWidth="0.4" opacity="0.45" />
        </svg>

        {/* Capsule shape — bottom left */}
        <svg
          className="absolute -bottom-20 -left-16 opacity-[0.032] text-forest-300 blur-[1px]"
          width="220" height="480" viewBox="0 0 220 480" fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="2" y="2" width="216" height="476" rx="108" stroke="currentColor" strokeWidth="1.1" />
          <rect x="30" y="30" width="160" height="420" rx="80" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="110" cy="28" r="3" fill="currentColor" opacity="0.55" />
          <circle cx="110" cy="452" r="3" fill="currentColor" opacity="0.55" />
          <line x1="110" y1="0" x2="110" y2="480" stroke="currentColor" strokeWidth="0.4" opacity="0.7" />
          <line x1="0" y1="240" x2="220" y2="240" stroke="currentColor" strokeWidth="0.4" opacity="0.7" />
        </svg>

        {/* Scattered dots — mid left */}
        <svg
          className="absolute top-1/3 left-[10%] opacity-[0.15] text-forest-500"
          width="180" height="160" viewBox="0 0 180 160" fill="none"
        >
          <circle cx="10" cy="10" r="1.5" fill="currentColor" />
          <circle cx="50" cy="28" r="1" fill="currentColor" />
          <circle cx="90" cy="8" r="2" fill="currentColor" />
          <circle cx="130" cy="48" r="1" fill="currentColor" />
          <circle cx="168" cy="18" r="1.5" fill="currentColor" />
          <circle cx="28" cy="78" r="1" fill="currentColor" />
          <circle cx="78" cy="68" r="1.5" fill="currentColor" />
          <circle cx="148" cy="88" r="1" fill="currentColor" />
          <circle cx="58" cy="138" r="1" fill="currentColor" />
          <circle cx="110" cy="118" r="1.5" fill="currentColor" />
          <circle cx="158" cy="148" r="1" fill="currentColor" />
        </svg>

        {/* Subtle grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.025] text-slate-400">
          <defs>
            <pattern id="grid-bg" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-bg)" />
        </svg>

      </div>
      {/* ============================================================== */}

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-navy-800 bg-navy-950/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-sm font-medium text-slate-400 hover:text-forest-200 transition-colors"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-lg border border-navy-700 bg-navy-900 group-hover:border-forest-700/50 group-hover:bg-forest-700/10 transition-all">
              <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </span>
            Kembali ke Portfolio
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-forest-500 animate-pulse" />
            Case Study
          </div>
        </div>
      </nav>

      <main className="relative mx-auto max-w-6xl px-6 pt-14 pb-32">

        {/* ===== HERO HEADER ===== */}
        <header className="mb-16">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              {project.tech_stack?.[0] && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-forest-400 border border-forest-700/40 bg-forest-700/10 rounded-full px-3 py-1 mb-5">
                  <span className="w-1 h-1 rounded-full bg-forest-400" />
                  {project.tech_stack[0]}
                </div>
              )}
              <h1 className="text-4xl md:text-[3rem] font-bold text-slate-100 leading-[1.1] tracking-tight mb-5">
                {project.title}
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed">
                {project.tagline}
              </p>
            </div>

            <div className="flex flex-row md:flex-col items-start gap-3 shrink-0">
              {project.link_website && (
                <a
                  href={project.link_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-forest-700 border border-forest-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(149,213,178,0.12)] hover:bg-forest-500 hover:shadow-[0_0_36px_rgba(149,213,178,0.25)] transition-all duration-300"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Visit Website ↗
                </a>
              )}
              {project.link_github && (
                <a
                  href={project.link_github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-navy-700 bg-navy-900 px-5 py-2.5 text-sm font-medium text-slate-300 hover:border-forest-700/50 hover:text-forest-200 hover:bg-forest-700/10 transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  Repository
                </a>
              )}
            </div>
          </div>
          <div className="mt-10 h-px bg-gradient-to-r from-transparent via-navy-700 to-transparent" />
        </header>

        {/* ===== COVER IMAGE ===== */}
        {project.image_url && (
          <div className="relative mb-16 group">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-forest-700/20 via-transparent to-forest-700/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative h-[280px] sm:h-[380px] md:h-[480px] w-full overflow-hidden rounded-2xl border border-navy-800 bg-navy-900 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.image_url}
                alt={project.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-transparent" />
              {project.link_website && (
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                  <a
                    href={project.link_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-navy-950/90 backdrop-blur-sm border border-navy-700 text-slate-300 px-3 py-1.5 rounded-lg hover:text-forest-200 hover:border-forest-700/50 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-forest-400 animate-pulse" />
                    Live Preview
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== MAIN GRID ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12 xl:gap-16 items-start">

          {/* LEFT: MAIN CONTENT */}
          <div className="space-y-14 min-w-0">

            <section>
              <SectionHeading>Tentang Project</SectionHeading>
              <p className="text-slate-400 leading-relaxed text-[15px]">
                {renderText(project.description)}
              </p>
            </section>

            {details && (
              <section className="space-y-5">
                <SectionHeading>Case Study</SectionHeading>

                {details.problem && (
                  <CaseCard label="Problem" step="01" accent="red"
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
                  >{renderText(details.problem)}</CaseCard>
                )}

                {details.solution && (
                  <CaseCard label="Solution" step="02" accent="blue"
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
                  >{renderText(details.solution)}</CaseCard>
                )}

                {details.result && (
                  <CaseCard label="Result" step="03" accent="forest"
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  >{renderText(details.result)}</CaseCard>
                )}
              </section>
            )}

            {/* BOTTOM CTA */}
            <div className="relative overflow-hidden rounded-2xl border border-forest-700/25 bg-navy-900/60 p-8 md:p-10">
              {/* Decorative circles inside CTA */}
              <div className="pointer-events-none absolute -right-16 -top-16 opacity-[0.08]" aria-hidden="true">
                <svg width="220" height="220" viewBox="0 0 220 220" fill="none">
                  <circle cx="110" cy="110" r="108" stroke="#95d5b2" strokeWidth="1" />
                  <circle cx="110" cy="110" r="75" stroke="#95d5b2" strokeWidth="1" />
                  <circle cx="110" cy="110" r="42" stroke="#95d5b2" strokeWidth="1" />
                  <circle cx="110" cy="110" r="5" fill="#95d5b2" />
                  <line x1="2" y1="110" x2="218" y2="110" stroke="#95d5b2" strokeWidth="0.5" />
                  <line x1="110" y1="2" x2="110" y2="218" stroke="#95d5b2" strokeWidth="0.5" />
                </svg>
              </div>
              <div className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-transparent via-forest-600/50 to-transparent" />

              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-forest-400 mb-2">Punya project serupa?</p>
                  <h3 className="text-xl md:text-2xl font-bold text-slate-100 mb-2">Mari Diskusikan Ide Anda</h3>
                  <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                    Saya siap membantu membangun solusi digital yang tepat untuk bisnis Anda dari desain hingga deployment.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  <a
                    href="https://wa.me/6282167565321?text=Halo,%20saya%20tertarik%20dengan%20layanan%20web%20development%20Anda"
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-forest-700 border border-forest-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(149,213,178,0.15)] hover:bg-forest-500 hover:shadow-[0_0_28px_rgba(149,213,178,0.3)] transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.523 5.845L.044 23.483a.5.5 0 00.614.614l5.638-1.479A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a10 10 0 01-5.193-1.449l-.371-.22-3.847 1.009 1.009-3.847-.22-.371A10 10 0 1112 22z"/>
                    </svg>
                    Chat via WhatsApp
                  </a>
                  <Link
                    href="/#kontak"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy-700 bg-navy-950 px-6 py-3 text-sm font-medium text-slate-400 hover:border-navy-600 hover:text-slate-200 transition-all"
                  >
                    Lihat Kontak Lain
                  </Link>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT: STICKY SIDEBAR */}
          <aside className="self-start space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">

            {/* Tech Stack */}
            {project.tech_stack && project.tech_stack.length > 0 && (
              <div className="rounded-2xl border border-navy-800 bg-navy-900/60 p-5 backdrop-blur-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Tech Stack</p>
                <div className="flex flex-wrap gap-2">
                  {project.tech_stack.map((tech: string) => (
                    <span key={tech} className="inline-flex items-center gap-1.5 rounded-lg bg-navy-950 border border-navy-800/80 px-3 py-1.5 text-xs font-medium text-forest-400">
                      <span className="w-1 h-1 rounded-full bg-forest-500 shrink-0" />
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Project Info */}
            <div className="rounded-2xl border border-navy-800 bg-navy-900/60 p-5 backdrop-blur-sm space-y-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Informasi</p>
              {details?.role && (
                <InfoRow
                  icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>}
                  label="Role" value={details.role}
                />
              )}
              {details?.duration && (
                <InfoRow
                  icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  label="Durasi" value={details.duration}
                />
              )}
              {!details?.role && !details?.duration && (
                <p className="text-xs text-slate-600 italic">Detail tidak tersedia.</p>
              )}
            </div>

            {/* Sidebar CTA */}
            <div className="relative overflow-hidden rounded-2xl border border-forest-700/30 bg-navy-900/60 p-5">
              {/* Mini decorative circles */}
              <div className="pointer-events-none absolute -right-8 -bottom-8 opacity-[0.09]" aria-hidden="true">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <circle cx="60" cy="60" r="58" stroke="#95d5b2" strokeWidth="1" />
                  <circle cx="60" cy="60" r="38" stroke="#95d5b2" strokeWidth="1" />
                  <circle cx="60" cy="60" r="4" fill="#95d5b2" />
                  <line x1="2" y1="60" x2="118" y2="60" stroke="#95d5b2" strokeWidth="0.5" />
                  <line x1="60" y1="2" x2="60" y2="118" stroke="#95d5b2" strokeWidth="0.5" />
                </svg>
              </div>

              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-forest-700/30 border border-forest-600/30 flex items-center justify-center">
                    <svg className="w-3 h-3 text-forest-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-forest-300">Tertarik bekerja sama?</p>
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Saya tersedia untuk project baru. Hubungi saya dan kita diskusikan kebutuhannya.
                </p>
                <a
                  href="https://wa.me/6282167565321?text=Halo,%20saya%20tertarik%20dengan%20layanan%20web%20development%20Anda"
                  target="_blank" rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest-700 border border-forest-600 py-2.5 text-xs font-semibold text-white hover:bg-forest-500 transition-colors shadow-[0_0_16px_rgba(149,213,178,0.12)]"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.523 5.845L.044 23.483a.5.5 0 00.614.614l5.638-1.479A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a10 10 0 01-5.193-1.449l-.371-.22-3.847 1.009 1.009-3.847-.22-.371A10 10 0 1112 22z"/>
                  </svg>
                  Chat WhatsApp
                </a>
              </div>
            </div>

            {/* Back link */}
            <Link
              href="/projects"
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-navy-800 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-300 hover:border-navy-700 transition-all"
            >
              ← Lihat Project Lainnya
            </Link>

          </aside>
        </div>
      </main>
    </div>
  );
}

// ==============================
// Sub-components
// ==============================

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-forest-400 to-forest-700/30" />
      <h2 className="text-lg font-bold text-slate-100 tracking-tight">{children}</h2>
    </div>
  );
}

type AccentColor = "red" | "blue" | "forest";

const accentStyles: Record<AccentColor, {
  border: string; bg: string; bar: string;
  iconBg: string; iconText: string; iconBorder: string; labelText: string;
}> = {
  red: {
    border: "border-red-900/40",
    bg: "bg-red-950/20",
    bar: "from-red-500/50 via-red-700/20 to-transparent",
    iconBg: "bg-red-500/10", iconText: "text-red-400", iconBorder: "border-red-500/20",
    labelText: "text-red-400",
  },
  blue: {
    border: "border-blue-900/40",
    bg: "bg-blue-950/20",
    bar: "from-blue-500/50 via-blue-700/20 to-transparent",
    iconBg: "bg-blue-500/10", iconText: "text-blue-400", iconBorder: "border-blue-500/20",
    labelText: "text-blue-400",
  },
  forest: {
    border: "border-forest-700/30",
    bg: "bg-forest-900/10",
    bar: "from-forest-500/50 via-forest-700/20 to-transparent",
    iconBg: "bg-forest-700/20", iconText: "text-forest-400", iconBorder: "border-forest-600/30",
    labelText: "text-forest-400",
  },
};

function CaseCard({
  label, step, accent, icon, children,
}: {
  label: string; step: string; accent: AccentColor;
  icon: React.ReactNode; children: React.ReactNode;
}) {
  const s = accentStyles[accent];
  return (
    <div className={`relative rounded-2xl border ${s.border} ${s.bg} p-6 overflow-hidden`}>
      <div className={`absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b ${s.bar}`} />
      <span className="absolute right-5 top-3 text-6xl font-black text-white/[0.03] select-none pointer-events-none leading-none">
        {step}
      </span>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`flex items-center justify-center w-7 h-7 rounded-lg border ${s.iconBg} ${s.iconBorder} ${s.iconText}`}>
          {icon}
        </div>
        <span className={`text-xs font-bold uppercase tracking-widest ${s.labelText}`}>{label}</span>
      </div>
      <div className="text-sm text-slate-400 leading-relaxed font-mono pl-1">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex items-center justify-center w-7 h-7 rounded-lg bg-navy-800 border border-navy-700/60 text-slate-400 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-200">{value}</p>
      </div>
    </div>
  );
}