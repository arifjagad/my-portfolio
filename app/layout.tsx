import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arif Jagad — Fullstack Developer",
  description:
    "Portfolio Arif Jagad, Fullstack Developer berbasis di Medan. Spesialis Next.js, Laravel, dan solusi web untuk bisnis lokal.",
  keywords: ["Fullstack Developer", "Medan", "Next.js", "Laravel", "Web Development"],
  authors: [{ name: "Arif Jagad", url: "https://github.com/arifjagad" }],
  openGraph: {
    title: "Arif Jagad — Fullstack Developer",
    description:
      "Portfolio Arif Jagad, Fullstack Developer berbasis di Medan. Spesialis Next.js, Laravel, dan solusi web untuk bisnis lokal.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${geistMono.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
