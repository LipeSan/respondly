"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";

export function AdminShopOrderAction({
  orderId,
  orderNumber,
  status,
}: {
  orderId: string;
  orderNumber: string;
  status: "paid" | "shipped";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");

  async function update(body: { status: "paid" } | { status: "shipped"; trackingNumber: string }) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/shop-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Failed to update order");
      setDialogOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  function closeDialog() {
    if (loading) return;
    setDialogOpen(false);
    setError(null);
  }

  if (status === "shipped") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => update({ status: "paid" })}
          disabled={loading}
          className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Undo shipped"}
        </button>
        {error ? <p className="max-w-[160px] text-right text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  const trimmed = trackingNumber.trim();

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
      >
        Mark shipped
      </button>
      <Modal
        open={dialogOpen}
        onClose={closeDialog}
        title={`Ship order #${orderNumber}`}
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" className="!w-auto" onClick={closeDialog} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" form={`ship-${orderId}`} className="!w-auto" isLoading={loading} disabled={!trimmed}>
              Mark shipped
            </Button>
          </div>
        }
      >
        <form
          id={`ship-${orderId}`}
          className="space-y-3 text-left"
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed) void update({ status: "shipped", trackingNumber: trimmed });
          }}
        >
          <Input
            id={`tracking-${orderId}`}
            label="Tracking number"
            placeholder="e.g. 33ABC1234567"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            maxLength={100}
            autoFocus
            error={error ?? undefined}
          />
          <p className="text-sm text-gray-500">The customer will see it on their orders page.</p>
        </form>
      </Modal>
    </>
  );
}
