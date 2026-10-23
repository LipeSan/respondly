"use client";

import { useEffect } from "react";
import { useCart } from "@/components/shop/useCart";

// Stripe sends the customer back here after paying; empty the local cart once.
export function ClearCartOnSuccess() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
