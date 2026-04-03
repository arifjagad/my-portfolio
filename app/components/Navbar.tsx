"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { href: "/#about",        label: "Tentang" },
  { href: "/#projects",     label: "Project" },
  { href: "/#experience",   label: "Pengalaman" },
  { href: "/#testimonials", label: "Testimoni" },
  { href: "/#kontak",       label: "Kontak" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      id="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-navy-950/70 backdrop-blur-xl border-b border-navy-800/50 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] py-1"
          : "bg-transparent py-3"
      }`}
    >
      <div className="section-container flex h-14 items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          id="navbar-logo"
          className="font-mono text-[15px] font-bold text-slate-100 hover:text-forest-200 transition-colors tracking-tight"
        >
          arif<span className="text-forest-200">.</span>jagad
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              id={`nav-${link.label.toLowerCase()}`}
              className="relative px-4 py-2 font-mono text-xs font-semibold text-slate-400 hover:text-forest-200 transition-colors tracking-widest uppercase rounded-full hover:bg-forest-700/10"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          id="navbar-mobile-toggle"
          className="group flex flex-col gap-1.5 p-2 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className={`block h-[2px] w-6 rounded-full bg-slate-300 transition-transform duration-300 ${menuOpen ? "translate-y-2 rotate-45 bg-forest-200" : "group-hover:bg-forest-200"}`} />
          <span className={`block h-[2px] w-4 rounded-full bg-slate-300 transition-opacity duration-300 ml-auto ${menuOpen ? "opacity-0" : "group-hover:bg-forest-200"}`} />
          <span className={`block h-[2px] w-6 rounded-full bg-slate-300 transition-transform duration-300 ${menuOpen ? "-translate-y-2 -rotate-45 bg-forest-200" : "group-hover:bg-forest-200"}`} />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-navy-800/50 bg-navy-950/95 backdrop-blur-xl md:hidden"
          >
            <nav className="section-container flex flex-col py-6 gap-2">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-4 py-3 font-mono text-sm font-semibold tracking-widest uppercase text-slate-400 transition-all hover:bg-forest-700/10 hover:text-forest-200 hover:pl-6"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
