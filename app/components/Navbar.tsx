"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { href: "#projects",    label: "Project" },
  { href: "#experience",  label: "Pengalaman" },
  { href: "#testimonials",label: "Testimoni" },
  { href: "#kontak",      label: "Kontak" },
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-navy-950/90 backdrop-blur-md border-b border-navy-900 shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="section-container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          id="navbar-logo"
          className="font-mono text-sm font-semibold text-slate-200 hover:text-forest-200 transition-colors"
        >
          arif<span className="text-forest-200">.</span>jagad
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              id={`nav-${link.label.toLowerCase()}`}
              className="font-mono text-xs text-slate-500 hover:text-slate-200 transition-colors tracking-wide"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          id="navbar-mobile-toggle"
          className="flex flex-col gap-1.5 p-1 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className={`block h-px w-5 bg-slate-500 transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block h-px w-5 bg-slate-500 transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block h-px w-5 bg-slate-500 transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-navy-900 bg-navy-950 md:hidden"
          >
            <nav className="section-container flex flex-col py-4 gap-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="font-mono text-sm text-slate-500 hover:text-slate-200 transition-colors"
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
