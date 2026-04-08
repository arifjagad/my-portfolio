"use client";

import { useEffect, useState } from "react";

type Props = {
  targetSelector?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function ReadingProgress({ targetSelector }: Props) {
  const [progress, setProgress] = useState(0);
  const [topOffset, setTopOffset] = useState(0);

  useEffect(() => {
    let rafId = 0;

    const update = () => {
      const viewportHeight = window.innerHeight || 1;
      const scrollY = window.scrollY || window.pageYOffset;
      const doc = document.documentElement;
      const atPageBottom = scrollY + viewportHeight >= doc.scrollHeight - 2;

      const navbar = document.getElementById("navbar");
      const navHeight = navbar?.offsetHeight ?? 0;
      setTopOffset(navHeight);

      if (targetSelector) {
        const target = document.querySelector(targetSelector) as HTMLElement | null;
        if (target) {
          const rect = target.getBoundingClientRect();
          const articleTop = rect.top + scrollY;
          const articleBottom = rect.bottom + scrollY;

          const start = articleTop - navHeight - 12;
          const end = Math.max(start + 1, articleBottom - viewportHeight + navHeight + 24);
          const current = scrollY + navHeight;

          if (atPageBottom || current >= articleBottom) {
            setProgress(1);
            return;
          }

          const ratio = (current - start) / (end - start);
          setProgress(clamp(ratio, 0, 1));
          return;
        }
      }

      const scrollable = doc.scrollHeight - viewportHeight;
      const ratio = atPageBottom ? 1 : scrollable > 0 ? scrollY / scrollable : 0;
      setProgress(clamp(ratio, 0, 1));
    };

    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetSelector]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-70 h-1 bg-navy-950/55"
      style={{ top: topOffset }}
    >
      <div
        className="h-full bg-linear-to-r from-forest-700 via-forest-500 to-forest-200 shadow-[0_0_10px_rgba(149,213,178,0.45)] transition-[width] duration-150"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
    </div>
  );
}
