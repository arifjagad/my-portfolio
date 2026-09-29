/**
 * lib/demo-research.ts
 * Riset otomatis satu bisnis sebelum generate:
 *   1. Beberapa pencarian Google terarah via 9router (Gemini grounding)
 *   2. Gambar opsional (logo / papan nama / interior) untuk palet yang akurat
 *   3. AI menyusun Brand Brief: fakta bisnis + arah desain, dalam JSON
 *
 * Brief disimpan di demo_businesses.research_brief dan bisa dikoreksi admin.
 */

import { log, runLogSession } from "./generate-logger";
import { nineRouterSearch, streamChatCompletion, type ChatContent, type SearchResponse } from "./ninerouter";
import { normalizeBrief, type BrandBrief } from "./brand-brief";
import { NINEROUTER_DEFAULT_MODEL } from "./ai-providers";
import { getCategoryDesignFallback } from "./ai-generator";

export interface ResearchTarget {
  slug: string;
  nama_bisnis: string;
  kategori: string;
  keyword: string | null;
  alamat: string | null;
  rating: number | null;
  jumlah_ulasan: number;
  nomor_telepon: string | null;
}

const SEARCH_CONCURRENCY = 3;
const MAX_ANSWER_CHARS = 3_500;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_BRAND_IMAGES = 4;

function buildQueries(biz: ResearchTarget): { topic: string; query: string }[] {
  const street = biz.alamat?.split(",")[0]?.trim() || "";
  const name = `"${biz.nama_bisnis}" ${street} Medan`.trim();

  return [
    { topic: "Profil", query: `${name} ${biz.kategori}: profil bisnis, sejarah, konsep, pemilik` },
    { topic: "Produk & harga", query: `${name}: daftar menu / produk / layanan lengkap beserta harga` },
    { topic: "Ulasan", query: `${name}: ulasan pelanggan Google Maps, apa yang paling dipuji dan dikeluhkan` },
    { topic: "Fasilitas", query: `${name}: jam buka, fasilitas, cara pesan, delivery, reservasi` },
    { topic: "Identitas visual", query: `${name}: warna logo, papan nama, desain interior, suasana tempat, seragam` },
    { topic: "Kanal online", query: `${name}: akun Instagram, Facebook, TikTok, GoFood, GrabFood, Shopee, Tokopedia` },
  ];
}

async function runSearches(biz: ResearchTarget): Promise<{ topic: string; response: SearchResponse | null }[]> {
  const queries = buildQueries(biz);
  const results: { topic: string; response: SearchResponse | null }[] = new Array(queries.length);
  let cursor = 0;

  async function worker() {
    while (cursor < queries.length) {
      const index = cursor++;
      const { topic, query } = queries[index];
      const started = Date.now();
      try {
        const response = await nineRouterSearch(query);
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        log("OK", `[Riset] ${topic}: ${response.results.length} sumber, jawaban ${response.answer.length} chars (${elapsed}s)`);
        results[index] = { topic, response };
      } catch (err: any) {
        log("WARN", `[Riset] ${topic} gagal: ${err?.message}`);
        results[index] = { topic, response: null };
      }
    }
  }

  await Promise.all(Array.from({ length: SEARCH_CONCURRENCY }, worker));
  return results;
}

/** URL https atau data URL → data URL base64 yang bisa dibaca model vision. */
async function loadImage(source: string): Promise<string | null> {
  if (source.startsWith("data:image/")) {
    return source.length * 0.75 <= MAX_IMAGE_BYTES ? source : null;
  }
  if (!/^https:\/\//i.test(source)) return null;

  const res = await fetch(source, {
    signal: AbortSignal.timeout(15_000),
    headers: { "User-Agent": "Mozilla/5.0 (demo-research)" },
  });
  const type = res.headers.get("content-type") || "";
  if (!res.ok || !type.startsWith("image/")) {
    throw new Error(`bukan gambar (HTTP ${res.status}, ${type || "tanpa content-type"})`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("gambar lebih dari 5 MB");
  return `data:${type.split(";")[0]};base64,${buffer.toString("base64")}`;
}

function formatSearchEvidence(searches: { topic: string; response: SearchResponse | null }[]): string {
  return searches
    .map(({ topic, response }) => {
      if (!response) return `### ${topic}\n(pencarian gagal)`;
      const sources = response.results
        .slice(0, 8)
        .map((r) => `- [${r.title}] ${r.snippet.replace(/\s+/g, " ").slice(0, 400)}`)
        .join("\n");
      return `### ${topic}\nJawaban pencarian:\n${response.answer.slice(0, MAX_ANSWER_CHARS) || "(kosong)"}\n\nSumber:\n${sources || "(tidak ada)"}`;
    })
    .join("\n\n");
}

function buildSynthesisPrompt(biz: ResearchTarget, evidence: string, imageCount: number, categoryVibe: string): string {
  return `Kamu adalah brand strategist + riset analis untuk bisnis lokal di Medan.
Tugas: susun BRAND BRIEF untuk membuat website demo "${biz.nama_bisnis}" berdasarkan HASIL RISET di bawah.

=== DATA DASAR (Google Maps) ===
Nama: ${biz.nama_bisnis}
Kategori: ${biz.kategori}
Alamat: ${biz.alamat || "-"}
Rating: ${biz.rating ?? "-"} (${biz.jumlah_ulasan} ulasan)
Telepon: ${biz.nomor_telepon || "-"}

=== HASIL RISET GOOGLE ===
${evidence}

${imageCount > 0 ? `=== GAMBAR ===\n${imageCount} gambar terlampir (logo / papan nama / interior / produk milik bisnis ini), berurutan 1..${imageCount}. Ambil palet warna dari gambar ini, dan jelaskan isi tiap gambar di "gambar_brand".\n` : ""}
=== ATURAN ===
1. JUJUR: hanya tulis fakta yang didukung hasil riset. Kalimat seperti "umumnya", "biasanya", "kemungkinan" = BUKAN fakta, jangan dipakai sebagai fakta.
2. Hati-hati bisnis lain dengan nama mirip di kota lain. Pakai hanya info yang cocok dengan alamat di Medan.
3. Produk: tulis nama & harga persis seperti ditemukan. Harga tidak ditemukan → null. Jangan mengarang produk.
4. Semua yang dicari tapi tidak ditemukan (harga, jam buka, cerita, logo, dst.) masukkan ke "tidak_ditemukan".
5. ARAH DESAIN harus lahir dari identitas bisnis ini (asal kuliner/budaya, konsep, interior, target pasar, kelas harga), bukan dari template kategori.
   - sumber_palet "gambar" jika dari gambar terlampir; "riset" jika warna disebut eksplisit oleh sumber; selain itu "saran" (diturunkan dari tema).
   - Palet: 6 warna hex, harmonis, teks terbaca di atas bg. Hindari palet generik kategori kecuali memang sesuai identitas.
   - Font: nama Google Fonts yang benar-benar ada, cocok dengan karakter bisnis.
   - Sebagai pembanding saja, vibe template kategori: "${categoryVibe}"
6. "kata_kunci_foto": 4-8 query foto stok dalam BAHASA INGGRIS (2-4 kata) yang menggambarkan produk/hidangan/layanan/suasana NYATA dari riset, mis. "shawarma wrap", "lamb mandi rice", "floor cushion seating". Dilarang: nama bisnis, nama kota, "storefront", "building", "shop".
7. Bahasa Indonesia untuk semua teks lain.

=== FORMAT OUTPUT ===
Balas HANYA satu objek JSON valid (tanpa markdown fence, tanpa penjelasan) dengan struktur:
{
  "ringkasan": "2-3 kalimat: bisnis apa, keunikan, untuk siapa",
  "identitas": { "tagline_saran": "tagline pendek khas bisnis ini", "cerita": "string atau null", "tahun_berdiri": "string atau null" },
  "produk": [ { "nama": "", "deskripsi": "string atau null", "harga": "mis. Rp 74.000 atau null", "sumber": "domain sumber atau null" } ],
  "layanan": ["..."],
  "fasilitas": ["..."],
  "jam_buka": "string atau null",
  "keunggulan_dari_ulasan": ["hal yang dipuji pelanggan"],
  "target_pelanggan": "",
  "kanal": ["@instagram / GoFood / dll yang ditemukan"],
  "visual": {
    "tema": "1 kalimat tema desain yang spesifik",
    "mood": ["3-5 kata sifat"],
    "motif": "pola/elemen dekoratif khas atau null",
    "theme": "light atau dark",
    "palet": { "primary": "#hex", "secondary": "#hex", "accent": "#hex", "bg": "#hex", "text": "#hex", "textMuted": "#hex" },
    "sumber_palet": "gambar | riset | saran",
    "alasan_palet": "1-2 kalimat kenapa palet ini mewakili bisnis",
    "font_heading": "Nama Google Font",
    "font_body": "Nama Google Font"
  },
  "kata_kunci_foto": ["english photo query"],
  "gambar_brand": [ { "index": 1, "isi": "apa yang terlihat di gambar 1, mis. logo merah-emas / papan nama / interior lesehan" } ],
  "tidak_ditemukan": ["..."],
  "sumber": [ { "judul": "domain / nama sumber", "url": null } ]
}`;
}

function parseJsonObject(text: string): any {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Output riset bukan JSON");
  return JSON.parse(text.slice(start, end + 1));
}

export async function researchBusiness(
  biz: ResearchTarget,
  options: { images?: string[]; model?: string } = {}
): Promise<BrandBrief> {
  return runLogSession(biz.slug, async () => {
    const model = options.model || NINEROUTER_DEFAULT_MODEL;
    const fallback = getCategoryDesignFallback(biz);
    const started = Date.now();

    log("INFO", `[Riset] Mulai riset: ${biz.nama_bisnis} (${biz.kategori})`);

    const [searches, images] = await Promise.all([
      runSearches(biz),
      Promise.all(
        (options.images ?? []).slice(0, MAX_BRAND_IMAGES).map(async (src, i) => {
          try {
            const dataUrl = await loadImage(src);
            if (dataUrl) log("OK", `[Riset] Gambar ${i + 1} siap dianalisis`);
            return dataUrl;
          } catch (err: any) {
            log("WARN", `[Riset] Gambar ${i + 1} dilewati: ${err?.message}`);
            return null;
          }
        })
      ),
    ]);

    const usableImages = images.filter((img): img is string => Boolean(img));
    if (searches.every((s) => !s.response)) {
      throw new Error("Semua pencarian gagal. Pastikan 9router berjalan dan akun Antigravity aktif.");
    }

    const prompt = buildSynthesisPrompt(biz, formatSearchEvidence(searches), usableImages.length, fallback.vibe);
    const content: ChatContent = usableImages.length
      ? [{ type: "text", text: prompt }, ...usableImages.map((url) => ({ type: "image_url" as const, image_url: { url } }))]
      : prompt;

    log("INFO", `[Riset] Menyusun Brand Brief dengan ${model} (${usableImages.length} gambar)...`);

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const text = await streamChatCompletion({
          model,
          content,
          temperature: 0.3,
          signal: AbortSignal.timeout(300_000),
        });
        const brief = normalizeBrief(parseJsonObject(text), fallback.palette);
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        log(
          "DONE",
          `[Riset] Brief selesai (${elapsed}s): ${brief.produk.length} produk, palet dari ${brief.visual.sumber_palet}, ${brief.tidak_ditemukan.length} hal tidak ditemukan`
        );
        return brief;
      } catch (err: any) {
        lastError = err;
        log("WARN", `[Riset] Penyusunan brief attempt ${attempt} gagal: ${err?.message}`);
      }
    }

    throw new Error(`Gagal menyusun Brand Brief: ${lastError?.message}`);
  });
}
