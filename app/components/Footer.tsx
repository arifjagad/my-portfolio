export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-navy-900 py-8">
      <div className="section-container flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="font-mono text-xs text-slate-500">
          © {year} Arif Jagad. All rights reserved.
        </p>
        <p className="font-mono text-xs text-slate-500">
          Built with{" "}
          <span className="text-forest-200">Next.js</span> ·{" "}
          <span className="text-forest-200">Tailwind</span> ·{" "}
          <span className="text-forest-200">Framer Motion</span>
        </p>
      </div>
    </footer>
  );
}
