"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CourseBundle } from "@/lib/courses";

const STORAGE_KEY = "arkado_cart_v1";

function readStoredCart(): CourseBundle[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as CourseBundle[];
  } catch {
    // corrupted cache — start with an empty cart
  }
  return [];
}

interface CartContextValue {
  items: CourseBundle[];
  isOpen: boolean;
  /** Buy-now flow: one course per order — replaces the cart and opens it. */
  addToCart: (course: CourseBundle) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Lazy init reads localStorage once on the client; SSR renders empty.
  const [items, setItems] = useState<CourseBundle[]>(readStoredCart);
  const [isOpen, setIsOpen] = useState(false);

  // Persist every change (no setState here — effect only writes out)
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage full/blocked — cart still works for this session
    }
  }, [items]);

  const addToCart = useCallback((course: CourseBundle) => {
    setItems([course]);
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  return (
    <CartContext.Provider
      value={{ items, isOpen, addToCart, removeItem, clear, openCart, closeCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
