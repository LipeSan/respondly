import type { Metadata } from "next";
import Script from "next/script";
import React from "react";
import Header from "../components/Landing/Header";
import Hero from "../components/Landing/Hero";
import BeforeAfter from "../components/Landing/BeforeAfter";
import MockupShowcase from "../components/Landing/MockupShowcase";
import HowItWorks from "../components/Landing/HowItWorks";
import Features from "../components/Landing/Features";
import Pricing from "../components/Landing/Pricing";
import FAQ from "../components/Landing/FAQ";
import FinalCTA from "../components/Landing/FinalCTA";
import Footer from "../components/Landing/Footer";
import {
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  getJsonLdOrganization,
  getJsonLdSoftwareApplication,
  getJsonLdWebSite,
  getSiteUrl,
  joinKeywords,
} from "@/lib/seo";

const siteUrl = getSiteUrl();

const organizationLd = getJsonLdOrganization(siteUrl);
const websiteLd = getJsonLdWebSite(siteUrl);
const softwareLd = getJsonLdSoftwareApplication(siteUrl, "home");

export const metadata: Metadata = {
  title: `${SITE_NAME} — AI & Templates for Google Review Replies`,
  description:
    "Respondly is an AI agent that replies to your new Google reviews automatically, with your own templates or AI that reads what the customer wrote. From A$9.99/month, 90-day free trial.",
  keywords: joinKeywords([
    ...DEFAULT_KEYWORDS,
    "Google reviews software",
    "AI review response tool",
    "AI review agent",
    "multi-location Google reviews",
  ]),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: `${SITE_NAME} — AI & Templates for Google Review Replies`,
    description:
      "Every new Google review answered every evening, with your templates or AI that replies to what the customer actually said. Approve first if you like.",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Respondly - Google reviews automation with AI and templates",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — AI & Templates for Google Review Replies`,
    description:
      "Templates when you want consistency. AI when you want it personal. Automated Google review replies that sound like you.",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function LandingPage() {
  return (
    <>
      <main
        data-testid="landing-page"
        className="relative min-h-screen bg-black text-white overflow-x-hidden"
      >
        <Header />
        <Hero />
        <BeforeAfter />
        <MockupShowcase />
        <HowItWorks />
        <Features />
        <Pricing />
        <FAQ />
        <FinalCTA />
        <Footer />
      </main>
      <Script
        id="ld-json-home"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationLd, websiteLd, softwareLd]),
        }}
      />
    </>
  );
}
