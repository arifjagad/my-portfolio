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

async function getCategory(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("blog_categories")
    .select("id,name,slug,description,is_visible")
    .eq("slug", slug)
    .eq("is_visible", true)
    .single();

  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    return {
      title: "Kategori Tidak Ditemukan",
      robots: { index: false, follow: false },
    };
  }

  const title = `Kategori ${category.name} - Blog`;
  const description =
    category.description || `Kumpulan artikel kategori ${category.name} seputar SEO dan web development.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/blog/kategori/${category.slug}`),
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: absoluteUrl(`/blog/kategori/${category.slug}`),
    },
  };
}

export default async function BlogCategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id,slug,title,excerpt,published_at,created_at,reading_time_minutes")
    .eq("status", "published")
    .eq("robots_index", true)
    .eq("category_id", category.id)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const list = posts ?? [];

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
            <p className="mb-2 text-xs uppercase tracking-wider text-forest-300/80">Kategori</p>
            <h1 className="text-3xl font-bold text-slate-100 md:text-4xl">{category.name}</h1>
            <p className="mt-3 text-slate-400">{category.description || "Artikel pada kategori ini."}</p>
          </header>

          {list.length === 0 ? (
            <div className="rounded-xl border border-navy-800 bg-navy-900 p-8 text-sm text-slate-500">
              Belum ada artikel untuk kategori ini.
            </div>
          ) : (
            <div className="space-y-4">
              {list.map((post) => (
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
