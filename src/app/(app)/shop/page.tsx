"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { Text } from "@/components/Text";
import { useToast } from "@/components/Toast";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { ColorPicker } from "@/components/shop/ColorPicker";
import {
  COLOR_LABELS,
  FREE_SHIPPING_FROM,
  PRODUCTS,
  cartKey,
  formatPrice,
  parseCartKey,
  shippingFor,
  type ProductColor,
} from "@/lib/shop";
import { useCart } from "@/components/shop/useCart";

const STEPS = [
  { title: "Tap or scan", body: "Customers tap their phone on the product or scan the QR code." },
  { title: "Leave a review", body: "Your Google review page opens straight away, no searching." },
  { title: "Respondly replies", body: "New reviews are answered by your rules, like any other review." },
];

export default function ShopPage() {
  const { showToast } = useToast();
  const { cart, setQty } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  // Colour picked on each product card; the first colour until changed.
  const [cardColors, setCardColors] = useState<Record<string, ProductColor>>({});

  // Keys that no longer match the catalogue (e.g. carts from before colours) are skipped.
  const lines = Object.entries(cart)
    .map(([key, qty]) => ({ key, qty, line: parseCartKey(key) }))
    .filter((l): l is { key: string; qty: number; line: NonNullable<typeof l.line> } => l.line !== null && l.qty > 0)
    .map(({ key, qty, line }) => ({ key, qty, product: line.product, color: line.color }))
    .sort((a, b) => PRODUCTS.indexOf(a.product) - PRODUCTS.indexOf(b.product) || a.color.localeCompare(b.color));
  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.product.price, 0);
  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;

  async function checkout() {
    setCheckingOut(true);
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines.map((l) => ({ id: l.product.id, color: l.color, quantity: l.qty })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(data?.error || "Couldn't start the checkout.");
      // Keep the button loading until Stripe's page replaces this one.
      window.location.href = data.url;
    } catch (e) {
      showToast({ type: "error", message: e instanceof Error ? e.message : "Couldn't start the checkout." });
      setCheckingOut(false);
    }
  }

  return (
    <div className="pb-12">
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Text variant="h1">Shop</Text>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-green-600">
              NFC cards and stands that open your Google review page with one tap.
            </p>
          </div>
          <Link href="/shop/orders" className="shrink-0">
            <Button variant="outline" className="!w-auto px-4 py-2">
              Your orders
            </Button>
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-50 text-sm font-semibold text-green-700">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                <p className="mt-0.5 text-sm text-gray-500">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="grid gap-6 sm:grid-cols-2 lg:col-span-2">
            {PRODUCTS.map((p) => {
              const color = cardColors[p.id] ?? p.colors[0];
              const key = cartKey(p.id, color);
              const qty = cart[key] ?? 0;
              const inOrder = lines.some((l) => l.product.id === p.id);
              return (
                <Card key={p.id} className={`flex flex-col !p-4 ${inOrder ? "!border-green-500 ring-1 ring-green-500" : ""}`}>
                  <ProductGallery product={p} badge={p.badge} compact href={`/shop/${p.id}`} />
                  <div className="mt-4 flex flex-1 flex-col px-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="text-base font-semibold text-gray-900">
                        <Link href={`/shop/${p.id}`} className="transition-colors hover:text-green-700">
                          {p.name}
                        </Link>
                      </h2>
                      <p className="shrink-0 text-right">
                        {p.compareAt ? (
                          <span className="mr-1.5 text-xs text-gray-400 line-through">{formatPrice(p.compareAt)}</span>
                        ) : null}
                        <span className="text-base font-bold text-gray-900">{formatPrice(p.price)}</span>
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{p.description}</p>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {p.details.map((d) => (
                        <li key={d} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {d}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto space-y-3 pt-5">
                      <ColorPicker
                        colors={p.colors}
                        value={color}
                        onChange={(c) => setCardColors((current) => ({ ...current, [p.id]: c }))}
                        label={p.name}
                      />
                      {qty > 0 ? (
                        <div className="flex items-center justify-between">
                          <QuantityStepper value={qty} onChange={(v) => setQty(key, v)} label={`${p.name} (${COLOR_LABELS[color]})`} />
                          <span className="text-sm font-medium text-green-700">In your order</span>
                        </div>
                      ) : (
                        <Button variant="outline" className="px-4 py-2" onClick={() => setQty(key, 1)}>
                          Add {COLOR_LABELS[color].toLowerCase()} to order
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="lg:sticky lg:top-24">
            <CardHeader title="Your order" subtitle="Every product links to your connected Google location." />
            {lines.length === 0 ? (
              <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center">
                <p className="text-sm font-medium text-gray-700">Nothing here yet</p>
                <p className="mt-1 text-sm text-gray-500">Add a product to see your total.</p>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {lines.map(({ key, product, color, qty }) => (
                  <li key={key} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-gray-700">
                      <span className="tabular-nums text-gray-400">{qty} ×</span> {product.name}
                      <span className="text-gray-400"> · {COLOR_LABELS[color]}</span>
                    </span>
                    <span className="font-medium tabular-nums text-gray-900">{formatPrice(qty * product.price)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Shipping</span>
                <span className="tabular-nums">
                  {lines.length === 0 ? "—" : shipping === 0 ? "Free" : formatPrice(shipping)}
                </span>
              </div>
              {lines.length > 0 && shipping > 0 ? (
                <p className="text-xs text-green-700">
                  Add {formatPrice(FREE_SHIPPING_FROM - subtotal)} more for free shipping.
                </p>
              ) : null}
              <div className="flex justify-between text-base font-semibold text-gray-900">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(total)}</span>
              </div>
            </div>

            <Button
              className="mt-5 px-4 py-2"
              disabled={itemCount === 0}
              isLoading={checkingOut}
              onClick={checkout}
            >
              {itemCount === 0 ? "Checkout" : `Checkout · ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            </Button>
            <p className="mt-3 text-xs text-gray-400">
              Prices include GST. Free shipping from {formatPrice(FREE_SHIPPING_FROM)}. Products ship within Australia in 10–20
              business days. You&apos;ll pay on a secure Stripe page.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
