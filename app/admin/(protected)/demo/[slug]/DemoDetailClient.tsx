"use client";

/**
 * app/admin/(protected)/demo/[slug]/DemoDetailClient.tsx
 * Client component: form enrichment + generate controls + iframe preview
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Business {
  id: string;
  slug: string;
  nama_bisnis: string;
  kategori: string;
  rating: number | null;
  jumlah_ulasan: number;
  nomor_telepon: string | null;
  alamat: string | null;
  link_gmaps: string | null;
  enriched_data: any;
  enriched_at: string | null;
  generated_html: string | null;
  generated_at: string | null;
  generation_version: number;
  status_pitch: string;
  is_locked: boolean;
  lock_reason: string | null;
}

const PITCH_OPTIONS = [
  { value: "belum_dikirim", label: "Belum Dikirim", color: "text-slate-400" },
  { value: "sudah_dikirim", label: "Sudah Dikirim", color: "text-sky-400" },
  { value: "deal", label: "✓ Deal", color: "text-emerald-400" },
  { value: "tidak_tertarik", label: "Tidak Tertarik", color: "text-red-400" },
];

export default function DemoDetailClient({ biz: initial }: { biz: Business }) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [biz, setBiz] = useState(initial);

  // ── Enrichment form state ────────────────────────────────────────────────────
  const ed = biz.enriched_data || {};
  const [jamBuka, setJamBuka] = useState(ed.jam_buka || "");
  const [deskripsi, setDeskripsi] = useState(ed.deskripsi || "");
  const [layanan, setLayanan] = useState(
    (ed.layanan || []).join("\n")
  );
  const [keunggulan, setKeunggulan] = useState(
    (ed.keunggulan || []).join("\n")
  );
  const [catatan, setCatatan] = useState(ed.catatan_internal || "");

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [pitchLoading, setPitchLoading] = useState(false);
  const [lockReason, setLockReason] = useState(biz.lock_reason || "");
  const [showLockModal, setShowLockModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [previewMode, setPreviewMode] = useState<"iframe" | "none">(
    biz.generated_html ? "iframe" : "none"
  );

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Collect enriched data ────────────────────────────────────────────────────
  function collectEnrichedData() {
    return {
      slug: biz.slug,
      jam_buka: jamBuka.trim() || null,
      deskripsi: deskripsi.trim() || null,
      layanan: layanan.split("\n").map((s: string) => s.trim()).filter(Boolean),
      keunggulan: keunggulan.split("\n").map((s: string) => s.trim()).filter(Boolean),
      catatan_internal: catatan.trim() || null,
    };
  }

  // ── Save enrichment ──────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/demo/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collectEnrichedData()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBiz((b) => ({
        ...b,
        enriched_data: data.enriched_data,
        enriched_at: new Date().toISOString(),
      }));
      showToast("Enrichment berhasil disimpan");
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Generate / Regenerate ────────────────────────────────────────────────────
  async function handleGenerate(force = false) {
    setGenerating(true);
    setPreviewMode("none");
    try {
      // Save enrichment dulu
      await fetch("/api/demo/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collectEnrichedData()),
      });

      // Generate
      const res = await fetch("/api/demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: biz.slug, force }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("⏳ Rate limit Gemini. Tunggu 15–30 detik lalu coba lagi.");
        }
        throw new Error(data.error);
      }

      setBiz((b) => ({
        ...b,
        generated_html: data.html,
        generated_at: data.generated_at,
        generation_version: data.generation_version,
        enriched_data: collectEnrichedData(),
      }));
      setPreviewMode("iframe");
      showToast(
        force
          ? `Regenerate v${data.generation_version} berhasil!`
          : "Generate berhasil!"
      );
    } catch (err: any) {
      showToast(err.message || "Generate gagal", "error");
    } finally {
      setGenerating(false);
    }
  }

  // ── Status pitch ─────────────────────────────────────────────────────────────
  async function handlePitchChange(value: string) {
    setPitchLoading(true);
    try {
      const res = await fetch("/api/demo/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: biz.slug, status_pitch: value }),
      });
      if (!res.ok) throw new Error("Gagal update status");
      setBiz((b) => ({ ...b, status_pitch: value }));
      showToast("Status pitch diperbarui");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setPitchLoading(false);
    }
  }

  // ── Lock / Unlock ────────────────────────────────────────────────────────────
  async function handleLock(locked: boolean) {
    setLockLoading(true);
    try {
      const res = await fetch("/api/demo/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: biz.slug,
          is_locked: locked,
          reason: lockReason,
        }),
      });
      if (!res.ok) throw new Error("Gagal update lock");
      setBiz((b) => ({ ...b, is_locked: locked, lock_reason: locked ? lockReason : null }));
      setShowLockModal(false);
      showToast(locked ? "Demo dikunci" : "Demo dibuka");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLockLoading(false);
    }
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : null;

  return (
    <div className="space-y-6 relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border transition-all ${
            toast.type === "success"
              ? "bg-emerald-950 border-emerald-800 text-emerald-300"
              : "bg-red-950 border-red-800 text-red-300"
          }`}
        >
          {toast.type === "success" ? "✓ " : "✗ "}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">{biz.nama_bisnis}</h1>
            {biz.is_locked && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-900/30 border border-red-800/50 text-red-400 text-xs font-medium">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Locked
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {biz.kategori}
            {biz.rating && <span className="ml-2">· ⭐ {biz.rating} ({biz.jumlah_ulasan} ulasan)</span>}
          </p>
        </div>

        {/* Actions header */}
        <div className="flex items-center gap-2">
          {biz.generated_html && (
            <a
              href={`/demo/${biz.slug}`}
              target="_blank"
              id={`btn-preview-${biz.slug}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-navy-800 text-slate-400 hover:text-slate-200 hover:border-navy-700 text-sm transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Buka Demo
            </a>
          )}
          <button
            onClick={() => router.back()}
            className="px-3 py-2 rounded-lg border border-navy-800 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            ← Kembali
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── PANEL KIRI ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Info bisnis */}
          <div className="rounded-xl border border-navy-900 bg-navy-950/40 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Info Bisnis</h2>
            <div className="grid grid-cols-1 gap-2">
              <InfoRow label="Alamat" value={biz.alamat} />
              <InfoRow label="Telepon" value={biz.nomor_telepon} />
              {biz.link_gmaps && (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-slate-600 w-20 shrink-0 mt-0.5">Google Maps</span>
                  <a href={biz.link_gmaps} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:text-sky-300 transition-colors underline underline-offset-2 break-all">
                    Buka Maps →
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Status & Lock */}
          <div className="rounded-xl border border-navy-900 bg-navy-950/40 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Status Pitch</h2>

            {/* Pitch dropdown */}
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Status</label>
              <select
                id="pitch-status-select"
                value={biz.status_pitch}
                onChange={(e) => handlePitchChange(e.target.value)}
                disabled={pitchLoading}
                className="w-full bg-navy-900 border border-navy-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-forest-700 transition-colors disabled:opacity-50"
              >
                {PITCH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Lock toggle */}
            <div className="pt-2 border-t border-navy-900 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">Kunci Demo</p>
                  <p className="text-xs text-slate-600 mt-0.5">Demo tidak bisa diakses publik</p>
                </div>
                <button
                  id="btn-lock-toggle"
                  onClick={() => {
                    if (biz.is_locked) {
                      handleLock(false);
                    } else {
                      setShowLockModal(true);
                    }
                  }}
                  disabled={lockLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    biz.is_locked ? "bg-red-600" : "bg-navy-800"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${biz.is_locked ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              {biz.is_locked && biz.lock_reason && (
                <p className="text-xs text-slate-600 italic">Alasan: {biz.lock_reason}</p>
              )}
            </div>
          </div>

          {/* Enrichment form */}
          <div className="rounded-xl border border-navy-900 bg-navy-950/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Enrichment Data</h2>
              {biz.enriched_at && (
                <span className="text-xs text-slate-600">
                  Terakhir: {formatDate(biz.enriched_at)}
                </span>
              )}
            </div>

            <FormField label="Jam Buka" id="field-jam-buka">
              <input
                id="field-jam-buka"
                type="text"
                value={jamBuka}
                onChange={(e) => setJamBuka(e.target.value)}
                placeholder="Contoh: Senin–Sabtu 08.00–17.00 WIB"
                className="w-full bg-navy-900 border border-navy-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-forest-700 transition-colors"
              />
            </FormField>

            <FormField label="Deskripsi Singkat" id="field-deskripsi">
              <textarea
                id="field-deskripsi"
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                rows={2}
                placeholder="Deskripsi singkat tentang bisnis ini..."
                className="w-full bg-navy-900 border border-navy-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-forest-700 transition-colors resize-none"
              />
            </FormField>

            <FormField label="Layanan / Produk" hint="Satu per baris" id="field-layanan">
              <textarea
                id="field-layanan"
                value={layanan}
                onChange={(e) => setLayanan(e.target.value)}
                rows={4}
                placeholder={"Potong Rambut\nCuci + Blow\nCat Rambut\nKreasi Rambut"}
                className="w-full bg-navy-900 border border-navy-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-forest-700 transition-colors resize-none font-mono"
              />
            </FormField>

            <FormField label="Keunggulan" hint="Satu per baris" id="field-keunggulan">
              <textarea
                id="field-keunggulan"
                value={keunggulan}
                onChange={(e) => setKeunggulan(e.target.value)}
                rows={3}
                placeholder={"Harga terjangkau\nStaf berpengalaman\nBuka setiap hari"}
                className="w-full bg-navy-900 border border-navy-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-forest-700 transition-colors resize-none font-mono"
              />
            </FormField>

            <FormField label="Catatan Internal" hint="Tidak masuk ke website" id="field-catatan">
              <textarea
                id="field-catatan"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={2}
                placeholder="Catatan pribadi tentang bisnis ini..."
                className="w-full bg-navy-900 border border-navy-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-forest-700 transition-colors resize-none"
              />
            </FormField>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              id="btn-save-enrichment"
              onClick={handleSave}
              disabled={saving || generating}
              className="w-full py-2.5 rounded-xl border border-navy-800 text-slate-300 hover:text-slate-100 hover:border-navy-700 text-sm font-medium transition-all disabled:opacity-40"
            >
              {saving ? "Menyimpan..." : "Simpan Enrichment"}
            </button>

            {!biz.generated_html ? (
              <button
                id="btn-generate"
                onClick={() => handleGenerate(false)}
                disabled={generating || saving}
                className="w-full py-2.5 rounded-xl bg-forest-700 hover:bg-forest-600 text-white text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Generate Website
                  </>
                )}
              </button>
            ) : (
              <button
                id="btn-regenerate"
                onClick={() => handleGenerate(true)}
                disabled={generating || saving}
                className="w-full py-2.5 rounded-xl bg-amber-600/80 hover:bg-amber-600 text-white text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                    </svg>
                    Regenerate (v{(biz.generation_version || 0) + 1})
                  </>
                )}
              </button>
            )}
          </div>

          {/* Generation info */}
          {biz.generated_at && (
            <div className="text-xs text-slate-600 space-y-0.5 font-mono">
              <p>Generate terakhir: {formatDate(biz.generated_at)}</p>
              <p>Versi: v{biz.generation_version}</p>
            </div>
          )}
        </div>

        {/* ── PANEL KANAN: Preview ────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Preview</h2>
            {biz.generated_html && (
              <button
                onClick={() => setPreviewMode(previewMode === "iframe" ? "none" : "iframe")}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {previewMode === "iframe" ? "Sembunyikan" : "Tampilkan"} Preview
              </button>
            )}
          </div>

          <div className="rounded-xl border border-navy-900 overflow-hidden bg-navy-950/20" style={{ height: "600px" }}>
            {generating ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-600">
                <div className="w-10 h-10 rounded-full border-2 border-forest-700/30 border-t-forest-500 animate-spin" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-slate-400">Generating dengan Gemini AI...</p>
                  <p className="text-xs">Estimasi 15–30 detik</p>
                </div>
              </div>
            ) : biz.generated_html && previewMode === "iframe" ? (
              <iframe
                ref={iframeRef}
                srcDoc={biz.generated_html}
                className="w-full h-full border-0"
                title={`Preview — ${biz.nama_bisnis}`}
                sandbox="allow-scripts allow-same-origin"
              />
            ) : biz.generated_html ? (
              <div className="h-full flex items-center justify-center text-slate-700 text-sm">
                <button
                  onClick={() => setPreviewMode("iframe")}
                  className="flex flex-col items-center gap-3 text-slate-600 hover:text-slate-400 transition-colors"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  Klik untuk tampilkan preview
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-700">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <div className="text-center">
                  <p className="text-sm text-slate-500">Belum ada preview</p>
                  <p className="text-xs text-slate-700 mt-1">Klik "Generate Website" untuk membuat demo</p>
                </div>
              </div>
            )}
          </div>

          {/* HTML size info */}
          {biz.generated_html && (
            <p className="text-xs text-slate-700 font-mono">
              HTML size: {(biz.generated_html.length / 1024).toFixed(1)} KB
            </p>
          )}
        </div>
      </div>

      {/* Lock Modal */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-navy-800 bg-navy-950 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-900/30 border border-red-800/50 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-400" strokeWidth="1.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <div>
                <h3 className="text-slate-100 font-semibold">Kunci Demo</h3>
                <p className="text-xs text-slate-500">Demo tidak bisa diakses publik</p>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 block mb-1.5">Alasan (opsional)</label>
              <input
                type="text"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="Tidak tertarik, sudah deal, dll..."
                className="w-full bg-navy-900 border border-navy-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-red-700 transition-colors"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowLockModal(false)}
                className="flex-1 py-2 rounded-lg border border-navy-800 text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                Batal
              </button>
              <button
                id="btn-confirm-lock"
                onClick={() => handleLock(true)}
                disabled={lockLoading}
                className="flex-1 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {lockLoading ? "Mengunci..." : "Kunci Demo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-slate-600 w-20 shrink-0 mt-0.5">{label}</span>
      <span className="text-xs text-slate-300 wrap-break-word">{value}</span>
    </div>
  );
}

function FormField({
  label,
  hint,
  id,
  children,
}: {
  label: string;
  hint?: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-xs font-medium text-slate-400">
          {label}
        </label>
        {hint && <span className="text-xs text-slate-700">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
