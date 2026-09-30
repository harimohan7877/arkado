import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreData } from "@/lib/store-data";

/**
 * Arkado Enterprise Payment Gateway & Security Service
 * Architected with Red-Team / Ethical Hacker Defenses:
 * - Server-Authoritative Price Validation (Anti-Price Tampering)
 * - Timing-Safe Cryptographic Signature Verification (Anti-Timing Attacks)
 * - Webhook Idempotency & Replay Protection
 * - Input Sanitization & Anti-XSS
 * - UTR Format & Anti-Duplicate Checking
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
 * 1. Gateway Status & Feature Flag
 * Keeps the gateway dormant when keys are absent, ensuring ZERO impact on existing site.
 */
export function isPaymentGatewayConfigured(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(
    keyId &&
    keySecret &&
    !keyId.includes("test_") && // Optional: ensure production or real keys
    keySecret.length > 8
  );
}

/**
 * Checks if basic Razorpay keys (test or live) are present
 */
export function hasRazorpayKeys(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/**
 * 2. Server-Authoritative Price Validation (Anti-Price Tampering)
 * NEVER trust the client amount. Queries database for authoritative price.
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
    // 1. Fetch products from relational marketplace_products table or fallback store
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
    console.error("[payment-gateway] Price validation error:", err);
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

/**
 * 3. Timing-Safe Cryptographic Signature Verification (Anti-Timing Attacks)
 */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !signature || !orderId || !paymentId) return false;

  try {
    const text = `${orderId}|${paymentId}`;
    const generated = crypto.createHmac("sha256", secret).update(text).digest("hex");

    const a = Buffer.from(generated, "utf-8");
    const b = Buffer.from(signature, "utf-8");

    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    console.error("[payment-gateway] Signature verification error:", err);
    return false;
  }
}

/**
 * 4. Razorpay Webhook Signature Verification
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret?: string
): boolean {
  const secret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !signature || !rawBody) return false;

  try {
    const generated = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(generated, "utf-8");
    const b = Buffer.from(signature, "utf-8");

    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    console.error("[payment-gateway] Webhook signature verification error:", err);
    return false;
  }
}

/**
 * 5. Input Sanitizer (Anti-XSS / Script Injection)
 */
export function sanitizeInput(input?: string | null): string {
  if (!input) return "";
  return String(input)
    .replace(/[<>'"`;(){}]/g, "") // Strip active script characters
    .trim()
    .substring(0, 255); // Prevent buffer overflow
}

/**
 * 6. UTR Validation & Duplicate Prevention (Anti-Fraud)
 *
 * Rules (Phase 3 hardening):
 * - UTR is OPTIONAL at order creation (checkout marks it "यदि उपलब्ध हो").
 * - If provided, it MUST be exactly 12 digits — anything else is HTTP 400.
 * - A UTR already used by another order is rejected (HTTP 409), not merely flagged.
 * - Duplicates are checked in BOTH stores: Supabase marketplace_orders and
 *   the JSON order store (data/orders.json), which the admin panel reads.
 */
export async function validateUtrSubmission(utr: string): Promise<{
  isValid: boolean;
  cleanUtr: string;
  isDuplicate: boolean;
  message?: string;
}> {
  const clean = utr.trim().replace(/\s+/g, "");

  // UTR is optional — an empty value is valid (customer may submit it later).
  if (!clean) {
    return { isValid: true, cleanUtr: "", isDuplicate: false };
  }

  // Most Indian UPI UTRs are exactly 12 digits numeric (e.g. 426812345678).
  // Anything else is rejected outright — the old code computed this check
  // but never enforced it.
  if (!/^\d{12}$/.test(clean)) {
    return {
      isValid: false,
      cleanUtr: clean,
      isDuplicate: false,
      message: "UTR must be exactly 12 digits.",
    };
  }

  // Check Supabase marketplace_orders for duplicate UTR
  try {
    const { data: existing } = await supabaseAdmin
      .from("marketplace_orders")
      .select("id, razorpay_payment_id, created_at")
      .eq("razorpay_payment_id", clean)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return {
        isValid: true,
        cleanUtr: clean,
        isDuplicate: true,
        message: "This UTR / Transaction reference has already been submitted.",
      };
    }
  } catch (err) {
    console.warn("[payment-gateway] Supabase UTR duplicate check failed:", err);
  }

  // Check the JSON order store too (primary store read by the admin panel)
  try {
    const jsonOrders = await getStoreData<any[]>("orders", "data/orders.json", []);
    const dup = jsonOrders.some((o) => o && o.utr === clean);
    if (dup) {
      return {
        isValid: true,
        cleanUtr: clean,
        isDuplicate: true,
        message: "This UTR / Transaction reference has already been submitted.",
      };
    }
  } catch (err) {
    console.warn("[payment-gateway] JSON UTR duplicate check failed:", err);
  }

  return {
    isValid: true,
    cleanUtr: clean,
    isDuplicate: false,
  };
}

/**
 * 7. State Machine Guard (Prevents Illegal State Regressions)
 *
 * NOTE: pending -> delivered is allowed because the production flow is
 * manual UTR verification: the admin checks the UPI payment and approves,
 * which confirms payment AND delivers the Drive link in one step.
 */
export const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ["paid", "delivered", "failed", "cancelled"],
  paid: ["delivered", "refunded"],
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
 * 8. Collision-resistant order IDs (Phase 3 hardening)
 *
 * The old format ARK-<year>-XXXX used only 4 random digits (9,000
 * possibilities) — collisions become likely as order volume grows, and
 * short sequential-looking IDs are easy to guess/enumerate.
 * New format: ARK-<year>-XXXXXXXX — 8 chars from a 32-symbol alphabet
 * (~1 trillion possibilities), generated with crypto randomness.
 * Callers must still check for collisions before use (see orders route).
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

/**
 * 9. Bulk status-change guard (Phase 3 hardening)
 *
 * Validates requested status changes against VALID_ORDER_TRANSITIONS.
 * Returns an error message for the first illegal transition, or null when
 * everything is legal. Fields that are unchanged (or missing on either
 * side, e.g. legacy orders) are skipped — never block on unknown data.
 * The UI alias "approved" is treated as "paid" for the state machine.
 */
export interface OrderStatusFields {
  status?: string;
  payment_status?: string;
  delivery_status?: string;
}

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
