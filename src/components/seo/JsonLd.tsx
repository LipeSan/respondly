// Renders JSON-LD in the server HTML. next/script would only inject it on the
// client after hydration, where crawlers that don't run JavaScript never see it.
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
