import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import Analytics from "@/components/Analytics";
import {
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  getSiteUrl,
  joinKeywords,
} from "@/lib/seo";

const geistSans = { variable: "font-sans" };
const geistMono = { variable: "font-mono" };

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — AI & Templates for Google Review Replies`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Respondly automates every Google review reply with on-brand templates or AI. Save hours every week, protect your rating, and turn every star into trust.",
  keywords: joinKeywords(DEFAULT_KEYWORDS),
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: siteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: SITE_NAME,
    title: "Respondly — AI & Templates for Google Review Replies",
    description:
      "Automate Google review replies with smart templates and AI. On-brand, sentiment-aware, and ready in seconds for local businesses and multi-location brands.",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Respondly — AI Google review automation",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Respondly — AI & Templates for Google Review Replies",
    description:
      "Automate Google review replies with smart templates or AI. On-brand answers, multilingual support, and human-in-the-loop approvals.",
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
