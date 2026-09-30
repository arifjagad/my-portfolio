"use client";

/**
 * app/demo/[slug]/DemoRenderer.tsx
 * Client component untuk render HTML hasil generate AI
 * Pakai iframe + srcDoc untuk isolasi penuh (CSS tidak bocor, no SSR conflict)
 *
 * Anti-copas kasual (lapisan viewer):
 * 1. HTML demo diterima dalam keadaan tersamar (XOR + base64, kunci acak per
 *    request dari server) dan dibuka kembali di sini sebelum disuntik ke
 *    iframe — jadi view-source / salinan halaman tidak langsung memuat HTML
 *    yang bisa dipakai, TANPA round-trip fetch tambahan (tetap cepat).
 * 2. Blokir klik kanan, drag, seleksi, copy, Ctrl/Cmd+S,U,P, dan shortcut
 *    pembuka devtools (F12, Ctrl+Shift+I/J/C, Cmd+Opt+I/J/C) di dokumen
 *    viewer (di dalam iframe sudah ada proteksi sendiri di tiap HTML demo).
 * Bukan keamanan mutlak: devtools via menu browser tetap bisa menyalin DOM
 * yang ter-render; itu batas fundamental konten yang ditampilkan browser.
 */

import DemoBanner from "./DemoBanner";
import { useEffect, useMemo, useState } from "react";

interface ObfuscatedPayload {
  data: string;
  key: string;
}

interface Props {
  slug: string;
  payload: ObfuscatedPayload;
  namaBisnis: string;
  nomorTelepon: string | null;
}

/** Balikkan penyamaran dari server (XOR + base64). */
function deobfuscate(payload: ObfuscatedPayload): string {
  const data = Uint8Array.from(atob(payload.data), (c) => c.charCodeAt(0));
  const key = Uint8Array.from(atob(payload.key), (c) => c.charCodeAt(0));
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
  return new TextDecoder().decode(out);
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

export default function DemoRenderer({ slug, payload, namaBisnis, nomorTelepon }: Props) {
  const safeHtml = useMemo(
    () => normalizeSrcDocHtml(deobfuscate(payload)),
    [payload]
  );
  // Iframe HANYA dirender di klien (setelah mount), bukan saat SSR.
  // Kalau ikut SSR, React menulis HTML demo (yang sudah dibuka) ke atribut
  // srcdoc di HTML awal — view-source jadi bocor lagi (meski ter-escape).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
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
        {mounted ? (
          <iframe
            srcDoc={safeHtml}
            title={`Demo website — ${namaBisnis}`}
            className="w-full h-full border-0 block"
            sandbox="allow-scripts allow-popups allow-forms"
            referrerPolicy="no-referrer"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full bg-white" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
