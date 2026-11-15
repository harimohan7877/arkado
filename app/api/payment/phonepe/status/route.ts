import { NextRequest, NextResponse } from "next/server";
import { sanitizeInput } from "@/lib/checkout";
import { completePhonePeOrder } from "@/lib/order-completion";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Order status re-check — used by the success page (after PhonePe
 * redirects the customer back) and by track-order's "Check my payment".
 *
 * Re-verifies the payment with PhonePe and completes the order
 * (delivery or pending_link) when it is COMPLETED. Idempotent: calling
 * it again on a paid order just returns the current delivery state
 * without re-emailing.
 *
 * The merchant order id (ARK-<year>-XXXXXXXX, ~1 trillion possibilities)
 * is the credential here — it is unguessable and never shown publicly.
 * The response carries download links only for a paid order.
 */
export async function GET(req: NextRequest) {
  const orderId = sanitizeInput(
    new URL(req.url).searchParams.get("orderId")
  ).toUpperCase();

  if (!orderId) {
    return NextResponse.json(
      { success: false, error: "Order ID is required." },
      { status: 400 }
    );
  }

  const result = await completePhonePeOrder(orderId);

  if (!result.ok && result.state === "UNKNOWN") {
    const notFound = (result.error || "").includes("not found");
    return NextResponse.json(
      { success: false, error: result.error || "Could not check the order." },
      { status: notFound ? 404 : 502 }
    );
  }

  return NextResponse.json({
    success: true,
    state: result.state,
    orderId: result.orderId,
    pendingLink: Boolean(result.pendingLink),
    deliveredItems: result.deliveredItems || [],
    transactionId: result.transactionId || undefined,
  });
}
