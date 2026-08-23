import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import Header from "@/components/Landing/Header";
import Footer from "@/components/Landing/Footer";
import {
  SITE_NAME,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  getSiteUrl,
  joinKeywords,
  getJsonLdOrganization,
} from "@/lib/seo";

const siteUrl = getSiteUrl();
const title = `Terms & Conditions | ${SITE_NAME}`;
const description =
  "Respondly Terms & Conditions. Service agreement covering account access, Google Business Profile integrations, AI-generated content, acceptable use, billing, intellectual property, and liability.";

export const metadata: Metadata = {
  title,
  description,
  keywords: joinKeywords([
    ...DEFAULT_KEYWORDS,
    "terms",
    "terms and conditions",
    "terms of service",
    "legal",
    "service agreement",
  ]),
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    type: "website",
    url: `${siteUrl}/terms`,
    siteName: SITE_NAME,
    title,
    description,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} terms and conditions` }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
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
    },
  },
};

export default function TermsPage() {
  const orgLd = getJsonLdOrganization(siteUrl);
  return (
    <>
      <Script
        id="ld-json-terms-org"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />
      <main data-testid="terms-page" className="relative min-h-screen bg-black text-white overflow-x-hidden">
        <Header showNav={false} />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-20">
          <div className="max-w-3xl">
            <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight">Terms & Conditions</h1>
            <p className="mt-3 text-sm text-zinc-400">Last updated: May 18, 2026</p>

            <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-8 sm:p-10">
              <div className="space-y-8 text-zinc-300 leading-relaxed">
            <section className="space-y-3">
              <h2 className="font-heading text-xl font-semibold text-white">1. Acceptance</h2>
              <p>
                By accessing or using Respondly (the “Service”), you agree to these Terms &
                Conditions. If you do not agree, do not use the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-heading text-xl font-semibold text-white">2. Account and access</h2>
              <p>
                You are responsible for maintaining the confidentiality of your access credentials
                and for all activity that occurs under your account. You agree to provide accurate
                and up-to-date information when registering.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-heading text-xl font-semibold text-white">3. Integrations and Google data</h2>
              <p>
                Respondly may integrate with Google Business Profile to sync locations and reviews.
                You represent that you have authorization to connect and manage the data of the
                business(es) associated with your account.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-heading text-xl font-semibold text-white">4. Automation and generated content</h2>
              <p>
                The Service may suggest replies or automate publishing based on rules, templates,
                and/or AI features. You are solely responsible for reviewing, approving (where
                applicable), and ensuring that any published responses are accurate, appropriate,
                and compliant with the policies of connected platforms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-heading text-xl font-semibold text-white">5. Acceptable use</h2>
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>violate laws, regulations, or third-party rights;</li>
                <li>attempt to access, interfere with, or exploit vulnerabilities in the Service;</li>
                <li>
                  publish unlawful, offensive, discriminatory, misleading content, or content that
                  infringes intellectual property.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-heading text-xl font-semibold text-white">6. Plans, payments, and cancellation</h2>
              <p>
                If you subscribe to a paid plan, pricing, billing frequency, and plan terms will be
                presented at the time of purchase. You may cancel using the options available in
                the Service; cancellation does not eliminate payment obligations incurred up to the
                effective cancellation date.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-heading text-xl font-semibold text-white">7. Intellectual property</h2>
              <p>
                Respondly and its components (including brand, design, and software) are protected
                by intellectual property laws. These Terms do not grant you any ownership rights in
                the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-heading text-xl font-semibold text-white">8. Disclaimers and limitation of liability</h2>
              <p>
                The Service is provided “as is” and may experience downtime or errors. To the
                maximum extent permitted by applicable law, Respondly is not liable for indirect
                losses, lost profits, or damages arising from the use of the Service, including
                decisions made based on automations or suggestions.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-heading text-xl font-semibold text-white">9. Changes</h2>
              <p>
                We may update these Terms from time to time. When we do, we will update the “Last
                updated” date on this page. Continued use of the Service after changes indicates
                acceptance of the updated Terms.
              </p>
            </section>
              </div>
            </div>

            <div className="mt-10 border-t border-white/10 pt-6 text-sm text-zinc-400">
              <p>
                Back to{" "}
                <Link href="/" className="text-white hover:text-zinc-200 font-medium">
                  the homepage
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        <Footer />
      </main>
    </>
  );
}
