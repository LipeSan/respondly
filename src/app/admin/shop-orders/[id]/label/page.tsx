import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SHIP_FROM } from "@/lib/shop";
import { shopItemKey, shopItemLabel, type ShopOrderItem } from "@/lib/shopOrders";
import { InlineNotification } from "@/components/InlineNotification";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

type ShippingAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

function recipientLines(address: unknown) {
  const a = (address ?? {}) as ShippingAddress;
  return [a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(" "), a.country === "AU" ? "AUSTRALIA" : a.country]
    .filter(Boolean) as string[];
}

/** Printable shipping label: recipient, return address and contents, sized for a 100 × 150 mm label. */
export default async function AdminShopOrderLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.shopOrder.findUnique({ where: { id } });
  if (!order) notFound();

  const orderNumber = order.id.slice(-8).toUpperCase();
  const items = order.items as ShopOrderItem[];
  const to = recipientLines(order.shippingAddress);

  return (
    <div className="space-y-6 print:space-y-0">
      <style>{"@page { margin: 8mm; }"}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin/shop-orders" className="text-sm font-semibold text-blue-600 hover:text-blue-500">
          ← Shop orders
        </Link>
        <PrintButton />
      </div>

      {!order.shippingName ? (
        <div className="print:hidden">
          <InlineNotification tone="warning">This order has no shipping address yet. It&apos;s added when the customer pays.</InlineNotification>
        </div>
      ) : null}
      {!SHIP_FROM ? (
        <div className="print:hidden">
          <InlineNotification tone="warning">The return address isn&apos;t set. Fill in SHIP_FROM in src/lib/shop.ts.</InlineNotification>
        </div>
      ) : null}

      <div className="mx-auto flex h-[150mm] w-[100mm] flex-col border-2 border-black bg-white text-black print:mx-0">
        <section className="flex-1 border-b-2 border-black p-[5mm]">
          <p className="text-[9pt] font-bold uppercase tracking-wider">Deliver to</p>
          <p className="mt-[2mm] text-[16pt] font-bold leading-tight">{order.shippingName ?? "—"}</p>
          <div className="mt-[1mm] text-[14pt] leading-snug">
            {to.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>

        <section className="border-b-2 border-black p-[5mm] text-[10pt] leading-snug">
          <p className="text-[8pt] font-bold uppercase tracking-wider">From</p>
          {SHIP_FROM ? (
            <>
              <p className="mt-[1mm] font-semibold">{SHIP_FROM.name}</p>
              {SHIP_FROM.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </>
          ) : (
            <p className="mt-[1mm]">—</p>
          )}
        </section>

        <section className="p-[5mm] text-[9pt] leading-snug">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[8pt] font-bold uppercase tracking-wider">Contents</p>
            <p className="font-mono font-semibold">#{orderNumber}</p>
          </div>
          <ul className="mt-[1mm]">
            {items.map((item) => (
              <li key={shopItemKey(item)}>
                {item.quantity} × {shopItemLabel(item)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
