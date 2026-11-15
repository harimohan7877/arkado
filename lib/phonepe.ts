/**
 * PhonePe PG v2 (Standard Checkout) — server-only helpers.
 *
 * Uses the official SDK (@phonepe-pg/pg-sdk-node v2.0.6):
 *   StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env)
 *   client.pay(StandardCheckoutPayRequest.builder()...) -> { redirectUrl, orderId, state }
 *   client.getOrderStatus(merchantOrderId) -> { state, paymentDetails[] }
 *   client.validateCallback(username, password, authorization, rawBody) -> CallbackResponse
 *   client.refund(RefundRequest.builder()...) -> RefundResponse
 *
 * Keys live ONLY in Vercel env vars — never in settings.json (git-tracked)
 * or the admin panel:
 *   PHONEPE_CLIENT_ID, PHONEPE_CLIENT_SECRET, PHONEPE_ENV (SANDBOX|PRODUCTION),
 *   PHONEPE_WEBHOOK_USERNAME, PHONEPE_WEBHOOK_PASSWORD
 *
 * Env defaults to SANDBOX when unset, so a misconfiguration can never
 * charge real money by accident.
 */

import {
  StandardCheckoutClient,
  StandardCheckoutPayRequest,
  RefundRequest,
  Env,
} from "@phonepe-pg/pg-sdk-node";
import type { OrderStatusResponse } from "@phonepe-pg/pg-sdk-node";
import type { CallbackResponse } from "@phonepe-pg/pg-sdk-node";

export function getPhonePeEnv(): Env {
  return process.env.PHONEPE_ENV?.toUpperCase() === "PRODUCTION"
    ? Env.PRODUCTION
    : Env.SANDBOX;
}

export function hasPhonePeKeys(): boolean {
  return Boolean(
    process.env.PHONEPE_CLIENT_ID && process.env.PHONEPE_CLIENT_SECRET
  );
}

let client: StandardCheckoutClient | null = null;

/** Lazy singleton — the SDK throws if getInstance is called twice. */
export function getPhonePeClient(): StandardCheckoutClient {
  if (client) return client;
  const clientId = process.env.PHONEPE_CLIENT_ID;
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "PhonePe credentials are not configured (PHONEPE_CLIENT_ID / PHONEPE_CLIENT_SECRET)."
    );
  }
  // clientVersion 1 is the current PG v2 client version.
  client = StandardCheckoutClient.getInstance(
    clientId,
    clientSecret,
    1,
    getPhonePeEnv()
  );
  return client;
}

/** ₹ → paisa (PhonePe amounts are in paisa; minimum is 100 paisa = ₹1). */
export function rupeesToPaisa(rupees: number): number {
  return Math.max(100, Math.round(Number(rupees) * 100));
}

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://www.arkado.store";
  return raw.replace(/\/$/, "");
}

export interface PhonePePayResult {
  redirectUrl: string;
  orderId: string;
  state: string;
  expireAt: number;
}

/**
 * Start a Standard Checkout payment. Returns the PhonePe hosted-page URL.
 * The frontend must navigate the CUSTOMER's browser to it (client-side
 * navigation, e.g. window.location.href) — PhonePe validates the referrer
 * header, so a server-side 302 redirect can fail.
 */
export async function createPhonePePayment(
  merchantOrderId: string,
  amountRupees: number,
  redirectUrl: string
): Promise<PhonePePayResult> {
  const res = await getPhonePeClient().pay(
    StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(rupeesToPaisa(amountRupees))
      .redirectUrl(redirectUrl)
      .build()
  );
  if (!res?.redirectUrl) {
    throw new Error("PhonePe did not return a payment page URL.");
  }
  return {
    redirectUrl: res.redirectUrl,
    orderId: res.orderId,
    state: res.state,
    expireAt: res.expireAt,
  };
}

export interface PhonePeStatus {
  state: string;
  orderId: string;
  merchantOrderId?: string;
  amount: number;
  /** PhonePe transaction id of the latest successful attempt, if any. */
  transactionId?: string;
  paymentMode?: string;
  errorCode?: string;
}

/** Server-side truth about an order — never trust the browser redirect. */
export async function getPhonePeOrderStatus(
  merchantOrderId: string
): Promise<PhonePeStatus> {
  const res: OrderStatusResponse = await getPhonePeClient().getOrderStatus(
    merchantOrderId,
    false
  );
  const latest = Array.isArray(res.paymentDetails)
    ? res.paymentDetails[res.paymentDetails.length - 1]
    : undefined;
  return {
    state: res.state,
    orderId: res.orderId,
    merchantOrderId: res.merchantOrderId,
    amount: res.amount,
    transactionId: latest?.transactionId,
    paymentMode: latest?.paymentMode,
    errorCode: res.errorCode,
  };
}

/**
 * Validate a PhonePe server-to-server callback. Throws PhonePeException
 * when the callback is not authentic (wrong username/password or tampered
 * body). Callers must catch it and return 401 without processing.
 */
export function validatePhonePeCallback(
  authorization: string,
  rawBody: string
): CallbackResponse {
  const username = process.env.PHONEPE_WEBHOOK_USERNAME || "";
  const password = process.env.PHONEPE_WEBHOOK_PASSWORD || "";
  if (!username || !password) {
    throw new Error(
      "PhonePe webhook credentials are not configured (PHONEPE_WEBHOOK_USERNAME / PHONEPE_WEBHOOK_PASSWORD)."
    );
  }
  return getPhonePeClient().validateCallback(
    username,
    password,
    authorization,
    rawBody
  );
}

/** Start a refund (double payment / link-not-delivered only). Amount in ₹. */
export async function refundPhonePePayment(
  merchantRefundId: string,
  originalMerchantOrderId: string,
  amountRupees: number
): Promise<{ refundId: string; state: string }> {
  const res = await getPhonePeClient().refund(
    RefundRequest.builder()
      .merchantRefundId(merchantRefundId)
      .originalMerchantOrderId(originalMerchantOrderId)
      .amount(rupeesToPaisa(amountRupees))
      .build()
  );
  return { refundId: res.refundId, state: res.state };
}
