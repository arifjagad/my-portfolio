import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ScrollToTop from "@/app/components/ScrollToTop";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { LONG_TAIL_KEYWORDS, SHORT_KEYWORDS, SITE_NAME, absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog SEO & Web Development",
  description:
    "Artikel SEO, web development, dan strategi website bisnis lokal dari Arif Jagad untuk membantu UMKM dan brand di Medan tumbuh lewat digital.",
  keywords: [
    ...SHORT_KEYWORDS,
    ...LONG_TAIL_KEYWORDS,
    "blog jasa website medan",
    "tips seo website bisnis lokal",
  ],
  alternates: {
    canonical: absoluteUrl("/blog"),
  },
  openGraph: {
    title: `Blog ${SITE_NAME} - SEO & Web Development`,
    description:
      "Kumpulan artikel SEO dan pengembangan website untuk bisnis lokal di Medan.",
    url: absoluteUrl("/blog"),
    type: "website",
  },
};

type BlogPostItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  focus_keyword: string | null;
  reading_time_minutes: number;
  published_at: string | null;
  created_at: string;
  blog_categories?: { name: string; slug: string }[] | null;
};

function formatDate(value: string | null, fallback: string) {
  const source = value || fallback;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(source));
}

export default async function BlogPage() {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("blog_posts")
    .select("id,slug,title,excerpt,featured_image_url,featured_image_alt,focus_keyword,reading_time_minutes,published_at,created_at,blog_categories(name,slug)")
    .eq("status", "published")
    .eq("robots_index", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const posts = (data ?? []) as unknown as BlogPostItem[];

  return (
    <>
      <Navbar />
      <div className="relative min-h-screen overflow-x-hidden bg-navy-950 pb-24 pt-32 font-sans text-slate-200 selection:bg-forest-500/30 selection:text-forest-200">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-forest-700/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-forest-700/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(100%_55%_at_50%_0%,rgba(149,213,178,0.08),transparent_60%)]" />
        </div>

        <main className="relative mx-auto max-w-6xl px-6">
          <header className="mb-12 md:mb-14">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-forest-200/70">Blog & Insight</p>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-200 md:text-5xl">Artikel SEO & Web Development</h1>
            <p className="text-lg text-slate-400">Strategi praktis untuk menaikkan performa website bisnis lokal, dari SEO sampai konversi lead.</p>
          </header>

          {posts.length === 0 ? (
            <div className="rounded-2xl border border-navy-800 bg-navy-900/70 p-12 text-center backdrop-blur-sm">
              <p className="mb-4 text-sm text-slate-500">Belum ada artikel yang dipublish.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {posts.map((post) => (
                // Supabase relation select returns array for related rows.
                // For this schema, category should have at most one row.
                // Keep first visible category as display label.
                (() => {
                  const category = Array.isArray(post.blog_categories)
                    ? post.blog_categories[0]
                    : undefined;

                  return (
                <article
                  key={post.id}
                  className="group overflow-hidden rounded-2xl border border-navy-800/70 bg-navy-900/40 transition-all duration-300 hover:-translate-y-1 hover:border-forest-700/60"
                >
                  <Link href={`/blog/${post.slug}`} className="block" aria-label={`Buka artikel ${post.title}`}>
                    {post.featured_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.featured_image_url}
                        alt={post.featured_image_alt || post.title}
                        className="h-52 w-full object-cover"
                      />
                    ) : (
                      <div className="h-52 w-full bg-gradient-to-br from-navy-900 via-navy-950 to-forest-900/20" />
                    )}
                  </Link>

                  <div className="p-5">
                    <div className="mb-3 flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{formatDate(post.published_at, post.created_at)}</span>
                      <span>•</span>
                      <span>{post.reading_time_minutes || 1} min baca</span>
                    </div>

                    {category?.name ? (
                      <Link
                        href={`/blog/kategori/${category.slug}`}
                        className="mb-3 inline-flex rounded-full border border-forest-700/40 bg-forest-700/10 px-2.5 py-1 text-[11px] font-medium text-forest-200 hover:bg-forest-700/20"
                      >
                        {category.name}
                      </Link>
                    ) : null}

                    <h2 className="line-clamp-2 text-xl font-semibold text-slate-100 transition-colors group-hover:text-forest-200">
                      <Link href={`/blog/${post.slug}`} className="hover:text-forest-200">
                        {post.title}
                      </Link>
                    </h2>

                    <p className="mt-3 line-clamp-3 text-sm text-slate-400">
                      {post.excerpt || "Baca insight lengkap artikel ini untuk strategi website dan SEO yang lebih efektif."}
                    </p>

                    <Link
                      href={`/blog/${post.slug}`}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-forest-300 transition-colors hover:text-forest-200"
                    >
                      Baca artikel
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                  </div>
                </article>
                  );
                })()
              ))}
            </div>
          )}
        </main>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}
