"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { Text } from "@/components/Text";
import { useToast } from "@/components/Toast";
import { ProductCover, ProductGallery } from "@/components/shop/ProductGallery";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { ColorPicker } from "@/components/shop/ColorPicker";
import { COLOR_LABELS, PRODUCTS, cartKey, formatPrice, parseCartKey, type Product, type ProductColor } from "@/lib/shop";
import { useCart } from "@/components/shop/useCart";

const FAQ = [
  {
    q: "Do my customers need an app?",
    a: "No. Modern iPhones and Android phones read NFC out of the box. On products with a QR code, older phones can scan it instead.",
  },
  {
    q: "What if I change my Google location?",
    a: "Products point to your Respondly link, not straight to Google, so we update where it goes and you keep using the same products.",
  },
  {
    q: "Can I offer a discount for a review?",
    a: "No. Google doesn't allow incentives for reviews, and you should ask every customer, not only the happy ones.",
  },
];

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function ProductDetail({ product }: { product: Product }) {
  const { showToast } = useToast();
  const { cart, setQty } = useCart();
  const [qty, setLocalQty] = useState(1);
  const [color, setColor] = useState<ProductColor>(product.colors[0]);

  const key = cartKey(product.id, color);
  const inOrder = cart[key] ?? 0;
  const orderCount = Object.entries(cart).reduce((sum, [k, n]) => sum + (parseCartKey(k) ? n : 0), 0);
  const others = PRODUCTS.filter((p) => p.id !== product.id).slice(0, 3);

  function addToOrder() {
    setQty(key, inOrder + qty);
    showToast({ type: "success", message: `${qty} × ${product.name} (${COLOR_LABELS[color]}) added to your order.` });
    setLocalQty(1);
  }

  return (
    <div className="pb-12">
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between gap-4 text-sm" aria-label="Breadcrumb">
          <div className="flex items-center gap-2 text-gray-500">
            <Link href="/shop" className="transition-colors hover:text-gray-900">
              Shop
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-gray-900">{product.name}</span>
          </div>
          {orderCount > 0 ? (
            <Link href="/shop" className="font-semibold text-green-700 transition-colors hover:text-green-800">
              View order · {orderCount} {orderCount === 1 ? "item" : "items"} →
            </Link>
          ) : null}
        </nav>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="!p-4">
            <ProductGallery product={product} badge={product.badge} />
          </Card>

          <Card>
            <Text variant="h1">{product.name}</Text>
            <p className="mt-2">
              <span className="text-2xl font-bold tracking-tight text-gray-900">{formatPrice(product.price)}</span>
              {product.compareAt ? (
                <>
                  <span className="ml-2 text-sm text-gray-400 line-through">{formatPrice(product.compareAt)}</span>
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Save {formatPrice(product.compareAt - product.price)}
                  </span>
                </>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-gray-400">Includes GST</p>

            <p className="mt-5 text-sm leading-relaxed text-gray-600">{product.longDescription}</p>

            <ul className="mt-5 space-y-2">
              {product.inTheBox.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckIcon />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Colour</p>
              <ColorPicker colors={product.colors} value={color} onChange={setColor} label={product.name} />
              <div className="mt-4 flex items-center gap-3">
                <QuantityStepper value={qty} onChange={setLocalQty} label={product.name} min={1} />
                <Button className="px-4 py-2" onClick={addToOrder}>
                  Add to order · {formatPrice(qty * product.price)}
                </Button>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                {inOrder > 0 ? `${inOrder} ${COLOR_LABELS[color].toLowerCase()} already in your order. ` : ""}Ships within Australia in 10–20 business days.
              </p>
            </div>

            <dl className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
              {product.specs.map((s) => (
                <div key={s.label} className="flex justify-between gap-4 py-2.5 text-sm">
                  <dt className="text-gray-500">{s.label}</dt>
                  <dd className="text-right font-medium text-gray-900">{s.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <Card>
          <CardHeader title="Questions" />
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            {FAQ.map((f) => (
              <div key={f.q}>
                <p className="text-sm font-semibold text-gray-900">{f.q}</p>
                <p className="mt-1 text-sm text-gray-500">{f.a}</p>
              </div>
            ))}
          </div>
        </Card>

        <div>
          <h2 className="text-base font-semibold text-gray-900">You might also like</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            {others.map((p) => (
              <Link key={p.id} href={`/shop/${p.id}`} className="group">
                <Card className="!p-4 transition-shadow group-hover:shadow-md">
                  <ProductCover product={p} />
                  <div className="mt-3 flex items-baseline justify-between gap-3 px-1">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-green-700">{p.name}</p>
                    <p className="text-sm font-bold text-gray-900">{formatPrice(p.price)}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
