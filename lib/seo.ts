export const SITE_NAME = "Arif Jagad";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://arifjagad.my.id";

export const SHORT_KEYWORDS = [
  "jasa website medan",
  "web developer medan",
  "fullstack developer",
  "next.js developer",
  "laravel developer",
  "portfolio developer",
  "jasa pembuatan website",
  "website bisnis lokal",
  "seo website",
  "landing page bisnis",
];

export const LONG_TAIL_KEYWORDS = [
  "jasa pembuatan website bisnis lokal di Medan",
  "fullstack developer Next.js dan Laravel di Medan",
  "jasa landing page untuk UMKM di Medan",
  "portfolio web developer Indonesia dengan studi kasus project",
  "jasa pembuatan demo website untuk promosi WhatsApp bisnis lokal",
  "developer website custom untuk klinik apotek dan barbershop di Medan",
  "jasa redesign website bisnis lokal agar lebih profesional",
  "pembuatan website cepat untuk owner usaha kecil menengah",
  "jasa web development dengan optimasi SEO lokal Medan",
  "solusi website company profile dan katalog produk UMKM",
];

export const GLOBAL_KEYWORDS = [...SHORT_KEYWORDS, ...LONG_TAIL_KEYWORDS, "arif jagad"];

export function absoluteUrl(path: string = "/"): string {
  if (!path.startsWith("/")) return `${SITE_URL}/${path}`;
  return `${SITE_URL}${path}`;
}
