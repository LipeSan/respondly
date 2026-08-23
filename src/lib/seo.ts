export function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env && /^https?:\/\//i.test(env)) {
    return env.replace(/\/$/, "");
  }
  return "https://respondly.com.au";
}

export const SITE_NAME = "Respondly";
export const DEFAULT_OG_IMAGE = `${getSiteUrl()}/og-image.png`;
export const DEFAULT_TWITTER_HANDLE = "";

export const DEFAULT_KEYWORDS = [
  "Google review automation",
  "auto reply Google reviews",
  "AI Google review responder",
  "Google reviews AI",
  "respond to Google reviews automatically",
  "Google business profile review management",
  "brand voice AI replies",
  "local business reputation management",
  "review templates",
  "Google review workflow",
];

export function joinKeywords(items: string[]): string {
  return items.join(", ");
}

export function getJsonLdOrganization(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`,
    email: "support@respondly.com.au",
    sameAs: [],
  };
}

export function getJsonLdSoftwareApplication(siteUrl: string, variant: "home" | "promo" = "home") {
  const description =
    variant === "promo"
      ? "Get 90 days free of Respondly. Automate every Google review reply with on-brand templates or AI. Save time, protect your rating, and turn every star into trust."
      : "Respondly automates Google review replies with on-brand templates and AI. Built for local businesses and multi-location brands that want speed, consistency and sentiment-aware answers.";
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: [
      {
        "@type": "Offer",
        price: variant === "promo" ? "0" : "0",
        priceCurrency: "USD",
      },
    ],
    description,
    url: variant === "promo" ? `${siteUrl}/promo/trial` : siteUrl,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      ratingCount: "100",
    },
  };
}

export function getJsonLdWebSite(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
  };
}
