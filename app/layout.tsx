import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { GLOBAL_KEYWORDS, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";
import RouteLoadingBar from "@/app/components/RouteLoadingBar";

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
    default: `${SITE_NAME} — Jasa Website Medan | Fullstack Developer`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Jasa pembuatan website di Medan oleh Arif Jagad. Fullstack Developer spesialis Next.js dan Laravel untuk website bisnis lokal, company profile, landing page, dan demo website SEO-friendly.",
  keywords: GLOBAL_KEYWORDS,
  category: "technology",
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
    title: `${SITE_NAME} — Jasa Website Medan | Fullstack Developer`,
    description:
      "Jasa pembuatan website di Medan oleh Arif Jagad. Spesialis Next.js dan Laravel untuk website bisnis lokal yang cepat, modern, dan SEO-ready.",
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
    title: `${SITE_NAME} — Jasa Website Medan | Fullstack Developer`,
    description:
      "Jasa pembuatan website di Medan oleh Arif Jagad. Solusi Next.js dan Laravel untuk bisnis lokal yang ingin naik level secara digital.",
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
      <body className="antialiased">
        <Suspense fallback={null}>
          <RouteLoadingBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
