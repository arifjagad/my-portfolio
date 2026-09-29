/**
 * lib/brand-brief.ts
 * Brand Brief: ringkasan hasil riset satu bisnis yang menjadi sumber fakta
 * dan arah desain saat generate. Aman untuk client (dipakai editor admin).
 */

export type PaletteSource = "gambar" | "riset" | "saran";

export interface BriefPalette {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
  textMuted: string;
}

export interface BriefProduct {
  nama: string;
  deskripsi: string | null;
  harga: string | null;
  sumber: string | null;
}

export interface BrandBrief {
  ringkasan: string;
  identitas: {
    tagline_saran: string;
    cerita: string | null;
    tahun_berdiri: string | null;
  };
  produk: BriefProduct[];
  layanan: string[];
  fasilitas: string[];
  jam_buka: string | null;
  keunggulan_dari_ulasan: string[];
  target_pelanggan: string;
  kanal: string[];
  visual: {
    tema: string;
    mood: string[];
    motif: string | null;
    theme: "light" | "dark";
    palet: BriefPalette;
    sumber_palet: PaletteSource;
    alasan_palet: string;
    font_heading: string;
    font_body: string;
  };
  /** Query foto Unsplash (Inggris) dari produk & suasana nyata, mis. "shawarma wrap" */
  kata_kunci_foto: string[];
  /** Isi tiap gambar brand yang dilampirkan saat riset (urutan = BRAND_IMG_n) */
  gambar_brand: { index: number; isi: string }[];
  tidak_ditemukan: string[];
  sumber: { judul: string; url: string | null }[];
}

const HEX = /^#[0-9a-f]{6}$/i;
const PALETTE_KEYS: (keyof BriefPalette)[] = ["primary", "secondary", "accent", "bg", "text", "textMuted"];

const FALLBACK_PALETTE: BriefPalette = {
  primary: "#0f172a",
  secondary: "#3b82f6",
  accent: "#dbeafe",
  bg: "#f8faff",
  text: "#0f172a",
  textMuted: "#64748b",
};

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function strOrNull(value: unknown): string | null {
  const s = str(value);
  return s && !/^(null|tidak ada|tidak ditemukan|-)$/i.test(s) ? s : null;
}

function strList(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => str(v)).filter(Boolean).slice(0, max);
}

function normalizeHex(value: unknown): string | null {
  let s = str(value);
  if (/^#[0-9a-f]{3}$/i.test(s)) s = `#${s.slice(1).split("").map((c) => c + c).join("")}`;
  return HEX.test(s) ? s.toLowerCase() : null;
}

// ─── Kontras WCAG ────────────────────────────────────────────────────────────
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Pastikan teks terbaca di atas background; warna brand lain tidak disentuh. */
function ensureReadable(palet: BriefPalette): BriefPalette {
  const darkBg = luminance(palet.bg) < 0.25;
  const fixed = { ...palet };
  if (contrastRatio(fixed.text, fixed.bg) < 4.5) fixed.text = darkBg ? "#f5f5f4" : "#111827";
  if (contrastRatio(fixed.textMuted, fixed.bg) < 3) fixed.textMuted = darkBg ? "#a8a29e" : "#57534e";
  return fixed;
}

/**
 * Rapikan JSON mentah dari AI (atau hasil edit admin) menjadi BrandBrief valid.
 * Warna yang tidak valid diganti fallbackPalette; kontras teks dijamin terbaca.
 */
export function normalizeBrief(raw: any, fallbackPalette: BriefPalette = FALLBACK_PALETTE): BrandBrief {
  const visual = raw?.visual ?? {};
  const rawPalet = visual.palet ?? {};

  const palet = Object.fromEntries(
    PALETTE_KEYS.map((key) => [key, normalizeHex(rawPalet[key]) ?? fallbackPalette[key]])
  ) as unknown as BriefPalette;

  const sumberPalet: PaletteSource = ["gambar", "riset", "saran"].includes(visual.sumber_palet)
    ? visual.sumber_palet
    : "saran";

  return {
    ringkasan: str(raw?.ringkasan),
    identitas: {
      tagline_saran: str(raw?.identitas?.tagline_saran),
      cerita: strOrNull(raw?.identitas?.cerita),
      tahun_berdiri: strOrNull(raw?.identitas?.tahun_berdiri),
    },
    produk: (Array.isArray(raw?.produk) ? raw.produk : [])
      .map((p: any) => ({
        nama: str(p?.nama),
        deskripsi: strOrNull(p?.deskripsi),
        harga: strOrNull(p?.harga),
        sumber: strOrNull(p?.sumber),
      }))
      .filter((p: BriefProduct) => p.nama)
      .slice(0, 24),
    layanan: strList(raw?.layanan),
    fasilitas: strList(raw?.fasilitas),
    jam_buka: strOrNull(raw?.jam_buka),
    keunggulan_dari_ulasan: strList(raw?.keunggulan_dari_ulasan, 10),
    target_pelanggan: str(raw?.target_pelanggan),
    kanal: strList(raw?.kanal, 10),
    visual: {
      tema: str(visual.tema),
      mood: strList(visual.mood, 8),
      motif: strOrNull(visual.motif),
      theme: visual.theme === "dark" ? "dark" : "light",
      palet: ensureReadable(palet),
      sumber_palet: sumberPalet,
      alasan_palet: str(visual.alasan_palet),
      font_heading: str(visual.font_heading, "Plus Jakarta Sans") || "Plus Jakarta Sans",
      font_body: str(visual.font_body, "Inter") || "Inter",
    },
    kata_kunci_foto: strList(raw?.kata_kunci_foto, 8).map((q) => q.replace(/["']/g, "")),
    gambar_brand: (Array.isArray(raw?.gambar_brand) ? raw.gambar_brand : [])
      .map((g: any) => ({ index: Number(g?.index), isi: str(g?.isi) }))
      .filter((g: { index: number; isi: string }) => Number.isInteger(g.index) && g.index >= 1 && g.isi)
      .slice(0, 4),
    tidak_ditemukan: strList(raw?.tidak_ditemukan),
    sumber: (Array.isArray(raw?.sumber) ? raw.sumber : [])
      .map((s: any) => ({ judul: str(s?.judul), url: strOrNull(s?.url) }))
      .filter((s: { judul: string }) => s.judul)
      .slice(0, 20),
  };
}

/** "Playfair Display" → "Playfair+Display:wght@400;500;600;700" untuk URL Google Fonts */
export function toGoogleFontParam(fontName: string): string {
  const family = fontName.replace(/:.*/, "").trim().replace(/\s+/g, "+");
  return `${family}:wght@300;400;500;600;700`;
}
