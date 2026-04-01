"use client";

/**
 * app/demo/[slug]/DemoBanner.tsx
 * Banner floating di bagian atas demo page
 * Menunjukkan bahwa ini adalah demo yang dibuat oleh arifjagad
 */

import { useState } from "react";

interface DemoBannerProps {
  namaBisnis: string;
  nomorTelepon: string | null;
}

export default function DemoBanner({ namaBisnis, nomorTelepon }: DemoBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const cleanPhone = nomorTelepon
    ? nomorTelepon.replace(/\D/g, "").replace(/^0/, "62")
    : null;

  const waLink = cleanPhone
    ? `https://wa.me/6282167565321?text=${encodeURIComponent(
        `Halo! Saya tertarik dengan demo website yang dibuat untuk ${namaBisnis}. Bisa kita diskusikan?`
      )}`
    : "https://wa.me/6282167565321";

  return (
    <div
      className="fixed top-0 left-0 right-0 z-9999 flex items-center justify-between px-4 py-2.5"
      style={{
        background: "rgba(5, 5, 15, 0.92)",
        borderBottom: "1px solid rgba(52, 211, 153, 0.2)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Left: info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="text-emerald-400"
            strokeWidth="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <p className="text-xs text-gray-400 truncate">
          <span className="text-gray-500 hidden sm:inline">Preview website untuk </span>
          <span className="text-white font-medium">{namaBisnis}</span>
          <span className="text-gray-600 mx-1.5">·</span>
          <span className="text-emerald-500/80">dibuat oleh </span>
          <a
            href="/"
            className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            arifjagad.my.id
          </a>
        </p>
      </div>

      {/* Right: CTA + dismiss */}
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: "rgba(52, 211, 153, 0.12)",
            border: "1px solid rgba(52, 211, 153, 0.3)",
            color: "#34d399",
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12.004 0C5.374 0 0 5.373 0 11.998c0 2.117.554 4.099 1.522 5.822L.057 23.994l6.305-1.654A11.954 11.954 0 0012.004 24C18.628 24 24 18.626 24 11.998 24 5.373 18.628 0 12.004 0zm0 21.818a9.816 9.816 0 01-5.003-1.371l-.359-.214-3.724.977.994-3.629-.233-.373a9.786 9.786 0 01-1.499-5.208c0-5.411 4.403-9.811 9.824-9.811 5.42 0 9.823 4.4 9.823 9.811 0 5.412-4.403 9.818-9.823 9.818z" />
          </svg>
          Hubungi Saya
        </a>

        <button
          onClick={() => setDismissed(true)}
          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-600 hover:text-gray-400 hover:bg-gray-800/50 transition-all"
          aria-label="Tutup banner"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
