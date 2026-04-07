import { absoluteUrl } from "@/lib/seo";
import { createClient } from "@supabase/supabase-js";

const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const nowIso = new Date().toISOString();

  const staticUrls = [
    { loc: absoluteUrl("/"), changefreq: "weekly", priority: "1.0" },
    { loc: absoluteUrl("/projects"), changefreq: "weekly", priority: "0.9" },
    { loc: absoluteUrl("/demos"), changefreq: "weekly", priority: "0.7" },
  ];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  let dynamicUrls: Array<{ loc: string; changefreq: string; priority: string }> = [];

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes("xxxx")) {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [{ data: projects }, { data: demos }] = await Promise.all([
      supabase
        .from("projects")
        .select("slug, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("demo_businesses")
        .select("slug, generated_at")
        .not("generated_html", "is", null)
        .eq("is_locked", false)
        .order("generated_at", { ascending: false }),
    ]);

    const projectUrls = (projects ?? []).map((item) => ({
      loc: absoluteUrl(`/projects/${item.slug}`),
      changefreq: "monthly",
      priority: "0.8",
    }));

    const demoUrls = (demos ?? []).map((item) => ({
      loc: absoluteUrl(`/demo/${item.slug}`),
      changefreq: "weekly",
      priority: "0.6",
    }));

    dynamicUrls = [...projectUrls, ...demoUrls];
  }

  const urls = [...staticUrls, ...dynamicUrls];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ loc, changefreq, priority }) => `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(body, { headers: XML_HEADERS });
}
