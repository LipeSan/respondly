import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import {
  SITE_NAME,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  getSiteUrl,
  joinKeywords,
  getJsonLdOrganization,
} from "@/lib/seo";
import ContactPageContent from "./ContactPageContent";

const siteUrl = getSiteUrl();
const title = `Contact | ${SITE_NAME}`;
const description =
  "Get in touch with the Respondly team. Questions about Google review automation, billing, setup, or partnerships — send us a message and we'll reply promptly.";

export const metadata: Metadata = {
  title: "Contact",
  description,
  keywords: joinKeywords([
    ...DEFAULT_KEYWORDS,
    "contact",
    "support",
    "help",
    "sales",
    "partnerships",
  ]),
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    type: "website",
    url: `${siteUrl}/contact`,
    siteName: SITE_NAME,
    title,
    description,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} contact page` }],
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

export default function ContactPage() {
  const orgLd = getJsonLdOrganization(siteUrl);
  return (
    <>
      <JsonLd data={orgLd} />
      <ContactPageContent />
    </>
  );
}
