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

interface SectionRequirement {
  id: string;
  label: string;
  objective: string;
  requiredItems: string[];
}

interface VisualVariant {
  name: string;
  layoutDirection: string;
  surfaceStyle: string;
  motionTone: string;
  ctaStyle: string;
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

const VISUAL_VARIANTS: VisualVariant[] = [
  {
    name: "Editorial Asimetris",
    layoutDirection: "Hero split asimetris dengan overlap visual, section zig-zag kiri-kanan, negative space besar.",
    surfaceStyle: "Card tipis + gradient layer transparan, bukan kotak seragam.",
    motionTone: "Reveal stagger halus dengan durasi 500-700ms, hover lift ringan.",
    ctaStyle: "CTA utama kontras tinggi, CTA sekunder ghost button rounded-full.",
  },
  {
    name: "Bento Komersial",
    layoutDirection: "Grid bento modular: satu card besar sebagai fokus + 3-5 card pendukung ukuran berbeda.",
    surfaceStyle: "Panel berlapis dengan border lembut + glow tipis sesuai warna kategori.",
    motionTone: "Micro-parallax elemen dekoratif + fade-up bertahap antar panel.",
    ctaStyle: "Sticky CTA mini pada mobile + tombol utama penuh warna brand.",
  },
  {
    name: "Immersive Storyline",
    layoutDirection: "Urutan section seperti cerita: hero -> trust -> layanan -> proof -> kontak, dengan transisi atmosferik.",
    surfaceStyle: "Background mesh/spotlight, section kontras jelas tanpa tampilan template.",
    motionTone: "Scroll reveal lebih sinematik, easing smooth dan subtle.",
    ctaStyle: "CTA muncul di beberapa titik dengan copy berbeda (book now / konsultasi / hubungi).",
  },
  {
    name: "Precision Corporate",
    layoutDirection: "Struktur rapih berbasis kolom dengan beberapa aksen diagonal/geometris agar tidak kaku.",
    surfaceStyle: "Clean panel + iconography konsisten + highlight data point.",
    motionTone: "Animasi minim dan profesional, fokus keterbacaan serta kecepatan.",
    ctaStyle: "CTA tegas dengan trust badge di sekitarnya.",
  },
];

const BASE_SECTION_BLUEPRINT: SectionRequirement[] = [
  {
    id: "hero",
    label: "Hero",
    objective: "Membangun first impression kuat dan relevan kategori bisnis.",
    requiredItems: ["headline spesifik kategori", "subheadline manfaat", "2 CTA", "rating/trust cue"],
  },
  {
    id: "layanan",
    label: "Layanan / Produk",
    objective: "Menjelaskan layanan inti yang benar-benar dijual bisnis.",
    requiredItems: ["minimal 4 item", "icon-chip HTML+CSS", "deskripsi singkat", "prioritas layanan unggulan"],
  },
  {
    id: "keunggulan",
    label: "Keunggulan",
    objective: "Membedakan bisnis dari kompetitor lokal.",
    requiredItems: ["minimal 3 bukti nilai", "copy persuasif", "layout kontras"],
  },
  {
    id: "tentang",
    label: "Tentang Kami",
    objective: "Membangun kepercayaan dengan identitas dan cerita singkat bisnis.",
    requiredItems: ["profil ringkas", "pengalaman atau value", "nada lokal Indonesia"],
  },
  {
    id: "kontak",
    label: "Kontak",
    objective: "Mengarahkan user ke tindakan (chat/kunjungan) secepat mungkin.",
    requiredItems: ["alamat", "jam buka", "telepon", "CTA WhatsApp", "tombol maps"],
  },
];

const CATEGORY_SECTION_APPEND: Record<string, SectionRequirement[]> = {
  "Barbershop": [
    {
      id: "harga",
      label: "Paket & Harga",
      objective: "Membantu user memilih layanan cepat berdasarkan budget.",
      requiredItems: ["minimal 3 paket", "durasi", "CTA booking"],
    },
  ],
  "Tempat Cukur Rambut": [
    {
      id: "harga",
      label: "Paket & Harga",
      objective: "Membantu user memilih layanan cepat berdasarkan budget.",
      requiredItems: ["minimal 3 paket", "durasi", "CTA booking"],
    },
  ],
  "Salon Kecantikan": [
    {
      id: "gallery",
      label: "Galeri Hasil",
      objective: "Menunjukkan kualitas hasil treatment/styling.",
      requiredItems: ["minimal 3 visual", "caption singkat", "komposisi estetik"],
    },
  ],
  "Kafe": [
    {
      id: "menu",
      label: "Menu Highlight",
      objective: "Mendorong minat kunjungan lewat menu signature.",
      requiredItems: ["minimal 4 menu", "harga opsional", "deskripsi rasa singkat"],
    },
  ],
  "Restoran": [
    {
      id: "menu",
      label: "Menu Highlight",
      objective: "Mendorong minat reservasi lewat menu utama.",
      requiredItems: ["minimal 4 menu", "deskripsi", "CTA reservasi"],
    },
  ],
  "Rumah Makan": [
    {
      id: "menu",
      label: "Menu Highlight",
      objective: "Mendorong minat pesan/kunjungan lewat menu favorit.",
      requiredItems: ["minimal 4 menu", "deskripsi", "CTA pesan"],
    },
  ],
  "Klinik Medis": [
    {
      id: "jadwal",
      label: "Jadwal Praktik",
      objective: "Memberi kejelasan waktu layanan medis.",
      requiredItems: ["jam praktik", "alur pendaftaran", "CTA konsultasi"],
    },
  ],
  "Klinik": [
    {
      id: "jadwal",
      label: "Jadwal Praktik",
      objective: "Memberi kejelasan waktu layanan medis.",
      requiredItems: ["jam praktik", "alur pendaftaran", "CTA konsultasi"],
    },
  ],
  "Hotel": [
    {
      id: "kamar",
      label: "Tipe Kamar",
      objective: "Membantu calon tamu memahami opsi menginap.",
      requiredItems: ["minimal 3 tipe kamar", "fasilitas", "CTA booking"],
    },
  ],
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

interface RankedImageCandidate extends ImageCandidate {
  score: number;
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

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickDeterministic<T>(items: T[], seed: string): T {
  if (items.length === 0) throw new Error("List kosong");
  const index = hashString(seed) % items.length;
  return items[index];
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace("#", "");
  const normalized = cleaned.length === 3
    ? cleaned.split("").map((c) => c + c).join("")
    : cleaned;
  const intValue = parseInt(normalized, 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(base: string, target: string, ratio: number): string {
  const a = hexToRgb(base);
  const b = hexToRgb(target);
  return rgbToHex(
    a.r + (b.r - a.r) * ratio,
    a.g + (b.g - a.g) * ratio,
    a.b + (b.b - a.b) * ratio
  );
}

function buildPaletteVariant(config: KategoriConfig, slug: string) {
  const seed = hashString(`${slug}:${config.vibe}`) % 4;
  const { warna } = config;

  if (seed === 0) {
    return {
      paletteName: "Core Signature",
      warna,
    };
  }

  if (config.cssTheme === "dark") {
    if (seed === 1) {
      return {
        paletteName: "Neon Soft Contrast",
        warna: {
          ...warna,
          secondary: mixHex(warna.secondary, "#ffffff", 0.14),
          accent: mixHex(warna.accent, "#ffffff", 0.12),
          textMuted: mixHex(warna.textMuted, "#cbd5e1", 0.18),
        },
      };
    }

    if (seed === 2) {
      return {
        paletteName: "Rich Amber Depth",
        warna: {
          ...warna,
          secondary: mixHex(warna.secondary, warna.accent, 0.3),
          accent: mixHex(warna.accent, "#f8fafc", 0.2),
          bg: mixHex(warna.bg, "#020617", 0.2),
        },
      };
    }

    return {
      paletteName: "Slate Premium",
      warna: {
        ...warna,
        primary: mixHex(warna.primary, "#1e293b", 0.25),
        secondary: mixHex(warna.secondary, "#e2e8f0", 0.1),
        accent: mixHex(warna.accent, "#cbd5e1", 0.15),
      },
    };
  }

  if (seed === 1) {
    return {
      paletteName: "Warm Luxe",
      warna: {
        ...warna,
        primary: mixHex(warna.primary, "#111827", 0.1),
        secondary: mixHex(warna.secondary, "#0f172a", 0.12),
        accent: mixHex(warna.accent, "#ffffff", 0.22),
        bg: mixHex(warna.bg, "#ffffff", 0.08),
      },
    };
  }

  if (seed === 2) {
    return {
      paletteName: "Soft Commercial",
      warna: {
        ...warna,
        primary: mixHex(warna.primary, "#0f172a", 0.08),
        secondary: mixHex(warna.secondary, warna.primary, 0.18),
        accent: mixHex(warna.accent, "#ffffff", 0.28),
        textMuted: mixHex(warna.textMuted, "#475569", 0.16),
      },
    };
  }

  return {
    paletteName: "Crisp Trust",
    warna: {
      ...warna,
      secondary: mixHex(warna.secondary, "#1d4ed8", 0.14),
      accent: mixHex(warna.accent, "#eff6ff", 0.2),
      bg: mixHex(warna.bg, "#f8fafc", 0.2),
    },
  };
}

function buildSectionBlueprint(kategori: string): SectionRequirement[] {
  const direct = CATEGORY_SECTION_APPEND[kategori] || [];
  const fuzzy = Object.entries(CATEGORY_SECTION_APPEND).find(([k]) =>
    kategori.toLowerCase().includes(k.toLowerCase())
  )?.[1] || [];

  const additional = direct.length ? direct : fuzzy;
  return [...BASE_SECTION_BLUEPRINT, ...additional];
}

function extractEnrichedKeywords(enriched?: EnrichedData | null): string[] {
  const layanan = Array.isArray(enriched?.layanan) ? enriched!.layanan : [];
  const deskripsi = enriched?.deskripsi ? [enriched.deskripsi] : [];
  const raw = [...layanan, ...deskripsi].join(" ").toLowerCase();

  const keywords = raw
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4)
    .filter((word) => !["dengan", "untuk", "yang", "pada", "dari", "dan", "kami", "anda", "medan"].includes(word));

  return Array.from(new Set(keywords)).slice(0, 6);
}

function buildUnsplashQueries(biz: BusinessData): string[] {
  const categoryQueries = getEnglishImageKeywords(biz);
  const nameCore = biz.nama_bisnis
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 3)
    .join(" ");
  const enrichedKeywords = extractEnrichedKeywords(biz.enriched_data);

  const queries = [
    `${biz.kategori} storefront`,
    `${biz.kategori} interior`,
    `${biz.kategori} service indonesia`,
    `${biz.kategori} business medan`,
    nameCore ? `${nameCore} ${biz.kategori}` : "",
    ...categoryQueries,
    ...enrichedKeywords.map((kw) => `${biz.kategori} ${kw}`),
    "indonesia local business",
  ].filter(Boolean);

  return Array.from(new Set(queries));
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

  const keywords = buildUnsplashQueries(biz);
  const imageMap = new Map<string, RankedImageCandidate>();
  const categoryToken = biz.kategori.toLowerCase().split(/\s+/).filter(Boolean);

  for (let queryIndex = 0; queryIndex < keywords.length; queryIndex++) {
    const query = keywords[queryIndex];

    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query
      )}&orientation=landscape&order_by=relevant&per_page=30&content_filter=high`;

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
        const rawUrl = item?.urls?.regular || item?.urls?.full || item?.urls?.raw;
        if (!rawUrl) continue;

        const alt = String(item?.alt_description || "").toLowerCase();
        const tokenMatch = categoryToken.some((token) => token.length > 2 && alt.includes(token));
        const isEarlyQuery = queryIndex < 4;
        const baseScore = 100 - queryIndex * 3;
        const relevanceBonus = tokenMatch ? 18 : 0;
        const widthBonus = Number(item?.width || 0) >= 1600 ? 6 : 0;
        const score = baseScore + relevanceBonus + widthBonus;

        const current = imageMap.get(rawUrl);
        if (!current || score > current.score) {
          imageMap.set(rawUrl, {
            url: rawUrl,
            alt: item?.alt_description || `${biz.kategori} business visual`,
            credit: item?.user?.name || "Unsplash Contributor",
            score: score + (isEarlyQuery ? 8 : 0),
          });
        }
      }
    } catch (err: any) {
      console.warn(`[AI Generator] Unsplash fetch error untuk query ${query}: ${err?.message || err}`);
    }
  }

  const ranked = Array.from(imageMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxImages)
    .map(({ score, ...img }) => img);

  return ranked;
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

function sanitizeCorruptedSvg(html: string): string {
  if (!html || !html.includes("<svg")) return html;

  const svgRegex = /<svg\b[\s\S]*?<\/svg>/gi;
  let sanitizedCount = 0;

  const sanitized = html.replace(svgRegex, (svgBlock) => {
    const pathRegex = /<path\b[^>]*\bd=(['"])([\s\S]*?)\1/gi;
    let match: RegExpExecArray | null;
    let corrupted = false;

    while ((match = pathRegex.exec(svgBlock)) !== null) {
      const d = match[2] || "";
      if (d.length > 1800 || /0h2m-2/i.test(d)) {
        corrupted = true;
        break;
      }
    }

    if (!corrupted) return svgBlock;
    sanitizedCount += 1;
    return '<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-current/15 text-current" aria-hidden="true">•</span>';
  });

  if (sanitizedCount > 0) {
    log("WARN", `SVG korup terdeteksi. ${sanitizedCount} blok diganti fallback icon-chip.`);
  }

  return sanitized;
}

const ICON_SHAPE_LIST = "circle dot, soft-square chip, ring badge, tiny divider line";

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
  const paletteVariant = buildPaletteVariant(config, biz.slug);
  const selectedVariant = pickDeterministic(
    VISUAL_VARIANTS,
    `${biz.slug}:${biz.kategori}:${paletteVariant.paletteName}`
  );
  const sectionBlueprint = buildSectionBlueprint(biz.kategori);
  const sectionBlueprintText = sectionBlueprint
    .map(
      (section, index) =>
        `${index + 1}. #${section.id} (${section.label}) — ${section.objective}\n   Wajib: ${section.requiredItems.join(", ")}`
    )
    .join("\n");

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
Palette : ${paletteVariant.paletteName}
Primary : ${paletteVariant.warna.primary} | Secondary: ${paletteVariant.warna.secondary} | Accent: ${paletteVariant.warna.accent}
BG      : ${paletteVariant.warna.bg} | Text: ${paletteVariant.warna.text} | Muted: ${paletteVariant.warna.textMuted}
Font    : Heading="${config.fontHeading.split(":")[0].replace(/\+/g, " ")}" Body="${config.fontBody.split(":")[0].replace(/\+/g, " ")}"
Tagline : "${config.heroTagline}" (kembangkan lebih spesifik)

=== STYLE DNA (ANTI-MONOTON) ===
Variant Name      : ${selectedVariant.name}
Layout Direction  : ${selectedVariant.layoutDirection}
Surface Style     : ${selectedVariant.surfaceStyle}
Motion Tone       : ${selectedVariant.motionTone}
CTA Style         : ${selectedVariant.ctaStyle}
Wajib mempertahankan identitas kategori bisnis, tapi hindari visual yang terlihat sama dengan output bisnis lain.

Aturan Estetika & Kreativitas:
1. TONE COMMITMENT: Tentukan satu tone ekstrem yang kohesif (misal: brutalist/raw, luxury/refined, playful, industrial) berdasarkan Vibe. Eksekusi dengan presisi tinggi.
2. DIFFERENTIATION: Buat satu hal yang UNFORGETTABLE. Jangan gunakan pattern komponen/layout template cookie-cutter yang gampang ditebak.
3. SPATIAL COMPOSITION: Gunakan layout asimetris, overlap elemen, generous negative space (atau controlled density). Jangan hanya menumpuk kotak-kotak biasa.
4. ATMOSPHERE: Jangan pakai background solid warna datar. Gunakan efek kontekstual: gradient mesh, noise texture tipis, pola geometris, transparansi berlapis, atau bayangan dramatis. 

=== STRUKTUR SECTION (WAJIB SEMUA ADA) ===
${config.komponen}

=== BLUEPRINT SECTION FINAL (WAJIB IKUT URUTAN) ===
${sectionBlueprintText}

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
- Jika skip foto di section → pakai gradient/dekorasi CSS (bukan box kosong).

=== COPYWRITING ===
Alur: Hook (masalah lokal) → Value prop (kenapa ${biz.nama_bisnis}) → Sosial proof (rating/ulasan) → CTA WhatsApp.
Bahasa Indonesia natural, hangat, profesional. Max 1-2 kalimat per blok. Hindari klaim bombastis.

=== HEAD (WAJIB PERSIS) ===
- <meta charset="UTF-8"> + viewport width=device-width,initial-scale=1.0
- <title>${biz.nama_bisnis} — [tagline singkat]</title>
- Google Fonts preconnect + link family=${config.fontHeading}&family=${config.fontBody}&display=swap
- <script src="https://cdn.tailwindcss.com"></script>
- Tailwind config script: colors {primary:"${paletteVariant.warna.primary}",secondary:"${paletteVariant.warna.secondary}",accent:"${paletteVariant.warna.accent}",brand:{bg:"${paletteVariant.warna.bg}",text:"${paletteVariant.warna.text}",muted:"${paletteVariant.warna.textMuted}"}}, fontFamily {heading:["${config.fontHeading.split(":")[0].replace(/\+/g, " ")}"],body:["${config.fontBody.split(":")[0].replace(/\+/g, " ")}"]}
- <style> wajib berisi: * reset, html scroll-behavior:smooth, body font+bg+color, h1/h2/h3 font-heading, .icon-chip{width:1.5rem;height:1.5rem;display:inline-flex;align-items:center;justify-content:center;border-radius:9999px;background:color-mix(in srgb,currentColor 14%,transparent);flex-shrink:0}, .noise::before{noise PNG/SVG data URI opacity:0.03}, .reveal{opacity:0 translateY(2rem) transition .7s}+.reveal.visible{opacity:1 translateY(0)}+delay variants 1-4, .wa-float{fixed bottom-8 right-8 z-9999 bg-#25d366 rounded-full px-6 py-3.5 flex gap-2 font-semibold shadow-lg transition}, .wa-float:hover{translateY(-3px)}, #navbar{transition bg+shadow}+#navbar.scrolled{bg:${isDark ? "rgba(13,13,13,.95)" : "rgba(255,255,255,.95)"} backdrop-blur-sm}, .deco-line{w-12 h-px bg-secondary mb-4}, .stars{color:#f59e0b}, @keyframes fade-up+float-soft+hover-lift

=== ICONS ===
Hindari SVG path kompleks/manual (rawan korup). JANGAN pakai emoji Unicode.
Gunakan icon visual berbasis HTML+CSS sederhana dengan class .icon-chip.
Bentuk yang diizinkan: ${ICON_SHAPE_LIST}.

=== FLOATING WA BUTTON (WAJIB) ===
<a href="${waLink}" target="_blank" class="wa-float" aria-label="Chat WhatsApp"><span class="icon-chip" aria-hidden="true">•</span><span>Chat via WhatsApp</span></a>

=== SCRIPT SEBELUM </body> (WAJIB) ===
1. Navbar: toggle class "scrolled" pada #navbar saat scrollY>50
2. Scroll reveal: IntersectionObserver threshold:0.1 pada .reveal → add class "visible"
3. Parallax: window scroll → style.transform translateY(scrollY*speed) pada [data-parallax]
4. Smooth anchor: querySelectorAll('a[href^="#"]') → scrollIntoView({behavior:"smooth"})

=== ATURAN KRITIS ===
- HTML valid: DOCTYPE+html+head+body. No TODO/placeholder/debug. Hanya Tailwind CDN+GFonts+vanillaJS.
- Mobile-first 360px+, max-w-6xl container, no overflow-x. Kontras terbaca, body min 16px.
- Section IDs minimal: #layanan #keunggulan #tentang #kontak (+ section tambahan sesuai blueprint).
- HERO: min-h-screen, gradient/mesh bg (bukan flat solid), nama bisnis text-6xl+${ratingBadge ? `, badge rating "${ratingBadge}"` : ""}, 2 CTAs, decorative absolutes, hero image.
- LAYANAN: bento (1 featured + beberapa kecil) atau alternating icon-teks, tiap item punya icon-chip HTML+CSS.
- KEUNGGULAN: bg kontras, grid 2x2 atau h-scroll, angka besar jika relevan.
- KONTAK: location+phone+clock lewat icon-chip, tombol WA mencolok, tombol Maps → ${mapsLink}.
- FOOTER: bg primary, text kontras, nama+tagline+copyright.

=== LARANGAN ===
DILARANG: emoji unicode | bg abu flat (#f5f5f5 dll) | border tebal default | tombol biru Tailwind (kecuali brand biru) | kartu identik semua | hero heading <text-5xl | Lorem ipsum | gambar box kosong | hotlink selain Unsplash | markdown fence output

=== QUALITY CHECK ===
- Premium & spesifik kategori "${biz.kategori}", bukan template generik
- Hero kuat, CTA visible, diferensiasi visual antar section
- Copy manusiawi & persuasif untuk audiens lokal Medan
- No overflow horizontal, no URL <img> berulang, animasi halus
- Tidak ada SVG path panjang/aneh yang rawan rusak

Sebelum menulis output final, lakukan SELF-CHECK internal (jangan ditampilkan) dan pastikan:
1) Semua section pada blueprint ada dan berurutan.
2) Warna, layout, dan motif berbeda dari template generik.
3) Gambar relevan kategori dan tidak duplikat URL.
4) Semua CTA mengarah ke link yang benar.

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
    const safeHtml = sanitizeCorruptedSvg(uniqueHtml);
    const finalHtml = injectImageFallbackScript(safeHtml, biz, imageCandidates);
    log("OK", `Final HTML siap: ${finalHtml.length} chars / ${(finalHtml.length / 1024).toFixed(1)} KB`);
    return finalHtml;
  }

  const htmlOpenIdx = text.indexOf("<html");
  if (htmlOpenIdx !== -1 && htmlEndIdx !== -1) {
    const html = text.slice(htmlOpenIdx, htmlEndIdx + 7);
    log("WARN", `HTML diekstrak (tanpa DOCTYPE): ${html.length} chars`);
    const uniqueHtml = enforceUniqueImageSources(html, imageCandidates);
    const safeHtml = sanitizeCorruptedSvg(uniqueHtml);
    const finalHtml = injectImageFallbackScript(safeHtml, biz, imageCandidates);
    log("OK", `Final HTML siap: ${finalHtml.length} chars / ${(finalHtml.length / 1024).toFixed(1)} KB`);
    return finalHtml;
  }

  log("WARN", `HTML tags tidak ditemukan! Returning raw text (${text.length} chars)`);
  console.warn(`[AI Generator] HTML tags not found, returning raw text (${text.length} chars)`);
  return injectImageFallbackScript(sanitizeCorruptedSvg(text), biz, imageCandidates);
}

function buildPolishPrompt(biz: BusinessData, draftHtml: string): string {
  return `Kamu adalah senior art director + frontend architect.
Tugasmu: PERBAIKI HTML berikut agar hasilnya naik kelas jadi premium, modern, dan lebih berkarakter.

=== KONTEKS BISNIS ===
Nama: ${biz.nama_bisnis}
Kategori: ${biz.kategori}
Alamat: ${biz.alamat || "Medan"}

=== TUJUAN REDESIGN ===
1. Tingkatkan visual hierarchy (hero lebih dramatis, CTA lebih jelas).
2. Tingkatkan design depth (komposisi asimetris, layering, rhythm antar section).
3. Tingkatkan typography contrast (heading vs body lebih tegas).
4. Buat tetap mobile-friendly, ringan, dan tidak overflow horizontal.

=== BATASAN KRITIS ===
1. Pertahankan section IDs utama: #layanan #keunggulan #tentang #kontak.
2. Pertahankan link bisnis yang sudah benar (WhatsApp, maps, kontak).
3. Jangan pakai SVG path kompleks. Gunakan icon-chip HTML+CSS sederhana.
4. Jangan output markdown fence. Output hanya HTML utuh.

=== INPUT HTML DRAFT ===
${draftHtml}

=== OUTPUT ===
Kembalikan HTML final yang sudah dipoles, mulai dari <!DOCTYPE html>.`;
}

async function polishWithOpenRouter(
  modelId: string,
  openrouterKey: string,
  draftHtml: string,
  biz: BusinessData,
  imageCandidates: ImageCandidate[]
): Promise<string> {
  try {
    const polishPrompt = buildPolishPrompt(biz, draftHtml);
    log("INFO", `[Polish] OpenRouter ${modelId} dimulai...`);

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: polishPrompt }],
        max_tokens: 65536,
        temperature: 0.45,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenRouter polish HTTP ${res.status}: ${body.slice(0, 220)}`);
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("OpenRouter polish response kosong");

    const polished = extractHTML(text, biz, imageCandidates);
    log("OK", `[Polish] OpenRouter selesai: ${(polished.length / 1024).toFixed(1)} KB`);
    return polished;
  } catch (err: any) {
    log("WARN", `[Polish] OpenRouter gagal, fallback ke draft: ${err?.message}`);
    return draftHtml;
  }
}

async function polishWithGemini(
  model: any,
  modelName: string,
  draftHtml: string,
  biz: BusinessData,
  imageCandidates: ImageCandidate[]
): Promise<string> {
  try {
    const polishPrompt = buildPolishPrompt(biz, draftHtml);
    log("INFO", `[Polish] Gemini ${modelName} dimulai...`);
    const result = await model.generateContent(polishPrompt);
    const text = result.response.text();
    if (!text) throw new Error("Gemini polish response kosong");

    const polished = extractHTML(text, biz, imageCandidates);
    log("OK", `[Polish] Gemini selesai: ${(polished.length / 1024).toFixed(1)} KB`);
    return polished;
  } catch (err: any) {
    log("WARN", `[Polish] Gemini gagal, fallback ke draft: ${err?.message}`);
    return draftHtml;
  }
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

        const draftHtml = extractHTML(text, biz, imageCandidates);
        return await polishWithOpenRouter(
          model.id,
          apiKey,
          draftHtml,
          biz,
          imageCandidates
        );

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

        const draftHtml = extractHTML(text, biz, imageCandidates);
        const polishedHtml = await polishWithOpenRouter(
          selectedProvider,
          openrouterKey,
          draftHtml,
          biz,
          imageCandidates
        );
        const totalElapsed = ((Date.now() - overallStart) / 1000).toFixed(1);
        log("DONE", `Generate selesai! Total waktu: ${totalElapsed}s | HTML: ${(polishedHtml.length / 1024).toFixed(1)} KB`);
        return polishedHtml;

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

            const draftHtml = extractHTML(text, biz, imageCandidates);
            const polishedHtml = await polishWithGemini(
              model,
              modelName,
              draftHtml,
              biz,
              imageCandidates
            );
            const totalElapsed = ((Date.now() - overallStart) / 1000).toFixed(1);
            log("DONE", `Generate Gemini selesai! Total waktu: ${totalElapsed}s | HTML: ${(polishedHtml.length / 1024).toFixed(1)} KB`);
            return polishedHtml;

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