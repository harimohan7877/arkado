"use client";

import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import { useCart } from "@/components/CartProvider";

/**
 * Shared header + cart for routes that don't mount their own drawer
 * (Contact, About, Track Order, blog articles). Connects the Navbar cart
 * button to the real cart instead of a no-op, and mounts the one
 * CartDrawer for the page.
 *
 * Do NOT use on routes that already mount a CartDrawer (HomeClient,
 * CourseDetailClient, CategoryDetailClient, search page) — a second
 * drawer would compete with theirs.
 */
export default function CartNavbar() {
  const { items, isOpen, openCart, closeCart, removeItem } = useCart();

  return (
    <>
      <Navbar cartCount={items.length} onCartClick={openCart} />
      <CartDrawer
        isOpen={isOpen}
        onClose={closeCart}
        cartItems={items}
        onRemoveItem={removeItem}
      />
    </>
  );
}
