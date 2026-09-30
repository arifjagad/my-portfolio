"use client";

/**
 * app/demo/[slug]/DemoRenderer.tsx
 * Client component untuk render HTML hasil generate AI
 * Pakai iframe + srcDoc untuk isolasi penuh (CSS tidak bocor, no SSR conflict)
 *
 * Anti-copas kasual (lapisan viewer):
 * 1. HTML demo diambil via /api/demo/html saat runtime, BUKAN dibake ke
 *    halaman — jadi view-source tidak mengandung HTML demo.
 * 2. Blokir klik kanan, drag, seleksi, copy, Ctrl/Cmd+S,U,P, dan shortcut
 *    pembuka devtools (F12, Ctrl+Shift+I/J/C, Cmd+Opt+I/J/C) di dokumen
 *    viewer (di dalam iframe sudah ada proteksi sendiri di tiap HTML demo).
 *    Semua ini hanya menghambat yang kasual: menu browser dan devtools
 *    yang sudah terbuka tetap bisa menyalin DOM yang ter-render.
 */

import DemoBanner from "./DemoBanner";
import { useEffect, useMemo, useState } from "react";

interface Props {
  slug: string;
  namaBisnis: string;
  nomorTelepon: string | null;
}

function normalizeSrcDocHtml(rawHtml: string): string {
  let html = rawHtml;

  // Pastikan anchor hash resolve ke dokumen srcDoc, bukan URL parent.
  if (!/<base\s/i.test(html)) {
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, '<head$1><base href="about:srcdoc">');
    } else {
      html = `<head><base href="about:srcdoc"></head>${html}`;
    }
  }

  // Fallback guard untuk HTML AI yang tidak attach behavior anchor internal.
  if (!html.includes("data-anchor-fix-script")) {
    const script = `<script data-anchor-fix-script>(function(){document.addEventListener('click',function(e){var t=e.target;var a=t&&t.closest?t.closest('a[href^="#"]'):null;if(!a)return;var href=a.getAttribute('href');if(!href||href.length<2)return;var id=decodeURIComponent(href.slice(1));var el=document.getElementById(id);if(!el)return;e.preventDefault();el.scrollIntoView({behavior:'smooth',block:'start'});});})();</script>`;
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${script}</body>`);
    } else {
      html += script;
    }
  }

  return html;
}

/** Ambil HTML demo dari API saat runtime (bukan dari SSR payload). */
function useDemoHtml(slug: string) {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await fetch(
          `/api/demo/html?slug=${encodeURIComponent(slug)}`,
          { signal: ctrl.signal, headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (typeof data?.html === "string" && data.html.length > 0) {
          setHtml(data.html);
        } else {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [slug]);

  return { html, failed };
}

/** Proteksi level viewer: blokir jalur simpan/salin yang kasual. */
function useViewerProtection() {
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => {
      const k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["s", "u", "p"].includes(k)) {
        e.preventDefault();
      }
      // Persulit buka devtools via keyboard (kasual saja; lewat menu browser tetap bisa)
      if (e.key === "F12") e.preventDefault();
      if (
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k)) ||
        (e.metaKey && e.altKey && ["i", "j", "c"].includes(k))
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("selectstart", block);
    document.addEventListener("copy", block);
    document.addEventListener("keydown", onKeyDown);

    const de = document.documentElement;
    const prevUserSelect = de.style.getPropertyValue("user-select");
    const prevWebkit = de.style.getPropertyValue("-webkit-user-select");
    de.style.setProperty("user-select", "none");
    de.style.setProperty("-webkit-user-select", "none");

    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("selectstart", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("keydown", onKeyDown);
      de.style.setProperty("user-select", prevUserSelect);
      de.style.setProperty("-webkit-user-select", prevWebkit);
    };
  }, []);
}

function useVisitBeacon(slug: string) {
  useEffect(() => {
    const key = `demo-visit:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage bisa diblokir; dedupe tetap dilakukan di server
    }

    fetch("/api/demo/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);
}

export default function DemoRenderer({ slug, namaBisnis, nomorTelepon }: Props) {
  const { html, failed } = useDemoHtml(slug);
  const safeHtml = useMemo(() => (html ? normalizeSrcDocHtml(html) : null), [html]);
  useVisitBeacon(slug);
  useViewerProtection();

  return (
    <div className="w-full h-dvh overflow-hidden bg-white">
      {/* Banner floating */}
      <DemoBanner namaBisnis={namaBisnis} nomorTelepon={nomorTelepon} />

      {/*
        Container fullscreen.
        pt-[44px] digunakan sebagai offset untuk banner yang posisinya fixed,
        sehingga bagian atas iframe tidak tertutup oleh banner.
      */}
      <div className="w-full h-full pt-11">
        {safeHtml ? (
          <iframe
            srcDoc={safeHtml}
            title={`Demo website — ${namaBisnis}`}
            className="w-full h-full border-0 block"
            sandbox="allow-scripts allow-popups allow-forms"
            referrerPolicy="no-referrer"
            loading="eager"
          />
        ) : failed ? (
          <div className="w-full h-full bg-gray-950 flex items-center justify-center p-6">
            <div className="text-center space-y-3">
              <p className="text-white text-lg font-medium">Demo tidak dapat dimuat</p>
              <p className="text-gray-400 text-sm">
                Silakan muat ulang halaman. Jika masih gagal, hubungi kami.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 rounded-lg text-sm font-medium text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
              >
                Muat ulang
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gray-950 flex items-center justify-center">
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 relative">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
                <div className="absolute inset-2 rounded-full border-2 border-emerald-500/60 animate-ping animation-delay-150" />
                <div className="relative w-16 h-16 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-emerald-400" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-48 bg-gray-800 rounded animate-pulse mx-auto" />
                <div className="h-3 w-32 bg-gray-800/60 rounded animate-pulse mx-auto" />
              </div>
              <p className="text-gray-500 text-sm font-mono">Memuat demo...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
