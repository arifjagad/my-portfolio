"use client";

/**
 * app/admin/(protected)/demo/[slug]/DemoDetailClient.tsx
 * Client component: form enrichment + generate controls + iframe preview
 */

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Select, { type GroupBase, type StylesConfig, type SingleValue } from "react-select";
import { OPENROUTER_MODELS } from "@/lib/openrouter-models";
import {
  DEFAULT_PROVIDER,
  NINEROUTER_DEFAULT_MODEL,
  NINEROUTER_PREFIX,
  isNineRouterProvider,
} from "@/lib/ai-providers";
import { absoluteUrl } from "@/lib/seo";
import {
  buildPitchMessage,
  buildWhatsAppLink,
  formatRelativeDays,
  needsFollowUp,
  normalizePhone,
  FOLLOW_UP_AFTER_DAYS,
} from "@/lib/demo-pitch";
import type { BrandBrief } from "@/lib/brand-brief";
import BrandBriefPanel from "./BrandBriefPanel";

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
  research_brief: BrandBrief | null;
  researched_at: string | null;
  brand_images: string[] | null;
  generated_html: string | null;
  generated_at: string | null;
  generation_version: number;
  status_pitch: string;
  pitched_at: string | null;
  visit_count: number | null;
  last_visited_at: string | null;
  is_locked: boolean;
  lock_reason: string | null;
}

const PITCH_OPTIONS = [
  { value: "belum_dikirim", label: "Belum Dikirim", color: "text-slate-400" },
  { value: "sudah_dikirim", label: "Sudah Dikirim", color: "text-sky-400" },
  { value: "deal", label: "✓ Deal", color: "text-emerald-400" },
  { value: "tidak_tertarik", label: "Tidak Tertarik", color: "text-red-400" },
];

// ── react-select types ────────────────────────────────────────────────
type ModelOption = { value: string; label: string; ctx?: number; group: "9router" | "gemini" | "openrouter" };
type ModelGroup  = GroupBase<ModelOption>;

const REMOTE_MODEL_GROUPS: ModelGroup[] = [
  {
    label: "── Google Gemini ──",
    options: [
      { value: "gemini", label: "✦ Gemini (Auto + Fallback)", group: "gemini" },
    ],
  },
  {
    label: "── OpenRouter Models ──",
    options: OPENROUTER_MODELS.map((m) => ({
      value: m.id,
      label: m.label,
      ctx: m.contextWindow,
      group: "openrouter" as const,
    })),
  },
];

const SELECT_STYLES: StylesConfig<ModelOption, false, ModelGroup> = {
  control: (base, state) => ({
    ...base,
    background: "#0b1120",
    borderColor: state.isFocused ? "#2d6a4f" : "#1e2d45",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 1px #2d6a4f" : "none",
    minHeight: "36px",
    fontSize: "0.75rem",
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
    cursor: "pointer",
    "&:hover": { borderColor: "#2d6a4f" },
  }),
  valueContainer: (base) => ({ ...base, padding: "2px 10px" }),
  singleValue: (base) => ({ ...base, color: "#e2e8f0" }),
  placeholder: (base) => ({ ...base, color: "#475569", fontSize: "0.75rem" }),
  input: (base) => ({ ...base, color: "#e2e8f0", fontSize: "0.75rem", fontFamily: "ui-monospace, SFMono-Regular, monospace" }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? "#94a3b8" : "#475569",
    padding: "4px 8px",
    "&:hover": { color: "#94a3b8" },
  }),
  menu: (base) => ({
    ...base,
    background: "#0d1929",
    border: "1px solid #1e2d45",
    borderRadius: "0.75rem",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
    overflow: "hidden",
    zIndex: 50,
  }),
  menuList: (base) => ({ ...base, padding: "4px", maxHeight: "340px" }),
  group: (base) => ({ ...base, padding: 0 }),
  groupHeading: (base) => ({
    ...base,
    color: "#475569",
    fontSize: "0.65rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "8px 10px 4px",
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
  }),
  option: (base, state) => ({
    ...base,
    background: state.isSelected
      ? "#1e3a5f"
      : state.isFocused
      ? "#172035"
      : "transparent",
    color: state.isSelected ? "#bae6fd" : "#94a3b8",
    borderRadius: "0.4rem",
    fontSize: "0.72rem",
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
    padding: "6px 10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  }),
  noOptionsMessage: (base) => ({ ...base, color: "#475569", fontSize: "0.75rem" }),
};

export default function DemoDetailClient({ biz: initial }: { biz: Business }) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [biz, setBiz] = useState(initial);

  // ── Riset & catatan ──────────────────────────────────────────────────────────
  // Enrichment manual lama (jam buka, layanan, dst.) tetap disimpan apa adanya;
  // form-nya diganti Brand Brief hasil riset. Catatan internal tetap bisa diedit.
  const ed = biz.enriched_data || {};
  const [catatan, setCatatan] = useState(ed.catatan_internal || "");
  const [brandImages, setBrandImages] = useState<string[]>(biz.brand_images ?? []);
  const [researching, setResearching] = useState(false);
  const [manualHtml, setManualHtml] = useState(biz.generated_html || "");

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [savingHtml, setSavingHtml] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [pitchLoading, setPitchLoading] = useState(false);
  const [lockReason, setLockReason] = useState(biz.lock_reason || "");
  const [showLockModal, setShowLockModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [previewMode, setPreviewMode] = useState<"iframe" | "none">(
    biz.generated_html ? "iframe" : "none"
  );
  // Model AI selector: default 9router lokal; "gemini" = Gemini API + auto-fallback OpenRouter
  const [selectedProvider, setSelectedProvider] = useState<string>(DEFAULT_PROVIDER);
  const [nineRouterModels, setNineRouterModels] = useState<string[]>([NINEROUTER_DEFAULT_MODEL]);
  const [nineRouterError, setNineRouterError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/demo/models")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.models) && data.models.length > 0) setNineRouterModels(data.models);
        if (data.error) setNineRouterError(data.error);
        else if (data.apiKeyConfigured === false) setNineRouterError("NINEROUTER_API_KEY belum diisi di .env.local");
      })
      .catch(() => setNineRouterError("Gagal memuat daftar model 9router"));
  }, []);

  const modelOptions = useMemo<ModelGroup[]>(
    () => [
      {
        label: "── 9router (lokal) ──",
        options: nineRouterModels.map((id) => ({
          value: `${NINEROUTER_PREFIX}${id}`,
          label: id === NINEROUTER_DEFAULT_MODEL ? `★ ${id}` : id,
          group: "9router" as const,
        })),
      },
      ...REMOTE_MODEL_GROUPS,
    ],
    [nineRouterModels]
  );
  const [polish, setPolish] = useState(true);

  // ── Pitch WhatsApp ───────────────────────────────────────────────────────────
  const demoUrl = absoluteUrl(`/demo/${biz.slug}`);
  const phone = normalizePhone(biz.nomor_telepon);
  const [pitchMessage, setPitchMessage] = useState(() => buildPitchMessage(biz, demoUrl));

  // ── Live log viewer ────────────────────────────────────────────
  const [logLines, setLogLines] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchLogs() {
    try {
      const res = await fetch(`/api/demo/generate-log?slug=${encodeURIComponent(biz.slug)}&lines=150`);
      if (!res.ok) return;
      const data = await res.json();
      setLogLines(data.lines || []);
      // Auto-scroll ke bawah
      setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      // silent
    }
  }

  function startLogPolling() {
    fetchLogs();
    pollRef.current = setInterval(fetchLogs, 2000);
  }

  function stopLogPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    // Final fetch untuk ambil log akhir
    fetchLogs();
  }

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Catatan internal (disimpan di enriched_data, field lama dipertahankan) ──
  function collectEnrichedData() {
    return {
      slug: biz.slug,
      jam_buka: ed.jam_buka ?? null,
      deskripsi: ed.deskripsi ?? null,
      layanan: ed.layanan ?? [],
      keunggulan: ed.keunggulan ?? [],
      catatan_internal: catatan.trim() || null,
    };
  }

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
      showToast("Catatan disimpan");
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Riset bisnis ─────────────────────────────────────────────────────────────
  async function handleResearch() {
    setResearching(true);
    setPreviewMode("none");
    setLogLines([]);
    startLogPolling();
    try {
      const res = await fetch("/api/demo/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: biz.slug, images: brandImages }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Riset gagal (HTTP ${res.status})`);

      setBiz((b) => ({
        ...b,
        research_brief: data.brief,
        researched_at: data.researched_at,
        brand_images: data.brand_images,
      }));
      setBrandImages(data.brand_images ?? []);
      showToast("Riset selesai. Cek Brand Brief sebelum generate.");
    } catch (err: any) {
      showToast(err.message || "Riset gagal", "error");
    } finally {
      stopLogPolling();
      setResearching(false);
      if (biz.generated_html) setPreviewMode("iframe");
    }
  }

  async function handleSaveBrief(brief: BrandBrief) {
    const res = await fetch("/api/demo/research", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: biz.slug, brief }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || "Gagal menyimpan Brief", "error");
      throw new Error(data.error || "Gagal menyimpan Brief");
    }
    setBiz((b) => ({ ...b, research_brief: data.brief }));
    showToast("Brief disimpan");
  }

  // ── Generate / Regenerate ────────────────────────────────────────────────────
  async function handleGenerate(force = false) {
    setGenerating(true);
    setPreviewMode("none");
    setLogLines([]);
    startLogPolling();
    try {
      // Generate (riset otomatis di server jika Brief belum ada)
      const res = await fetch("/api/demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: biz.slug, force, provider: selectedProvider, polish }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(data.error || "⏳ Rate limit. Tunggu 15–30 detik lalu coba lagi.");
        }
        throw new Error(data.error || `Generate gagal (HTTP ${res.status})`);
      }

      setBiz((b) => ({
        ...b,
        generated_html: data.html,
        generated_at: data.generated_at,
        generation_version: data.generation_version,
        research_brief: data.research_brief ?? b.research_brief,
        researched_at: data.researched_at ?? b.researched_at,
      }));
      setManualHtml(data.html || "");
      setPreviewMode("iframe");
      showToast(
        force
          ? `Regenerate v${data.generation_version} berhasil!`
          : "Generate berhasil!"
      );
    } catch (err: any) {
      showToast(err.message || "Generate gagal", "error");
    } finally {
      stopLogPolling();
      setGenerating(false);
    }
  }

  // ── Save manual HTML ─────────────────────────────────────────────────────────
  async function handleSaveManualHtml() {
    if (!manualHtml.trim()) {
      showToast("HTML kosong, tidak bisa disimpan", "error");
      return;
    }

    setSavingHtml(true);
    try {
      const res = await fetch("/api/demo/html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: biz.slug,
          html: manualHtml,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan HTML manual");

      setBiz((b) => ({
        ...b,
        generated_html: data.html,
        generated_at: data.generated_at,
        generation_version: data.generation_version,
      }));
      setManualHtml(data.html || "");
      setPreviewMode("iframe");
      showToast(`HTML manual tersimpan (v${data.generation_version})`);
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan HTML manual", "error");
    } finally {
      setSavingHtml(false);
    }
  }

  // ── Status pitch ─────────────────────────────────────────────────────────────
  async function handlePitchChange(value: string, markSent = false) {
    setPitchLoading(true);
    try {
      const res = await fetch("/api/demo/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: biz.slug, status_pitch: value, mark_sent: markSent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal update status");
      setBiz((b) => ({ ...b, status_pitch: value, pitched_at: data.pitched_at ?? b.pitched_at }));
      showToast(markSent ? "Ditandai sudah dikirim" : "Status pitch diperbarui");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setPitchLoading(false);
    }
  }

  // ── Kirim via WhatsApp ───────────────────────────────────────────────────────
  function handleSendWhatsApp() {
    if (!phone) return;
    window.open(buildWhatsAppLink(phone, pitchMessage), "_blank", "noopener,noreferrer");
    // Deal / tidak tertarik tidak diturunkan kembali jadi "sudah dikirim"
    if (biz.status_pitch === "belum_dikirim" || biz.status_pitch === "sudah_dikirim") {
      handlePitchChange("sudah_dikirim", true);
    }
  }

  async function handleCopyPitch() {
    try {
      await navigator.clipboard.writeText(pitchMessage);
      showToast("Pesan disalin");
    } catch {
      showToast("Gagal menyalin pesan", "error");
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

            {/* Aktivitas pitch */}
            <div className="grid grid-cols-3 gap-2">
              <PitchStat label="Dikirim" value={formatRelativeDays(biz.pitched_at) ?? "—"} />
              <PitchStat label="Dibuka" value={`${biz.visit_count ?? 0}×`} />
              <PitchStat label="Terakhir dibuka" value={formatRelativeDays(biz.last_visited_at) ?? "—"} />
            </div>
            {needsFollowUp(biz.status_pitch, biz.pitched_at) && (
              <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-900/50 rounded-lg px-3 py-2">
                Sudah lebih dari {FOLLOW_UP_AFTER_DAYS} hari sejak dikirim
                {(biz.visit_count ?? 0) > 0 ? " dan demo sudah dibuka" : " dan demo belum dibuka"}. Saatnya follow-up.
              </p>
            )}

            {/* Pesan WhatsApp */}
            <div className="pt-2 border-t border-navy-900 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="field-pitch-message" className="text-xs font-medium text-slate-400">Pesan WhatsApp</label>
                <button
                  onClick={() => setPitchMessage(buildPitchMessage(biz, demoUrl))}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Reset template
                </button>
              </div>
              <textarea
                id="field-pitch-message"
                value={pitchMessage}
                onChange={(e) => setPitchMessage(e.target.value)}
                rows={8}
                className="w-full bg-navy-900 border border-navy-800 rounded-lg px-3 py-2 text-xs leading-5 text-slate-200 focus:outline-none focus:border-forest-700 transition-colors resize-y"
              />
              {!biz.generated_at && (
                <p className="text-xs text-amber-500">Demo belum di-generate. Generate dulu sebelum mengirim.</p>
              )}
              {biz.is_locked && (
                <p className="text-xs text-red-400">Demo sedang dikunci, calon client tidak bisa membukanya.</p>
              )}
              {!phone ? (
                <p className="text-xs text-red-400">Nomor telepon tidak valid atau kosong.</p>
              ) : !phone.isMobile ? (
                <p className="text-xs text-amber-500">
                  Nomor {biz.nomor_telepon} tampaknya telepon rumah/kantor, kemungkinan tidak ada WhatsApp.
                </p>
              ) : null}
              <div className="flex gap-2">
                <button
                  id="btn-send-whatsapp"
                  onClick={handleSendWhatsApp}
                  disabled={!phone || !biz.generated_at || biz.is_locked || pitchLoading}
                  className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-40"
                >
                  {biz.pitched_at ? "Kirim Ulang via WhatsApp" : "Kirim via WhatsApp"}
                </button>
                <button
                  onClick={handleCopyPitch}
                  className="px-3 py-2 rounded-lg border border-navy-800 text-slate-400 hover:text-slate-200 hover:border-navy-700 text-sm transition-colors"
                >
                  Salin
                </button>
              </div>
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

          {/* Brand Brief hasil riset */}
          <BrandBriefPanel
            brief={biz.research_brief}
            researchedAt={biz.researched_at}
            images={brandImages}
            researching={researching}
            disabled={generating}
            onImagesChange={setBrandImages}
            onResearch={handleResearch}
            onSaveBrief={handleSaveBrief}
          />

          {/* Catatan internal */}
          <div className="rounded-xl border border-navy-900 bg-navy-950/40 p-5 space-y-3">
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
              disabled={saving || generating || researching}
              className="w-full py-2.5 rounded-xl border border-navy-800 text-slate-300 hover:text-slate-100 hover:border-navy-700 text-sm font-medium transition-all disabled:opacity-40"
            >
              {saving ? "Menyimpan..." : "Simpan Catatan"}
            </button>

            {/* Model AI Selector */}
          <div className="rounded-xl border border-navy-900 bg-navy-950/40 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 shrink-0">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              </svg>
              <span className="text-xs font-medium text-slate-400">Model AI</span>
              <span className={`ml-auto text-xs px-1.5 py-0.5 rounded border font-mono ${
                isNineRouterProvider(selectedProvider)
                  ? "bg-emerald-900/40 border-emerald-800/50 text-emerald-400"
                  : selectedProvider === "gemini"
                  ? "bg-sky-900/40 border-sky-800/50 text-sky-400"
                  : "bg-violet-900/40 border-violet-800/50 text-violet-400"
              }`}>
                {isNineRouterProvider(selectedProvider) ? "9router" : selectedProvider === "gemini" ? "Gemini" : "OpenRouter"}
              </span>
            </div>

            <Select<ModelOption, false, ModelGroup>
              inputId="model-selector"
              options={modelOptions}
              styles={SELECT_STYLES}
              isDisabled={generating || saving}
              isSearchable
              placeholder="Pilih model AI..."
              value={
                modelOptions.flatMap((g) => g.options).find(
                  (o) => o.value === selectedProvider
                ) ?? null
              }
              onChange={(opt: SingleValue<ModelOption>) => {
                if (opt) setSelectedProvider(opt.value);
              }}
              formatOptionLabel={(opt: ModelOption) => (
                <div className="flex items-center justify-between w-full gap-2">
                  <span>{opt.label}</span>
                  {opt.ctx && (
                    <span style={{
                      fontSize: "0.6rem",
                      padding: "1px 5px",
                      borderRadius: "4px",
                      background: "#1e2d45",
                      color: "#64748b",
                      whiteSpace: "nowrap",
                      fontFamily: "ui-monospace, monospace",
                    }}>
                      {opt.ctx >= 1000000
                        ? `${(opt.ctx / 1000000).toFixed(0)}M ctx`
                        : `${(opt.ctx / 1000).toFixed(0)}K ctx`}
                    </span>
                  )}
                </div>
              )}
              noOptionsMessage={() => "Model tidak ditemukan"}
            />

            {isNineRouterProvider(selectedProvider) && (
              <p className={`text-xs ${nineRouterError ? "text-amber-500" : "text-slate-700"}`}>
                {nineRouterError ?? "Model lokal via 9router. Hanya jalan saat admin dibuka dari laptop (npm run dev)."}
              </p>
            )}
            {isNineRouterProvider(selectedProvider) && !biz.research_brief && (
              <p className="text-xs text-sky-400/80">Brief belum ada: riset Google dijalankan otomatis dulu (+1–3 menit).</p>
            )}
            {!isNineRouterProvider(selectedProvider) && !biz.research_brief && (
              <p className="text-xs text-amber-500">Tanpa 9router tidak ada riset: konten akan dikarang dari kategori.</p>
            )}
            {selectedProvider === "gemini" && (
              <p className="text-xs text-slate-700">Coba Gemini 2.5/2.0 Flash, fallback otomatis ke OpenRouter jika limit.</p>
            )}

            <label className="flex items-start gap-2 pt-1 cursor-pointer">
              <input
                id="field-polish"
                type="checkbox"
                checked={polish}
                onChange={(e) => setPolish(e.target.checked)}
                disabled={generating}
                className="mt-0.5 accent-emerald-600"
              />
              <span className="text-xs text-slate-400">
                Polish tahap kedua
                <span className="block text-slate-700">
                  Hasil lebih rapi, tapi ~2× lebih lama. Dilewati otomatis jika waktu tidak cukup.
                </span>
              </span>
            </label>
          </div>

          {!biz.generated_html ? (
              <button
                id="btn-generate"
                onClick={() => handleGenerate(false)}
                disabled={generating || saving || researching}
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
                disabled={generating || saving || researching}
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

          {/* Manual HTML Editor */}
          <div className="rounded-xl border border-navy-900 bg-navy-950/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Manual HTML Editor</h2>
              <span className="text-xs text-slate-600 font-mono">
                {(manualHtml.length / 1024).toFixed(1)} KB
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Paste HTML dari Claude/ChatGPT atau edit langsung, lalu simpan ke kolom <span className="font-mono">generated_html</span>.
            </p>

            <textarea
              id="field-manual-html"
              value={manualHtml}
              onChange={(e) => setManualHtml(e.target.value)}
              rows={14}
              spellCheck={false}
              placeholder="Tempel HTML lengkap di sini..."
              className="w-full bg-navy-950 border border-navy-800 rounded-lg px-3 py-3 text-xs leading-5 text-slate-200 placeholder-slate-700 focus:outline-none focus:border-forest-700 transition-colors resize-y font-mono"
            />

            <div className="flex flex-wrap gap-2">
              <button
                id="btn-save-manual-html"
                onClick={handleSaveManualHtml}
                disabled={savingHtml || generating}
                className="px-3 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-sm font-medium transition-colors disabled:opacity-40"
              >
                {savingHtml ? "Menyimpan HTML..." : "Simpan HTML Manual"}
              </button>

              <button
                id="btn-preview-manual-html"
                onClick={() => {
                  if (!manualHtml.trim()) return;
                  setBiz((b) => ({ ...b, generated_html: manualHtml }));
                  setPreviewMode("iframe");
                }}
                disabled={!manualHtml.trim()}
                className="px-3 py-2 rounded-lg border border-navy-800 text-slate-300 hover:text-slate-100 hover:border-navy-700 text-sm transition-colors disabled:opacity-40"
              >
                Preview dari Editor
              </button>
            </div>
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

          <div className="rounded-xl border border-navy-900 overflow-hidden bg-navy-950/20" style={{ height: "1650px" }}>
            {generating || researching ? (
              <div className="h-full flex flex-col gap-0 overflow-hidden">
                {/* Header log panel */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-navy-900 bg-navy-950/60 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-mono text-slate-400">{researching ? "Riset" : "Generate"} Log — Live</span>
                  </div>
                  <span className="text-xs text-slate-600 font-mono">
                    {selectedProvider === "gemini" ? "Gemini AI" : selectedProvider}
                  </span>
                </div>

                {/* Log output */}
                <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-5 bg-[#0a0d12]">
                  {logLines.length === 0 ? (
                    <div className="flex items-center gap-2 text-slate-600 mt-4 justify-center">
                      <span className="w-4 h-4 rounded-full border-2 border-slate-700 border-t-slate-500 animate-spin" />
                      Menunggu log pertama...
                    </div>
                  ) : (
                    logLines.map((line, idx) => {
                      const isError = line.includes("[ERROR]");
                      const isWarn  = line.includes("[WARN ");
                      const isOk    = line.includes("[OK   ]");
                      const isDone  = line.includes("[DONE ");
                      const isStart = line.includes("[START]");
                      return (
                        <div
                          key={idx}
                          className={`whitespace-pre-wrap break-all ${
                            isError ? "text-red-400" :
                            isWarn  ? "text-amber-400" :
                            isOk    ? "text-emerald-400" :
                            isDone  ? "text-emerald-300 font-semibold" :
                            isStart ? "text-sky-400" :
                            "text-slate-500"
                          }`}
                        >
                          {line}
                        </div>
                      );
                    })
                  )}
                  <div ref={logEndRef} />
                </div>

                {/* Footer spinner */}
                <div className="shrink-0 px-4 py-2 border-t border-navy-900 bg-navy-950/40 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-forest-700/40 border-t-forest-500 animate-spin" />
                  <span className="text-xs text-slate-600">
                    Proses berjalan... {polish ? "bisa sampai ~4 menit" : "sekitar 1 menit"}
                  </span>
                </div>
              </div>
            ) : biz.generated_html && previewMode === "iframe" ? (
              <iframe
                ref={iframeRef}
                srcDoc={biz.generated_html}
                className="w-full h-full border-0"
                title={`Preview — ${biz.nama_bisnis}`}
                sandbox="allow-scripts"
                referrerPolicy="no-referrer"
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

function PitchStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-navy-900 bg-navy-900/40 px-3 py-2">
      <p className="text-[11px] text-slate-600">{label}</p>
      <p className="text-sm text-slate-200 font-medium mt-0.5">{value}</p>
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
