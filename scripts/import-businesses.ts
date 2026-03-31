/**
 * scripts/import-businesses.ts
 * Import CSV bisnis target ke tabel demo_businesses di Supabase
 *
 * Jalankan: npx tsx scripts/import-businesses.ts
 *
 * Encoding CSV: latin-1, delimiter: ;
 * Kolom: Keyword;Nama Bisnis;Kategori;Rating;Jumlah Ulasan;Nomor Telepon;Punya Website?;Link Website;Alamat;Link Google Maps
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { createClient } from "@supabase/supabase-js";

// ─── Config ──────────────────────────────────────────────────────────────────
const CSV_PATH = path.join(
  process.cwd(),
  "public/documents/Daftar Calon Pembeli - Tidak Ada Website.csv"
);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BATCH_SIZE = 50; // insert per batch

// ─── Slug generator (tidak pakai package agar tidak ada dependency issue) ────
function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ç]/g, "c")
    .replace(/[ñ]/g, "n")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── CSV parsing (latin-1 via buffer decode) ─────────────────────────────────
function parseCSV(filePath: string): Array<string[]> {
  const buffer = fs.readFileSync(filePath);
  // latin-1 decode: byte-by-byte
  const content = buffer
    .toString("binary")
    .split(/\r?\n/)
    .map((line) => Buffer.from(line, "binary").toString("latin1"));

  const rows: Array<string[]> = [];
  for (const line of content) {
    if (!line.trim()) continue;
    // Simple split by ; (assuming no ; inside fields for this dataset)
    rows.push(line.split(";").map((cell) => cell.trim()));
  }
  return rows;
}

// ─── Type ─────────────────────────────────────────────────────────────────────
interface DemoBusiness {
  slug: string;
  keyword: string | null;
  nama_bisnis: string;
  kategori: string;
  rating: number | null;
  jumlah_ulasan: number;
  nomor_telepon: string | null;
  alamat: string | null;
  link_gmaps: string | null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Validate env
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error(
      "❌  Missing env vars: NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY"
    );
    console.error(
      "   Pastikan file .env.local ada dan jalankan: npx tsx --env-file=.env.local scripts/import-businesses.ts"
    );
    console.error("\n   Atau set manual:");
    console.error(
      "   $env:NEXT_PUBLIC_SUPABASE_URL='https://xxx.supabase.co'"
    );
    console.error("   $env:SUPABASE_SERVICE_ROLE_KEY='eyJ...'");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log("📂  Membaca CSV...");
  const rows = parseCSV(CSV_PATH);

  // Row 0 = header
  const [header, ...dataRows] = rows;
  console.log(`📊  Header: ${header.join(" | ")}`);
  console.log(`📊  Total data rows: ${dataRows.length}`);

  // Validate header
  // Expected: Keyword;Nama Bisnis;Kategori;Rating;Jumlah Ulasan;Nomor Telepon;Punya Website?;Link Website;Alamat;Link Google Maps
  const expectedCols = 10;
  if (header.length < expectedCols) {
    console.warn(
      `⚠️  Header hanya ${header.length} kolom, expected ${expectedCols}. Lanjutkan dengan hati-hati.`
    );
  }

  // Parse rows
  const businesses: DemoBusiness[] = [];
  const slugSet = new Set<string>();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length < 3) continue; // skip incomplete rows

    const namaBisnis = row[1]?.trim();
    if (!namaBisnis) {
      console.warn(`⚠️  Row ${i + 2}: nama bisnis kosong, skip`);
      continue;
    }

    let slug = toSlug(namaBisnis);
    if (!slug) slug = `bisnis-${i + 1}`;

    // Handle duplicate slugs
    if (slugSet.has(slug)) {
      const kategori = toSlug(row[2]?.trim() || "");
      slug = `${slug}-${kategori || i + 1}`;
      if (slugSet.has(slug)) {
        slug = `${slug}-${i + 1}`;
      }
    }
    slugSet.add(slug);

    const ratingStr = row[3]?.trim().replace(",", ".");
    const rating = ratingStr ? parseFloat(ratingStr) : null;
    const ulasanStr = row[4]?.trim().replace(/\./g, "").replace(/,/g, "");
    const jumlahUlasan = ulasanStr ? parseInt(ulasanStr) || 0 : 0;

    businesses.push({
      slug,
      keyword: row[0]?.trim() || null,
      nama_bisnis: namaBisnis,
      kategori: row[2]?.trim() || "Lainnya",
      rating: isNaN(rating!) ? null : rating,
      jumlah_ulasan: jumlahUlasan,
      nomor_telepon: row[5]?.trim() || null,
      // Skip col 6 (Punya Website?) & col 7 (Link Website) — sudah difilter
      alamat: row[8]?.trim() || null,
      link_gmaps: row[9]?.trim() || null,
    });
  }

  console.log(`✅  Parsed: ${businesses.length} bisnis valid`);

  // ─── Cek existing slugs ───────────────────────────────────────────────────
  console.log("🔍  Cek data yang sudah ada di Supabase...");
  const { data: existing } = await supabase
    .from("demo_businesses")
    .select("slug");
  const existingSlugs = new Set((existing || []).map((r: any) => r.slug));
  console.log(`   Existing: ${existingSlugs.size} records`);

  const toInsert = businesses.filter((b) => !existingSlugs.has(b.slug));
  const skipped = businesses.length - toInsert.length;

  console.log(`📥  Akan insert: ${toInsert.length} (skip ${skipped} duplikat)`);

  if (toInsert.length === 0) {
    console.log("✅  Semua data sudah ada di database. Tidak ada yang di-import.");
    return;
  }

  // ─── Batch insert ─────────────────────────────────────────────────────────
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("demo_businesses").insert(batch);

    if (error) {
      console.error(
        `❌  Batch ${Math.floor(i / BATCH_SIZE) + 1} gagal:`,
        error.message
      );
      // Try one by one untuk identify problematic row
      for (const biz of batch) {
        const { error: e2 } = await supabase
          .from("demo_businesses")
          .insert([biz]);
        if (e2) {
          console.error(`   ❌  Skip "${biz.nama_bisnis}": ${e2.message}`);
          failed++;
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
      console.log(
        `   ✅  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} records`
      );
    }
  }

  console.log("\n─────────────────────────────");
  console.log(`📊  HASIL IMPORT:`);
  console.log(`   ✅  Inserted : ${inserted}`);
  console.log(`   ⏭️  Skipped  : ${skipped} (sudah ada)`);
  console.log(`   ❌  Failed   : ${failed}`);
  console.log("─────────────────────────────\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
