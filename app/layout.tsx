import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Fullstack Developer`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Portfolio Arif Jagad, Fullstack Developer berbasis di Medan. Spesialis Next.js, Laravel, dan solusi web untuk bisnis lokal.",
  keywords: ["Fullstack Developer", "Medan", "Next.js", "Laravel", "Web Development"],
  authors: [{ name: "Arif Jagad", url: "https://github.com/arifjagad" }],
  alternates: {
    canonical: absoluteUrl("/"),
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: `${SITE_NAME} — Fullstack Developer`,
    description:
      "Portfolio Arif Jagad, Fullstack Developer berbasis di Medan. Spesialis Next.js, Laravel, dan solusi web untuk bisnis lokal.",
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    type: "website",
    locale: "id_ID",
    images: [
      {
        url: absoluteUrl("/opengraph-image.png"),
        width: 1200,
        height: 630,
        alt: "Arif Jagad - Fullstack Developer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Fullstack Developer`,
    description:
      "Portfolio Arif Jagad, Fullstack Developer berbasis di Medan. Spesialis Next.js, Laravel, dan solusi web untuk bisnis lokal.",
    images: [absoluteUrl("/opengraph-image.png")],
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
