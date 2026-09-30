/**
 * app/demo/[slug]/page.tsx
 * Public demo page — render HTML hasil generate Gemini
 *
 * Flow:
 * 1. Ambil data bisnis dari Supabase by slug (server)
 * 2. Jika not found → 404
 * 3. Jika is_locked → halaman locked
 * 4. Jika generated_html ada:
 *    a. Sisipkan penanda forensik per prospek (komentar HTML tak terlihat)
 *       agar kebocoran bisa dilacak sumbernya.
 *    b. HTML disamarkan (XOR + base64, kunci acak per request) lalu di-pass
 *       ke DemoRenderer yang membukanya kembali di sisi klien sebelum
 *       disuntik ke iframe srcDoc (iframe hanya dirender setelah mount agar
 *       SSR tidak membocorkan isi ke atribut srcdoc).
 *    Tujuannya: view-source / salinan halaman tidak langsung memuat HTML
 *    demo yang bisa dipakai, TANPA menambah round-trip fetch (cepat).
 * 5. Jika belum ada → halaman "sedang disiapkan"
 */

import { notFound } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { getServiceClient } from "@/lib/supabase-admin";
import DemoRenderer from "./DemoRenderer";
import { Metadata } from "next";
import { LONG_TAIL_KEYWORDS, SHORT_KEYWORDS, absoluteUrl } from "@/lib/seo";

/**
 * Ketertelusuran per prospek (forensik, bukan enkripsi).
 * Setiap slug mendapat ID unik deterministik; disisipkan sebagai komentar
 * HTML tak terlihat di dalam demo SEBELUM disamarkan. Kalau suatu saat ada
 * HTML demo yang bocor/tersebar, ID ini menunjukkan link prospek mana yang
 * menjadi sumbernya. Verifikasi: hitung ulang untuk slug yang dikenal —
 *   node -e "console.log(require('node:crypto').createHash('sha256').update('demo-trace:v1:'+'<slug>').digest('hex').slice(0,16))"
 * Ini penghalang forensik kasual: yang sengaja membersihkan komentar tetap
 * bisa menghapusnya, sama seperti batasan devtools pada umumnya.
 */
function demoTraceId(slug: string): string {
  return createHash("sha256")
    .update(`demo-trace:v1:${slug}`)
    .digest("hex")
    .slice(0, 16);
}

function injectTraceMarker(html: string, traceId: string): string {
  const marker = `<!--demo-trace:${traceId}-->`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${marker}</body>`);
  }
  return `${html}${marker}`;
}

/**
 * Samarkan HTML demo agar view-source / hasil Ctrl+S (via menu) tidak
 * langsung menampilkan HTML yang bisa dipakai. XOR dengan kunci acak per
 * request + base64; kunci ikut dikirim ke klien untuk dibuka kembali.
 * Ini penghalang kasual, bukan enkripsi keamanan: yang niat tetap bisa
 * membalikannya, sama seperti batasan devtools pada umumnya.
 */
function obfuscateHtml(html: string): { data: string; key: string } {
  const key = randomBytes(32);
  const buf = Buffer.from(html, "utf8");
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ key[i % key.length];
  return { data: out.toString("base64"), key: key.toString("base64") };
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
    .select("nama_bisnis, kategori, alamat, generated_html, is_locked")
    .eq("slug", slug)
    .single();

  if (!data) {
    return {
      title: "Demo Page",
      robots: { index: false, follow: false },
    };
  }

  const isIndexable = Boolean(data.generated_html) && !data.is_locked;
  const title = `${data.nama_bisnis} - Demo Website ${data.kategori}`;
  const description = `Preview website profesional untuk ${data.nama_bisnis}, ${data.kategori} di ${data.alamat || "Medan"}.`;

  return {
    title,
    description,
    keywords: [
      ...SHORT_KEYWORDS,
      ...LONG_TAIL_KEYWORDS,
      `${data.kategori} Medan`,
      `${data.nama_bisnis} website`,
      "demo website bisnis lokal",
    ],
    alternates: {
      canonical: absoluteUrl(`/demo/${slug}`),
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: absoluteUrl(`/demo/${slug}`),
    },
    robots: isIndexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
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
      "slug, nama_bisnis, kategori, alamat, nomor_telepon, generated_html, is_locked"
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
  // 1. Sisipkan penanda forensik per prospek (tak terlihat di render).
  // 2. Samarkan agar view-source / salinan halaman tidak langsung memuat
  //    HTML demo yang bisa dipakai. Dibuka kembali di DemoRenderer.
  const traceId = demoTraceId(biz.slug);
  const tracedHtml = injectTraceMarker(biz.generated_html, traceId);
  const payload = obfuscateHtml(tracedHtml);
  return (
    <DemoRenderer
      slug={biz.slug}
      payload={payload}
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
