/**
 * lib/ai-generator.ts
 * Generate HTML demo page via Google Gemini API
 *
 * Strategi:
 * - Prompt struktural: scaffolding HTML diberikan, AI mengisi konten & style
 * - Negative prompt agresif untuk mencegah output generik
 * - Merge data mentah + enriched_data
 * - Retry otomatis 3x jika Gemini gagal
 * - Return HTML string siap pakai
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BusinessData {
  slug: string;
  nama_bisnis: string;
  kategori: string;
  rating: number | null;
  jumlah_ulasan: number;
  nomor_telepon: string | null;
  alamat: string | null;
  link_gmaps: string | null;
  enriched_data?: EnrichedData | null;
}

export interface EnrichedData {
  jam_buka?: string;
  deskripsi?: string;
  layanan?: string[];
  keunggulan?: string[];
  catatan_internal?: string;
}

// ─── Kategori config ──────────────────────────────────────────────────────────
interface KategoriConfig {
  vibe: string;
  warna: {
    primary: string;      // hex
    secondary: string;    // hex
    accent: string;       // hex
    bg: string;           // hex
    text: string;         // hex
    textMuted: string;    // hex
  };
  fontHeading: string;    // Google Fonts name
  fontBody: string;       // Google Fonts name
  heroTagline: string;    // inspirasi tagline
  komponen: string;
  cssTheme: string;       // dark | light
}

const KATEGORI_CONFIG: Record<string, KategoriConfig> = {
  "Salon Kecantikan": {
    vibe: "Luxury editorial beauty brand. Tone seperti Aesop, Chanel Beauty, atau Glossier versi premium. Sophisticated, tidak norak.",
    warna: {
      primary: "#1a1a1a",
      secondary: "#c9a87c",
      accent: "#e8d5b7",
      bg: "#faf8f5",
      text: "#1a1a1a",
      textMuted: "#6b6b6b",
    },
    fontHeading: "Cormorant+Garamond:wght@300;400;600",
    fontBody: "DM+Sans:wght@300;400;500",
    heroTagline: "Percayakan Kecantikanmu pada Ahlinya",
    komponen: "Navbar transparan, Hero fullscreen dengan headline serif besar + subtext, Section layanan dengan layout asimetris 2-kolom, Section keunggulan bento grid gelap, Section about dengan split layout foto+teks, Section kontak & jam buka, Footer minimalis, Floating WhatsApp button",
    cssTheme: "light",
  },
  "Barbershop": {
    vibe: "Dark luxury men's grooming. Seperti brand premium: Johnny's Chop Shop, Old Spice Premium. Maskulin, bold, berwibawa.",
    warna: {
      primary: "#0d0d0d",
      secondary: "#c8a951",
      accent: "#2a2a2a",
      bg: "#0d0d0d",
      text: "#f0ece4",
      textMuted: "#8a8478",
    },
    fontHeading: "Bebas+Neue",
    fontBody: "Inter:wght@300;400;500",
    heroTagline: "Tampil Tajam. Percaya Diri.",
    komponen: "Navbar dark, Hero fullscreen dark dengan headline display font raksasa, Section layanan + harga dengan grid horizontal scroll feel, Section tentang kami, Section galeri look (placeholder CSS shapes), Section jam buka + kontak, Footer dark, Floating WhatsApp",
    cssTheme: "dark",
  },
  "Tempat Cukur Rambut": {
    vibe: "Dark luxury men's grooming. Bold, maskulin, berwibawa.",
    warna: {
      primary: "#0d0d0d",
      secondary: "#c8a951",
      accent: "#2a2a2a",
      bg: "#0d0d0d",
      text: "#f0ece4",
      textMuted: "#8a8478",
    },
    fontHeading: "Bebas+Neue",
    fontBody: "Inter:wght@300;400;500",
    heroTagline: "Tampil Tajam. Percaya Diri.",
    komponen: "Navbar dark, Hero fullscreen dark dengan headline besar, Section layanan + harga, Section jam buka + kontak, Footer dark, Floating WhatsApp",
    cssTheme: "dark",
  },
  "Apotek": {
    vibe: "Clean modern healthcare. Terpercaya, steril, profesional. Seperti halodoc/kimia farma tapi lebih boutique.",
    warna: {
      primary: "#0a4f3c",
      secondary: "#10b981",
      accent: "#d1fae5",
      bg: "#f8fffe",
      text: "#0a2818",
      textMuted: "#4b7a63",
    },
    fontHeading: "Plus+Jakarta+Sans:wght@600;700;800",
    fontBody: "Plus+Jakarta+Sans:wght@300;400;500",
    heroTagline: "Kesehatan Anda, Prioritas Kami",
    komponen: "Navbar putih bersih, Hero dengan badge 'Terpercaya' + headline bold, Section layanan unggulan card flat, Section info 24 jam highlight, Section lokasi + kontak, Footer, Floating WhatsApp",
    cssTheme: "light",
  },
  "Kafe": {
    vibe: "Warm artisan coffee culture. Seperti brand specialty coffee: Anomali, Kopi Kenangan Premium, atau Blue Bottle. Cozy tapi stylish.",
    warna: {
      primary: "#2c1810",
      secondary: "#c8864a",
      accent: "#f5e6d3",
      bg: "#fdf6ee",
      text: "#2c1810",
      textMuted: "#7a5c42",
    },
    fontHeading: "Playfair+Display:wght@400;600;700",
    fontBody: "Lato:wght@300;400;700",
    heroTagline: "Temukan Momen Terbaikmu di Sini",
    komponen: "Navbar transparan cream, Hero fullscreen dengan tagline serif, Menu highlight section horizontal scroll, Section suasana (aesthetic placeholder CSS), Jam buka + maps, Footer warm, Floating WhatsApp",
    cssTheme: "light",
  },
  "Restoran": {
    vibe: "Fine dining feel untuk restoran lokal. Hangat, mengundang, membuat lapar.",
    warna: {
      primary: "#1c0a00",
      secondary: "#d4622a",
      accent: "#f5d5b5",
      bg: "#fffbf7",
      text: "#1c0a00",
      textMuted: "#7a4a2a",
    },
    fontHeading: "Playfair+Display:wght@400;600;700",
    fontBody: "Source+Sans+3:wght@300;400;600",
    heroTagline: "Cita Rasa yang Tak Terlupakan",
    komponen: "Navbar, Hero penuh dengan tagline, Menu highlight, Jam buka, Reservasi WhatsApp CTA, Lokasi, Footer",
    cssTheme: "light",
  },
  "Rumah Makan": {
    vibe: "Fine dining feel untuk rumah makan lokal. Hangat dan mengundang.",
    warna: {
      primary: "#1c0a00",
      secondary: "#d4622a",
      accent: "#f5d5b5",
      bg: "#fffbf7",
      text: "#1c0a00",
      textMuted: "#7a4a2a",
    },
    fontHeading: "Playfair+Display:wght@400;600;700",
    fontBody: "Source+Sans+3:wght@300;400;600",
    heroTagline: "Cita Rasa yang Tak Terlupakan",
    komponen: "Navbar, Hero, Menu highlight, Jam buka, CTA WhatsApp, Lokasi, Footer",
    cssTheme: "light",
  },
  "Bengkel Sepeda Motor": {
    vibe: "Industrial bold. Otomotif premium. Seperti brand Castrol atau Yamaha Genuine Service. Terpercaya, maskulin, tegas.",
    warna: {
      primary: "#111111",
      secondary: "#f97316",
      accent: "#1f1f1f",
      bg: "#111111",
      text: "#f5f5f5",
      textMuted: "#9ca3af",
    },
    fontHeading: "Barlow+Condensed:wght@600;700;800",
    fontBody: "Barlow:wght@300;400;500",
    heroTagline: "Motor Sehat, Perjalanan Aman",
    komponen: "Navbar dark, Hero dark bold, Layanan + estimasi harga, Keunggulan, Jam buka + kontak, Footer dark, Floating WhatsApp",
    cssTheme: "dark",
  },
  "Bengkel": {
    vibe: "Industrial bold, otomotif premium. Terpercaya dan tegas.",
    warna: {
      primary: "#111111",
      secondary: "#f97316",
      accent: "#1f1f1f",
      bg: "#111111",
      text: "#f5f5f5",
      textMuted: "#9ca3af",
    },
    fontHeading: "Barlow+Condensed:wght@600;700;800",
    fontBody: "Barlow:wght@300;400;500",
    heroTagline: "Servis Terpercaya untuk Kendaraan Anda",
    komponen: "Navbar dark, Hero dark bold, Layanan + harga, Jam buka + kontak, Footer dark, Floating WhatsApp",
    cssTheme: "dark",
  },
  "Klinik Medis": {
    vibe: "Premium boutique clinic. Profesional tapi tidak dingin. Seperti klinik premium di Singapura atau Jakarta Selatan.",
    warna: {
      primary: "#0f3460",
      secondary: "#16a9c8",
      accent: "#e0f7fa",
      bg: "#f8fbff",
      text: "#0a1628",
      textMuted: "#4a6fa5",
    },
    fontHeading: "Nunito+Sans:wght@600;700;800",
    fontBody: "Nunito+Sans:wght@300;400;600",
    heroTagline: "Kesehatan Premium, Pelayanan Tulus",
    komponen: "Navbar putih, Hero profesional dengan trust badges, Layanan / dokter cards, Jadwal praktek, Cara daftar, Lokasi + kontak, Footer, Floating WhatsApp",
    cssTheme: "light",
  },
  "Klinik": {
    vibe: "Premium boutique clinic. Profesional tapi tidak dingin.",
    warna: {
      primary: "#0f3460",
      secondary: "#16a9c8",
      accent: "#e0f7fa",
      bg: "#f8fbff",
      text: "#0a1628",
      textMuted: "#4a6fa5",
    },
    fontHeading: "Nunito+Sans:wght@600;700;800",
    fontBody: "Nunito+Sans:wght@300;400;600",
    heroTagline: "Kesehatan Premium, Pelayanan Tulus",
    komponen: "Navbar putih, Hero profesional, Layanan, Jadwal, Lokasi + kontak, Footer, Floating WhatsApp",
    cssTheme: "light",
  },
  "Toko Optik": {
    vibe: "Modern precision eyewear. Seperti brand Warby Parker atau Optical88. Clean, presisi, premium.",
    warna: {
      primary: "#0a1628",
      secondary: "#3b82f6",
      accent: "#dbeafe",
      bg: "#f8faff",
      text: "#0a1628",
      textMuted: "#4a5568",
    },
    fontHeading: "DM+Serif+Display",
    fontBody: "DM+Sans:wght@300;400;500",
    heroTagline: "Pandangan Lebih Jernih, Gaya Lebih Percaya Diri",
    komponen: "Navbar, Hero clean, Produk unggulan, Layanan cek mata, Booking appointment, Kontak, Footer, Floating WhatsApp",
    cssTheme: "light",
  },
  "Hotel": {
    vibe: "Boutique luxury hotel. Seperti design hotel bintang 4-5 di Bali atau Singapura. Elegan, eksklusif, mengundang.",
    warna: {
      primary: "#1a1208",
      secondary: "#b8954a",
      accent: "#f5edd8",
      bg: "#faf8f3",
      text: "#1a1208",
      textMuted: "#6b5a3a",
    },
    fontHeading: "Cormorant+Garamond:wght@300;400;600",
    fontBody: "Jost:wght@300;400;500",
    heroTagline: "Ketenangan dan Kemewahan dalam Setiap Momen",
    komponen: "Navbar transparan, Hero fullscreen, Tipe kamar + fasilitas, Keunggulan hotel, Booking WhatsApp CTA, Lokasi, Footer, Floating WhatsApp",
    cssTheme: "light",
  },
};

const DEFAULT_CONFIG: KategoriConfig = {
  vibe: "Modern professional business. Clean, terpercaya, dan elegan.",
  warna: {
    primary: "#0f172a",
    secondary: "#3b82f6",
    accent: "#dbeafe",
    bg: "#f8faff",
    text: "#0f172a",
    textMuted: "#64748b",
  },
  fontHeading: "Plus+Jakarta+Sans:wght@600;700;800",
  fontBody: "Plus+Jakarta+Sans:wght@300;400;500",
  heroTagline: "Solusi Terbaik untuk Kebutuhan Anda",
  komponen: "Navbar, Hero, Layanan/Produk, Keunggulan, Jam buka + kontak, Footer, Floating WhatsApp",
  cssTheme: "light",
};

// ─── Phone number cleaner ─────────────────────────────────────────────────────
function cleanPhone(phone: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "").replace(/^0/, "62");
}

interface ImageCandidate {
  url: string;
  alt: string;
  credit: string;
}

const UNSPLASH_DIRECT_FALLBACKS: string[] = [
  "https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=1584&auto=format&fit=crop&ixlib=rb-4.1.0",
  "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=1600&auto=format&fit=crop&ixlib=rb-4.1.0",
];

const IMAGE_KEYWORDS_EN: Record<string, string[]> = {
  "Salon Kecantikan": ["hair salon interior", "beauty salon stylist", "hair styling salon"],
  "Barbershop": ["barbershop interior", "barber cutting hair", "mens grooming barber"],
  "Tempat Cukur Rambut": ["barber shop haircut", "haircut barber chair", "male barber haircut"],
  "Apotek": ["pharmacy interior", "pharmacist medicine", "drugstore counter"],
  "Kafe": ["coffee shop interior", "barista making coffee", "cozy cafe table"],
  "Restoran": ["restaurant interior", "restaurant food plating", "restaurant service"],
  "Rumah Makan": ["indonesian restaurant", "family dining restaurant", "serving indonesian food"],
  "Bengkel Sepeda Motor": ["motorcycle mechanic workshop", "motorbike service garage", "mechanic fixing motorcycle"],
  "Bengkel": ["automotive mechanic workshop", "car mechanic garage", "vehicle service center"],
  "Klinik Medis": ["medical clinic interior", "doctor patient consultation", "clinic reception healthcare"],
  "Klinik": ["clinic waiting room", "clinic doctor consultation", "healthcare clinic room"],
  "Toko Optik": ["optical store glasses", "optometrist eye exam", "eyewear shop interior"],
  "Hotel": ["hotel lobby", "hotel room interior", "hotel reception"],
};

function getEnglishImageKeywords(biz: BusinessData): string[] {
  const direct = IMAGE_KEYWORDS_EN[biz.kategori];
  if (direct) return direct;

  const lowerCategory = biz.kategori.toLowerCase();
  const matched = Object.entries(IMAGE_KEYWORDS_EN).find(([k]) =>
    lowerCategory.includes(k.toLowerCase())
  );

  if (matched) return matched[1];
  return [
    `${biz.kategori} business interior`,
    `${biz.kategori} storefront`,
    "local business indonesia",
  ];
}

async function fetchUnsplashImageCandidates(
  biz: BusinessData,
  options: { maxImages?: number } = {}
): Promise<ImageCandidate[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  const maxImages = options.maxImages ?? 24;

  if (!accessKey) {
    return [];
  }

  const keywords = getEnglishImageKeywords(biz);
  const seen = new Set<string>();
  const images: ImageCandidate[] = [];

  for (const query of keywords) {
    if (images.length >= maxImages) break;

    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query
      )}&orientation=landscape&per_page=20&content_filter=high`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
        next: { revalidate: 86400 },
      });

      if (!res.ok) {
        console.warn(`[AI Generator] Unsplash API gagal (${res.status}) untuk query: ${query}`);
        continue;
      }

      const data = await res.json();
      const results: any[] = Array.isArray(data?.results) ? data.results : [];

      for (const item of results) {
        if (images.length >= maxImages) break;

        const rawUrl = item?.urls?.regular || item?.urls?.full || item?.urls?.raw;
        if (!rawUrl || seen.has(rawUrl)) continue;

        seen.add(rawUrl);
        images.push({
          url: rawUrl,
          alt: item?.alt_description || `${biz.kategori} business visual`,
          credit: item?.user?.name || "Unsplash Contributor",
        });
      }
    } catch (err: any) {
      console.warn(`[AI Generator] Unsplash fetch error untuk query ${query}: ${err?.message || err}`);
    }
  }

  return images.slice(0, maxImages);
}

function enforceUniqueImageSources(
  html: string,
  imageCandidates: ImageCandidate[] = []
): string {
  if (!html || imageCandidates.length < 2) return html;

  const imgTagRegex = /<img\b[^>]*>/gi;
  const used = new Set<string>();
  let candidateIndex = 0;

  return html.replace(imgTagRegex, (tag) => {
    const srcMatch = tag.match(/\bsrc=(['"])(.*?)\1/i);
    if (!srcMatch) return tag;

    const originalSrc = srcMatch[2];
    if (!used.has(originalSrc)) {
      used.add(originalSrc);
      return tag;
    }

    let replacement = "";
    while (candidateIndex < imageCandidates.length) {
      const candidateUrl = imageCandidates[candidateIndex++].url;
      if (!used.has(candidateUrl)) {
        replacement = candidateUrl;
        used.add(candidateUrl);
        break;
      }
    }

    if (!replacement) return tag;
    return tag.replace(srcMatch[0], `src="${replacement}"`);
  });
}

// ─── SVG Icon Library ─────────────────────────────────────────────────────────
// Berikan library SVG inline agar AI tidak perlu generate sendiri & tidak pakai emoji
const SVG_ICONS = `
<!-- SVG Icon Library - gunakan class "icon" pada svg -->
<!-- scissors --> <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>
<!-- star --> <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
<!-- phone --> <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2 3h6l2 5-2.5 1.5a11 11 0 0 0 5 5L14 12l5 2v6a2 2 0 0 1-2 2A19 19 0 0 1 2 5a2 2 0 0 1 2-2"/></svg>
<!-- location --> <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 21s-8-6.25-8-11a8 8 0 1 1 16 0c0 4.75-8 11-8 11z"/><circle cx="12" cy="10" r="2" stroke-width="1.5"/></svg>
<!-- clock --> <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="1.5"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6l4 2"/></svg>
<!-- check --> <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
<!-- sparkles --> <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16 2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
<!-- arrow-right --> <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7-7 7 7-7 7"/></svg>
<!-- whatsapp --> <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
<!-- map --> <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13 6-3m-6 3V7m6 10 4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
`;

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(biz: BusinessData, imageCandidates: ImageCandidate[] = []): string {
  const enriched = biz.enriched_data;

  // Cari config kategori
  const config =
    KATEGORI_CONFIG[biz.kategori] ??
    Object.entries(KATEGORI_CONFIG).find(([key]) =>
      biz.kategori.toLowerCase().includes(key.toLowerCase())
    )?.[1] ??
    DEFAULT_CONFIG;

  const cleanedPhone = cleanPhone(biz.nomor_telepon);
  const waText = encodeURIComponent(
    `Halo ${biz.nama_bisnis}, saya tertarik dengan layanan Anda`
  );
  const waLink = cleanedPhone
    ? `https://wa.me/${cleanedPhone}?text=${waText}`
    : "#";
  const mapsLink = biz.link_gmaps || "#";

  const layananList = enriched?.layanan?.length
    ? enriched.layanan.map((l) => `• ${l}`).join("\n")
    : "(buat layanan yang relevan dan realistis untuk kategori ini, minimal 4 layanan)";

  const keunggulanList = enriched?.keunggulan?.length
    ? enriched.keunggulan.map((k) => `• ${k}`).join("\n")
    : "(buat 4 keunggulan kompetitif yang relevan dan persuasif)";

  const ratingBadge =
    biz.rating
      ? `${biz.rating} ★ · ${biz.jumlah_ulasan.toLocaleString("id-ID")} ulasan Google`
      : "";

  const isDark = config.cssTheme === "dark";
  const fallbackImageUrl = imageCandidates[0]?.url || UNSPLASH_DIRECT_FALLBACKS[0];

  const imagePoolText = imageCandidates.length
    ? imageCandidates
        .map((img, idx) => `${idx + 1}. ${img.url} | alt: ${img.alt} | by: ${img.credit}`)
        .join("\n")
    : "(UNSPLASH_API_UNAVAILABLE: gunakan URL direct images.unsplash.com/photo-... yang valid dan relevan.)";

  // CSS Variables string untuk Tailwind config
  const tailwindConfig = `
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '${config.warna.primary}',
            secondary: '${config.warna.secondary}',
            accent: '${config.warna.accent}',
            brand: {
              bg: '${config.warna.bg}',
              text: '${config.warna.text}',
              muted: '${config.warna.textMuted}',
            }
          },
          fontFamily: {
            heading: ['${config.fontHeading.split(":")[0].replace(/\+/g, " ")}', 'serif'],
            body: ['${config.fontBody.split(":")[0].replace(/\+/g, " ")}', 'sans-serif'],
          }
        }
      }
    }
  `;

  return `Kamu adalah world-class frontend engineer, conversion-focused copywriter, dan UI designer untuk website bisnis lokal Indonesia.

Tugas: hasilkan SATU file HTML landing page yang terlihat seperti hasil agensi profesional (bukan template AI), siap dipakai sebagai halaman demo pitch client.

=== DATA BISNIS ===
Nama Bisnis   : ${biz.nama_bisnis}
Kategori      : ${biz.kategori}
Alamat        : ${biz.alamat || "Medan, Sumatera Utara"}
Telepon       : ${biz.nomor_telepon || "-"}
Rating        : ${ratingBadge || "Belum ada rating"}
Jam Buka      : ${enriched?.jam_buka || "Hubungi kami untuk info jam operasional"}
Deskripsi     : ${enriched?.deskripsi || ""}
Layanan       :
${layananList}
Keunggulan    :
${keunggulanList}

=== VIBE & ESTETIKA ===
${config.vibe}

=== TUJUAN BISNIS HALAMAN INI ===
- Meningkatkan niat chat WhatsApp dari pengunjung baru
- Menunjukkan kredibilitas bisnis lokal di Medan
- Membuat owner merasa ini website layak dipakai untuk bisnis asli, bukan sekadar demo

=== PALET WARNA (GUNAKAN PERSIS) ===
Primary   : ${config.warna.primary}
Secondary : ${config.warna.secondary}  
Accent    : ${config.warna.accent}
Background: ${config.warna.bg}
Text      : ${config.warna.text}
Text Muted: ${config.warna.textMuted}
Mode      : ${isDark ? "DARK THEME" : "LIGHT THEME"}

=== FONT (WAJIB) ===
Heading: ${config.fontHeading.split(":")[0].replace(/\+/g, " ")}
Body   : ${config.fontBody.split(":")[0].replace(/\+/g, " ")}

=== STRUKTUR HALAMAN (WAJIB ADA SEMUA) ===
${config.komponen}

=== LINKS ===
WhatsApp CTA : ${waLink}
Google Maps  : ${mapsLink}

=== TAGLINE INSPIRASI ===
"${config.heroTagline}"
(Kembangkan menjadi copy yang lebih unik & relevan dengan nama bisnis)

=== GAMBAR / VISUAL ASSET (WAJIB REALISTIS, BUKAN KOTAK KOSONG) ===
Daftar URL gambar Unsplash yang SUDAH divalidasi sistem:
${imagePoolText}

- Gunakan minimal 5 gambar relevan, dan tambahkan sesuai kebutuhan layout (umumnya 6-12 gambar).
- Komposisi wajib: 1 hero image, 2 service/lifestyle image, 1 about/team image, 1 gallery/ambience image.
- Sumber yang diizinkan: Unsplash.
- WAJIB prioritaskan URL dari daftar yang disediakan sistem di atas.
- DILARANG membuat URL image sendiri jika daftar tersedia.
- DILARANG pakai source.unsplash.com sebagai URL utama.
- WAJIB gunakan src berbeda untuk tiap <img> (jangan ulang URL yang sama).
- DILARANG pakai gambar random yang tidak relevan dengan kategori bisnis.
- Setiap <img> wajib punya: loading="lazy", decoding="async", referrerpolicy="no-referrer", alt deskriptif berbahasa Indonesia, class object-cover.
- Setiap <img> wajib punya fallback onerror, contoh:
  onerror="this.onerror=null;this.src='${fallbackImageUrl}';"
- Jika memilih tidak pakai foto untuk satu section, ganti dengan visual gradient/SVG dekoratif yang sengaja didesain (bukan placeholder box polos).

=== FRAMEWORK COPYWRITING (WAJIB) ===
Gunakan alur pesan seperti ini:
1) Hook cepat: masalah/keinginan utama customer lokal
2) Value proposition: kenapa ${biz.nama_bisnis} lebih dipercaya
3) Bukti sosial: rating/ulasan/testimoni singkat realistis
4) CTA jelas: ajak chat WhatsApp sekarang

Aturan copy:
- Bahasa Indonesia natural, hangat, profesional, tidak lebay.
- Hindari klaim bombastis seperti "nomor 1 se-Indonesia".
- Jika data tidak ada, gunakan teks netral yang realistis dan tidak mengada-ada.
- Maksimal 1-2 kalimat per blok teks agar mudah scan di mobile.

=== PROSES KERJA INTERNAL (JANGAN DITAMPILKAN KE OUTPUT) ===
Lakukan langkah ini secara internal sebelum menulis HTML final:
1) Turunkan 3 konsep visual singkat dari vibe kategori.
2) Pilih 1 konsep terbaik untuk bisnis ini.
3) Susun wireframe section-by-section.
4) Tulis HTML final.
5) Audit hasil dengan checklist kualitas di bawah.

Jangan tampilkan proses berpikir. Output hanya HTML final.

=== ATURAN TEKNIS WAJIB ===

1. HEAD SECTION (template persis ini):
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${biz.nama_bisnis} — [tagline singkat]</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${config.fontHeading}&family=${config.fontBody}&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    ${tailwindConfig}
  </script>
  <style>
    /* CSS Custom ini WAJIB ada */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { font-family: '${config.fontBody.split(":")[0].replace(/\+/g, " ")}', sans-serif; background: ${config.warna.bg}; color: ${config.warna.text}; }
    h1, h2, h3, .font-heading { font-family: '${config.fontHeading.split(":")[0].replace(/\+/g, " ")}', serif; }
    .icon { width: 1.5rem; height: 1.5rem; display: inline-block; flex-shrink: 0; }
    
    /* Noise texture overlay untuk depth */
    .noise::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 1;
    }
    
    /* Animasi scroll reveal */
    .reveal { opacity: 0; transform: translateY(2rem); transition: opacity 0.7s ease, transform 0.7s ease; }
    .reveal.visible { opacity: 1; transform: translateY(0); }
    .reveal-delay-1 { transition-delay: 0.1s; }
    .reveal-delay-2 { transition-delay: 0.2s; }
    .reveal-delay-3 { transition-delay: 0.3s; }
    .reveal-delay-4 { transition-delay: 0.4s; }
    
    /* Floating WA button */
    .wa-float {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 9999;
      background: #25d366;
      color: white;
      border-radius: 9999px;
      padding: 0.875rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      box-shadow: 0 8px 30px rgba(37,211,102,0.4);
      text-decoration: none;
      transition: all 0.3s ease;
    }
    .wa-float:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(37,211,102,0.5); }
    .wa-float .icon { width: 1.25rem; height: 1.25rem; }
    
    /* Navbar */
    #navbar { transition: background 0.3s ease, box-shadow 0.3s ease; }
    #navbar.scrolled { background: ${isDark ? "rgba(13,13,13,0.95)" : "rgba(255,255,255,0.95)"} !important; backdrop-filter: blur(12px); box-shadow: 0 1px 20px rgba(0,0,0,0.08); }

    /* Decorative line */
    .deco-line { width: 3rem; height: 2px; background: ${config.warna.secondary}; display: block; margin-bottom: 1rem; }
    
    /* Star rating */
    .stars { color: #f59e0b; display: inline-flex; gap: 2px; }

    /* Animasi halus yang terasa premium, bukan berlebihan */
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(18px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-up { animation: fade-up 0.8s ease both; }

    @keyframes float-soft {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    .float-soft { animation: float-soft 6s ease-in-out infinite; }

    .hover-lift {
      transition: transform 0.35s ease, box-shadow 0.35s ease;
    }
    .hover-lift:hover {
      transform: translateY(-6px);
      box-shadow: 0 18px 45px rgba(0, 0, 0, 0.15);
    }
  </style>
</head>

2. SVG ICONS: Berikut adalah snippet SVG inline yang boleh kamu salin dan gunakan:
${SVG_ICONS}
Gunakan SVG di atas untuk semua ikon. Tidak perlu membuat SVG baru, cukup salin sesuai kebutuhan.

3. FLOATING WHATSAPP BUTTON (template persis):
<a href="${waLink}" target="_blank" class="wa-float" aria-label="Chat WhatsApp">
  <!-- paste SVG whatsapp dari library di atas -->
  <span>Chat via WhatsApp</span>
</a>

4. SCROLL REVEAL JS (template persis, taruh sebelum </body>):
<script>
  // Navbar scroll effect
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
  
  // Scroll reveal
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
  }, { threshold: 0.1 });
  reveals.forEach(el => observer.observe(el));

  // Sedikit parallax untuk elemen dekoratif
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    parallaxEls.forEach((el) => {
      const speed = Number(el.getAttribute('data-parallax')) || 0.08;
      el.style.transform = 'translateY(' + (y * speed) + 'px)';
    });
  });
  
  // Smooth scroll navbar links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
</script>

5. RESPONSIVE & ACCESSIBILITY (WAJIB):
- Mobile-first: layout harus rapi mulai 360px.
- Gunakan container dengan max-width yang konsisten (mis. max-w-6xl atau max-w-7xl).
- Pastikan kontras teks terbaca jelas di semua section.
- Semua tombol/link utama wajib punya hover, focus-visible, dan aria-label jika perlu.
- Jangan gunakan ukuran font terlalu kecil (body minimal setara 16px).
- Hindari section terlalu padat; beri whitespace yang cukup.

6. STRUKTUR NAVBAR & SECTION ID (WAJIB):
- Navbar berisi anchor ke section utama: #layanan, #keunggulan, #tentang, #kontak.
- Setiap section wajib punya id yang benar agar smooth scroll berfungsi.

7. KUALITAS KODE (WAJIB):
- HTML valid dan lengkap: <!DOCTYPE html>, <html>, <head>, <body>.
- Tidak ada komentar TODO, placeholder kosong, atau teks debugging.
- Tidak ada dependency selain Tailwind CDN + Google Fonts + vanilla JS ringan.
- Tidak boleh ada script eksternal lain.

8. MICRO-ANIMATION (WAJIB HALUS):
- Gunakan animasi seperlunya pada elemen penting: hero CTA, cards layanan, dan decorative accent.
- Hindari animasi berulang yang mengganggu atau terlalu cepat.
- Durasi ideal 300ms-900ms, easing smooth.
- Hormati keterbacaan konten: animasi tidak boleh mengorbankan UX.

=== LARANGAN KERAS (MELANGGAR = OUTPUT GAGAL) ===
🚫 DILARANG emoji Unicode apapun (✂️ 💆 ⭐ 🌟 💅 🏪 dsb) — GUNAKAN SVG dari library di atas
🚫 DILARANG background flat abu-abu (#f5f5f5, #f0f0f0, bg-gray-100) sebagai background utama section
🚫 DILARANG card dengan border tebal default atau shadow hitam tebal box-shadow: 0 0 10px #000
🚫 DILARANG tombol biru default Tailwind (bg-blue-500) kecuali memang warna brand-nya biru
🚫 DILARANG layout kartu yang semua simetris sempurna — harus ada variasi ukuran, asimetri
🚫 DILARANG heading hero kurang dari text-5xl (min text-6xl di desktop)
🚫 DILARANG teks "Lorem ipsum" atau placeholder teks tidak bermakna
🚫 DILARANG gambar kosong berupa box polos tanpa fungsi visual
🚫 DILARANG hotlink gambar dari domain acak selain Unsplash/Pexels
🚫 DILARANG membungkus output dalam markdown code fence (\`\`\`html)

=== PANDUAN DESAIN PREMIUM ===

HERO SECTION:
- Min height: 100vh
- Background: bukan warna solid flat. Gunakan: radial-gradient, linear-gradient bertumpuk, atau CSS mesh gradient menggunakan warna primary + secondary
- Nama bisnis dalam font heading, SANGAT BESAR (clamp atau text-7xl)
${ratingBadge ? `- Tampilkan badge rating: "${ratingBadge}" dalam pill/badge estetis` : ""}
- Dua tombol CTA: utama (WhatsApp) + sekunder (scroll ke layanan)
- Gunakan absolute positioned decorative elements (lingkaran, garis) sebagai background flair
- Sertakan hero visual yang relevan (foto Unsplash/Pexels atau komposisi visual artistik), bukan kotak kosong

SECTION LAYANAN:
- Bukan grid kartu identik semua. Gunakan bento-like: 1 kartu besar featured + beberapa kartu kecil
- Atau gunakan alternating list layout (icon kiri, teks kanan, bergantian)
- Setiap layanan punya icon SVG dari library di atas

SECTION KEUNGGULAN:
- Background kontras dengan section sebelumnya (gelap jika sebelumnya terang, dsb)
- 4 keunggulan dalam grid 2×2 atau horizontal scrollable
- Angka/statistik besar jika relevan

SECTION KONTAK:
- Tampilkan: alamat (dengan ikon location SVG), telepon (dengan ikon phone SVG), jam buka (dengan ikon clock SVG)
- Tombol WhatsApp yang mencolok
- Tombol "Lihat di Google Maps" → href="${mapsLink}"

FOOTER:
- Background: warna primary
- Text: warna kontras dengan primary
- Nama bisnis, tagline singkat, copyright tahun ini

=== QUALITY CHECKLIST (WAJIB LULUS SEBELUM OUTPUT) ===
Pastikan hasil final memenuhi semua poin ini:
- Terasa premium dan spesifik untuk kategori "${biz.kategori}", bukan template generik.
- Hero kuat, hierarchy jelas, CTA langsung terlihat tanpa scroll jauh.
- Ada diferensiasi visual antar section (warna, layout, ritme spacing).
- Copy terasa manusiawi dan persuasif untuk audiens lokal Medan.
- Mobile experience rapi: tidak ada overflow horizontal.
- Semua link CTA valid: WhatsApp = ${waLink}, Maps = ${mapsLink}.
- Visual tidak terlihat seperti placeholder box; gunakan foto relevan atau bentuk dekoratif yang intentional.
- Animasi terasa halus dan profesional, bukan gimmick berlebihan.
- Variasi gambar terlihat nyata: tidak ada URL <img> yang sama dipakai berulang.

=== OUTPUT ===
Kembalikan HANYA kode HTML lengkap.
Mulai langsung dari <!DOCTYPE html>.
Tanpa penjelasan.
Tanpa markdown fence.
Tanpa teks lain di luar HTML.`;
}

function injectImageFallbackScript(
  html: string,
  biz: BusinessData,
  imageCandidates: ImageCandidate[] = []
): string {
  if (!html || !html.includes("</body>")) return html;
  if (html.includes("data-image-fallback-script")) return html;

  const fallbackCandidates = [
    ...imageCandidates.map((img) => img.url),
    ...UNSPLASH_DIRECT_FALLBACKS,
  ];

  const fallbackScript = `
<script data-image-fallback-script>
  (function () {
    const fallbackList = ${JSON.stringify(fallbackCandidates)};
    const images = document.querySelectorAll('img');

    images.forEach((img, idx) => {
      if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
      if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');
      if (!img.getAttribute('referrerpolicy')) img.setAttribute('referrerpolicy', 'no-referrer');

      img.addEventListener('error', function () {
        const currentAttempt = Number(img.dataset.fallbackAttempt || '0');
        if (currentAttempt >= fallbackList.length) return;
        img.dataset.fallbackAttempt = String(currentAttempt + 1);
        img.src = fallbackList[currentAttempt];
      });

      if (!img.src || img.src === '#') {
        img.dataset.fallbackAttempt = '1';
        img.src = fallbackList[0] || '';
      }
    });
  })();
</script>`;

  return html.replace("</body>", `${fallbackScript}\n</body>`);
}

// ─── Main generator function ──────────────────────────────────────────────────
export async function generateDemoHTML(
  biz: BusinessData,
  options: { retries?: number } = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tidak ditemukan di env");

  const genAI = new GoogleGenerativeAI(apiKey);

  const MODELS_TO_TRY = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ];

  const imageCandidates = await fetchUnsplashImageCandidates(biz, { maxImages: 24 });
  if (imageCandidates.length === 0) {
    console.warn("[AI Generator] Tidak mendapat kandidat image dari Unsplash API. Pastikan UNSPLASH_ACCESS_KEY valid.");
  }
  const prompt = buildPrompt(biz, imageCandidates);
  const maxRetries = options.retries ?? 3;
  let lastError: Error | null = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.7,       // seimbang: tetap kreatif tapi lebih konsisten
          topP: 0.9,
          maxOutputTokens: 65536,
        },
      });

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 1) {
            console.log(`[AI Generator] (${modelName}) Retry ${attempt}/${maxRetries}...`);
            await new Promise((r) => setTimeout(r, attempt * 5000));
          }

          console.log(`[AI Generator] Trying ${modelName}...`);
          const result = await model.generateContent(prompt);
          let text = result.response.text();

          console.log(`[AI Generator] Raw response: ${text.length} chars`);

          // Strip markdown code fence
          if (text.includes("```")) {
            text = text
              .replace(/^```(?:html)?\s*\n?/im, "")
              .replace(/\n?```\s*$/im, "")
              .trim();
          }

          // Ekstrak HTML
          const doctypeIdx = text.indexOf("<!DOCTYPE html>");
          const htmlEndIdx = text.lastIndexOf("</html>");

          if (doctypeIdx !== -1 && htmlEndIdx !== -1) {
            const html = text.slice(doctypeIdx, htmlEndIdx + 7);
            const uniqueHtml = enforceUniqueImageSources(html, imageCandidates);
            const safeHtml = injectImageFallbackScript(uniqueHtml, biz, imageCandidates);
            console.log(`[AI Generator] Extracted HTML: ${html.length} chars`);
            return safeHtml;
          }

          const htmlOpenIdx = text.indexOf("<html");
          if (htmlOpenIdx !== -1 && htmlEndIdx !== -1) {
            const html = text.slice(htmlOpenIdx, htmlEndIdx + 7);
            const uniqueHtml = enforceUniqueImageSources(html, imageCandidates);
            const safeHtml = injectImageFallbackScript(uniqueHtml, biz, imageCandidates);
            console.log(`[AI Generator] Extracted HTML (no DOCTYPE): ${html.length} chars`);
            return safeHtml;
          }

          console.warn(`[AI Generator] HTML tags not found, returning raw text (${text.length} chars)`);
          return injectImageFallbackScript(text, biz, imageCandidates);

        } catch (err: any) {
          lastError = err;
          const msg: string = err?.message || "";
          console.error(`[AI Generator] (${modelName}) Attempt ${attempt} failed:`, msg);

          if (msg.includes("404") || msg.includes("is not found")) {
            console.log(`[AI Generator] Model ${modelName} tidak tersedia, coba model berikutnya...`);
            break;
          }

          const isRateLimit =
            msg.includes("429") ||
            msg.includes("quota") ||
            msg.includes("RESOURCE_EXHAUSTED") ||
            msg.includes("FreeTier");

          if (isRateLimit) {
            const waitMs = attempt * 15000;
            console.log(`[AI Generator] Rate limit — tunggu ${waitMs / 1000}s...`);
            await new Promise((r) => setTimeout(r, waitMs));
          }
        }
      }
    } catch (outerErr: any) {
      lastError = outerErr;
      console.error(`[AI Generator] Model ${modelName} outer error:`, outerErr?.message);
    }
  }

  throw new Error(
    `Gagal generate dengan semua model. Error terakhir: ${lastError?.message}`
  );
}

export { buildPrompt };