/** Shared helpers for the public order-tracking feature. Pure functions — unit tested. */

export interface SafeOrder {
  order_id: string;
  course_title: string;
  amount: number;
  payment_status: string;
  delivery_status: string;
  created_at: string;
}

export type OrderPhase = "ordered" | "verifying" | "approved" | "delivered" | "failed";

/** Keep only the last 10 digits for comparison (+91 / 0 prefix tolerant). */
export function normPhone(p: string): string {
  const d = (p || "").replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
}

/**
 * All phone-number candidates for an order record.
 * Supabase-sourced orders often have the phone embedded in customer_name
 * as "Name (9876543210)" with the phone columns empty — so we check there too.
 */
export function orderPhoneCandidates(order: Record<string, any>): string[] {
  const out: string[] = [];
  if (order.phone) out.push(String(order.phone));
  if (order.customer_phone) out.push(String(order.customer_phone));
  const name = String(order.customer_name || order.name || "");
  const m = name.match(/\((\+?\d[\d\s-]{7,}\d)\)/);
  if (m) out.push(m[1]);
  return out;
}

/** True when the given raw phone matches any candidate on the order. */
export function orderPhoneMatches(order: Record<string, any>, rawPhone: string): boolean {
  const want = normPhone(rawPhone);
  if (want.length < 10) return false;
  return orderPhoneCandidates(order).some((c) => normPhone(c) === want);
}

/**
 * Strip an order record down to the fields safe for public display.
 * NEVER includes: drive_url, utr, email, phone, customer name.
 */
export function toSafeOrder(order: Record<string, any>): SafeOrder | null {
  if (!order || typeof order !== "object") return null;
  const order_id = String(order.order_id || order.id || "").trim();
  if (!order_id) return null;
  return {
    order_id,
    course_title: String(order.course_title || order.exam_name || "Course Bundle"),
    amount: Number(order.amount) || 0,
    payment_status: String(order.payment_status || "pending"),
    delivery_status: String(order.delivery_status || "pending"),
    created_at: String(order.created_at || ""),
  };
}

export function phaseOf(o: SafeOrder): OrderPhase {
  if (o.payment_status === "failed") return "failed";
  if (o.payment_status === "paid" && o.delivery_status === "delivered") return "delivered";
  if (o.payment_status === "paid") return "approved";
  return "verifying";
}

export const PHASE_INFO: Record<OrderPhase, { title: string; desc: string }> = {
  ordered: { title: "Order mil gaya", desc: "Tumhara order hum tak pahunch gaya hai." },
  verifying: {
    title: "Payment verify ho raha hai",
    desc: "Hum tumhara UTR check kar rahe hain — aam taur par kuch ghanton mein ho jata hai.",
  },
  approved: {
    title: "Payment approved!",
    desc: "Tumhara study material taiyaar ho raha hai — link jald WhatsApp par milega.",
  },
  delivered: {
    title: "Delivered!",
    desc: "Study material ka link bhej diya gaya hai — apna WhatsApp check karo.",
  },
  failed: {
    title: "Order cancel ho gaya",
    desc: "Is order ka payment verify nahi ho paya. Madad chahiye to WhatsApp par sampark karo.",
  },
};

export const TRACK_STEPS = ["Order placed", "Payment verifying", "Approved", "Delivered"];

export function stepIndex(phase: OrderPhase): number {
  if (phase === "failed") return -1;
  if (phase === "verifying") return 1;
  if (phase === "approved") return 2;
  if (phase === "delivered") return 3;
  return 0;
}
