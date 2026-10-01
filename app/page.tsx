import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase";
import { getServiceClient } from "@/lib/supabase-admin";
import { getGithubStats } from "@/lib/github";
import { Metadata } from "next";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import AboutSection from "./components/AboutSection";
import GithubStatsSection from "./components/GithubStatsSection";
import TechStackSection from "./components/TechStackSection";
import ProjectsSection from "./components/ProjectsSection";
import DemoShowcaseSection, { DemoShowcaseItem } from "./components/DemoShowcaseSection";
import ExperienceSection from "./components/ExperienceSection";
import TestimonialsSection from "./components/TestimonialsSection";
import ContactSection from "./components/ContactSection";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import { Project, Experience, Testimonial, TechStack, Profile } from "@/lib/supabase";
import {
  LONG_TAIL_KEYWORDS,
  SHORT_KEYWORDS,
  SITE_NAME,
  absoluteUrl,
} from "@/lib/seo";

// Revalidate halaman setiap 1 jam
export const revalidate = 3600;

const EMPTY_DATA = {
  githubStats: { publicRepos: 0, followers: 0, totalStars: 0, topLanguages: [] as string[] },
  projects: [] as Project[],
  demos: [] as DemoShowcaseItem[],
  experiences: [] as Experience[],
  testimonials: [] as Testimonial[],
  techStacks: [] as TechStack[],
  profile: null as Profile | null,
};

async function getData() {
  // Fetch GitHub stats selalu (tidak butuh Supabase)
  const githubStats = await getGithubStats();

  // Skip Supabase query jika belum dikonfigurasi
  if (!isSupabaseConfigured()) {
    return { ...EMPTY_DATA, githubStats };
  }

  const [projectsRes, experiencesRes, testimonialsRes, techStacksRes, profileRes] =
    await Promise.allSettled([
      supabaseServer
        .from("projects")
        .select("*, project_details(*)")
        .order("sort_order", { ascending: true }),
      supabaseServer
        .from("experiences")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabaseServer
        .from("testimonials")
        .select("*")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true }),
      supabaseServer
        .from("tech_stacks")
        .select("*")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true }),
      supabaseServer
        .from("profiles")
        .select("*")
        .eq("id", 1)
        .single(),
    ]);

  // Demo bisnis lokal: 8 demo prioritas pitch (bukan latest sembarang),
  // agar yang tampil di homepage adalah demo kurasi. Pakai service client
  // karena tabel demo_businesses tidak terbaca anon.
  const PITCH_SLUGS = [
    "restoran-ria",
    "saness-salon-spa",
    "vibes-barbershop-coffee-johor",
    "cosima-beauty-salon",
    "klinik-pratama-mitra-mikayla",
    "zap-clinic-pattimura-medan",
    "kodagu-restoran",
    "noura-aesthetic",
  ];
  let demos: DemoShowcaseItem[] = [];
  try {
    const { data } = await getServiceClient()
      .from("demo_businesses")
      .select("slug, nama_bisnis, kategori, rating, jumlah_ulasan")
      .in("slug", PITCH_SLUGS)
      .not("generated_at", "is", null)
      .eq("is_locked", false);
    const rows = (data ?? []) as DemoShowcaseItem[];
    // urutkan sesuai prioritas pitch
    demos = PITCH_SLUGS.flatMap((s) => rows.filter((r) => r.slug === s)).slice(0, 6);
  } catch {
    demos = [];
  }

  return {
    githubStats,
    projects:
      projectsRes.status === "fulfilled"
        ? ((projectsRes.value.data ?? []) as Project[])
        : [],
    demos,
    experiences:
      experiencesRes.status === "fulfilled"
        ? ((experiencesRes.value.data ?? []) as Experience[])
        : [],
    testimonials:
      testimonialsRes.status === "fulfilled"
        ? ((testimonialsRes.value.data ?? []) as Testimonial[])
        : [],
    techStacks:
      techStacksRes.status === "fulfilled"
        ? ((techStacksRes.value.data ?? []) as TechStack[])
        : [],
    profile:
      profileRes.status === "fulfilled"
        ? (profileRes.value.data as Profile)
        : null,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await getData();

  if (!profile) return {};

  const homeKeywords = [
    ...SHORT_KEYWORDS,
    ...LONG_TAIL_KEYWORDS,
    "web developer indonesia",
    "developer website umkm medan",
  ];

  const title = `${profile.name} - ${profile.role} | Jasa Website Medan`;
  const description =
    profile.short_bio ||
    "Portfolio Arif Jagad berisi studi kasus project web development, demo website bisnis lokal, dan layanan pembuatan website SEO-friendly di Medan.";

  return {
    title,
    description,
    keywords: homeKeywords,
    alternates: {
      canonical: absoluteUrl("/"),
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: absoluteUrl("/"),
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function HomePage() {
  const { githubStats, projects, demos, experiences, testimonials, techStacks, profile } = await getData();

  return (
    <>
      <Navbar />
      <main>
        <HeroSection profile={profile} />
        <AboutSection profile={profile} />
        <ProjectsSection projects={projects} />
        <DemoShowcaseSection demos={demos} />
        <ExperienceSection experiences={experiences} />
        <TechStackSection skills={techStacks} />
        <GithubStatsSection stats={githubStats} />
        <TestimonialsSection testimonials={testimonials} />
        <ContactSection />
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
