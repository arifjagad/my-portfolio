"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function isInternalNavigation(target: EventTarget | null) {
  const anchor = (target as HTMLElement | null)?.closest("a");
  if (!anchor) return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;
  if (anchor.target === "_blank") return false;
  if (anchor.hasAttribute("download")) return false;

  try {
    const destination = new URL(anchor.href, window.location.href);
    const current = new URL(window.location.href);

    if (destination.origin !== current.origin) return false;
    if (
      destination.pathname === current.pathname &&
      destination.search === current.search &&
      destination.hash === current.hash
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export default function RouteLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const start = () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }

      setVisible(true);
      setProgress((prev) => (prev > 10 ? prev : 8));

      timerRef.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          const increment = prev < 40 ? 8 : prev < 70 ? 4 : 2;
          return Math.min(prev + increment, 90);
        });
      }, 180);
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!isInternalNavigation(event.target)) return;

      start();
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setProgress(100);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 220);

    return () => window.clearTimeout(hideTimer);
  }, [pathname, searchParams, visible]);

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-100 h-0.75 bg-transparent">
      <div
        className="h-full bg-linear-to-r from-forest-400 via-forest-500 to-forest-300 shadow-[0_0_12px_rgba(149,213,178,0.45)] transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
