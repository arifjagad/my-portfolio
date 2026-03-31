import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase";
import { getGithubStats } from "@/lib/github";
import { Metadata } from "next";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import AboutSection from "./components/AboutSection";
import GithubStatsSection from "./components/GithubStatsSection";
import TechStackSection from "./components/TechStackSection";
import ProjectsSection from "./components/ProjectsSection";
import ExperienceSection from "./components/ExperienceSection";
import TestimonialsSection from "./components/TestimonialsSection";
import ContactSection from "./components/ContactSection";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import { Project, Experience, Testimonial, TechStack, Profile } from "@/lib/supabase";

// Revalidate halaman setiap 1 jam
export const revalidate = 3600;

const EMPTY_DATA = {
  githubStats: { publicRepos: 0, followers: 0, totalStars: 0, topLanguages: [] as string[] },
  projects: [] as Project[],
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

  return {
    githubStats,
    projects:
      projectsRes.status === "fulfilled"
        ? ((projectsRes.value.data ?? []) as Project[])
        : [],
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

  return {
    title: `${profile.name} — ${profile.role}`,
    description: profile.short_bio,
    openGraph: {
      title: `${profile.name} — ${profile.role}`,
      description: profile.short_bio,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${profile.name} — ${profile.role}`,
      description: profile.short_bio,
    },
  };
}

export default async function HomePage() {
  const { githubStats, projects, experiences, testimonials, techStacks, profile } = await getData();

  return (
    <>
      <Navbar />
      <main>
        <HeroSection profile={profile} />
        <AboutSection profile={profile} />
        <ProjectsSection projects={projects} />
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
