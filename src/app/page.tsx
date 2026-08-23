import type { Metadata } from "next";
import Script from "next/script";
import React from "react";
import Header from "../components/Landing/Header";
import Hero from "../components/Landing/Hero";
import Problem from "../components/Landing/Problem";
import MockupShowcase from "../components/Landing/MockupShowcase";
import HowItWorks from "../components/Landing/HowItWorks";
import Features from "../components/Landing/Features";
import Pricing from "../components/Landing/Pricing";
import FAQ from "../components/Landing/FAQ";
import FinalCTA from "../components/Landing/FinalCTA";
import Footer from "../components/Landing/Footer";
import { Analytics } from "@vercel/analytics/react";
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
    "Automate every Google review reply with on-brand templates or AI. Respondly replies in seconds, keeps your rating protected and every customer feeling heard.",
  keywords: joinKeywords([
    ...DEFAULT_KEYWORDS,
    "Google reviews software",
    "AI review response tool",
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
      "Respondly automates Google reviews with templates and AI. Reply in your brand voice, detect sentiment, and keep 5-star reputation working for you 24/7.",
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
      "Templates when you want speed. AI when you want nuance. Automate Google review replies that actually sound like you.",
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
        <Analytics />
        <Hero />
        <Problem />
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
