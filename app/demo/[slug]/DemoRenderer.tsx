"use client";

/**
 * app/demo/[slug]/DemoRenderer.tsx
 * Client component untuk render HTML hasil generate AI
 * Pakai iframe + srcDoc untuk isolasi penuh (CSS tidak bocor, no SSR conflict)
 */

import DemoBanner from "./DemoBanner";

interface Props {
  html: string;
  namaBisnis: string;
  nomorTelepon: string | null;
}

export default function DemoRenderer({ html, namaBisnis, nomorTelepon }: Props) {
  return (
    <div className="w-full h-[100dvh] overflow-hidden bg-white">
      {/* Banner floating */}
      <DemoBanner namaBisnis={namaBisnis} nomorTelepon={nomorTelepon} />

      {/* 
        Container fullscreen. 
        pt-[44px] digunakan sebagai offset untuk banner yang posisinya fixed, 
        sehingga bagian atas iframe tidak tertutup oleh banner.
      */}
      <div className="w-full h-full pt-[44px]">
        <iframe
          srcDoc={html}
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
