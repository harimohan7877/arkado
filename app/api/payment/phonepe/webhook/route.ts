import { NextRequest, NextResponse } from "next/server";
import { validatePhonePeCallback } from "@/lib/phonepe";
import { completePhonePeOrder } from "@/lib/order-completion";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * PhonePe server-to-server webhook (Standard Checkout).
 *
 * PhonePe calls this when a payment completes/fails — even if the
 * customer closed the browser mid-payment, so this is the primary
 * delivery trigger (the "server pe hogi" guarantee).
 *
 * The callback is authenticated with the dashboard webhook username /
 * password (validateCallback). The callback payload is only the TRIGGER —
 * completion re-verifies the payment via PhonePe's Order Status API
 * before marking anything paid or delivering.
 *
 * Always returns 200 for a valid callback (even when completion had a
 * transient issue — the status route / track-order re-check resolves it).
 * Returns 500 only when completion could not even determine the payment
 * state, so PhonePe retries.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const authorization = req.headers.get("authorization") || "";

  let callback;
  try {
    callback = validatePhonePeCallback(authorization, rawBody);
  } catch (err: unknown) {
    console.error(
      "[phonepe-webhook] Callback validation failed:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "Invalid callback." }, { status: 401 });
  }

  const payload = callback.payload || ({} as Record<string, unknown>);
  const merchantOrderId =
    (payload as { merchantOrderId?: string }).merchantOrderId || "";

  // Refund callbacks carry originalMerchantOrderId instead — nothing to
  // complete here; refunds are handled by the admin refund flow.
  if (!merchantOrderId) {
    return NextResponse.json({ received: true });
  }

  console.log("[phonepe-webhook] Callback received:", {
    type: callback.type,
    merchantOrderId,
    state: (payload as { state?: string }).state,
  });

  const result = await completePhonePeOrder(merchantOrderId);

  if (!result.ok && result.state === "UNKNOWN") {
    // Transient (e.g. PhonePe status API unreachable) — let PhonePe retry.
    return NextResponse.json(
      { received: true, error: result.error || "Completion pending." },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true, state: result.state });
}
