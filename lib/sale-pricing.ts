/**
 * Site-wide sale pricing — the single source of truth for automatic discounts.
 *
 * When Harimohan sets a discount % in admin (Settings → फेस्टिवल ऑफर),
 * every product price on the site drops automatically: cards, course pages,
 * search, hero, cart totals, UPI amount and the order amount.
 *
 * Rules:
 * - Sale applies on top of the course's own price (course.price), rounded.
 * - Synthetic bundle items (id starts with "bundle-") already include the
 *   sale in their computed price — CartDrawer must NOT discount them twice.
 * - When the sale is off or expired, getSalePct returns 0 and every
 *   consumer falls back to the regular price. No code changes needed.
 */
import { useSettings } from "./store-hooks";
import { getFestivalOffer, isFestivalSaleLive } from "./default-settings";

/** Active site-wide discount %, or 0 when no sale is running. */
export function getSalePct(settings: unknown): number {
  const offer = getFestivalOffer(settings);
  if (!offer.enabled) return 0;
  if (!isFestivalSaleLive(offer)) return 0;
  const pct = Number((offer as { discount_percent?: unknown }).discount_percent) || 0;
  return pct > 0 && pct <= 90 ? Math.round(pct) : 0;
}

/** Price after applying the sale %. Rounded, never below ₹1. */
export function applySale(price: number, pct: number): number {
  if (!pct || pct <= 0) return price;
  return Math.max(1, Math.round(price * (1 - pct / 100)));
}

/** True for synthetic bundle cart items whose price already includes the sale. */
export function isPreDiscountedItem(item: { id?: string }): boolean {
  return typeof item.id === "string" && item.id.startsWith("bundle-");
}

/** Final payable price for a cart/display item under the current sale. */
export function finalItemPrice(item: { id?: string; price: number }, pct: number): number {
  if (isPreDiscountedItem(item)) return item.price;
  return applySale(item.price, pct);
}

/** Fill {day} / {pct} placeholders in admin-editable text templates. */
export function fillTemplate(tpl: string, vars: { day?: number; pct?: number }): string {
  return (tpl || "")
    .replace(/\{day\}/g, String(vars.day ?? ""))
    .replace(/\{pct\}/g, String(vars.pct ?? ""));
}

/** React hook for any component that shows prices. */
export function useSiteSale(): { pct: number; isLive: boolean } {
  const { settings } = useSettings();
  const pct = getSalePct(settings);
  return { pct, isLive: pct > 0 };
}
