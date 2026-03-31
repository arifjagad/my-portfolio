"use client";

import { motion } from "framer-motion";
import { GithubStats } from "@/lib/github";

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  PHP: "#8892be",
  Python: "#3572A5",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Rust: "#dea584",
  Go: "#00ADD8",
  Shell: "#89e051",
  Blade: "#f05340",
};

type Props = {
  stats: GithubStats;
};

// Compact number formatter: 1963 → "1.9K"
function fmt(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "K";
  return n.toLocaleString();
}

export default function GithubStatsSection({ stats }: Props) {
  const hasContributions = stats.contributionsLastYear > 0;
  const hasCommits = stats.totalCommits > 0;

  return (
    <section id="github-stats" className="relative py-24 border-t border-navy-900 overflow-hidden bg-navy-950">
      
      {/* ── Background Depth Orb ── */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[400px] w-full max-w-3xl rounded-[100%] bg-forest-700/5 blur-[120px]" />
      </div>

      <div className="section-container">

        {/* ── Header ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-14"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-forest-200/70">
            — AKTIVITAS
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100 leading-tight">
            GitHub <span className="text-forest-200">Stats</span>
          </h2>
          <p className="mt-4 text-[15px] text-slate-400 max-w-lg leading-relaxed">
            Aktivitas coding dan kontribusi open source saya di GitHub.
          </p>
        </motion.div>

        {/* ── Row 1: Key Metrics ──────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 mb-10">
          {/* Public Repos */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0 }}
            className="group bg-navy-900/40 backdrop-blur-sm border border-navy-800/60 rounded-2xl p-6 flex flex-col gap-3 transition-all duration-500 hover:border-forest-700/50 hover:shadow-[0_8px_30px_-12px_rgba(149,213,178,0.2)] hover:-translate-y-1"
          >
            <div className="text-slate-400 group-hover:text-forest-200 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </div>
            <div className="text-4xl font-bold text-slate-100">{fmt(stats.publicRepos)}</div>
            <div className="font-mono text-[11px] font-semibold text-slate-500 uppercase tracking-[0.15em]">Public Repos</div>
          </motion.div>

          {/* Contributions — hanya tampil jika ada data */}
          {(hasContributions || !hasCommits) && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="group bg-navy-900/40 backdrop-blur-sm border border-navy-800/60 rounded-2xl p-6 flex flex-col gap-3 transition-all duration-500 hover:border-forest-700/50 hover:shadow-[0_8px_30px_-12px_rgba(149,213,178,0.2)] hover:-translate-y-1"
            >
              <div className="text-forest-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="4" height="4" rx="1" />
                  <rect x="10" y="4" width="4" height="4" rx="1" />
                  <rect x="17" y="4" width="4" height="4" rx="1" />
                  <rect x="3" y="11" width="4" height="4" rx="1" />
                  <rect x="10" y="11" width="4" height="4" rx="1" />
                  <rect x="17" y="11" width="4" height="4" rx="1" />
                  <rect x="3" y="18" width="4" height="4" rx="1" />
                  <rect x="10" y="18" width="4" height="4" rx="1" />
                </svg>
              </div>
              <div className="text-4xl font-bold text-slate-100">
                {hasContributions ? fmt(stats.contributionsLastYear) : "900+"}
              </div>
              <div className="font-mono text-[11px] font-semibold text-slate-500 uppercase tracking-[0.15em]">Contributions / Yr</div>
            </motion.div>
          )}

          {/* Total Commits */}
          {hasCommits && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="group bg-navy-900/40 backdrop-blur-sm border border-navy-800/60 rounded-2xl p-6 flex flex-col gap-3 transition-all duration-500 hover:border-forest-700/50 hover:shadow-[0_8px_30px_-12px_rgba(149,213,178,0.2)] hover:-translate-y-1"
            >
              <div className="text-slate-400 group-hover:text-forest-200 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <line x1="12" y1="3" x2="12" y2="9" />
                  <line x1="12" y1="15" x2="12" y2="21" />
                </svg>
              </div>
              <div className="text-4xl font-bold text-slate-100">{fmt(stats.totalCommits)}</div>
              <div className="font-mono text-[11px] font-semibold text-slate-500 uppercase tracking-[0.15em]">Total Commits</div>
            </motion.div>
          )}
        </div>

        {/* ── Row 2: Contribution Graph Embed ─────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="mb-10 group rounded-2xl border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm p-6 sm:p-8 overflow-hidden transition-all duration-500 hover:border-forest-700/50 hover:shadow-[0_8px_30px_-12px_rgba(149,213,178,0.2)] relative"
        >
          <p className="mb-5 font-mono text-[11px] font-semibold text-slate-400 group-hover:text-forest-200 transition-colors uppercase tracking-[0.15em]">
            Contribution Graph — Last Year
          </p>
          <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
            <img
              src={`https://ghchart.rshah.org/1a7a4a/arifjagad`}
              alt="GitHub Contribution Graph"
              className="w-full min-w-[700px] opacity-80 group-hover:opacity-100 transition-opacity duration-500 drop-shadow-sm"
              style={{ filter: "brightness(0.9) contrast(1.1)" }}
            />
          </div>
        </motion.div>

        {/* ── Row 3: Top Languages ─────────────────────────────── */}
        {stats.topLanguages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="mb-10"
          >
            <p className="mb-5 font-mono text-[11px] font-semibold text-slate-400 uppercase tracking-[0.15em]">
              Top Languages
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {stats.topLanguages.map((lang, i) => (
                <motion.div
                  key={lang}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="group flex items-center gap-2.5 rounded-full bg-navy-900/40 backdrop-blur-sm border border-navy-800/60 px-5 py-2.5 hover:bg-forest-700/10 hover:border-forest-700/50 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 animate-pulse group-hover:animate-none"
                    style={{ backgroundColor: LANGUAGE_COLORS[lang] ?? "#64748b" }}
                  />
                  <span className="font-mono text-xs font-medium text-slate-300 group-hover:text-forest-200 transition-colors">{lang}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Row 4: Pinned Repos ───────────────────────────────── */}
        {stats.pinnedRepos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.25 }}
            className="mb-10"
          >
            <p className="mb-5 font-mono text-[11px] font-semibold text-slate-400 uppercase tracking-[0.15em]">
              Featured Repositories
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {stats.pinnedRepos.map((repo, i) => (
                <motion.a
                  key={repo.name}
                  href={repo.url}
                  id={`link-pinned-repo-${repo.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="group flex flex-col gap-4 rounded-2xl border border-navy-800/60 bg-navy-900/40 backdrop-blur-sm p-6 hover:border-forest-700/50 hover:-translate-y-1 hover:shadow-[0_8px_30px_-12px_rgba(149,213,178,0.25)] transition-all duration-500"
                >
                  {/* Repo name + icon */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-slate-500 shrink-0 group-hover:text-forest-200 transition-colors">
                        <path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h11v4H3z" />
                      </svg>
                      <span className="font-mono text-sm font-bold text-slate-200 group-hover:text-forest-200 transition-colors truncate">
                        {repo.name}
                      </span>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-600 group-hover:text-forest-200 transition-colors shrink-0 mt-0.5">
                      <path d="M7 17L17 7M7 7h10v10" />
                    </svg>
                  </div>

                  {/* Description */}
                  <div className="flex-1">
                    <p className="text-[13px] text-slate-400 group-hover:text-slate-300 transition-colors line-clamp-2 leading-relaxed">
                      {repo.description ?? "No description."}
                    </p>
                  </div>

                  {/* Footer: language + stars + forks */}
                  <div className="flex items-center gap-4 mt-2 border-t border-navy-800/50 pt-4">
                    {repo.language && (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: LANGUAGE_COLORS[repo.language] ?? "#64748b" }}
                        />
                        <span className="font-mono text-[11px] font-medium text-slate-400 group-hover:text-slate-300">{repo.language}</span>
                      </div>
                    )}
                    {repo.stars > 0 && (
                      <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-slate-400 transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span className="font-mono text-[11px] font-medium">{repo.stars}</span>
                      </div>
                    )}
                    {repo.forks > 0 && (
                      <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-slate-400 transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="12" cy="18" r="2" />
                          <path d="M6 8v2a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V8" />
                          <line x1="12" y1="14" x2="12" y2="16" />
                        </svg>
                        <span className="font-mono text-[11px] font-medium">{repo.forks}</span>
                      </div>
                    )}
                  </div>
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Footer: GitHub link ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="text-center sm:text-left mt-12"
        >
          <a
            href="https://github.com/arifjagad"
            id="link-github-profile"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 font-mono text-sm font-semibold text-slate-400 hover:text-forest-200 transition-colors bg-navy-900/30 hover:bg-forest-700/10 border border-navy-800/50 hover:border-forest-700/40 rounded-full px-6 py-2.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            Jelajahi GitHub saya 
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </a>
        </motion.div>

      </div>
    </section>
  );
}
