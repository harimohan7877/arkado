import crypto from "crypto";
import { getStoreData } from "@/lib/store-data";
import { getSalePct, applySale } from "./sale-pricing";
import { DEFAULT_SETTINGS } from "./default-settings";

/**
 * Shared checkout helpers — gateway-agnostic (PhonePe).
 *
 * Price validation, input sanitization, order-id generation and the order
 * state machine. The old lib/payment-gateway.ts held these next to
 * Razorpay helpers; Razorpay + UTR are gone (PhonePe migration, Nov 2026),
 * so the reusable pieces live here.
 */

export interface OrderValidationItem {
  productId: string;
  quantity?: number;
}

export interface ValidatedOrderResult {
  isValid: boolean;
  totalAmount: number;
  currency: string;
  items: Array<{
    id: string;
    title: string;
    price: number;
    drive_url?: string;
  }>;
  tamperingDetected: boolean;
  error?: string;
}

/**
 * Server-Authoritative Price Validation (Anti-Price Tampering).
 * NEVER trust the client amount. Returns the RAW catalog price — callers
 * that charge the customer must apply the sale % themselves (see
 * validateCheckoutOrder, which does exactly that).
 */
export async function validateOrderPrices(
  items: OrderValidationItem[],
  clientReportedTotal?: number
): Promise<ValidatedOrderResult> {
  if (!items || items.length === 0) {
    return {
      isValid: false,
      totalAmount: 0,
      currency: "INR",
      items: [],
      tamperingDetected: false,
      error: "No products specified in checkout.",
    };
  }

  try {
    const courses = await getStoreData<any[]>("courses", "data/courses.json", []);
    const courseMap = new Map<string, any>();
    for (const c of courses) {
      if (c.id) courseMap.set(c.id, c);
      if (c.slug) courseMap.set(c.slug, c);
    }

    let computedTotal = 0;
    const validatedItems: Array<{ id: string; title: string; price: number; drive_url?: string }> = [];

    for (const reqItem of items) {
      const found = courseMap.get(reqItem.productId);
      if (!found) {
        return {
          isValid: false,
          totalAmount: 0,
          currency: "INR",
          items: [],
          tamperingDetected: false,
          error: `Product ${reqItem.productId} not found in catalog.`,
        };
      }

      // Authoritative server-side price (sale_price priority, fallback to price or 99)
      const authoritativePrice = Number(found.price || found.sale_price || 99);
      const qty = Math.max(1, Math.min(reqItem.quantity || 1, 10)); // Clamp 1 to 10
      computedTotal += authoritativePrice * qty;

      validatedItems.push({
        id: found.id,
        title: found.title || found.name || "Course Bundle",
        price: authoritativePrice,
        drive_url: found.drive_url,
      });
    }

    // Check if client tried to submit a modified total
    let tamperingDetected = false;
    if (clientReportedTotal !== undefined && Math.abs(clientReportedTotal - computedTotal) > 0.5) {
      console.warn(`[SECURITY ALERT] Price tampering detected! Client reported: ₹${clientReportedTotal}, Server computed: ₹${computedTotal}`);
      tamperingDetected = true;
    }

    return {
      isValid: true,
      totalAmount: computedTotal,
      currency: "INR",
      items: validatedItems,
      tamperingDetected,
    };
  } catch (err) {
    console.error("[checkout] Price validation error:", err);
    return {
      isValid: false,
      totalAmount: 0,
      currency: "INR",
      items: [],
      tamperingDetected: false,
      error: "Failed to validate order pricing.",
    };
  }
}

export interface CheckoutOrderItem {
  productId: string;
  quantity?: number;
  title?: string;
  /** Kit ids for bundle-* items — the client sends these from the cart. */
  bundle_items?: string[];
}

export interface ValidatedCheckoutLine {
  id: string;
  title: string;
  /** Final payable price: sale-adjusted, bundle discount applied. */
  price: number;
  drive_url: string;
  bundle_items?: Array<{ id: string; title: string; drive_url: string }>;
}

export interface ValidatedCheckoutOrder {
  isValid: boolean;
  totalAmount: number;
  currency: string;
  items: ValidatedCheckoutLine[];
  error?: string;
}

/**
 * Checkout order validation — the SAME pricing law as the old POST
 * /api/orders (lib/sale-pricing.ts is the single source of truth).
 *
 * Bundle items are recomputed from their constituent kits (sum of
 * sale-adjusted kit prices, then the bundle discount from settings).
 * The total must match the client total within ±₹2. Never charge a total
 * the server didn't verify.
 */
export async function validateCheckoutOrder(
  items: CheckoutOrderItem[],
  clientReportedTotal?: number
): Promise<ValidatedCheckoutOrder> {
  if (!items || items.length === 0) {
    return {
      isValid: false,
      totalAmount: 0,
      currency: "INR",
      items: [],
      error: "No products specified in checkout.",
    };
  }

  try {
    const settings = (await getStoreData(
      "settings",
      "data/settings.json",
      DEFAULT_SETTINGS
    )) as typeof DEFAULT_SETTINGS;
    const salePct = getSalePct(settings);
    const bundleDiscPct = (() => {
      const bc = (
        settings as unknown as { bundle_card?: { discount_percent?: unknown } }
      )?.bundle_card;
      return typeof bc?.discount_percent === "number" ? bc.discount_percent : 5;
    })();

    const courses = await getStoreData<any[]>("courses", "data/courses.json", []);
    const courseMap = new Map<string, any>();
    for (const c of courses) {
      if (c.id) courseMap.set(c.id, c);
      if (c.slug) courseMap.set(c.slug, c);
    }

    const lines: ValidatedCheckoutLine[] = [];
    let computedTotal = 0;

    for (const reqItem of items) {
      const itemId = String(reqItem.productId || "");
      const qty = Math.max(1, Math.min(reqItem.quantity || 1, 10));

      if (itemId.startsWith("bundle-")) {
        const kitIds: string[] = Array.isArray(reqItem.bundle_items)
          ? reqItem.bundle_items.map(String)
          : [];
        const kits = kitIds.map((kid) => courseMap.get(kid)).filter(Boolean);
        if (kits.length === 0) {
          return {
            isValid: false,
            totalAmount: 0,
            currency: "INR",
            items: [],
            error: `Bundle ${itemId} could not be verified.`,
          };
        }
        const kitSum = kits.reduce(
          (s: number, k: any) => s + applySale(Number(k.price) || 0, salePct),
          0
        );
        const serverPrice = Math.max(
          1,
          Math.round(kitSum * (1 - bundleDiscPct / 100))
        );
        computedTotal += serverPrice * qty;
        lines.push({
          id: itemId,
          title: String(
            reqItem.title || courseMap.get(itemId)?.title || kits[0]?.title || "Full Bundle"
          ),
          price: serverPrice,
          drive_url: "",
          bundle_items: kits.map((k: any) => ({
            id: k.id,
            title: k.title,
            drive_url: k.drive_url || "",
          })),
        });
      } else {
        const check = await validateOrderPrices([{ productId: itemId }]);
        const mp = check.items[0];
        if (!check.isValid || !mp) {
          return {
            isValid: false,
            totalAmount: 0,
            currency: "INR",
            items: [],
            error: check.error || `Product ${itemId} not found in catalog.`,
          };
        }
        const linePrice = applySale(Number(mp.price) || 0, salePct);
        computedTotal += linePrice * qty;
        lines.push({
          id: itemId,
          title: mp.title,
          price: linePrice,
          drive_url: mp.drive_url || "",
        });
      }
    }

    // Total must match what the client computed (allow ±₹2 rounding tolerance).
    if (
      typeof clientReportedTotal === "number" &&
      Math.abs(computedTotal - clientReportedTotal) > 2
    ) {
      console.warn(
        `[checkout] Total mismatch: client ₹${clientReportedTotal} vs server ₹${computedTotal}`
      );
      return {
        isValid: false,
        totalAmount: 0,
        currency: "INR",
        items: [],
        error: "Price verification failed. Please refresh and try again.",
      };
    }

    return {
      isValid: true,
      totalAmount: computedTotal,
      currency: "INR",
      items: lines,
    };
  } catch (err) {
    console.error("[checkout] Order validation error:", err);
    return {
      isValid: false,
      totalAmount: 0,
      currency: "INR",
      items: [],
      error: "Failed to validate order pricing.",
    };
  }
}

/** Input Sanitizer (Anti-XSS / Script Injection) */
export function sanitizeInput(input?: string | null): string {
  if (!input) return "";
  return String(input)
    .replace(/[<>'"`;(){}]/g, "") // Strip active script characters
    .trim()
    .substring(0, 255); // Prevent buffer overflow
}

/**
 * State Machine Guard (Prevents Illegal State Regressions)
 *
 * NOTE: pending -> delivered is allowed because auto-delivery marks
 * paid+delivered in one step when links exist. pending_link is the
 * paid-but-link-not-ready state (admin adds the link later, then it
 * moves to delivered).
 */
export const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ["paid", "delivered", "pending_link", "failed", "cancelled"],
  paid: ["delivered", "pending_link", "refunded"],
  pending_link: ["delivered", "refunded"],
  delivered: ["refunded"],
  failed: ["pending"],
  cancelled: [],
  refunded: [],
};

export function canTransitionOrderStatus(currentStatus: string, newStatus: string): boolean {
  const allowed = VALID_ORDER_TRANSITIONS[currentStatus.toLowerCase()];
  if (!allowed) return false;
  return allowed.includes(newStatus.toLowerCase());
}

/**
 * Collision-resistant order IDs.
 * Format: ARK-<year>-XXXXXXXX — 8 chars from a 32-symbol alphabet
 * (~1 trillion possibilities), generated with crypto randomness.
 * Callers must still check for collisions before use. The same id is
 * used as the PhonePe merchantOrderId (alphanumeric + hyphens only,
 * well under PhonePe's 63-char limit).
 */
const ORDER_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I confusion

export function generateOrderId(): string {
  const year = new Date().getFullYear();
  const bytes = crypto.randomBytes(8);
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += ORDER_ID_ALPHABET[bytes[i] % ORDER_ID_ALPHABET.length];
  }
  return `ARK-${year}-${suffix}`;
}

/** Terms & Conditions acceptance gate — explicit opt-in required. */
export function validateTermsAcceptance(termsAccepted: unknown): string | null {
  if (termsAccepted !== true) {
    return "You must accept the Terms of Service to place an order.";
  }
  return null;
}

export interface OrderStatusFields {
  status?: string;
  payment_status?: string;
  delivery_status?: string;
}

/** Bulk status-change guard — validates against VALID_ORDER_TRANSITIONS. */
export function validateStatusTransitions(
  current: OrderStatusFields,
  next: OrderStatusFields
): string | null {
  const pairs: Array<[string | undefined, string | undefined, string]> = [
    [current.status, next.status, "status"],
    [current.payment_status, next.payment_status, "payment_status"],
    [current.delivery_status, next.delivery_status, "delivery_status"],
  ];
  for (const [cur, nxt, field] of pairs) {
    if (!nxt || !cur || nxt.toLowerCase() === cur.toLowerCase()) continue;
    const normalized = nxt.toLowerCase() === "approved" ? "paid" : nxt;
    if (!canTransitionOrderStatus(cur, normalized)) {
      return `Illegal ${field} transition: "${cur}" → "${nxt}".`;
    }
  }
  return null;
}

/**
 * Insert a marketplace_orders row, tolerating missing optional columns.
 *
 * PostgREST reports ONE missing column per failed insert (the first in
 * payload order), so a fixed-order sequential if-chain can miss a group
 * whose check already ran — e.g. course_title fails first, terms next,
 * and the terms check has already passed. This loops: after each failed
 * insert, strip the column group named in the error and retry, until the
 * insert succeeds or no strippable group remains. Each iteration removes
 * at least one column, so the loop always terminates (max 5 attempts).
 *
 * Returns the final error (null on success), the groups stripped, and the
 * payload that was actually inserted. Callers log a loud error on
 * failure; the checkout's tolerate-and-continue behaviour (JSON backup +
 * persistence verify) is unchanged.
 */
export interface OrderInsertResult {
  error: { message: string } | null;
  strippedGroups: string[];
  payload: Record<string, any>;
}

const MISSING_COLUMN_GROUPS: Array<{
  name: string;
  pattern: RegExp;
  columns: string[];
}> = [
  { name: "items", pattern: /items/, columns: ["items"] },
  {
    name: "terms",
    pattern: /terms_accepted|terms_version/,
    columns: ["terms_accepted", "terms_accepted_at", "terms_version"],
  },
  {
    name: "course_title/drive_url",
    pattern: /course_title|drive_url/,
    columns: ["course_title", "drive_url"],
  },
  {
    name: "attribution",
    pattern: /visitor_id|session_id|utm_source/,
    columns: ["visitor_id", "session_id", "utm_source"],
  },
  { name: "user_id", pattern: /user_id/, columns: ["user_id"] },
];

export async function insertMarketplaceOrderWithColumnFallback(
  insert: (
    row: Record<string, any>
  ) => Promise<{ error: { message: string } | null }>,
  basePayload: Record<string, any>
): Promise<OrderInsertResult> {
  const payload: Record<string, any> = { ...basePayload };
  const strippedGroups: string[] = [];
  let { error } = await insert(payload);
  while (error) {
    const message = error.message;
    const group = MISSING_COLUMN_GROUPS.find(
      (g) => g.pattern.test(message) && g.columns.some((c) => c in payload)
    );
    if (!group) break;
    console.warn(
      `[phonepe-create] ${group.name} column(s) missing, retrying without them.`
    );
    for (const c of group.columns) delete payload[c];
    strippedGroups.push(group.name);
    ({ error } = await insert(payload));
  }
  return { error, strippedGroups, payload };
}
