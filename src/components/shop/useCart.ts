"use client";

import { useSyncExternalStore } from "react";

// The Shop mock-up keeps the order in localStorage so it survives moving
// between the product list and a product page. It is per browser only.
type Cart = Record<string, number>;

const STORAGE_KEY = "respondly.shop.cart";
const EMPTY: Cart = {};
const listeners = new Set<() => void>();
let cache: Cart | null = null;

function read(): Cart {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Cart) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: Cart) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked (private mode); the cart still works for this page view.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCart() {
  const cart = useSyncExternalStore(subscribe, read, () => EMPTY);

  function setQty(id: string, qty: number) {
    const next = { ...read() };
    if (qty > 0) next[id] = qty;
    else delete next[id];
    write(next);
  }

  function clear() {
    write(EMPTY);
  }

  return { cart, setQty, clear };
}
