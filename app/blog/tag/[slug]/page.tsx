import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ScrollToTop from "@/app/components/ScrollToTop";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
};

async function getTag(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("blog_tags")
    .select("id,name,slug")
    .eq("slug", slug)
    .single();

  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTag(slug);

  if (!tag) {
    return {
      title: "Tag Tidak Ditemukan",
      robots: { index: false, follow: false },
    };
  }

  const title = `Tag ${tag.name} - Blog`;
  const description = `Kumpulan artikel dengan topik ${tag.name}.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/blog/tag/${tag.slug}`),
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: absoluteUrl(`/blog/tag/${tag.slug}`),
    },
  };
}

export default async function BlogTagPage({ params }: Props) {
  const { slug } = await params;
  const tag = await getTag(slug);

  if (!tag) notFound();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("blog_post_tags")
    .select("blog_posts(id,slug,title,excerpt,published_at,created_at,reading_time_minutes,status,robots_index)")
    .eq("tag_id", tag.id);

  const posts = (data ?? [])
    .flatMap((item) => {
      const value = item.blog_posts as unknown;
      return Array.isArray(value) ? value : value ? [value] : [];
    })
    .filter((post: { status?: string; robots_index?: boolean }) => post.status === "published" && post.robots_index === true)
    .sort((a: { published_at?: string | null; created_at?: string }, b: { published_at?: string | null; created_at?: string }) => {
      const aDate = new Date(a.published_at || a.created_at || 0).getTime();
      const bDate = new Date(b.published_at || b.created_at || 0).getTime();
      return bDate - aDate;
    });

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-navy-950 pb-20 pt-28 text-slate-200">
        <main className="mx-auto max-w-5xl px-6">
          <Link href="/blog" className="mb-8 inline-flex items-center gap-2 text-sm text-forest-300 hover:text-forest-200">
            <span>←</span>
            Kembali ke blog
          </Link>

          <header className="mb-10">
            <p className="mb-2 text-xs uppercase tracking-wider text-forest-300/80">Tag</p>
            <h1 className="text-3xl font-bold text-slate-100 md:text-4xl">{tag.name}</h1>
            <p className="mt-3 text-slate-400">Artikel yang membahas topik {tag.name}.</p>
          </header>

          {posts.length === 0 ? (
            <div className="rounded-xl border border-navy-800 bg-navy-900 p-8 text-sm text-slate-500">
              Belum ada artikel dengan tag ini.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post: { id: string; slug: string; title: string; excerpt: string | null; published_at: string | null; created_at: string; reading_time_minutes: number }) => (
                <article key={post.id} className="rounded-xl border border-navy-800 bg-navy-900 p-5 hover:border-forest-700/50">
                  <h2 className="text-xl font-semibold text-slate-100">{post.title}</h2>
                  <p className="mt-2 text-sm text-slate-400">{post.excerpt || "Baca artikel lengkap untuk insight detail."}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <span>{new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(post.published_at || post.created_at))}</span>
                    <span>•</span>
                    <span>{post.reading_time_minutes || 1} min baca</span>
                  </div>
                  <Link href={`/blog/${post.slug}`} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-forest-300 hover:text-forest-200">
                    Baca artikel
                    <span>→</span>
                  </Link>
                </article>
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
