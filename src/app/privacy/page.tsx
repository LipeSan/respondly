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
const title = `Privacy Policy | ${SITE_NAME}`;
const description =
  "Respondly Privacy Policy. Learn how we collect, use, and protect your data — account information, Google Business Profile integrations, usage data, and your data retention and security practices.";

export const metadata: Metadata = {
  title,
  description,
  keywords: joinKeywords([
    ...DEFAULT_KEYWORDS,
    "privacy",
    "privacy policy",
    "data protection",
    "GDPR",
    "data security",
  ]),
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    type: "website",
    url: `${siteUrl}/privacy`,
    siteName: SITE_NAME,
    title,
    description,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} privacy policy` }],
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

export default function PrivacyPage() {
  const orgLd = getJsonLdOrganization(siteUrl);
  return (
    <>
      <Script
        id="ld-json-privacy-org"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />
      <main data-testid="privacy-page" className="relative min-h-screen bg-black text-white overflow-x-hidden">
        <Header showNav={false} />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-20">
          <div className="max-w-3xl">
            <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="mt-3 text-sm text-zinc-400">Last updated: May 19, 2026</p>

            <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-8 sm:p-10">
              <div className="space-y-8 text-zinc-300 leading-relaxed">
                <section className="space-y-3">
                  <h2 className="font-heading text-xl font-semibold text-white">1. Overview</h2>
                  <p>
                    This Privacy Policy explains how Respondly collects, uses, and protects your information when you use
                    our website and services (the “Service”).
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="font-heading text-xl font-semibold text-white">2. Information we collect</h2>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      Account information (such as name, email address, and authentication details) when you create an
                      account.
                    </li>
                    <li>
                      Business information you provide (such as business name and optional contact details) for onboarding
                      and configuration.
                    </li>
                    <li>
                      Usage and technical data (such as device/browser details, IP address, and logs) to operate and secure
                      the Service.
                    </li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h2 className="font-heading text-xl font-semibold text-white">3. Google integrations</h2>
                  <p>
                    If you connect Google Business Profile, Respondly will access data necessary to sync locations and
                    reviews and to publish replies on your behalf. You can revoke access at any time through your Google
                    account settings.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="font-heading text-xl font-semibold text-white">4. How we use your information</h2>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Provide and maintain the Service, including syncing reviews and generating drafts.</li>
                    <li>Authenticate users and prevent fraud and abuse.</li>
                    <li>Communicate service-related updates and support messages.</li>
                    <li>Improve product performance, reliability, and user experience.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h2 className="font-heading text-xl font-semibold text-white">5. Sharing</h2>
                  <p>
                    We may share information with service providers that help us operate the Service (for example,
                    infrastructure, analytics, email delivery, payments, and authentication). We do not sell your personal
                    information.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="font-heading text-xl font-semibold text-white">6. Data retention</h2>
                  <p>
                    We retain information for as long as needed to provide the Service, comply with legal obligations, and
                    resolve disputes. You may request deletion of your account data subject to applicable law and legitimate
                    business purposes.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="font-heading text-xl font-semibold text-white">7. Security</h2>
                  <p>
                    We use reasonable administrative, technical, and organizational safeguards designed to protect your
                    information. No method of transmission or storage is 100% secure.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="font-heading text-xl font-semibold text-white">8. Changes</h2>
                  <p>
                    We may update this Privacy Policy from time to time. When we do, we will update the “Last updated” date
                    on this page.
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

