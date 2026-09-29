"use client";

/**
 * app/admin/(protected)/demo/[slug]/BrandBriefPanel.tsx
 * Panel riset: gambar brand opsional, tombol riset, dan tampilan/editor Brand Brief.
 */

import { useEffect, useState } from "react";
import type { BrandBrief, BriefPalette } from "@/lib/brand-brief";

const MAX_IMAGES = 4;
const MAX_IMAGE_EDGE = 1024;

const PALETTE_LABELS: { key: keyof BriefPalette; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "bg", label: "Background" },
  { key: "text", label: "Text" },
  { key: "textMuted", label: "Muted" },
];

const SOURCE_BADGE: Record<BrandBrief["visual"]["sumber_palet"], { label: string; className: string }> = {
  gambar: { label: "Dari gambar", className: "text-emerald-300 bg-emerald-900/30 border-emerald-800/60" },
  riset: { label: "Dari riset", className: "text-sky-300 bg-sky-900/30 border-sky-800/60" },
  saran: { label: "Saran AI (tebakan dari tema)", className: "text-amber-300 bg-amber-900/30 border-amber-800/60" },
};

interface Props {
  brief: BrandBrief | null;
  researchedAt: string | null;
  images: string[];
  researching: boolean;
  disabled: boolean;
  onImagesChange: (images: string[]) => void;
  onResearch: () => void;
  onSaveBrief: (brief: BrandBrief) => Promise<void>;
}

/** Kecilkan gambar di browser agar muat disimpan & dikirim ke model vision. */
function fileToResizedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("File bukan gambar"));
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function BrandBriefPanel({
  brief,
  researchedAt,
  images,
  researching,
  disabled,
  onImagesChange,
  onResearch,
  onSaveBrief,
}: Props) {
  const [urlInput, setUrlInput] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [palette, setPalette] = useState<BriefPalette | null>(brief?.visual.palet ?? null);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPalette(brief?.visual.palet ?? null);
    setJsonMode(false);
  }, [brief]);

  const paletteChanged =
    brief && palette && PALETTE_LABELS.some(({ key }) => palette[key] !== brief.visual.palet[key]);

  async function addFiles(files: FileList | File[]) {
    setImageError(null);
    const room = MAX_IMAGES - images.length;
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (picked.length === 0) {
      setImageError(room <= 0 ? `Maksimal ${MAX_IMAGES} gambar` : "Tidak ada file gambar");
      return;
    }
    try {
      const dataUrls = await Promise.all(picked.map(fileToResizedDataUrl));
      onImagesChange([...images, ...dataUrls]);
    } catch (err: any) {
      setImageError(err.message);
    }
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    if (!url.startsWith("https://")) return setImageError("URL harus diawali https://");
    if (images.length >= MAX_IMAGES) return setImageError(`Maksimal ${MAX_IMAGES} gambar`);
    setImageError(null);
    onImagesChange([...images, url]);
    setUrlInput("");
  }

  async function save(next: BrandBrief) {
    setSaving(true);
    try {
      await onSaveBrief(next);
    } finally {
      setSaving(false);
    }
  }

  async function saveJson() {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonError(null);
      await save(parsed);
    } catch (err: any) {
      setJsonError(err instanceof SyntaxError ? `JSON tidak valid: ${err.message}` : err.message);
    }
  }

  return (
    <div
      className="rounded-xl border border-navy-900 bg-navy-950/40 p-5 space-y-4"
      onPaste={(e) => {
        if (e.clipboardData.files.length) {
          e.preventDefault();
          addFiles(e.clipboardData.files);
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Brand Brief</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {researchedAt
              ? `Riset: ${new Date(researchedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`
              : "Hasil riset Google tentang bisnis ini"}
          </p>
        </div>
        <button
          id="btn-research"
          onClick={onResearch}
          disabled={disabled || researching}
          className="shrink-0 px-3 py-2 rounded-lg bg-sky-800 hover:bg-sky-700 text-white text-xs font-semibold transition-colors disabled:opacity-40 flex items-center gap-2"
        >
          {researching && <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
          {researching ? "Meriset..." : brief ? "Riset Ulang" : "Riset Bisnis"}
        </button>
      </div>

      {/* Gambar brand opsional */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-400">
          Gambar brand <span className="text-slate-600 font-normal">(opsional, maks {MAX_IMAGES}): logo, papan nama, interior</span>
        </p>
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {images.map((src, i) => (
              <div key={`${i}-${src.slice(-24)}`} className="relative aspect-square rounded-lg overflow-hidden border border-navy-800 bg-navy-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Gambar brand ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => onImagesChange(images.filter((_, idx) => idx !== i))}
                  disabled={researching}
                  aria-label="Hapus gambar"
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs leading-none hover:bg-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {images.length < MAX_IMAGES && (
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUrl()}
              placeholder="Tempel URL gambar https://..."
              className="flex-1 min-w-0 bg-navy-900 border border-navy-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-forest-700"
            />
            <button onClick={addUrl} className="px-2.5 rounded-lg border border-navy-800 text-slate-400 hover:text-slate-200 text-xs">
              Tambah
            </button>
            <label className="px-2.5 py-1.5 rounded-lg border border-navy-800 text-slate-400 hover:text-slate-200 text-xs cursor-pointer">
              Upload
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}
        <p className="text-[11px] text-slate-700">Bisa juga tempel screenshot langsung (Ctrl+V) di panel ini. Gambar dipakai saat riset berikutnya.</p>
        {imageError && <p className="text-xs text-red-400">{imageError}</p>}
      </div>

      {/* Isi Brief */}
      {!brief ? (
        <p className="text-xs text-slate-500 border border-dashed border-navy-800 rounded-lg p-3">
          Belum ada riset. Klik <span className="text-slate-300">Riset Bisnis</span> untuk meninjau hasilnya dulu, atau langsung
          Generate dan riset akan dijalankan otomatis.
        </p>
      ) : jsonMode ? (
        <div className="space-y-2">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={22}
            spellCheck={false}
            className="w-full bg-navy-950 border border-navy-800 rounded-lg px-3 py-2 text-[11px] leading-5 text-slate-200 font-mono focus:outline-none focus:border-forest-700 resize-y"
          />
          {jsonError && <p className="text-xs text-red-400">{jsonError}</p>}
          <div className="flex gap-2">
            <button
              onClick={saveJson}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-xs font-medium disabled:opacity-40"
            >
              {saving ? "Menyimpan..." : "Simpan Brief"}
            </button>
            <button onClick={() => setJsonMode(false)} className="px-3 py-1.5 rounded-lg border border-navy-800 text-slate-400 text-xs">
              Batal
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          {brief.ringkasan && <p className="text-slate-300 leading-5">{brief.ringkasan}</p>}

          {/* Arah desain */}
          <div className="rounded-lg border border-navy-800 bg-navy-900/40 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-medium">Arah desain</span>
              <span className={`px-1.5 py-0.5 rounded border text-[11px] ${SOURCE_BADGE[brief.visual.sumber_palet].className}`}>
                {SOURCE_BADGE[brief.visual.sumber_palet].label}
              </span>
              <span className="text-slate-600">{brief.visual.theme === "dark" ? "Tema gelap" : "Tema terang"}</span>
            </div>
            {brief.visual.tema && <p className="text-slate-300">{brief.visual.tema}</p>}
            {brief.visual.mood.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {brief.visual.mood.map((m) => (
                  <span key={m} className="px-2 py-0.5 rounded-full bg-navy-800 text-slate-400">{m}</span>
                ))}
              </div>
            )}
            {palette && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PALETTE_LABELS.map(({ key, label }) => (
                  <label key={key} className="space-y-1 cursor-pointer">
                    <span className="block h-9 rounded-md border border-white/10" style={{ background: palette[key] }} />
                    <input
                      type="color"
                      value={palette[key]}
                      onChange={(e) => setPalette({ ...palette, [key]: e.target.value })}
                      className="sr-only"
                    />
                    <span className="block text-[10px] text-slate-500">{label}</span>
                    <span className="block text-[10px] text-slate-400 font-mono">{palette[key]}</span>
                  </label>
                ))}
              </div>
            )}
            {paletteChanged && (
              <div className="flex gap-2">
                <button
                  onClick={() => save({ ...brief, visual: { ...brief.visual, palet: palette! } })}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-xs font-medium disabled:opacity-40"
                >
                  {saving ? "Menyimpan..." : "Simpan warna"}
                </button>
                <button onClick={() => setPalette(brief.visual.palet)} className="px-3 py-1.5 rounded-lg border border-navy-800 text-slate-400 text-xs">
                  Batal
                </button>
              </div>
            )}
            {brief.visual.alasan_palet && <p className="text-slate-500">{brief.visual.alasan_palet}</p>}
            <p className="text-slate-500">
              Font: <span className="text-slate-300">{brief.visual.font_heading}</span> /{" "}
              <span className="text-slate-300">{brief.visual.font_body}</span>
              {brief.visual.motif && <> · Motif: <span className="text-slate-300">{brief.visual.motif}</span></>}
            </p>
          </div>

          {brief.produk.length > 0 && (
            <BriefSection title={`Produk / menu (${brief.produk.length})`}>
              <ul className="space-y-1">
                {brief.produk.map((p, i) => (
                  <li key={`${p.nama}-${i}`} className="flex justify-between gap-3">
                    <span className="text-slate-300">{p.nama}</span>
                    <span className={p.harga ? "text-slate-400 shrink-0" : "text-slate-700 shrink-0"}>{p.harga ?? "tanpa harga"}</span>
                  </li>
                ))}
              </ul>
            </BriefSection>
          )}

          <BriefList title="Layanan" items={brief.layanan} />
          <BriefList title="Fasilitas" items={brief.fasilitas} />
          <BriefList title="Dipuji pelanggan" items={brief.keunggulan_dari_ulasan} />
          {brief.jam_buka && <BriefSection title="Jam buka"><p className="text-slate-300">{brief.jam_buka}</p></BriefSection>}
          {brief.target_pelanggan && (
            <BriefSection title="Target pelanggan"><p className="text-slate-300">{brief.target_pelanggan}</p></BriefSection>
          )}
          <BriefList title="Kanal online" items={brief.kanal} />
          {(brief.kata_kunci_foto?.length ?? 0) > 0 && (
            <BriefSection title="Kata kunci foto stok">
              <p className="text-slate-400 font-mono">{brief.kata_kunci_foto.join(" · ")}</p>
            </BriefSection>
          )}

          {brief.tidak_ditemukan.length > 0 && (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-3">
              <p className="text-amber-400 font-medium mb-1">Tidak ditemukan saat riset (tidak akan dikarang)</p>
              <ul className="list-disc pl-4 text-amber-200/70 space-y-0.5">
                {brief.tidak_ditemukan.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          )}

          {brief.sumber.length > 0 && (
            <p className="text-slate-600">
              Sumber: {brief.sumber.map((s) => s.judul).join(" · ")}
            </p>
          )}

          <button
            onClick={() => {
              setJsonText(JSON.stringify(brief, null, 2));
              setJsonError(null);
              setJsonMode(true);
            }}
            className="text-xs text-sky-400 hover:text-sky-300"
          >
            Koreksi Brief (edit JSON)
          </button>
        </div>
      )}
    </div>
  );
}

function BriefSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-slate-500 font-medium">{title}</p>
      {children}
    </div>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <BriefSection title={title}>
      <ul className="list-disc pl-4 text-slate-300 space-y-0.5">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </BriefSection>
  );
}
