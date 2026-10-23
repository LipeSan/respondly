"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";

const RED_OUTLINE = "!w-auto !border-red-300 px-4 py-2 !text-red-600 hover:!bg-red-50 focus:!ring-red-500";

export function CancelOrderButton({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const [open, setOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" className={RED_OUTLINE} onClick={() => setOpen(true)}>
        Cancel
      </Button>
      <Modal
        open={open}
        onClose={() => {
          if (!canceling) setOpen(false);
        }}
        title="Cancel this order?"
        footer={
          // Plain form post: the route redirects back to the orders list.
          <form
            method="post"
            action={`/api/shop/orders/${orderId}/cancel`}
            onSubmit={() => setCanceling(true)}
            className="flex justify-end gap-3"
          >
            <Button type="button" variant="outline" className="!w-auto" onClick={() => setOpen(false)} disabled={canceling}>
              Keep order
            </Button>
            {/* Not isLoading: Button's spinner is white and would vanish on the white outline. */}
            <Button type="submit" variant="outline" className={RED_OUTLINE} disabled={canceling}>
              {canceling ? "Canceling…" : "Cancel order"}
            </Button>
          </form>
        }
      >
        <p className="text-sm text-gray-600">
          Order <span className="font-mono font-medium text-gray-900">#{orderNumber}</span> hasn&apos;t been paid yet.
          Canceling it closes its Stripe payment page, so it can&apos;t be paid anymore.
        </p>
      </Modal>
    </>
  );
}
