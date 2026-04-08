import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ScrollToTop from "@/app/components/ScrollToTop";
import ReadingProgress from "../../components/ReadingProgress";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { LONG_TAIL_KEYWORDS, SHORT_KEYWORDS, SITE_NAME, absoluteUrl } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

type BlogPostDetail = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_html: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  focus_keyword: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  canonical_url: string | null;
  robots_index: boolean;
  robots_follow: boolean;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  reading_time_minutes: number;
  published_at: string | null;
  created_at: string;
  blog_categories?: { name: string; slug: string }[] | null;
  blog_post_tags?: { blog_tags: { name: string; slug: string }[] | null }[];
  blog_post_images?: { id: string; image_url: string; alt_text: string | null; caption: string | null }[];
};

function formatDate(value: string | null, fallback: string) {
  const source = value || fallback;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(source));
}

async function getPostBySlug(slug: string): Promise<BlogPostDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("blog_posts")
    .select("id,slug,title,excerpt,content_html,featured_image_url,featured_image_alt,focus_keyword,seo_title,seo_description,seo_keywords,canonical_url,robots_index,robots_follow,og_title,og_description,og_image_url,reading_time_minutes,published_at,created_at,blog_categories(name,slug),blog_post_tags(blog_tags(name,slug)),blog_post_images(id,image_url,alt_text,caption)")
    .eq("slug", slug)
    .eq("status", "published")
    .eq("robots_index", true)
    .single();

  return (data as unknown as BlogPostDetail | null) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Artikel Tidak Ditemukan",
      robots: { index: false, follow: false },
    };
  }

  const title = post.seo_title || post.og_title || `${post.title} | Blog ${SITE_NAME}`;
  const description = post.seo_description || post.og_description || post.excerpt || "Artikel SEO dan web development.";
  const canonical = post.canonical_url || absoluteUrl(`/blog/${post.slug}`);
  const image = post.og_image_url || post.featured_image_url || absoluteUrl("/opengraph-image.png");

  return {
    title,
    description,
    keywords: [
      ...SHORT_KEYWORDS,
      ...LONG_TAIL_KEYWORDS,
      ...(post.seo_keywords ?? []),
      ...(post.focus_keyword ? [post.focus_keyword] : []),
    ],
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: {
      index: post.robots_index,
      follow: post.robots_follow,
    },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const category = Array.isArray(post.blog_categories) ? post.blog_categories[0] : undefined;

  const tags = (post.blog_post_tags ?? [])
    .flatMap((item) => (Array.isArray(item.blog_tags) ? item.blog_tags : []))
    .filter((item): item is { name: string; slug: string } => Boolean(item));

  return (
    <>
      <Navbar />
      <ReadingProgress targetSelector="article.tiptap-output" />
      <div className="relative min-h-screen overflow-x-hidden bg-navy-950 pb-20 pt-28 text-slate-200">
        <main className="mx-auto max-w-4xl px-6">
          <Link href="/blog" className="mb-8 inline-flex items-center gap-2 text-sm text-forest-300 hover:text-forest-200">
            <span>←</span>
            Kembali ke blog
          </Link>

          <header className="mb-8">
            {category?.name ? (
              <Link
                href={`/blog/kategori/${category.slug}`}
                className="mb-3 inline-block text-xs uppercase tracking-[0.2em] text-forest-300/80 hover:text-forest-200"
              >
                {category.name}
              </Link>
            ) : (
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-forest-300/80">Blog</p>
            )}

            <h1 className="text-3xl font-bold leading-tight text-slate-100 md:text-4xl">{post.title}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{formatDate(post.published_at, post.created_at)}</span>
              <span>•</span>
              <span>{post.reading_time_minutes || 1} min baca</span>
              {post.focus_keyword ? (
                <>
                  <span>•</span>
                  <span className="text-forest-300">{post.focus_keyword}</span>
                </>
              ) : null}
            </div>
          </header>

          {post.featured_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.featured_image_url}
              alt={post.featured_image_alt || post.title}
              className="mb-8 h-auto w-full rounded-2xl border border-navy-800 object-cover"
            />
          ) : null}

          <article
            className="tiptap-output"
            dangerouslySetInnerHTML={{ __html: post.content_html || "<p>Konten belum tersedia.</p>" }}
          />

          {(post.blog_post_images?.length ?? 0) > 0 ? (
            <section className="mt-12">
              <h2 className="mb-4 text-xl font-semibold text-slate-100">Gallery</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {post.blog_post_images?.map((image) => (
                  <figure key={image.id} className="overflow-hidden rounded-xl border border-navy-800 bg-navy-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.image_url} alt={image.alt_text || post.title} className="h-56 w-full object-cover" />
                    {image.caption ? <figcaption className="px-3 py-2 text-xs text-slate-400">{image.caption}</figcaption> : null}
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          {tags.length > 0 ? (
            <section className="mt-10 border-t border-navy-800 pt-6">
              <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Tags</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag.slug}
                    href={`/blog/tag/${tag.slug}`}
                    className="rounded-full border border-forest-700/40 bg-forest-700/10 px-2.5 py-1 text-xs text-forest-200 hover:bg-forest-700/20"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}
