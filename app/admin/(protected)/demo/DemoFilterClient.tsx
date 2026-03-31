"use client";

/**
 * app/admin/(protected)/demo/DemoFilterClient.tsx
 * Client component: filter bar + tabel bisnis interaktif
 */

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import Select, { StylesConfig } from "react-select";

interface Business {
  id: string;
  slug: string;
  nama_bisnis: string;
  kategori: string;
  rating: number | null;
  jumlah_ulasan: number;
  nomor_telepon: string | null;
  enriched_data: any;
  enriched_at: string | null;
  generated_html: string | null;
  generated_at: string | null;
  generation_version: number;
  status_pitch: string;
  is_locked: boolean;
}

interface Filters {
  search: string;
  kategori: string;
  status_generate: string;
  status_pitch: string;
  rating: string;
  jumlah_ulasan: string;
}

interface Props {
  businesses: Business[];
  kategoriList: string[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  currentFilters: Filters;
}

const PITCH_LABELS: Record<string, { label: string; color: string }> = {
  belum_dikirim: { label: "Belum Dikirim", color: "text-slate-400 bg-slate-800/60 border-slate-700" },
  sudah_dikirim: { label: "Sudah Dikirim", color: "text-sky-400 bg-sky-900/30 border-sky-800/60" },
  deal: { label: "Deal ✓", color: "text-emerald-400 bg-emerald-900/30 border-emerald-800/60" },
  tidak_tertarik: { label: "Tidak Tertarik", color: "text-red-400 bg-red-900/30 border-red-800/60" },
};

function getGenerateStatus(biz: Business) {
  if (!biz.generated_html) return { label: "Belum", color: "text-slate-500 bg-slate-900 border-slate-800", dot: "bg-red-500" };
  if (biz.enriched_data) return { label: "Generated + Enriched", color: "text-emerald-400 bg-emerald-900/20 border-emerald-900/50", dot: "bg-emerald-500" };
  return { label: "Generated", color: "text-amber-400 bg-amber-900/20 border-amber-900/50", dot: "bg-amber-500" };
}

// Styling custom untuk react-select agar cocok dengan tema navy-900 Tailwind
const selectStyles: StylesConfig<any, false> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "#0f172a", // navy-900 equivalent (slate-900)
    borderColor: state.isFocused ? "#15803d" : "#1e293b", // forest-700 : navy-800
    borderRadius: "0.5rem",
    minHeight: "38px", // Sesuaikan dengan tinggi input search
    boxShadow: state.isFocused ? "0 0 0 1px #15803d" : "none",
    "&:hover": {
      borderColor: state.isFocused ? "#15803d" : "#334155",
    },
    cursor: "pointer",
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "0.5rem",
    zIndex: 9999, // Harus di atas elemen lain
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#15803d" // forest-700
      : state.isFocused
      ? "#1e293b" // navy-800
      : "transparent",
    color: state.isSelected ? "#ffffff" : "#cbd5e1", // text-slate-300
    cursor: "pointer",
    "&:active": {
      backgroundColor: "#166534", // forest-800
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: "#e2e8f0", // text-slate-200
    fontSize: "0.875rem",
  }),
  placeholder: (base) => ({
    ...base,
    color: "#475569", // text-slate-600
    fontSize: "0.875rem",
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "#475569",
    "&:hover": { color: "#94a3b8" },
    padding: "4px 8px",
  }),
  input: (base) => ({
    ...base,
    color: "#e2e8f0", // Saat mengetik text-nya putih
  }),
};

export default function DemoFilterClient({
  businesses,
  kategoriList,
  totalCount,
  currentPage,
  totalPages,
  currentFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState<Filters>(currentFilters);

  // ─── Opsi untuk react-select ────────────────────────────────────────────────
  const kategoriOptions = [
    { value: "all", label: "Semua Kategori" },
    ...kategoriList.map((k) => ({ value: k, label: k })),
  ];

  const statusGenerateOptions = [
    { value: "all", label: "Semua Status" },
    { value: "generated", label: "Sudah Generate" },
    { value: "not_generated", label: "Belum Generate" },
  ];

  const statusPitchOptions = [
    { value: "all", label: "Semua Pitch" },
    { value: "belum_dikirim", label: "Belum Dikirim" },
    { value: "sudah_dikirim", label: "Sudah Dikirim" },
    { value: "deal", label: "Deal ✓" },
    { value: "tidak_tertarik", label: "Tidak Tertarik" },
  ];

  const ratingOptions = [
    { value: "all", label: "Semua Rating" },
    { value: "4.8", label: "Rating ≥ 4.8" },
    { value: "4.5", label: "Rating ≥ 4.5" },
    { value: "4.0", label: "Rating ≥ 4.0" },
    { value: "3.5", label: "Rating ≥ 3.5" },
  ];

  const reviewOptions = [
    { value: "all", label: "Semua Ulasan" },
    { value: "500", label: "Ulasan ≥ 500" },
    { value: "100", label: "Ulasan ≥ 100" },
    { value: "50", label: "Ulasan ≥ 50" },
    { value: "10", label: "Ulasan ≥ 10" },
  ];

  // Helper untuk mendapatkan objek option penuh berdasar string value (dibutuhkan react-select)
  const getOpt = (opts: any[], val: string) => opts.find((o) => o.value === val) || opts[0];

  // ─── Filter logic ───────────────────────────────────────────────────────────
  function applyFilters(newFilters: Partial<Filters>) {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    
    // Auto submit setiap kali filter dropdown berubah
    const params = new URLSearchParams();
    if (updated.search) params.set("search", updated.search);
    if (updated.kategori !== "all") params.set("kategori", updated.kategori);
    if (updated.status_generate !== "all") params.set("status_generate", updated.status_generate);
    if (updated.status_pitch !== "all") params.set("status_pitch", updated.status_pitch);
    if (updated.rating !== "all") params.set("rating", updated.rating);
    if (updated.jumlah_ulasan !== "all") params.set("jumlah_ulasan", updated.jumlah_ulasan);
    
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function gotoPage(p: number) {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.kategori !== "all") params.set("kategori", filters.kategori);
    if (filters.status_generate !== "all") params.set("status_generate", filters.status_generate);
    if (filters.status_pitch !== "all") params.set("status_pitch", filters.status_pitch);
    if (filters.rating !== "all") params.set("rating", filters.rating);
    if (filters.jumlah_ulasan !== "all") params.set("jumlah_ulasan", filters.jumlah_ulasan);
    params.set("page", String(p));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col xl:flex-row gap-3 p-4 rounded-xl border border-navy-900 bg-navy-950/40">
        
        {/* Search */}
        <div className="flex-1 min-w-[240px]">
          <input
            id="demo-search"
            type="text"
            placeholder="Cari nama bisnis..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && applyFilters({})} // Trigger dari enter untuk search
            className="w-full h-[38px] bg-navy-900 border border-navy-800 rounded-lg px-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-forest-700 transition-colors"
          />
        </div>

        {/* Dropdowns (Select2) */}
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="w-[180px]">
            <Select
              instanceId="filter-kategori"
              options={kategoriOptions}
              value={getOpt(kategoriOptions, filters.kategori)}
              onChange={(val: any) => applyFilters({ kategori: val.value })}
              styles={selectStyles}
              isSearchable={true}
              placeholder="Kategori"
            />
          </div>

          <div className="w-[160px]">
            <Select
              instanceId="filter-generate"
              options={statusGenerateOptions}
              value={getOpt(statusGenerateOptions, filters.status_generate)}
              onChange={(val: any) => applyFilters({ status_generate: val.value })}
              styles={selectStyles}
              isSearchable={false}
            />
          </div>

          <div className="w-[150px]">
            <Select
              instanceId="filter-pitch"
              options={statusPitchOptions}
              value={getOpt(statusPitchOptions, filters.status_pitch)}
              onChange={(val: any) => applyFilters({ status_pitch: val.value })}
              styles={selectStyles}
              isSearchable={false}
            />
          </div>

          <div className="w-[140px]">
            <Select
              instanceId="filter-rating"
              options={ratingOptions}
              value={getOpt(ratingOptions, filters.rating)}
              onChange={(val: any) => applyFilters({ rating: val.value })}
              styles={selectStyles}
              isSearchable={false}
            />
          </div>

          <div className="w-[145px]">
            <Select
              instanceId="filter-ulasan"
              options={reviewOptions}
              value={getOpt(reviewOptions, filters.jumlah_ulasan)}
              onChange={(val: any) => applyFilters({ jumlah_ulasan: val.value })}
              styles={selectStyles}
              isSearchable={false}
            />
          </div>

          {/* Apply + Reset Buton untuk Search bar dan Reset manual */}
          <button
            id="demo-filter-apply"
            onClick={() => applyFilters({})}
            disabled={isPending}
            className="px-4 h-[38px] rounded-lg bg-forest-700 hover:bg-forest-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isPending ? "..." : "Cari"}
          </button>

          <button
            id="demo-filter-reset"
            onClick={() => {
              const reset: Filters = { 
                search: "", 
                kategori: "all", 
                status_generate: "all", 
                status_pitch: "all",
                rating: "all",
                jumlah_ulasan: "all"
              };
              setFilters(reset);
              startTransition(() => router.push(pathname));
            }}
            className="px-3 h-[38px] rounded-lg border border-navy-800 text-slate-500 hover:text-slate-300 hover:border-navy-700 text-sm transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Total info */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Menampilkan {businesses.length} dari {totalCount.toLocaleString("id-ID")} bisnis</span>
        <span>Hal {currentPage} / {totalPages}</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-navy-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-900 bg-navy-950">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Bisnis</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Kategori</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Generate</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Pitch</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Lock</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900">
              {businesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-600">
                    Tidak ada data yang cocok dengan filter
                  </td>
                </tr>
              ) : (
                businesses.map((biz) => {
                  const genStatus = getGenerateStatus(biz);
                  const pitchStatus = PITCH_LABELS[biz.status_pitch] || PITCH_LABELS.belum_dikirim;

                  return (
                    <tr key={biz.id} className="hover:bg-navy-950/60 transition-colors group">
                      {/* Bisnis */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {biz.is_locked && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-500 shrink-0" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                          )}
                          <div>
                            <p className="text-slate-200 font-medium group-hover:text-white transition-colors truncate max-w-48">
                              {biz.nama_bisnis}
                            </p>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {biz.rating ? `⭐ ${biz.rating}` : "Belum ada rating"}
                              {biz.jumlah_ulasan > 0 && <span className="ml-1">({biz.jumlah_ulasan} ulasan)</span>}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Kategori */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400">{biz.kategori}</span>
                      </td>

                      {/* Generate status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${genStatus.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${genStatus.dot}`} />
                          {genStatus.label}
                        </span>
                        {biz.generation_version > 0 && (
                          <p className="text-xs text-slate-700 mt-1">v{biz.generation_version}</p>
                        )}
                      </td>

                      {/* Pitch status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-md border text-xs font-medium ${pitchStatus.color}`}>
                          {pitchStatus.label}
                        </span>
                      </td>

                      {/* Lock */}
                      <td className="px-4 py-3">
                        <span className={`text-xs ${biz.is_locked ? "text-red-400" : "text-slate-700"}`}>
                          {biz.is_locked ? "🔒 Locked" : "—"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {biz.generated_html && (
                            <a
                              href={`/demo/${biz.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md text-slate-600 hover:text-slate-300 hover:bg-navy-900 transition-all"
                              title="Preview demo"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                                <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </a>
                          )}
                          <Link
                            href={`/admin/demo/${biz.slug}`}
                            id={`demo-edit-${biz.slug}`}
                            className="px-3 py-1.5 rounded-lg bg-navy-900 border border-navy-800 text-slate-400 hover:text-slate-200 hover:border-navy-700 text-xs font-medium transition-all"
                          >
                            {biz.generated_html ? "Edit" : "Proses"}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => gotoPage(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
            className="px-3 py-1.5 rounded-lg border border-navy-800 text-sm text-slate-500 hover:text-slate-300 hover:border-navy-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ← Prev
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
            const p = startPage + i;
            return (
              <button
                key={p}
                onClick={() => gotoPage(p)}
                disabled={isPending}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                  p === currentPage
                    ? "border-forest-700 bg-forest-900/30 text-forest-300"
                    : "border-navy-800 text-slate-500 hover:text-slate-300 hover:border-navy-700"
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => gotoPage(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
            className="px-3 py-1.5 rounded-lg border border-navy-800 text-sm text-slate-500 hover:text-slate-300 hover:border-navy-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
