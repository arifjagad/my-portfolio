import Link from "next/link";
import { ReactNode } from "react";

type Tone = "slate" | "amber" | "sky" | "red";

interface Action {
  href: string;
  label: string;
  variant?: "primary" | "ghost";
}

interface ErrorShellProps {
  code: string;
  title: string;
  description: string;
  tone?: Tone;
  actions: Action[];
  badge?: string;
  footer?: ReactNode;
}

const toneStyles: Record<Tone, { border: string; glow: string; badge: string }> = {
  slate: {
    border: "border-slate-700/40",
    glow: "from-slate-500/20 to-navy-900/0",
    badge: "text-slate-300 bg-slate-500/10 border-slate-400/20",
  },
  amber: {
    border: "border-amber-700/40",
    glow: "from-amber-500/20 to-navy-900/0",
    badge: "text-amber-200 bg-amber-500/10 border-amber-400/25",
  },
  sky: {
    border: "border-sky-700/40",
    glow: "from-sky-500/20 to-navy-900/0",
    badge: "text-sky-200 bg-sky-500/10 border-sky-400/25",
  },
  red: {
    border: "border-red-700/40",
    glow: "from-red-500/20 to-navy-900/0",
    badge: "text-red-200 bg-red-500/10 border-red-400/25",
  },
};

export default function ErrorShell({
  code,
  title,
  description,
  tone = "slate",
  actions,
  badge,
  footer,
}: ErrorShellProps) {
  const t = toneStyles[tone];

  return (
    <main className="relative min-h-screen overflow-hidden bg-navy-950 text-slate-200 px-6 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-gradient-to-b blur-3xl ${t.glow}`} />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.16) 1px, transparent 0)", backgroundSize: "28px 28px" }} />
      </div>

      <section className="relative mx-auto flex min-h-[78vh] w-full max-w-3xl items-center justify-center">
        <article className={`w-full rounded-3xl border ${t.border} bg-navy-900/70 p-8 md:p-10 shadow-[0_20px_90px_rgba(2,8,23,0.55)] backdrop-blur-sm`}>
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-slate-500">Error</p>
              <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight md:text-5xl">{code}</h1>
            </div>
            {badge ? (
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${t.badge}`}>
                {badge}
              </span>
            ) : null}
          </div>

          <h2 className="text-2xl font-semibold leading-tight md:text-3xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">{description}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {actions.map((action, idx) => {
              const isPrimary = (action.variant || (idx === 0 ? "primary" : "ghost")) === "primary";
              return (
                <Link
                  key={`${action.href}-${action.label}`}
                  href={action.href}
                  className={
                    isPrimary
                      ? "rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-forest-500 hover:shadow-[0_10px_35px_rgba(64,145,108,0.35)]"
                      : "rounded-xl border border-navy-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:-translate-y-0.5 hover:border-slate-500/40 hover:text-slate-100"
                  }
                >
                  {action.label}
                </Link>
              );
            })}
          </div>

          {footer ? <div className="mt-6 border-t border-navy-800 pt-4 text-xs text-slate-500">{footer}</div> : null}
        </article>
      </section>
    </main>
  );
}
