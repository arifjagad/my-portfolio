"use client";

/**
 * app/demo/[slug]/DemoRenderer.tsx
 * Client component untuk render HTML hasil generate AI
 * Pakai iframe + srcDoc untuk isolasi penuh (CSS tidak bocor, no SSR conflict)
 */

import DemoBanner from "./DemoBanner";
import { useEffect, useMemo } from "react";

interface Props {
  slug: string;
  html: string;
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

export default function DemoRenderer({ slug, html, namaBisnis, nomorTelepon }: Props) {
  const safeHtml = useMemo(() => normalizeSrcDocHtml(html), [html]);
  useVisitBeacon(slug);

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
        <iframe
          srcDoc={safeHtml}
          title={`Demo website — ${namaBisnis}`}
          className="w-full h-full border-0 block"
          sandbox="allow-scripts allow-popups allow-forms"
          referrerPolicy="no-referrer"
          loading="eager"
        />
      </div>
    </div>
  );
}
