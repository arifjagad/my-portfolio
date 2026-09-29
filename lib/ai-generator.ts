/**
 * lib/ai-generator.ts
 * Generate HTML demo page via 9router lokal (default), Gemini API, atau OpenRouter
 *
 * Strategi:
 * - Prompt struktural: scaffolding HTML diberikan, AI mengisi konten & style
 * - Negative prompt agresif untuk mencegah output generik
 * - Merge data mentah + enriched_data
 * - Retry otomatis 3x jika Gemini gagal
 * - Fallback otomatis ke OpenRouter jika semua model Gemini habis
 * - Batas waktu total (budget) agar selesai sebelum timeout serverless;
 *   tahap polish dilewati otomatis jika sisa waktu tidak cukup
 * - Return HTML string siap pakai
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { OPENROUTER_MODELS } from "./openrouter-models";
import { AsyncLocalStorage } from "node:async_hooks";
import { log, runLogSession } from "./generate-logger";
import { DEFAULT_PROVIDER, isNineRouterProvider, nineRouterModelOf } from "./ai-providers";
import { isRunningOnVercel, requireNineRouter, streamChatCompletion } from "./ninerouter";
import { toGoogleFontParam, type BrandBrief } from "./brand-brief";

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
  keyword?: string | null;
  enriched_data?: EnrichedData | null;
  research_brief?: BrandBrief | null;
  /** Foto asli bisnis (https / data URL). Di prompt dirujuk sebagai token BRAND_IMG_n. */
  brand_images?: string[] | null;
}

export interface EnrichedData {
  jam_buka?: string;
  deskripsi?: string;
  layanan?: string[];
  keunggulan?: string[];
  catatan_internal?: string;
}

// ─── Time budget ──────────────────────────────────────────────────────────────
// Di Vercel route generate dibatasi maxDuration 300 dtk, jadi budget 270 dtk.
// Di laptop (9router) tidak ada batas serverless; budget hanya pengaman.
// Semua retry, jeda rate limit, dan tahap polish harus muat di dalam budget.
const VERCEL_BUDGET_MS = 270_000;
const LOCAL_BUDGET_MS = 900_000;

function resolveBudgetMs(): number {
  const fromEnv = Number(process.env.GENERATE_BUDGET_MS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return isRunningOnVercel() ? VERCEL_BUDGET_MS : LOCAL_BUDGET_MS;
}
const MIN_REQUEST_MS = 45_000;   // sisa minimal untuk memulai request generate baru
const MIN_POLISH_MS = 100_000;   // polish rata-rata ~110 dtk di log produksi
const SAFETY_MARGIN_MS = 5_000;

interface GenerateBudget {
  deadline: number;
  polish: boolean;
}

const budgetStore = new AsyncLocalStorage<GenerateBudget>();

class BudgetExceededError extends Error {
  constructor(context: string) {
    super(`Batas waktu generate habis (${context}). Coba lagi atau matikan polish.`);
    this.name = "BudgetExceededError";
  }
}

function remainingMs(): number {
  const budget = budgetStore.getStore();
  return budget ? budget.deadline - Date.now() : Infinity;
}

function assertBudget(context: string): void {
  if (remainingMs() < MIN_REQUEST_MS) throw new BudgetExceededError(context);
}

/** AbortSignal yang putus tepat sebelum deadline, agar request AI tidak menggantung. */
function requestSignal(): AbortSignal | undefined {
  const remaining = remainingMs();
  if (!Number.isFinite(remaining)) return undefined;
  return AbortSignal.timeout(Math.max(remaining - SAFETY_MARGIN_MS, 1_000));
}

async function waitWithinBudget(ms: number, context: string): Promise<void> {
  if (remainingMs() - ms < MIN_REQUEST_MS) throw new BudgetExceededError(context);
  await new Promise((r) => setTimeout(r, ms));
}

function canPolish(): boolean {
  const budget = budgetStore.getStore();
  if (budget && !budget.polish) {
    log("INFO", "[Polish] Dilewati (dimatikan dari admin)");
    return false;
  }
  const remaining = remainingMs();
  if (remaining < MIN_POLISH_MS) {
    log("WARN", `[Polish] Dilewati — sisa waktu ${(remaining / 1000).toFixed(0)}s tidak cukup, pakai draft`);
    return false;
  }
  return true;
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
    cssTheme: "light",
  },
  "Toko Pakaian": {
    vibe: "Fashion boutique editorial. Seperti lookbook brand lokal (Erigo, Cotton Ink): clean, trendy, visual koleksi jadi pusat perhatian.",
    warna: {
      primary: "#18181b",
      secondary: "#c2410c",
      accent: "#fde8d7",
      bg: "#fafaf9",
      text: "#18181b",
      textMuted: "#71717a",
    },
    fontHeading: "Syne:wght@600;700;800",
    fontBody: "Manrope:wght@300;400;500",
    heroTagline: "Gaya Baru Setiap Hari",
    cssTheme: "light",
  },
  "Minimarket": {
    vibe: "Minimarket modern yang ramah dan cepat. Seperti Indomaret/Alfamart versi lokal: cerah, praktis, menonjolkan kelengkapan dan promo.",
    warna: {
      primary: "#14532d",
      secondary: "#16a34a",
      accent: "#fef08a",
      bg: "#f7fdf8",
      text: "#0f2918",
      textMuted: "#4d6b57",
    },
    fontHeading: "Outfit:wght@600;700;800",
    fontBody: "Outfit:wght@300;400;500",
    heroTagline: "Belanja Harian, Dekat dan Lengkap",
    cssTheme: "light",
  },
  "Toko Roti": {
    vibe: "Artisan bakery yang hangat. Seperti bakery artisan Jakarta: homemade, aroma roti baru keluar oven, menggugah selera.",
    warna: {
      primary: "#3f2a1d",
      secondary: "#d97706",
      accent: "#fde9c9",
      bg: "#fffaf2",
      text: "#3f2a1d",
      textMuted: "#8a6a52",
    },
    fontHeading: "Fraunces:wght@500;600;700",
    fontBody: "Nunito:wght@300;400;600",
    heroTagline: "Dipanggang Segar Setiap Hari",
    cssTheme: "light",
  },
  "Salon Rambut": {
    vibe: "Hair studio urban yang segar dan stylish. Fokus ke hasil potongan, warna, dan perawatan rambut.",
    warna: {
      primary: "#1f1b2e",
      secondary: "#be185d",
      accent: "#fce7f3",
      bg: "#fdfbfc",
      text: "#1f1b2e",
      textMuted: "#6b6478",
    },
    fontHeading: "DM+Serif+Display",
    fontBody: "DM+Sans:wght@300;400;500",
    heroTagline: "Rambut Sehat, Tampil Percaya Diri",
    cssTheme: "light",
  },
  "Toko Oleh-oleh": {
    vibe: "Toko oleh-oleh khas Medan yang bangga lokal. Seperti Bolu Meranti atau Bika Ambon Zulaikha: hangat, autentik, cocok untuk wisatawan.",
    warna: {
      primary: "#7c2d12",
      secondary: "#ea580c",
      accent: "#fed7aa",
      bg: "#fffbf5",
      text: "#431407",
      textMuted: "#9a5b3c",
    },
    fontHeading: "Playfair+Display:wght@500;700",
    fontBody: "Poppins:wght@300;400;500",
    heroTagline: "Oleh-oleh Khas Medan, Dibawa Pulang dengan Bangga",
    cssTheme: "light",
  },
};

// Kategori Google Maps yang tidak punya config sendiri → key KATEGORI_CONFIG
const KATEGORI_ALIASES: Record<string, string> = {
  "kedai kopi": "Kafe",
  "coffee shop": "Kafe",
  "toko swalayan": "Minimarket",
  "supermarket": "Minimarket",
  "toko bahan makanan": "Minimarket",
  "toko kelontong": "Minimarket",
  "toko kue": "Toko Roti",
  "salon rambut": "Salon Rambut",
  "ahli estetika": "Salon Kecantikan",
  "toko suvenir": "Toko Oleh-oleh",
  "toko suku cadang motor": "Bengkel Sepeda Motor",
  "butik": "Toko Pakaian",
  "toko busana": "Toko Pakaian",
};

// Fallback dari keyword scraping saat kategori kosong / "Lainnya"
const KEYWORD_ALIASES: Record<string, string> = {
  "toko baju": "Toko Pakaian",
  "salon": "Salon Kecantikan",
  "apotek": "Apotek",
  "bengkel motor": "Bengkel Sepeda Motor",
  "minimarket": "Minimarket",
  "toko oleh-oleh": "Toko Oleh-oleh",
  "klinik": "Klinik Medis",
  "optik": "Toko Optik",
  "restoran": "Restoran",
  "rumah makan": "Rumah Makan",
  "cafe": "Kafe",
  "barbershop": "Barbershop",
  "hotel": "Hotel",
};

// Key terpanjang dicek dulu agar "Bengkel Sepeda Motor" menang atas "Bengkel"
const CONFIG_KEYS_BY_LENGTH = Object.keys(KATEGORI_CONFIG).sort((a, b) => b.length - a.length);

function resolveKategoriKey(biz: Pick<BusinessData, "kategori" | "keyword">): string | null {
  const kategori = (biz.kategori || "").trim();
  const lower = kategori.toLowerCase();

  if (KATEGORI_CONFIG[kategori]) return kategori;
  if (KATEGORI_ALIASES[lower]) return KATEGORI_ALIASES[lower];

  const fuzzy = CONFIG_KEYS_BY_LENGTH.find((key) => lower.includes(key.toLowerCase()));
  if (fuzzy) return fuzzy;

  return KEYWORD_ALIASES[(biz.keyword || "").trim().toLowerCase()] ?? null;
}

/** Palet & tema kategori, dipakai riset sebagai cadangan jika warna dari AI tidak valid. */
export function getCategoryDesignFallback(biz: Pick<BusinessData, "kategori" | "keyword">) {
  const key = resolveKategoriKey(biz);
  const config = (key && KATEGORI_CONFIG[key]) || DEFAULT_CONFIG;
  return { kategoriKey: key, palette: config.warna, vibe: config.vibe, theme: config.cssTheme };
}

/** Label kategori untuk prompt & query gambar; "Lainnya" diganti hasil resolve/keyword. */
function displayKategori(biz: BusinessData): string {
  const kategori = (biz.kategori || "").trim();
  if (kategori && kategori.toLowerCase() !== "lainnya") return kategori;
  return resolveKategoriKey(biz) ?? (biz.keyword?.trim() || "Bisnis Lokal");
}

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
  cssTheme: "light",
};

// ─── Arketipe halaman ─────────────────────────────────────────────────────────
// Struktur halaman mengikuti apa yang dicari pengunjung jenis bisnis ini,
// bukan blueprint landing page generik (hero → layanan → keunggulan → tentang).
interface PageSection {
  id: string;
  label: string;
  guide: string;
}

interface PageArchetype {
  label: string;
  visitorQuestions: string[];
  sections: PageSection[];
  photoSubjects: string;
}

const CONTACT_SECTION: PageSection = {
  id: "kontak",
  label: "Jam buka & lokasi",
  guide: "Alamat lengkap, jam buka, telepon, tombol Maps & WhatsApp. Dua kolom sederhana, tanpa kartu berhias.",
};

const REVIEW_SECTION: PageSection = {
  id: "ulasan",
  label: "Kata pelanggan",
  guide: "Rating Google + 2-3 kutipan pendek hasil parafrase dari 'yang dipuji pelanggan'. Tanpa nama orang, tanpa foto orang. Lewati jika faktanya tidak ada.",
};

const PAGE_ARCHETYPES: Record<string, PageArchetype> = {
  kuliner: {
    label: "Kuliner",
    visitorQuestions: [
      "Makanannya apa dan kelihatan enak atau tidak?",
      "Harganya berapa?",
      "Buka jam berapa dan di mana?",
      "Bisa pesan antar atau reservasi?",
    ],
    sections: [
      { id: "beranda", label: "Hero", guide: "Foto hidangan paling khas sebagai visual utama (bukan gedung). Nama bisnis, satu kalimat jelas tentang apa yang disajikan, jam buka, 1 tombol utama (pesan/reservasi via WhatsApp) + tautan 'Lihat menu'." },
      { id: "menu", label: "Menu", guide: "Disusun seperti menu cetak, BUKAN kartu: kelompokkan per jenis (makanan utama, sup, minuman, penutup); tiap baris nama + deskripsi 1 baris + harga rata kanan dengan garis titik. Ini bagian terpanjang halaman. Produk tanpa harga tetap dicantumkan tanpa harga." },
      { id: "suasana", label: "Makan di tempat", guide: "Satu foto besar + paragraf pendek tentang pengalaman di tempat, hanya dari fasilitas nyata (mis. area lesehan). Bukan grid." },
      REVIEW_SECTION,
      { id: "pesan", label: "Cara pesan", guide: "Daftar sederhana: makan di tempat, bungkus, pesan antar (sebut platform yang benar-benar ada), reservasi. Tiap cara dengan tombol/tautan yang sesuai." },
      CONTACT_SECTION,
    ],
    photoSubjects: "hidangan dari menu, detail bahan/masakan, suasana makan di dalam ruangan",
  },
  perawatan: {
    label: "Perawatan diri (salon, barbershop)",
    visitorQuestions: [
      "Hasil potongan / perawatannya seperti apa?",
      "Layanan apa saja dan berapa harganya?",
      "Bisa booking kapan, buka jam berapa?",
      "Lokasinya di mana?",
    ],
    sections: [
      { id: "beranda", label: "Hero", guide: "Foto hasil atau proses layanan. Nama, layanan utama dalam satu kalimat, jam buka, tombol booking WhatsApp." },
      { id: "layanan", label: "Layanan & harga", guide: "Daftar harga tipografis dikelompokkan per jenis layanan (nama — durasi bila ada — harga). Bukan kartu." },
      { id: "hasil", label: "Hasil", guide: "Galeri 3-6 foto hasil/proses tanpa bingkai kartu dan tanpa caption panjang." },
      REVIEW_SECTION,
      CONTACT_SECTION,
    ],
    photoSubjects: "rambut/wajah hasil perawatan, proses potong/styling, peralatan salon/barber",
  },
  kesehatan: {
    label: "Kesehatan (apotek, klinik, optik)",
    visitorQuestions: [
      "Layanan atau produk yang saya butuhkan tersedia?",
      "Buka / praktik jam berapa?",
      "Bagaimana cara konsultasi, pesan, atau daftar?",
      "Lokasinya di mana?",
    ],
    sections: [
      { id: "beranda", label: "Hero", guide: "Tenang dan informatif: nama, layanan inti dalam satu kalimat, jam buka hari ini, tombol WhatsApp/telepon. Foto opsional." },
      { id: "layanan", label: "Layanan", guide: "Daftar layanan/produk dikelompokkan dengan kalimat informatif singkat. Tanpa klaim medis." },
      { id: "jadwal", label: "Jadwal", guide: "Tabel jam buka / jam praktik bila ada di fakta. Lewati jika tidak ada." },
      { id: "cara", label: "Cara konsultasi / pesan", guide: "Langkah bernomor hanya jika memang berurutan (mis. kirim resep via WhatsApp → konfirmasi → ambil/antar)." },
      REVIEW_SECTION,
      CONTACT_SECTION,
    ],
    photoSubjects: "rak obat/produk, pemeriksaan, kacamata/frame, ruang tunggu yang bersih",
  },
  otomotif: {
    label: "Otomotif (bengkel)",
    visitorQuestions: [
      "Bisa menangani kendaraan / masalah saya?",
      "Kira-kira biayanya berapa?",
      "Buka jam berapa, perlu antre?",
      "Lokasinya di mana?",
    ],
    sections: [
      { id: "beranda", label: "Hero", guide: "Foto pengerjaan kendaraan. Nama, jenis kendaraan/servis yang ditangani, jam buka, tombol booking WhatsApp." },
      { id: "layanan", label: "Layanan & biaya", guide: "Daftar/tabel layanan dengan estimasi biaya bila ada di fakta. Bukan kartu." },
      REVIEW_SECTION,
      CONTACT_SECTION,
    ],
    photoSubjects: "mekanik mengerjakan motor/mobil, suku cadang, peralatan bengkel",
  },
  toko: {
    label: "Toko (pakaian, minimarket, oleh-oleh)",
    visitorQuestions: [
      "Barang apa yang dijual?",
      "Harganya berapa?",
      "Bisa beli online / diantar?",
      "Buka jam berapa dan di mana?",
    ],
    sections: [
      { id: "beranda", label: "Hero", guide: "Foto produk. Nama, apa yang dijual dalam satu kalimat, jam buka, tombol WhatsApp." },
      { id: "produk", label: "Produk", guide: "Jika ada foto produk relevan: grid foto + nama + harga tanpa bingkai kartu. Jika tidak: daftar kategori produk + harga." },
      { id: "beli", label: "Cara beli", guide: "Datang langsung, WhatsApp, marketplace/pesan antar yang benar-benar ada." },
      REVIEW_SECTION,
      CONTACT_SECTION,
    ],
    photoSubjects: "produk yang dijual (pakaian, makanan kemasan, kue), rak/display produk di dalam toko",
  },
  penginapan: {
    label: "Penginapan",
    visitorQuestions: [
      "Kamarnya seperti apa?",
      "Harganya berapa per malam?",
      "Fasilitas apa saja dan lokasinya dekat apa?",
      "Bagaimana cara reservasi?",
    ],
    sections: [
      { id: "beranda", label: "Hero", guide: "Foto kamar/lobi. Nama, lokasi singkat, tombol reservasi WhatsApp." },
      { id: "kamar", label: "Kamar", guide: "Tipe kamar dengan foto, kapasitas, dan harga bila ada di fakta." },
      { id: "fasilitas", label: "Fasilitas", guide: "Daftar sederhana dua kolom, bukan kartu ber-icon." },
      REVIEW_SECTION,
      CONTACT_SECTION,
    ],
    photoSubjects: "kamar tidur, kamar mandi, lobi, sarapan",
  },
  umum: {
    label: "Usaha lokal",
    visitorQuestions: [
      "Usaha ini menjual / melayani apa?",
      "Berapa harganya?",
      "Bagaimana cara menghubungi atau memesan?",
      "Buka jam berapa dan di mana?",
    ],
    sections: [
      { id: "beranda", label: "Hero", guide: "Nama, apa yang ditawarkan dalam satu kalimat konkret, jam buka, tombol WhatsApp." },
      { id: "layanan", label: "Produk / layanan", guide: "Daftar produk/layanan dengan harga bila ada. Bukan kartu seragam." },
      REVIEW_SECTION,
      CONTACT_SECTION,
    ],
    photoSubjects: "produk atau layanan yang benar-benar dijual",
  },
};

const ARCHETYPE_BY_KATEGORI: Record<string, keyof typeof PAGE_ARCHETYPES> = {
  "Kafe": "kuliner",
  "Restoran": "kuliner",
  "Rumah Makan": "kuliner",
  "Toko Roti": "kuliner",
  "Salon Kecantikan": "perawatan",
  "Salon Rambut": "perawatan",
  "Barbershop": "perawatan",
  "Tempat Cukur Rambut": "perawatan",
  "Apotek": "kesehatan",
  "Klinik Medis": "kesehatan",
  "Klinik": "kesehatan",
  "Toko Optik": "kesehatan",
  "Bengkel Sepeda Motor": "otomotif",
  "Bengkel": "otomotif",
  "Toko Pakaian": "toko",
  "Minimarket": "toko",
  "Toko Oleh-oleh": "toko",
  "Hotel": "penginapan",
};

function resolveArchetype(kategoriKey: string | null): PageArchetype {
  return PAGE_ARCHETYPES[(kategoriKey && ARCHETYPE_BY_KATEGORI[kategoriKey]) || "umum"];
}

// ─── Anti-slop ────────────────────────────────────────────────────────────────
// Ciri halaman "buatan AI" yang dilarang di prompt generate dan diaudit saat polish.
const BANNED_PATTERNS = [
  "Label kecil huruf kapital / bergaris di atas judul section (eyebrow). Maksimal satu di seluruh halaman.",
  "Kartu bernomor (01, 02, 03) dan badge kecil di pojok kartu seperti \"FOKUS UTAMA\", \"EKSKLUSIF\".",
  "Baris statistik (100%, 24/7, 500+, 10 tahun) kecuali angka persis dari fakta; rating & jumlah ulasan Google boleh.",
  "Judul dengan satu kata/frasa dimiringkan atau diberi warna berbeda.",
  "Tautan \"Selengkapnya →\" / \"Pesan sekarang →\" di setiap item atau kartu.",
  "Grid kartu berbingkai seragam di lebih dari satu section.",
  "Titik, bulatan, atau kotak kosong sebagai pengganti icon; emoji.",
  "Section \"Kenapa memilih kami\" / \"Keunggulan\" berisi 3-4 poin abstrak.",
  "Testimoni dengan nama orang, foto orang, atau kutipan karangan.",
  "Hero layar penuh dengan heading raksasa tanpa informasi (apa yang dijual, jam buka).",
  "Glow, blur, glassmorphism, gradient mesh, garis dekoratif, dan ornamen yang tidak berasal dari identitas bisnis.",
];

const BANNED_WORDS = [
  "otentik", "autentik", "premium", "eksklusif", "imersif", "dedikasi", "berkomitmen",
  "menghadirkan", "hadir untuk", "solusi", "terbaik", "terpercaya", "berkualitas tinggi",
  "tak terlupakan", "memanjakan", "kemewahan", "mewah", "destinasi", "surga", "sempurna",
  "unggulan", "istimewa", "cita rasa", "pengalaman kuliner",
];

// ─── Phone number cleaner ─────────────────────────────────────────────────────
function cleanPhone(phone: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "").replace(/^0/, "62");
}

const UNSPLASH_TIMEOUT_MS = 8_000;

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
  "Toko Pakaian": ["clothing boutique interior", "fashion store clothes rack", "apparel shop display"],
  "Minimarket": ["convenience store aisle", "grocery store shelves", "mini market interior"],
  "Toko Roti": ["bakery display bread", "fresh baked pastries", "bakery shop interior"],
  "Salon Rambut": ["hair salon stylist cutting", "hair coloring salon", "modern hair salon interior"],
  "Toko Oleh-oleh": ["traditional indonesian snacks", "souvenir food shop", "cake gift box"],
};

function getEnglishImageKeywords(biz: BusinessData): string[] {
  const key = resolveKategoriKey(biz);
  if (key && IMAGE_KEYWORDS_EN[key]) return IMAGE_KEYWORDS_EN[key];

  return [`${biz.kategori} interior`, "small local business"];
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
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

/**
 * Query foto: kata kunci produk/suasana dari Brief riset dulu, lalu kategori.
 * Tanpa "storefront"/nama kota: hasilnya foto ruko & jalan milik usaha lain.
 */
function buildUnsplashQueries(biz: BusinessData): string[] {
  const briefQueries = biz.research_brief?.kata_kunci_foto ?? [];
  const categoryQueries = getEnglishImageKeywords(biz);
  return Array.from(new Set([...briefQueries, ...categoryQueries].map((q) => q.trim()).filter(Boolean)));
}

// Foto stok bangunan/jalan terlihat seperti tempat usaha lain → tidak dipakai
const UNWANTED_IMAGE_ALT = /\b(building|buildings|street|storefront|shopfront|facade|façade|signage|skyline|city|road|architecture|exterior)\b/i;

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
  const relevanceTokens = Array.from(
    new Set(keywords.join(" ").toLowerCase().split(/\s+/).filter((t) => t.length > 3))
  );

  // Semua query paralel; urutan hasil tetap mengikuti queryIndex untuk scoring
  const responses = await Promise.all(
    keywords.map(async (query) => {
      try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
          query
        )}&orientation=landscape&order_by=relevant&per_page=30&content_filter=high`;

        const res = await fetch(url, {
          headers: {
            Authorization: `Client-ID ${accessKey}`,
          },
          next: { revalidate: 86400 },
          signal: AbortSignal.timeout(UNSPLASH_TIMEOUT_MS),
        });

        if (!res.ok) {
          console.warn(`[AI Generator] Unsplash API gagal (${res.status}) untuk query: ${query}`);
          return [];
        }

        const data = await res.json();
        return Array.isArray(data?.results) ? (data.results as any[]) : [];
      } catch (err: any) {
        console.warn(`[AI Generator] Unsplash fetch error untuk query ${query}: ${err?.message || err}`);
        return [];
      }
    })
  );

  responses.forEach((results, queryIndex) => {
      for (const item of results) {
        const rawUrl = item?.urls?.regular || item?.urls?.full || item?.urls?.raw;
        if (!rawUrl) continue;

        const alt = String(item?.alt_description || "").toLowerCase();
        if (UNWANTED_IMAGE_ALT.test(alt)) continue;
        const tokenMatch = relevanceTokens.some((token) => alt.includes(token));
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
  });

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
    return "";
  });

  if (sanitizedCount > 0) {
    log("WARN", `SVG korup terdeteksi. ${sanitizedCount} blok dihapus.`);
  }

  return sanitized;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
/** Arah desain dari Brief riset menggantikan vibe/palet/font kategori; struktur section tetap dari kategori. */
function configFromBrief(brief: BrandBrief, base: KategoriConfig): KategoriConfig {
  const { visual } = brief;
  const vibeParts = [
    visual.tema,
    visual.mood.length ? `Mood: ${visual.mood.join(", ")}` : "",
    visual.motif ? `Motif dekorasi: ${visual.motif}` : "",
  ].filter(Boolean);

  return {
    vibe: vibeParts.join(". ") || base.vibe,
    warna: visual.palet,
    fontHeading: toGoogleFontParam(visual.font_heading),
    fontBody: toGoogleFontParam(visual.font_body),
    heroTagline: brief.identitas.tagline_saran || base.heroTagline,
    cssTheme: visual.theme,
  };
}

function buildFactsBlock(brief: BrandBrief): string {
  const lines: string[] = [];
  const list = (title: string, items: string[]) => {
    if (items.length) lines.push(`${title}:\n${items.map((i) => `• ${i}`).join("\n")}`);
  };

  if (brief.ringkasan) lines.push(`Ringkasan: ${brief.ringkasan}`);
  if (brief.identitas.cerita) lines.push(`Cerita: ${brief.identitas.cerita}`);
  if (brief.identitas.tahun_berdiri) lines.push(`Berdiri: ${brief.identitas.tahun_berdiri}`);
  if (brief.target_pelanggan) lines.push(`Target pelanggan: ${brief.target_pelanggan}`);
  list(
    "Produk / menu (nama — harga — deskripsi)",
    brief.produk.map((p) => [p.nama, p.harga ?? "harga tidak diketahui", p.deskripsi].filter(Boolean).join(" — "))
  );
  list("Layanan", brief.layanan);
  list("Fasilitas", brief.fasilitas);
  list("Yang dipuji pelanggan (dari ulasan)", brief.keunggulan_dari_ulasan);
  list("Kanal online", brief.kanal);
  list("TIDAK DITEMUKAN saat riset (jangan dikarang)", brief.tidak_ditemukan);

  return lines.join("\n");
}

function fontFamilyName(googleFontParam: string): string {
  return googleFontParam.split(":")[0].replace(/\+/g, " ");
}

function usableBrandImages(images: string[] | null | undefined): string[] {
  return (images ?? []).filter((src) => src.startsWith("https://") || src.startsWith("data:image/"));
}

/** Ganti token BRAND_IMG_n dengan foto asli. Dilakukan paling akhir agar data URL tidak ikut ke prompt. */
function applyBrandImages(html: string, images: string[] | null | undefined): string {
  const usable = usableBrandImages(images);
  if (usable.length === 0) return html;
  return html.replace(/BRAND_IMG_(\d+)/g, (token, n) => usable[Number(n) - 1] ?? token);
}

function buildPrompt(biz: BusinessData, imageCandidates: ImageCandidate[] = []): string {
  const enriched = biz.enriched_data;
  const brief = biz.research_brief ?? null;

  const kategoriKey = resolveKategoriKey(biz);
  const categoryConfig = (kategoriKey && KATEGORI_CONFIG[kategoriKey]) || DEFAULT_CONFIG;
  const config = brief ? configFromBrief(brief, categoryConfig) : categoryConfig;
  const palette = brief ? brief.visual.palet : buildPaletteVariant(config, biz.slug).warna;
  const archetype = resolveArchetype(kategoriKey);
  const headingFont = fontFamilyName(config.fontHeading);
  const bodyFont = fontFamilyName(config.fontBody);
  const isDark = config.cssTheme === "dark";

  const cleanedPhone = cleanPhone(biz.nomor_telepon);
  const waText = encodeURIComponent(`Halo ${biz.nama_bisnis}, saya mau tanya`);
  const waLink = cleanedPhone ? `https://wa.me/${cleanedPhone}?text=${waText}` : "#";
  const mapsLink = biz.link_gmaps || "#";

  const layananList = enriched?.layanan?.length
    ? enriched.layanan.map((l) => `• ${l}`).join("\n")
    : "(tidak ada data: tulis layanan umum yang pasti ada untuk jenis usaha ini, tanpa harga)";
  const keunggulanList = enriched?.keunggulan?.length
    ? enriched.keunggulan.map((k) => `• ${k}`).join("\n")
    : "(tidak ada data)";

  const businessBlock = brief
    ? `${buildFactsBlock(brief)}
Jam Buka: ${brief.jam_buka || "(tidak diketahui — tulis \"Hubungi kami untuk jam buka\")"}

ATURAN FAKTA (KRITIS):
- Semua produk, menu, harga, layanan, dan fasilitas HANYA dari daftar di atas. Jangan menambah item.
- Produk tanpa harga: tampilkan tanpa harga. Jangan menebak harga.
- Jangan mengarang tahun berdiri, penghargaan, jumlah pelanggan, nama pemilik, asal bahan, atau teknik masak yang tidak disebut.
- Kutipan pelanggan = parafrase dari "Yang dipuji pelanggan", tanpa klaim baru.`
    : `Jam Buka: ${enriched?.jam_buka || "(tidak diketahui)"}
Deskripsi: ${enriched?.deskripsi || "-"}
Layanan:
${layananList}
Keunggulan:
${keunggulanList}
Tanpa riset: jangan mengarang harga, menu spesifik, fasilitas, atau angka.`;

  const designSourceNote = brief
    ? `Hasil riset identitas bisnis (sumber palet: ${brief.visual.sumber_palet}). ${brief.visual.alasan_palet}`
    : `Tanpa riset: arah desain dari jenis usaha "${biz.kategori}".`;

  const ratingText = biz.rating
    ? `${String(biz.rating).replace(".", ",")} dari ${biz.jumlah_ulasan.toLocaleString("id-ID")} ulasan Google`
    : "";

  const sectionPlan = archetype.sections
    .map((section, i) => `${i + 1}. <section id="${section.id}"> ${section.label}\n   ${section.guide}`)
    .join("\n");

  const brandImages = usableBrandImages(biz.brand_images);
  const brandImageText = brandImages
    .map((_, i) => {
      const desc = brief?.gambar_brand.find((g) => g.index === i + 1)?.isi;
      return `BRAND_IMG_${i + 1}: ${desc ?? "foto milik bisnis ini (isi tidak dideskripsikan)"}`;
    })
    .join("\n");

  const imagePoolText = imageCandidates.length
    ? imageCandidates.map((img, idx) => `${idx + 1}. ${img.url} | alt: ${img.alt}`).join("\n")
    : "(tidak ada foto stok — buat halaman tanpa foto stok; tipografi & warna saja sudah cukup)";

  return `Kamu desainer web senior yang membuat situs untuk usaha lokal. Situs buatanmu terasa dibuat oleh orang yang sudah datang ke tempatnya: jelas, hemat, spesifik. Kamu tidak memakai template landing page.
Buat SATU file HTML untuk halaman demo "${biz.nama_bisnis}".

=== BISNIS ===
Nama     : ${biz.nama_bisnis}
Jenis    : ${biz.kategori}
Alamat   : ${biz.alamat || "Medan, Sumatera Utara"}
Telepon  : ${biz.nomor_telepon || "-"}
Rating   : ${ratingText || "Belum ada"}
${businessBlock}

=== YANG DICARI PENGUNJUNG (urut prioritas) ===
${archetype.visitorQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}
Ruang, ukuran, dan posisi di halaman mengikuti urutan ini. Pertanyaan nomor 1 harus terjawab di layar pertama.

=== STRUKTUR HALAMAN (${archetype.label}) ===
${sectionPlan}
Section yang faktanya tidak ada boleh dilewati atau digabung. Jangan menambah section "Kenapa memilih kami", "Keunggulan", "Statistik", atau "Tentang kami" berisi klaim umum.

=== IDENTITAS VISUAL ===
${designSourceNote}
Tema   : ${config.vibe}
Mode   : ${isDark ? "gelap" : "terang"}
Warna  : primary ${palette.primary} · secondary ${palette.secondary} · accent ${palette.accent} · bg ${palette.bg} · text ${palette.text} · muted ${palette.textMuted}
Font   : judul "${headingFont}", teks "${bodyFont}"
Tagline acuan: "${config.heroTagline}" (boleh diganti kalimat yang lebih konkret)

Prinsip desain:
- Satu gagasan visual dari identitas di atas, dipakai hemat dan konsisten (maksimal 1-2 elemen dekoratif di seluruh halaman).
- Bentuk tiap section mengikuti isinya: menu seperti menu cetak, jadwal seperti tabel, suasana dengan satu foto besar. Dua section berturut-turut tidak boleh sama-sama grid kartu.
- Background polos itu baik. Pergantian section cukup dengan warna latar atau spasi.
- Teks isi 16-18px, line-height lega, kontras minimal WCAG AA, lebar paragraf maksimal ~65 karakter.
- Biarkan konten bernapas; jangan mengisi ruang kosong dengan hiasan.

=== TULISAN ===
- Tulis seperti pemilik menjelaskan ke tetangga: kalimat pendek, kata benda konkret dari fakta (nama menu, bahan, fasilitas, jam).
- Judul hero menyebut hal konkret (hidangan/layanan khas atau detail tempat), bukan kata sifat.
- Judul section berupa label fungsional ("Menu", "Jam buka & lokasi", "Kata pelanggan") atau kalimat konkret, bukan slogan.
- Paragraf maksimal 2 kalimat. Jangan ada kalimat yang bisa ditempel ke usaha lain tanpa diubah.
- Kata terlarang (kecuali bagian dari nama menu atau kutipan fakta): ${BANNED_WORDS.join(", ")}.

=== POLA TERLARANG (ciri template AI) ===
${BANNED_PATTERNS.map((pattern) => `- ${pattern}`).join("\n")}

=== FOTO ===
${brandImageText ? `Foto asli bisnis — utamakan, tulis src PERSIS berupa token ini (akan diganti otomatis):\n${brandImageText}\n\n` : ""}Foto stok (pilih berdasarkan alt):
${imagePoolText}

Aturan foto:
- Subjek yang cocok: ${archetype.photoSubjects}.
- JANGAN memakai foto stok berisi gedung, ruko, jalan, fasad, atau papan nama: pengunjung akan mengira itu tempatnya.
- Lebih baik section tanpa foto daripada foto yang tidak cocok. 3-6 foto cukup. Jangan ulang URL.
- Foto stok BUKAN foto tempat ini: jangan beri alt/caption seperti "Interior ${biz.nama_bisnis}" atau "Suasana di tempat kami". Alt menggambarkan isi foto apa adanya ("Sepiring nasi mandi dengan daging kambing").
- Tiap <img>: alt deskriptif bahasa Indonesia, decoding="async", referrerpolicy="no-referrer", object-cover; loading="lazy" kecuali foto hero.

=== LINK & CTA ===
WhatsApp: ${waLink}
Maps    : ${mapsLink}
Tombol aksi hanya di: hero, section pesan/kontak, dan tombol WhatsApp mengambang. Tidak ada tautan panah di tiap item.

=== TEKNIS (WAJIB) ===
- HTML valid lengkap, <html lang="id">, meta charset UTF-8 + viewport, <title>${biz.nama_bisnis} — [deskripsi singkat yang konkret]</title>.
- Google Fonts: preconnect + <link href="https://fonts.googleapis.com/css2?family=${config.fontHeading}&family=${config.fontBody}&display=swap" rel="stylesheet">.
- <script src="https://cdn.tailwindcss.com"></script> + tailwind.config: colors {primary:"${palette.primary}", secondary:"${palette.secondary}", accent:"${palette.accent}", brand:{bg:"${palette.bg}", text:"${palette.text}", muted:"${palette.textMuted}"}}, fontFamily {heading:["${headingFont}"], body:["${bodyFont}"]}.
- Hanya Tailwind CDN + Google Fonts + vanilla JS. Tanpa library lain. Icon tidak wajib; jika dipakai, SVG sederhana (maks 2 path pendek).
- Mobile-first mulai 360px, container max-w-6xl, tanpa overflow horizontal.
- Navbar: nama bisnis + 3-5 anchor ke id section + tombol WhatsApp. Saat scrollY > 50 tambahkan class "scrolled" (latar solid).
- Tombol WhatsApp mengambang: <a href="${waLink}" target="_blank" rel="noopener" class="wa-float" aria-label="Chat WhatsApp">WhatsApp</a> — fixed bottom-6 right-6, bg #25d366, teks putih, rounded-full, px-5 py-3, font-semibold, shadow.
- Animasi opsional: fade-in saat scroll (IntersectionObserver), ≤ 500ms, tanpa parallax. Anchor scroll halus.
- Footer ringkas: nama, alamat, jam buka, kanal online yang ada, © tahun.

=== CEK DIAM-DIAM SEBELUM MENULIS ===
1. Pertanyaan pengunjung nomor 1 terjawab di layar pertama?
2. Ada pola terlarang atau kata terlarang? Hapus.
3. Setiap produk, harga, dan fasilitas ada di fakta? Yang tidak ada, hapus.
4. Ada foto gedung/toko yang bukan milik bisnis ini? Hapus.
5. Jika nama bisnis diganti usaha sejenis, apakah halaman masih cocok? Jika ya, halaman terlalu generik: perbanyak detail spesifik dari fakta.

=== OUTPUT ===
Hanya kode HTML, mulai dari <!DOCTYPE html>. Tanpa penjelasan, tanpa fence.`;
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
  const brief = biz.research_brief;
  const archetype = resolveArchetype(resolveKategoriKey(biz));
  const sectionIds = Array.from(
    new Set(Array.from(draftHtml.matchAll(/<section\b[^>]*\bid=(["'])([^"']+)\1/gi), (m) => m[2]))
  );
  const keepDesign = brief
    ? `Palet tetap (primary ${brief.visual.palet.primary}, secondary ${brief.visual.palet.secondary}, accent ${brief.visual.palet.accent}, bg ${brief.visual.palet.bg}, text ${brief.visual.palet.text}) dan font tetap "${brief.visual.font_heading}" / "${brief.visual.font_body}".`
    : "Palet & font di tailwind.config tetap.";

  return `Kamu editor desain senior. Tugasmu MENGURANGI, bukan menambah: hapus ciri template AI dari halaman berikut sambil menjaga semua fakta.

=== KONTEKS ===
Nama: ${biz.nama_bisnis}
Jenis: ${biz.kategori}
Pertanyaan utama pengunjung: ${archetype.visitorQuestions[0]}

=== AUDIT & PERBAIKI ===
1. Hapus pola terlarang berikut di mana pun muncul:
${BANNED_PATTERNS.map((pattern) => `   - ${pattern}`).join("\n")}
2. Ganti kata terlarang dengan detail konkret yang sudah ada di halaman: ${BANNED_WORDS.join(", ")}.
3. Buang kalimat yang bisa ditempel ke usaha lain. Perpendek paragraf (maks 2 kalimat).
4. Pastikan jawaban untuk "${archetype.visitorQuestions[0]}" paling menonjol dan ada di layar pertama.
5. Jika dua section berturut-turut sama-sama grid kartu, ubah salah satunya menjadi daftar, dua kolom, atau satu foto besar.
6. Buang foto yang menampilkan gedung, ruko, jalan, atau papan nama dari foto stok.
7. Hasil boleh (dan biasanya sebaiknya) lebih pendek dari draft.

=== BATASAN ===
1. Pertahankan section berikut beserta ID-nya: ${sectionIds.length ? sectionIds.map((id) => `#${id}`).join(" ") : "(semua section di draft)"}.
2. Pertahankan semua link (WhatsApp, Maps) dan semua src gambar yang dipakai, termasuk token BRAND_IMG_n apa adanya.
3. ${keepDesign}
4. JANGAN menambah produk, harga, fasilitas, angka, atau klaim baru.
5. Tanpa markdown fence. Output hanya HTML utuh mulai dari <!DOCTYPE html>.

=== INPUT HTML DRAFT ===
${draftHtml}`;
}

async function polishWithOpenRouter(
  modelId: string,
  openrouterKey: string,
  draftHtml: string,
  biz: BusinessData,
  imageCandidates: ImageCandidate[]
): Promise<string> {
  if (!canPolish()) return draftHtml;

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
      signal: requestSignal(),
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
  if (!canPolish()) return draftHtml;

  try {
    const polishPrompt = buildPolishPrompt(biz, draftHtml);
    log("INFO", `[Polish] Gemini ${modelName} dimulai...`);
    const result = await model.generateContent(polishPrompt, { signal: requestSignal() });
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
          await waitWithinBudget(waitSec * 1000, "jeda retry");
        }

        assertBudget("OpenRouter fallback");
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
          signal: requestSignal(),
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
            await waitWithinBudget(waitMs, "jeda rate limit");
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
        if (err instanceof BudgetExceededError) throw err;
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

// ─── 9router (OpenAI-compatible, lokal) ───────────────────────────────────────
function streamWithLog(model: string, content: string, temperature: number, label: string): Promise<string> {
  let nextLogAt = 10_240;
  return streamChatCompletion({
    model,
    content,
    temperature,
    signal: requestSignal(),
    onProgress: (chars) => {
      if (chars < nextLogAt) return;
      log("INFO", `[${label}] Streaming... ${(chars / 1024).toFixed(0)} KB diterima`);
      nextLogAt += 10_240;
    },
  });
}

async function polishWithNineRouter(
  model: string,
  draftHtml: string,
  biz: BusinessData,
  imageCandidates: ImageCandidate[]
): Promise<string> {
  if (!canPolish()) return draftHtml;

  try {
    log("INFO", `[Polish] 9router ${model} dimulai...`);
    const text = await streamWithLog(model, buildPolishPrompt(biz, draftHtml), 0.45, "Polish");
    if (!text) throw new Error("9router polish response kosong");

    const polished = extractHTML(text, biz, imageCandidates);
    log("OK", `[Polish] 9router selesai: ${(polished.length / 1024).toFixed(1)} KB`);
    return polished;
  } catch (err: any) {
    if (err instanceof BudgetExceededError) throw err;
    log("WARN", `[Polish] 9router gagal, fallback ke draft: ${err?.message}`);
    return draftHtml;
  }
}

async function generateWithNineRouter(
  model: string,
  prompt: string,
  biz: BusinessData,
  imageCandidates: ImageCandidate[],
  maxRetries: number
): Promise<string> {
  const { baseUrl } = requireNineRouter();

  log("INFO", `Mode: 9router lokal → ${model} (${baseUrl})`);
  let lastError: Error | null = null;
  const overallStart = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        const waitSec = attempt * 5;
        log("INFO", `(9router) Retry ${attempt}/${maxRetries} — tunggu ${waitSec}s...`);
        await waitWithinBudget(waitSec * 1000, "jeda retry");
      }

      assertBudget("9router");
      log("INFO", `Mengirim ke 9router (attempt ${attempt}/${maxRetries}) | stream | max_tokens: 65536 | temperature: 0.7`);
      const reqStart = Date.now();

      const text = await streamWithLog(model, prompt, 0.7, "9router");

      const elapsed = ((Date.now() - reqStart) / 1000).toFixed(1);
      log("INFO", `9router selesai dalam ${elapsed}s — ${text.length} chars / ${(text.length / 1024).toFixed(1)} KB`);
      if (!text) throw new Error("Response kosong dari 9router");

      const draftHtml = extractHTML(text, biz, imageCandidates);
      const polishedHtml = await polishWithNineRouter(model, draftHtml, biz, imageCandidates);
      const totalElapsed = ((Date.now() - overallStart) / 1000).toFixed(1);
      log("DONE", `Generate 9router selesai! Total waktu: ${totalElapsed}s | HTML: ${(polishedHtml.length / 1024).toFixed(1)} KB`);
      return polishedHtml;
    } catch (err: any) {
      if (err instanceof BudgetExceededError) throw err;
      lastError = err;
      const msg: string = err?.message || "";
      log("ERROR", `(9router) Attempt ${attempt} gagal: ${msg.slice(0, 300)}`);

      if (/ECONNREFUSED|fetch failed/i.test(msg)) {
        throw new Error("9router tidak bisa dihubungi di localhost:20128. Pastikan 9router sedang berjalan.");
      }
      if (/HTTP 401|invalid_api_key|Missing API key/i.test(msg)) {
        throw new Error("API key 9router ditolak. Cek NINEROUTER_API_KEY di .env.local.");
      }
      if (/HTTP 429/.test(msg)) {
        log("WARN", "Rate limit 9router — tunggu 15s...");
        await waitWithinBudget(15_000, "jeda rate limit");
      }
    }
  }

  throw new Error(`Gagal generate dengan 9router (${model}) setelah ${maxRetries} attempt. Error: ${lastError?.message}`);
}

// ─── Main generator function ──────────────────────────────────────────────────
interface GenerateOptions {
  retries?: number;
  provider?: string;
  polish?: boolean;
  budgetMs?: number;
}

/**
 * @param options.provider  - "9router:<model>" (default, lihat lib/ai-providers.ts),
 *                           "gemini" (auto-fallback ke OpenRouter),
 *                           atau model ID OpenRouter (misal "deepseek/deepseek-r1:free")
 *                           untuk langsung pakai model tersebut tanpa coba Gemini.
 * @param options.polish    - false = lewati tahap polish (lebih cepat, ~1 menit)
 * @param options.budgetMs  - batas waktu total, default dari resolveBudgetMs()
 */
export async function generateDemoHTML(
  rawBiz: BusinessData,
  options: GenerateOptions = {}
): Promise<string> {
  const biz: BusinessData = { ...rawBiz, kategori: displayKategori(rawBiz) };
  const budget: GenerateBudget = {
    deadline: Date.now() + (options.budgetMs ?? resolveBudgetMs()),
    polish: options.polish ?? true,
  };

  return runLogSession(biz.slug, () =>
    budgetStore.run(budget, async () => {
      try {
        const html = await runGenerate(biz, rawBiz.kategori, options);
        return applyBrandImages(html, rawBiz.brand_images);
      } catch (err) {
        if (err instanceof BudgetExceededError) log("ERROR", err.message);
        throw err;
      }
    })
  );
}

async function runGenerate(
  biz: BusinessData,
  rawKategori: string,
  options: GenerateOptions
): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const selectedProvider = options.provider ?? DEFAULT_PROVIDER;
  const useNineRouter = isNineRouterProvider(selectedProvider);

  if (!useNineRouter && !geminiKey && !openrouterKey) {
    throw new Error("Tidak ada API key. Set GEMINI_API_KEY atau OPENROUTER_API_KEY di .env.local");
  }

  log("INFO", `Bisnis         : ${biz.nama_bisnis}`);
  log("INFO", `Kategori       : ${rawKategori}${rawKategori !== biz.kategori ? ` → ${biz.kategori}` : ""}`);
  log("INFO", `Config tampilan: ${resolveKategoriKey(biz) ?? "DEFAULT"}`);
  log("INFO", `Budget waktu   : ${(remainingMs() / 1000).toFixed(0)}s | polish: ${budgetStore.getStore()?.polish ? "ya" : "tidak"}`);
  log("INFO", `Rating         : ${biz.rating ?? "(kosong)"} (${biz.jumlah_ulasan} ulasan)`);
  log("INFO", `Provider dipilih: ${selectedProvider}`);
  if (!useNineRouter) {
    log("INFO", `Gemini key     : ${geminiKey ? "✓ Ada" : "✗ Tidak ada"}`);
    log("INFO", `OpenRouter key : ${openrouterKey ? "✓ Ada" : "✗ Tidak ada"}`);
  }

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
  let lastError: Error | null = null;
  const overallStart = Date.now();

  if (useNineRouter) {
    return generateWithNineRouter(nineRouterModelOf(selectedProvider), prompt, biz, imageCandidates, maxRetries);
  }

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
          await waitWithinBudget(waitSec * 1000, "jeda retry");
        }

        assertBudget("OpenRouter");
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
          signal: requestSignal(),
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
        if (err instanceof BudgetExceededError) throw err;
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
              await waitWithinBudget(waitSec * 1000, "jeda retry");
            }

            assertBudget(`Gemini ${modelName}`);
            log("INFO", `Mengirim ke Gemini (attempt ${attempt}/${maxRetries})...`);
            const reqStart = Date.now();
            console.log(`[AI Generator] Trying Gemini: ${modelName}...`);
            const result = await model.generateContent(prompt, { signal: requestSignal() });
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
            if (err instanceof BudgetExceededError) throw err;
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
              await waitWithinBudget(waitSec * 1000, "jeda retry");
            }
          }
        }
      } catch (outerErr: any) {
        if (outerErr instanceof BudgetExceededError) throw outerErr;
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