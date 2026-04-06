import { absoluteUrl } from "@/lib/seo";

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

  const urls = [
    { loc: absoluteUrl("/"), changefreq: "weekly", priority: "1.0" },
    { loc: absoluteUrl("/projects"), changefreq: "weekly", priority: "0.9" },
    { loc: absoluteUrl("/demos"), changefreq: "weekly", priority: "0.7" },
    { loc: absoluteUrl("/errors"), changefreq: "monthly", priority: "0.3" },
  ];

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
