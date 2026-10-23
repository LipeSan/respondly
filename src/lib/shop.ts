export type ProductVisualKind = "card" | "stand" | "sticker" | "kit";

export const PRODUCT_COLORS = ["black", "white"] as const;
export type ProductColor = (typeof PRODUCT_COLORS)[number];

export const COLOR_LABELS: Record<ProductColor, string> = { black: "Black", white: "White" };

export function isProductColor(value: unknown): value is ProductColor {
  return PRODUCT_COLORS.includes(value as ProductColor);
}

export type Product = {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  details: string[];
  specs: { label: string; value: string }[];
  inTheBox: string[];
  price: number;
  compareAt?: number;
  badge?: string;
  visual: ProductVisualKind;
  // The first one is preselected. For the kit, one colour applies to everything in it.
  colors: ProductColor[];
  // Up to 3 photos in /public/images/shop, e.g. "/images/shop/table-stand-1.jpg".
  // Not under /public/shop: the middleware protects /shop, so the image
  // optimizer would get a login redirect. Shown whole on white
  // (object-contain), so square product shots work best. Slots without a
  // photo show the illustration instead.
  images: string[];
};

// Shop catalogue. This is the source of truth for prices: the checkout API
// rebuilds every line from here and never trusts amounts sent by the browser.
// Prices and products are still placeholders.
export const PRODUCTS: Product[] = [
  {
    id: "starter-kit",
    name: "Starter kit",
    description: "Everything a counter and a team need to start collecting reviews.",
    longDescription:
      "Put the stand where customers pay and give the cards to your team, so every happy customer is one tap away from your Google review page. All products in the kit point to the same link, so you can see how many taps turn into reviews.",
    details: ["1 table stand", "5 review cards", "Free shipping"],
    specs: [
      { label: "Works with", value: "iPhone and Android, no app needed" },
      { label: "Links to", value: "Your connected Google location" },
    ],
    inTheBox: ["1 acrylic table stand", "5 NFC review cards"],
    price: 134.99,
    compareAt: 159.94,
    badge: "Best value",
    visual: "kit",
    colors: ["black", "white"],
    images: ["/images/shop/starter-kit-1.avif", "/images/shop/starter-kit-2.avif", "/images/shop/starter-kit-3.avif"],
  },
  {
    id: "table-stand",
    name: "Table stand",
    description: "Acrylic stand for the counter or tables. Tap with a phone or scan the QR.",
    longDescription:
      "A clear acrylic stand that sits next to the till or on each table. Customers tap their phone on it, or scan the QR code, and your Google review page opens straight away.",
    details: ["NFC + QR code", "12.75 × 7.6 cm"],
    specs: [
      { label: "Size", value: "12.75 × 7.6 cm" },
      { label: "Works with", value: "iPhone and Android, no app needed" },
    ],
    inTheBox: ["1 acrylic table stand"],
    price: 34.99,
    visual: "stand",
    colors: ["black", "white"],
    images: ["/images/shop/table-stand-3.avif", "/images/shop/table-stand-1.avif", "/images/shop/table-stand-2.avif"],
  },
  {
    id: "review-card",
    name: "Review card",
    description: "10 × 10 cm card your team can hand over at the end of a visit.",
    longDescription:
      "A 10 × 10 cm card your team can show or hand over at the end of a visit. Great for tradies, salons and anyone who finishes the job face to face.",
    details: ["NFC + QR code", "10 × 10 cm"],
    specs: [
      { label: "Size", value: "10 × 10 cm, 1.5 mm thick" },
      { label: "Works with", value: "iPhone and Android, no app needed" },
    ],
    inTheBox: ["1 NFC review card"],
    price: 24.99,
    visual: "card",
    colors: ["black", "white"],
    images: [
      "/images/shop/review-card-1.avif",
      "/images/shop/review-card-2.avif",
      "/images/shop/review-card-3.avif",
    ],
  },
  {
    id: "review-sticker",
    name: "Window sticker",
    description: "Round sticker for doors, windows and payment terminals.",
    longDescription:
      "A round sticker for the front door, the window or right next to the payment terminal. Weatherproof, so it can live outside too.",
    details: ["NFC + QR code", "10 cm, weatherproof"],
    specs: [
      { label: "Size", value: "10 cm round" },
      { label: "Works with", value: "iPhone and Android, no app needed" },
    ],
    inTheBox: ["1 NFC window sticker"],
    price: 19.99,
    visual: "sticker",
    colors: ["black", "white"],
    images: ["/images/shop/review-sticker-1.avif", "/images/shop/review-sticker-2.avif", "/images/shop/review-sticker-3.avif"],
  },
];

export function getProduct(id: string) {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}

// Cart lines are keyed by product and colour, e.g. "table-stand:black".
export function cartKey(productId: string, color: ProductColor) {
  return `${productId}:${color}`;
}

export function parseCartKey(key: string) {
  const [productId, color] = key.split(":");
  const product = getProduct(productId);
  if (!product || !isProductColor(color) || !product.colors.includes(color)) return null;
  return { product, color };
}

export function formatPrice(value: number) {
  return `A$${value.toFixed(2)}`;
}

// Return address printed on shipping labels (/admin/shop-orders/[id]/label).
// null hides it and the label shows a warning instead.
export const SHIP_FROM: { name: string; lines: string[] } | null = {
  name: "Respondly",
  lines: ["310/1 Higherdale Avenue", "Miranda NSW 2228"],
};

// Shipping within Australia: free from A$99, flat A$9.95 below that.
export const FREE_SHIPPING_FROM = 99;
export const SHIPPING_FEE = 9.95;

export function shippingFor(subtotal: number) {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
}

export function toCents(value: number) {
  return Math.round(value * 100);
}
