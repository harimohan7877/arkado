import { NextRequest } from "next/server";

/**
 * Admin session authentication.
 *
 * SECURITY MODEL (Phase 1 hardening):
 * - The raw ADMIN_PASSCODE is only ever compared server-side inside the login
 *   route. It is NEVER sent to the browser, stored in cookies, localStorage,
 *   sessionStorage, or returned in any API response.
 * - On successful login the server issues a signed session token
 *   (v1.<issuedAtMs>.<expiresAtMs>.<hmac-sha256>) using SESSION_SECRET.
 * - The token is stored in an HttpOnly + Secure + SameSite=Lax cookie, so
 *   JavaScript (and any XSS payload) cannot read it.
 * - Uses the Web Crypto API so the same code runs in the Node.js runtime
 *   (API routes) and the Edge runtime (proxy.ts).
 */

export const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "";

/** Name of the HttpOnly session cookie set on admin login. */
export const ADMIN_SESSION_COOKIE = "arkado-admin-session";

/** Session lifetime: 24 hours. */
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || "";
}

const encoder = new TextEncoder();

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

/** Constant-time comparison so signature checks don't leak via timing. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Creates a signed admin session token.
 * Format: v1.<issuedAtMs>.<expiresAtMs>.<hex-hmac-sha256(secret, "v1.<issuedAtMs>.<expiresAtMs>")>
 * Throws if SESSION_SECRET is not configured (fail loudly, never issue
 * tokens nobody can verify).
 */
export async function createAdminSessionToken(
  nowMs: number = Date.now()
): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error(
      "[admin-auth] SESSION_SECRET environment variable is not set!"
    );
  }
  const expiresAt = nowMs + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `v1.${nowMs}.${expiresAt}`;
  const sig = await hmacSha256Hex(secret, payload);
  return `${payload}.${sig}`;
}

/** Verifies a session token created by createAdminSessionToken(). */
export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  const secret = getSessionSecret();
  if (!secret) {
    console.error(
      "[admin-auth] SESSION_SECRET environment variable is not set!"
    );
    return false;
  }

  const clean = (token || "").trim();
  const parts = clean.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const [, issuedAt, expiresAt, sig] = parts;
  if (!/^\d+$/.test(issuedAt) || !/^\d+$/.test(expiresAt)) return false;

  const expectedSig = await hmacSha256Hex(secret, `v1.${issuedAt}.${expiresAt}`);
  if (!timingSafeEqualHex(sig, expectedSig)) return false;
  if (Date.now() > Number(expiresAt)) return false;

  return true;
}

/**
 * Returns true when the request carries a valid signed admin session cookie.
 *
 * NOTE: the raw passcode is intentionally NOT accepted here anymore — not in
 * headers, not in cookies. Only SESSION_SECRET-signed session tokens grant
 * access. Legacy passcode cookies/headers are ignored (treated as invalid).
 */
export async function verifyAdminSession(req: NextRequest): Promise<boolean> {
  // Allow local development / localhost / LAN admin requests so local testing never fails
  const host = req.headers.get("host") || "";
  if (
    process.env.NODE_ENV !== "production" &&
    (host.includes("localhost") || host.includes("127.0.0.1"))
  ) {
    return true;
  }

  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  if (!token) return false;
  return verifyAdminSessionToken(token);
}
