/**
 * app/admin/(protected)/demo/page.tsx
 * Dashboard admin untuk manajemen demo bisnis
 *
 * Fitur:
 * - Tabel semua bisnis target dengan status badge
 * - Filter: kategori, status generate, status pitch, search
 * - Pagination 50 per halaman
 * - Quick action: langsung buka form per bisnis
 */

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import DemoFilterClient from "./DemoFilterClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo Bisnis — Admin",
};

export const dynamic = "force-dynamic";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface SearchParams {
  search?: string;
  kategori?: string;
  status_generate?: string;
  status_pitch?: string;
  rating?: string;
  jumlah_ulasan?: string;
  page?: string;
}

const PAGE_SIZE = 50;

export default async function DemoDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1"));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = getServiceClient();

  // ── Build query ─────────────────────────────────────────────────────────────
  let query = supabase
    .from("demo_businesses")
    .select(
      "id, slug, nama_bisnis, kategori, rating, jumlah_ulasan, nomor_telepon, enriched_data, enriched_at, generated_html, generated_at, generation_version, status_pitch, is_locked",
      { count: "exact" }
    )
    .order("nama_bisnis", { ascending: true });

  if (sp.search) {
    query = query.ilike("nama_bisnis", `%${sp.search}%`);
  }
  if (sp.kategori && sp.kategori !== "all") {
    query = query.eq("kategori", sp.kategori);
  }
  if (sp.status_pitch && sp.status_pitch !== "all") {
    query = query.eq("status_pitch", sp.status_pitch);
  }
  if (sp.status_generate === "generated") {
    query = query.not("generated_html", "is", null);
  } else if (sp.status_generate === "not_generated") {
    query = query.is("generated_html", null);
  }
  if (sp.rating && sp.rating !== "all") {
    query = query.gte("rating", parseFloat(sp.rating));
  }
  if (sp.jumlah_ulasan && sp.jumlah_ulasan !== "all") {
    query = query.gte("jumlah_ulasan", parseInt(sp.jumlah_ulasan, 10));
  }

  const { data: businesses, count } = await query.range(
    offset,
    offset + PAGE_SIZE - 1
  );

  // ── Stats ringkas ────────────────────────────────────────────────────────────
  const { count: totalCount } = await supabase
    .from("demo_businesses")
    .select("*", { count: "exact", head: true });

  const { count: generatedCount } = await supabase
    .from("demo_businesses")
    .select("*", { count: "exact", head: true })
    .not("generated_html", "is", null);

  const { count: dealCount } = await supabase
    .from("demo_businesses")
    .select("*", { count: "exact", head: true })
    .eq("status_pitch", "deal");

  // ── Kategori list untuk filter ───────────────────────────────────────────────
  const { data: kategoriRows } = await supabase
    .from("demo_businesses")
    .select("kategori")
    .order("kategori");
  const kategoriList = [
    ...new Set((kategoriRows || []).map((r: any) => r.kategori)),
  ].sort();

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Demo Bisnis</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola demo website untuk calon client bisnis lokal Medan
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Target" value={totalCount || 0} color="slate" />
        <StatCard
          label="Sudah Generate"
          value={generatedCount || 0}
          color="emerald"
          sub={`${Math.round(((generatedCount || 0) / (totalCount || 1)) * 100)}%`}
        />
        <StatCard
          label="Belum Generate"
          value={(totalCount || 0) - (generatedCount || 0)}
          color="amber"
        />
        <StatCard label="Deal" value={dealCount || 0} color="sky" />
      </div>

      {/* Filter + Table (client component) */}
      <DemoFilterClient
        businesses={businesses || []}
        kategoriList={kategoriList}
        totalCount={count || 0}
        currentPage={page}
        totalPages={totalPages}
        currentFilters={{
          search: sp.search || "",
          kategori: sp.kategori || "all",
          status_generate: sp.status_generate || "all",
          status_pitch: sp.status_pitch || "all",
          rating: sp.rating || "all",
          jumlah_ulasan: sp.jumlah_ulasan || "all",
        }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: number;
  color: "slate" | "emerald" | "amber" | "sky";
  sub?: string;
}) {
  const colorMap = {
    slate: "text-slate-300 border-slate-800",
    emerald: "text-emerald-400 border-emerald-900/50",
    amber: "text-amber-400 border-amber-900/50",
    sky: "text-sky-400 border-sky-900/50",
  };

  return (
    <div
      className={`rounded-xl border bg-navy-950/50 p-4 ${colorMap[color]}`}
    >
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorMap[color].split(" ")[0]}`}>
        {value.toLocaleString("id-ID")}
      </p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}
