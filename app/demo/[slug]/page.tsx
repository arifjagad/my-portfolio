/**
 * app/demo/[slug]/page.tsx
 * Public demo page — render HTML hasil generate Gemini
 *
 * Flow:
 * 1. Ambil data bisnis dari Supabase by slug
 * 2. Jika not found → 404
 * 3. Jika is_locked → halaman locked
 * 4. Jika generated_html ada → render via dangerouslySetInnerHTML
 * 5. Jika belum ada → halaman "sedang disiapkan"
 */

import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import DemoRenderer from "./DemoRenderer";
import { Metadata } from "next";

// ─── Service client (server-side) ────────────────────────────────────────────
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── generateMetadata ─────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("demo_businesses")
    .select("nama_bisnis, kategori, alamat")
    .eq("slug", slug)
    .single();

  if (!data) {
    return { title: "Demo Page" };
  }

  return {
    title: `${data.nama_bisnis} — Demo Website`,
    description: `Preview website profesional untuk ${data.nama_bisnis}, ${data.kategori} di ${data.alamat || "Medan"}.`,
  };
}

// ─── Page component ───────────────────────────────────────────────────────────
export default async function DemoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getServiceClient();

  const { data: biz, error } = await supabase
    .from("demo_businesses")
    .select(
      "slug, nama_bisnis, kategori, alamat, nomor_telepon, generated_html, generated_at, generation_version, is_locked, lock_reason, enriched_data"
    )
    .eq("slug", slug)
    .single();

  if (error || !biz) {
    notFound();
  }

  // ── LOCKED ──────────────────────────────────────────────────────────────────
  if (biz.is_locked) {
    return <LockedPage biz={biz} />;
  }

  // ── BELUM GENERATE ──────────────────────────────────────────────────────────
  if (!biz.generated_html) {
    return <NotGeneratedPage biz={biz} />;
  }

  // ── RENDER HTML ─────────────────────────────────────────────────────────────
  return (
    <DemoRenderer
      html={biz.generated_html}
      namaBisnis={biz.nama_bisnis}
      nomorTelepon={biz.nomor_telepon}
    />
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LockedPage({ biz }: { biz: any }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        {/* Lock icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="text-gray-500"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-white text-2xl font-semibold">
            Demo Tidak Tersedia
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Halaman demo untuk <span className="text-white font-medium">{biz.nama_bisnis}</span> saat
            ini tidak dapat diakses.
          </p>
        </div>

        <a
          href="/"
          className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Kembali ke Homepage
        </a>
      </div>
    </div>
  );
}

function NotGeneratedPage({ biz }: { biz: any }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        {/* Pending icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-950/30 border border-emerald-900/50 flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="text-emerald-500"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-white text-2xl font-semibold">
            Sedang Disiapkan
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Website demo untuk{" "}
            <span className="text-white font-medium">{biz.nama_bisnis}</span>{" "}
            sedang dalam proses pembuatan. Silakan cek kembali dalam beberapa saat.
          </p>
        </div>

        <div className="pt-2 border-t border-gray-900 text-xs text-gray-600 font-mono">
          demo dibuat oleh{" "}
          <a href="/" className="text-emerald-600 hover:text-emerald-400 transition-colors">
            arifjagad.my.id
          </a>
        </div>
      </div>
    </div>
  );
}
