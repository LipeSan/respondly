import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { PromoTrialContent } from "@/app/promo/trial/PromoTrialContent";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  getJsonLdOrganization,
  getJsonLdSoftwareApplication,
  getSiteUrl,
  joinKeywords,
} from "@/lib/seo";

const siteUrl = getSiteUrl();
const canonicalUrl = `${siteUrl}/promo/trial`;

const organizationLd = getJsonLdOrganization(siteUrl);
const softwareLd = getJsonLdSoftwareApplication(siteUrl, "promo");

export const metadata: Metadata = {
  title: `${SITE_NAME} — 90-Day Free Trial (VIP90DAYS)`,
  description:
    "Get 90 days of Respondly free. Automate Google review replies with on-brand templates or AI. Card required. Cancel anytime.",
  keywords: joinKeywords([
    "90 day free trial",
    "Google review automation free trial",
    "VIP90DAYS",
    "AI review responder free",
    "respondly trial",
    "Google reviews automation offer",
  ]),
  alternates: {
    canonical: "/promo/trial",
  },
  openGraph: {
    type: "website",
    url: canonicalUrl,
    title: `${SITE_NAME} — 90-Day Free Trial (VIP90DAYS)`,
    description:
      "Claim your 90 days free with VIP90DAYS. Automate Google review replies with templates or AI that reads every review like your best teammate.",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Respondly 90-day free trial — Google reviews automation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — 90-Day Free Trial (VIP90DAYS)`,
    description:
      "VIP90DAYS unlocks 90 days free of Respondly. AI and templates for Google review replies, multilingual support, and 1-click approvals.",
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PromoTrialPage() {
  return (
    <>
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        <PromoTrialContent />
      </Suspense>
      <Script
        id="ld-json-promo"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationLd, softwareLd]),
        }}
      />
    </>
  );
}
