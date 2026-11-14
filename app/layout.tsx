import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const fallbackUrl = "http://localhost:3000";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || fallbackUrl).replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "My Library — books, essays, PDFs & notes on a dark shelf",
    template: "%s · My Library",
  },
  description:
    "A private, hand-arranged bookshelf of books, articles, PDFs, videos and notes. Browse the wall, search the spines, or step behind the desk to add something new.",
  applicationName: "My Library",
  authors: [{ name: "My Library" }],
  creator: "My Library",
  keywords: [
    "personal library",
    "bookshelf",
    "reading list",
    "books",
    "articles",
    "PDFs",
    "notes",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "My Library",
    title: "My Library — a private shelf of books, essays & notes",
    description:
      "A dark, moving bookshelf of books, articles, PDFs, videos and notes. Browse, search, and keep a quiet record of what you read.",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Library",
    description:
      "A dark, moving bookshelf of books, articles, PDFs, videos and notes.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  category: "books",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#090B12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <a className="skip-link" href="#shelf">
          Skip to the shelf
        </a>
        {children}
      </body>
    </html>
  );
}
