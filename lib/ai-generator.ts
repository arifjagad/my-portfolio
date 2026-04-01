/**
 * lib/ai-generator.ts
 * Generate HTML demo page via Google Gemini API (dengan fallback ke OpenRouter)
 *
 * Strategi:
 * - Prompt struktural: scaffolding HTML diberikan, AI mengisi konten & style
 * - Negative prompt agresif untuk mencegah output generik
 * - Merge data mentah + enriched_data
 * - Retry otomatis 3x jika Gemini gagal
 * - Fallback otomatis ke OpenRouter jika semua model Gemini habis
 * - Return HTML string siap pakai
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { OPENROUTER_MODELS } from "./openrouter-models";
import { log, startLogSession } from "./generate-logger";

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

// ─── SVG icon names (ringkas, tidak perlu tulis raw HTML di prompt) ──────────
// AI tahu SVG Heroicons/Lucide, cukup sebutkan nama ikon yang diizinkan
const SVG_ICON_LIST = "scissors, star (filled), phone, location-pin, clock, check, sparkles, arrow-right, whatsapp-logo, map";

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

  return `Kamu adalah world-class frontend engineer, conversion-focused copywriter, dan UI designer untuk website bisnis lokal Indonesia.
Hasilkan SATU file HTML landing page agensi-grade sebagai halaman demo pitch client.

=== BISNIS ===
Nama     : ${biz.nama_bisnis}
Kategori : ${biz.kategori}
Alamat   : ${biz.alamat || "Medan, Sumatera Utara"}
Telepon  : ${biz.nomor_telepon || "-"}
Rating   : ${ratingBadge || "Belum ada"}
Jam Buka : ${enriched?.jam_buka || "Hubungi kami"}
Deskripsi: ${enriched?.deskripsi || ""}
Layanan  :
${layananList}
Keunggulan:
${keunggulanList}

=== DESIGN THINKING & AESTHETICS ===
Vibe    : ${config.vibe}
Theme   : ${isDark ? "DARK" : "LIGHT"}
Primary : ${config.warna.primary} | Secondary: ${config.warna.secondary} | Accent: ${config.warna.accent}
BG      : ${config.warna.bg} | Text: ${config.warna.text} | Muted: ${config.warna.textMuted}
Font    : Heading="${config.fontHeading.split(":")[0].replace(/\+/g, " ")}" Body="${config.fontBody.split(":")[0].replace(/\+/g, " ")}"
Tagline : "${config.heroTagline}" (kembangkan lebih spesifik)

Aturan Estetika & Kreativitas:
1. TONE COMMITMENT: Tentukan satu tone ekstrem yang kohesif (misal: brutalist/raw, luxury/refined, playful, industrial) berdasarkan Vibe. Eksekusi dengan presisi tinggi.
2. DIFFERENTIATION: Buat satu hal yang UNFORGETTABLE. Jangan gunakan pattern komponen/layout template cookie-cutter yang gampang ditebak.
3. SPATIAL COMPOSITION: Gunakan layout asimetris, overlap elemen, generous negative space (atau controlled density). Jangan hanya menumpuk kotak-kotak biasa.
4. ATMOSPHERE: Jangan pakai background solid warna datar. Gunakan efek kontekstual: gradient mesh, noise texture tipis, pola geometris, transparansi berlapis, atau bayangan dramatis. 

=== STRUKTUR SECTION (WAJIB SEMUA ADA) ===
${config.komponen}

=== LINKS ===
WhatsApp: ${waLink}
Maps    : ${mapsLink}

=== GAMBAR (WAJIB REALISTIS) ===
Pool URL Unsplash tervalidasi:
${imagePoolText}

Aturan gambar:
- Min 5 gambar, prioritas dari pool di atas. Komposisi: 1 hero, 2 service/lifestyle, 1 about, 1 gallery.
- Tiap <img>: loading="lazy" decoding="async" referrerpolicy="no-referrer" alt=[deskripsi-id] class="object-cover"
- Tiap <img> wajib: onerror="this.onerror=null;this.src='${fallbackImageUrl}';"
- Jangan ulang URL yang sama. Jangan hotlink selain Unsplash.
- Jika skip foto di section → pakai gradient/SVG dekoratif (bukan box kosong).

=== COPYWRITING ===
Alur: Hook (masalah lokal) → Value prop (kenapa ${biz.nama_bisnis}) → Sosial proof (rating/ulasan) → CTA WhatsApp.
Bahasa Indonesia natural, hangat, profesional. Max 1-2 kalimat per blok. Hindari klaim bombastis.

=== HEAD (WAJIB PERSIS) ===
- <meta charset="UTF-8"> + viewport width=device-width,initial-scale=1.0
- <title>${biz.nama_bisnis} — [tagline singkat]</title>
- Google Fonts preconnect + link family=${config.fontHeading}&family=${config.fontBody}&display=swap
- <script src="https://cdn.tailwindcss.com"></script>
- Tailwind config script: colors {primary:"${config.warna.primary}",secondary:"${config.warna.secondary}",accent:"${config.warna.accent}",brand:{bg:"${config.warna.bg}",text:"${config.warna.text}",muted:"${config.warna.textMuted}"}}, fontFamily {heading:["${config.fontHeading.split(":")[0].replace(/\+/g, " ")}"],body:["${config.fontBody.split(":")[0].replace(/\+/g, " ")}"]}
- <style> wajib berisi: * reset, html scroll-behavior:smooth, body font+bg+color, h1/h2/h3 font-heading, .icon{w-6 h-6 inline-block flex-shrink-0}, .noise::before{noise SVG data URI opacity:0.03}, .reveal{opacity:0 translateY(2rem) transition .7s}+.reveal.visible{opacity:1 translateY(0)}+delay variants 1-4, .wa-float{fixed bottom-8 right-8 z-9999 bg-#25d366 rounded-full px-6 py-3.5 flex gap-2 font-semibold shadow-lg transition}, .wa-float:hover{translateY(-3px)}, #navbar{transition bg+shadow}+#navbar.scrolled{bg:${isDark ? "rgba(13,13,13,.95)" : "rgba(255,255,255,.95)"} backdrop-blur-sm}, .deco-line{w-12 h-px bg-secondary mb-4}, .stars{color:#f59e0b}, @keyframes fade-up+float-soft+hover-lift

=== ICONS ===
Gunakan HANYA inline SVG (Heroicons/Lucide). JANGAN pakai emoji Unicode.
Ikon diizinkan: ${SVG_ICON_LIST}. Tiap svg: class="icon" viewBox="0 0 24 24".

=== FLOATING WA BUTTON (WAJIB) ===
<a href="${waLink}" target="_blank" class="wa-float" aria-label="Chat WhatsApp">[svg whatsapp]<span>Chat via WhatsApp</span></a>

=== SCRIPT SEBELUM </body> (WAJIB) ===
1. Navbar: toggle class "scrolled" pada #navbar saat scrollY>50
2. Scroll reveal: IntersectionObserver threshold:0.1 pada .reveal → add class "visible"
3. Parallax: window scroll → style.transform translateY(scrollY*speed) pada [data-parallax]
4. Smooth anchor: querySelectorAll('a[href^="#"]') → scrollIntoView({behavior:"smooth"})

=== ATURAN KRITIS ===
- HTML valid: DOCTYPE+html+head+body. No TODO/placeholder/debug. Hanya Tailwind CDN+GFonts+vanillaJS.
- Mobile-first 360px+, max-w-6xl container, no overflow-x. Kontras terbaca, body min 16px.
- Section IDs: #layanan #keunggulan #tentang #kontak.
- HERO: min-h-screen, gradient/mesh bg (bukan flat solid), nama bisnis text-6xl+${ratingBadge ? `, badge rating "${ratingBadge}"` : ""}, 2 CTAs, decorative absolutes, hero image.
- LAYANAN: bento (1 featured + beberapa kecil) atau alternating icon-teks, tiap item punya SVG icon.
- KEUNGGULAN: bg kontras, grid 2x2 atau h-scroll, angka besar jika relevan.
- KONTAK: location+phone+clock SVG, tombol WA mencolok, tombol Maps → ${mapsLink}.
- FOOTER: bg primary, text kontras, nama+tagline+copyright.

=== LARANGAN ===
DILARANG: emoji unicode | bg abu flat (#f5f5f5 dll) | border tebal default | tombol biru Tailwind (kecuali brand biru) | kartu identik semua | hero heading <text-5xl | Lorem ipsum | gambar box kosong | hotlink selain Unsplash | markdown fence output

=== QUALITY CHECK ===
- Premium & spesifik kategori "${biz.kategori}", bukan template generik
- Hero kuat, CTA visible, diferensiasi visual antar section
- Copy manusiawi & persuasif untuk audiens lokal Medan
- No overflow horizontal, no URL <img> berulang, animasi halus

=== OUTPUT ===
Hanya kode HTML. Mulai dari <!DOCTYPE html>. Tanpa penjelasan, tanpa fence.`;
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

// ─── HTML extractor helper ────────────────────────────────────────────────────
function extractHTML(
  text: string,
  biz: BusinessData,
  imageCandidates: ImageCandidate[]
): string {
  // Strip markdown code fence
  if (text.includes("```")) {
    text = text
      .replace(/^```(?:html)?\s*\n?/im, "")
      .replace(/\n?```\s*$/im, "")
      .trim();
    log("INFO", "Stripped markdown code fence dari response");
  }

  // Ekstrak HTML
  const doctypeIdx = text.indexOf("<!DOCTYPE html>");
  const htmlEndIdx = text.lastIndexOf("</html>");

  if (doctypeIdx !== -1 && htmlEndIdx !== -1) {
    const html = text.slice(doctypeIdx, htmlEndIdx + 7);
    log("OK", `HTML diekstrak (dengan DOCTYPE): ${html.length} chars / ${(html.length / 1024).toFixed(1)} KB`);
    const uniqueHtml = enforceUniqueImageSources(html, imageCandidates);
    const finalHtml = injectImageFallbackScript(uniqueHtml, biz, imageCandidates);
    log("OK", `Final HTML siap: ${finalHtml.length} chars / ${(finalHtml.length / 1024).toFixed(1)} KB`);
    return finalHtml;
  }

  const htmlOpenIdx = text.indexOf("<html");
  if (htmlOpenIdx !== -1 && htmlEndIdx !== -1) {
    const html = text.slice(htmlOpenIdx, htmlEndIdx + 7);
    log("WARN", `HTML diekstrak (tanpa DOCTYPE): ${html.length} chars`);
    const uniqueHtml = enforceUniqueImageSources(html, imageCandidates);
    const finalHtml = injectImageFallbackScript(uniqueHtml, biz, imageCandidates);
    log("OK", `Final HTML siap: ${finalHtml.length} chars / ${(finalHtml.length / 1024).toFixed(1)} KB`);
    return finalHtml;
  }

  log("WARN", `HTML tags tidak ditemukan! Returning raw text (${text.length} chars)`);
  console.warn(`[AI Generator] HTML tags not found, returning raw text (${text.length} chars)`);
  return injectImageFallbackScript(text, biz, imageCandidates);
}

// ─── OpenRouter generator (fallback semua model) ─────────────────────────────
async function generateWithOpenRouter(
  prompt: string,
  biz: BusinessData,
  imageCandidates: ImageCandidate[],
  maxRetries = 2
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY tidak ditemukan di env");

  let lastError: Error | null = null;

  for (const model of OPENROUTER_MODELS) {
    log("INFO", `[OpenRouter-fallback] Mencoba model: ${model.label} (${model.id})`);
    console.log(`[OpenRouter] Mencoba model: ${model.label} (${model.id})`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          const waitSec = attempt * 5;
          log("INFO", `[OpenRouter-fallback] (${model.id}) Retry ${attempt}/${maxRetries} — tunggu ${waitSec}s...`);
          console.log(`[OpenRouter] (${model.id}) Retry ${attempt}/${maxRetries}...`);
          await new Promise((r) => setTimeout(r, waitSec * 1000));
        }

        log("INFO", `[OpenRouter-fallback] Mengirim request ke OpenRouter API...`);
        const reqStart = Date.now();

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model.id,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 65536,
            temperature: 0.7,
          }),
        });

        const elapsed = ((Date.now() - reqStart) / 1000).toFixed(1);
        log("INFO", `[OpenRouter-fallback] Response HTTP ${res.status} diterima dalam ${elapsed}s`);

        if (!res.ok) {
          const errBody = await res.text();
          const errMsg = `HTTP ${res.status}: ${errBody.slice(0, 200)}`;
          log("ERROR", `[OpenRouter-fallback] (${model.id}) Request gagal: ${errMsg}`);
          console.error(`[OpenRouter] (${model.id}) Gagal:`, errMsg);

          if (res.status === 429) {
            const waitMs = attempt * 15000;
            log("WARN", `[OpenRouter-fallback] Rate limit — tunggu ${waitMs / 1000}s...`);
            console.log(`[OpenRouter] Rate limit — tunggu ${waitMs / 1000}s...`);
            lastError = new Error(errMsg);
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }

          lastError = new Error(errMsg);
          break;
        }

        const data = await res.json();
        const text: string = data?.choices?.[0]?.message?.content ?? "";
        log("INFO", `[OpenRouter-fallback] (${model.id}) Raw response: ${text.length} chars / ${(text.length / 1024).toFixed(1)} KB`);
        console.log(`[OpenRouter] (${model.id}) Raw response: ${text.length} chars`);

        if (!text) {
          log("ERROR", `[OpenRouter-fallback] Response content kosong!`);
          lastError = new Error("Response kosong dari OpenRouter");
          break;
        }

        return extractHTML(text, biz, imageCandidates);

      } catch (err: any) {
        lastError = err;
        log("ERROR", `[OpenRouter-fallback] (${model.id}) Attempt ${attempt} exception: ${err?.message}`);
        console.error(`[OpenRouter] (${model.id}) Attempt ${attempt} error:`, err?.message);
      }
    }
  }

  throw new Error(
    `Gagal generate dengan semua model OpenRouter. Error terakhir: ${lastError?.message}`
  );
}

// ─── Main generator function ──────────────────────────────────────────────────
/**
 * @param options.provider  - "gemini" (default, auto-fallback ke OpenRouter),
 *                           atau model ID OpenRouter (misal "deepseek/deepseek-r1:free")
 *                           untuk langsung pakai model tersebut tanpa coba Gemini.
 */
export async function generateDemoHTML(
  biz: BusinessData,
  options: { retries?: number; provider?: string } = {}
): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!geminiKey && !openrouterKey) {
    throw new Error("Tidak ada API key. Set GEMINI_API_KEY atau OPENROUTER_API_KEY di .env.local");
  }

  // ── Start log session ───────────────────────────────────────────────────────
  startLogSession(biz.slug);
  log("INFO", `Bisnis         : ${biz.nama_bisnis}`);
  log("INFO", `Kategori       : ${biz.kategori}`);
  log("INFO", `Rating         : ${biz.rating ?? "(kosong)"} (${biz.jumlah_ulasan} ulasan)`);
  log("INFO", `Provider dipilih: ${options.provider ?? "gemini"}`);
  log("INFO", `Gemini key     : ${geminiKey ? "✓ Ada" : "✗ Tidak ada"}`);
  log("INFO", `OpenRouter key : ${openrouterKey ? "✓ Ada" : "✗ Tidak ada"}`);

  // ── Ambil gambar Unsplash ────────────────────────────────────────────────────
  log("INFO", "Mengambil kandidat gambar dari Unsplash API...");
  const imageCandidates = await fetchUnsplashImageCandidates(biz, { maxImages: 24 });
  if (imageCandidates.length === 0) {
    log("WARN", "Tidak ada kandidat gambar dari Unsplash! Memakai URL fallback.");
    console.warn("[AI Generator] Tidak mendapat kandidat image dari Unsplash API. Pastikan UNSPLASH_ACCESS_KEY valid.");
  } else {
    log("OK", `Unsplash: ${imageCandidates.length} gambar kandidat siap`);
  }

  // ── Build prompt ─────────────────────────────────────────────────────────────
  const prompt = buildPrompt(biz, imageCandidates);
  log("INFO", `Prompt dibangun: ${prompt.length} chars / ${(prompt.length / 1024).toFixed(1)} KB`);

  const maxRetries = options.retries ?? 3;
  const selectedProvider = options.provider ?? "gemini";
  let lastError: Error | null = null;
  const overallStart = Date.now();

  // ── Jika user memilih model OpenRouter tertentu (bukan "gemini") ────────────
  if (selectedProvider !== "gemini" && openrouterKey) {
    log("INFO", `Mode: Direct OpenRouter → ${selectedProvider}`);
    const targetModels = OPENROUTER_MODELS.filter((m) => m.id === selectedProvider);
    if (targetModels.length === 0) {
      const errMsg = `Model OpenRouter "${selectedProvider}" tidak ditemukan di openrouter-models.ts`;
      log("ERROR", errMsg);
      throw new Error(errMsg);
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          const waitSec = attempt * 5;
          log("INFO", `(${selectedProvider}) Retry ${attempt}/${maxRetries} — tunggu ${waitSec}s...`);
          await new Promise((r) => setTimeout(r, waitSec * 1000));
        }

        log("INFO", `Mengirim request ke OpenRouter (attempt ${attempt}/${maxRetries})...`);
        log("INFO", `URL: https://openrouter.ai/api/v1/chat/completions`);
        log("INFO", `Model: ${selectedProvider}  |  max_tokens: 65536  |  temperature: 0.7`);
        const reqStart = Date.now();

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedProvider,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 65536,
            temperature: 0.7,
          }),
        });

        const elapsed = ((Date.now() - reqStart) / 1000).toFixed(1);
        log("INFO", `Response HTTP ${res.status} diterima dalam ${elapsed}s`);

        if (!res.ok) {
          const errBody = await res.text();
          const errMsg = `HTTP ${res.status}: ${errBody.slice(0, 300)}`;
          log("ERROR", `Request gagal: ${errMsg}`);
          throw new Error(errMsg);
        }

        const data = await res.json();
        const text: string = data?.choices?.[0]?.message?.content ?? "";

        // Log usage info jika ada
        if (data?.usage) {
          log("INFO", `Token usage — prompt: ${data.usage.prompt_tokens ?? "?"} | completion: ${data.usage.completion_tokens ?? "?"} | total: ${data.usage.total_tokens ?? "?"}`);
        }

        if (!text) {
          log("ERROR", "Response content kosong dari OpenRouter!");
          throw new Error("Response kosong dari OpenRouter");
        }

        log("INFO", `Raw response: ${text.length} chars / ${(text.length / 1024).toFixed(1)} KB`);

        const result = extractHTML(text, biz, imageCandidates);
        const totalElapsed = ((Date.now() - overallStart) / 1000).toFixed(1);
        log("DONE", `Generate selesai! Total waktu: ${totalElapsed}s | HTML: ${(result.length / 1024).toFixed(1)} KB`);
        return result;

      } catch (err: any) {
        lastError = err;
        log("ERROR", `Attempt ${attempt} exception: ${err?.message}`);
        console.error(`[OpenRouter] (${selectedProvider}) Attempt ${attempt} error:`, err?.message);
      }
    }

    const errMsg = `Gagal generate dengan model "${selectedProvider}" setelah ${maxRetries} attempt. Error: ${lastError?.message}`;
    log("ERROR", errMsg);
    throw new Error(errMsg);
  }

  // ── Tahap 1: Coba semua model Gemini (default / provider="gemini") ──────────
  log("INFO", "Mode: Gemini Auto (dengan fallback OpenRouter)");
  let geminiExhausted = false;
  if (geminiKey) {
    const genAI = new GoogleGenerativeAI(geminiKey);

    const GEMINI_MODELS = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
    ];
    log("INFO", `Gemini model list: ${GEMINI_MODELS.join(" → ")}`);

    for (const modelName of GEMINI_MODELS) {
      log("INFO", `─── Mencoba Gemini: ${modelName} ───`);
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 65536,
          },
        });

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            if (attempt > 1) {
              const waitSec = attempt * 5;
              log("INFO", `(${modelName}) Retry ${attempt}/${maxRetries} — tunggu ${waitSec}s...`);
              console.log(`[AI Generator] (${modelName}) Retry ${attempt}/${maxRetries}...`);
              await new Promise((r) => setTimeout(r, waitSec * 1000));
            }

            log("INFO", `Mengirim ke Gemini (attempt ${attempt}/${maxRetries})...`);
            const reqStart = Date.now();
            console.log(`[AI Generator] Trying Gemini: ${modelName}...`);
            const result = await model.generateContent(prompt);
            const elapsed = ((Date.now() - reqStart) / 1000).toFixed(1);
            let text = result.response.text();
            log("INFO", `Gemini response diterima dalam ${elapsed}s — ${text.length} chars / ${(text.length / 1024).toFixed(1)} KB`);
            console.log(`[AI Generator] Gemini raw response: ${text.length} chars`);

            const html = extractHTML(text, biz, imageCandidates);
            const totalElapsed = ((Date.now() - overallStart) / 1000).toFixed(1);
            log("DONE", `Generate Gemini selesai! Total waktu: ${totalElapsed}s | HTML: ${(html.length / 1024).toFixed(1)} KB`);
            return html;

          } catch (err: any) {
            lastError = err;
            const msg: string = err?.message || "";
            log("ERROR", `(${modelName}) Attempt ${attempt} gagal: ${msg.slice(0, 200)}`);
            console.error(`[AI Generator] (${modelName}) Attempt ${attempt} failed:`, msg);

            if (msg.includes("404") || msg.includes("is not found")) {
              log("WARN", `Model ${modelName} tidak tersedia (404), beralih ke model berikutnya...`);
              console.log(`[AI Generator] Model ${modelName} tidak tersedia, coba model berikutnya...`);
              break;
            }

            const isRateLimit =
              msg.includes("429") ||
              msg.includes("quota") ||
              msg.includes("RESOURCE_EXHAUSTED") ||
              msg.includes("FreeTier");

            if (isRateLimit) {
              const waitSec = attempt * 15;
              log("WARN", `Rate limit Gemini — tunggu ${waitSec}s...`);
              console.log(`[AI Generator] Rate limit — tunggu ${waitSec}s...`);
              await new Promise((r) => setTimeout(r, waitSec * 1000));
            }
          }
        }
      } catch (outerErr: any) {
        lastError = outerErr;
        log("ERROR", `Model ${modelName} outer error: ${outerErr?.message}`);
        console.error(`[AI Generator] Model ${modelName} outer error:`, outerErr?.message);
      }
    }

    geminiExhausted = true;
    log("WARN", "Semua model Gemini gagal. Beralih ke OpenRouter sebagai fallback...");
    console.warn("[AI Generator] Semua model Gemini gagal. Beralih ke OpenRouter...");
  }

  // ── Tahap 2: Fallback ke OpenRouter ─────────────────────────────────────────
  if (openrouterKey) {
    log("INFO", "─── OpenRouter Fallback (semua model dari openrouter-models.ts) ───");
    try {
      return await generateWithOpenRouter(prompt, biz, imageCandidates, maxRetries);
    } catch (orErr: any) {
      lastError = orErr;
      log("ERROR", `OpenRouter fallback juga gagal: ${orErr?.message}`);
      console.error("[AI Generator] OpenRouter juga gagal:", orErr?.message);
    }
  } else if (geminiExhausted) {
    log("WARN", "OPENROUTER_API_KEY tidak ada — tidak ada fallback tersisa.");
    console.warn("[AI Generator] OPENROUTER_API_KEY tidak ada; tidak ada fallback.");
  }

  const finalErr = `Gagal generate dengan semua provider (Gemini + OpenRouter). Error terakhir: ${lastError?.message}`;
  log("ERROR", finalErr);
  throw new Error(finalErr);
}

export { buildPrompt };