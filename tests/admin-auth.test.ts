import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  verifyAdminSession,
  verifyAdminSessionToken,
  createAdminSessionToken,
  ADMIN_PASSCODE,
  ADMIN_SESSION_COOKIE,
} from "@/lib/admin-auth";

// lib/admin-auth reads SESSION_SECRET lazily, so setting it here (before any
// test body runs) is enough.
process.env.SESSION_SECRET = "test-session-secret-for-vitest";

function reqWithCookie(cookieHeader: string) {
  return new NextRequest("https://arkado.in/api/admin/stats", {
    headers: { cookie: cookieHeader },
  });
}

describe("Admin Authentication Module", () => {
  it("should have a non-empty test ADMIN_PASSCODE", () => {
    expect(ADMIN_PASSCODE).toBeTruthy();
  });

  it("should reject unauthorized request without credentials", async () => {
    const req = new NextRequest("https://arkado.in/api/admin/stats");
    expect(await verifyAdminSession(req)).toBe(false);
  });

  it("should reject request with raw passcode in Bearer header (passcode no longer accepted)", async () => {
    const req = new NextRequest("https://arkado.in/api/admin/stats", {
      headers: { authorization: `Bearer ${ADMIN_PASSCODE}` },
    });
    expect(await verifyAdminSession(req)).toBe(false);
  });

  it("should reject request with raw passcode in x-admin-passcode header", async () => {
    const req = new NextRequest("https://arkado.in/api/admin/stats", {
      headers: { "x-admin-passcode": ADMIN_PASSCODE },
    });
    expect(await verifyAdminSession(req)).toBe(false);
  });

  it("should reject request with legacy passcode cookie", async () => {
    const req = reqWithCookie(`arkado-admin-verified=${ADMIN_PASSCODE}`);
    expect(await verifyAdminSession(req)).toBe(false);
  });

  it("should reject request with spoofed cookie value like 'true'", async () => {
    const req = reqWithCookie(`${ADMIN_SESSION_COOKIE}=true`);
    expect(await verifyAdminSession(req)).toBe(false);
  });

  it("should reject malformed session tokens", async () => {
    for (const bad of ["", "v1.123", "v1.abc.def.ghi", "not-a-token"]) {
      expect(await verifyAdminSession(reqWithCookie(`${ADMIN_SESSION_COOKIE}=${bad}`))).toBe(false);
    }
  });

  it("should accept a valid signed session cookie", async () => {
    const token = await createAdminSessionToken();
    const req = reqWithCookie(`${ADMIN_SESSION_COOKIE}=${token}`);
    expect(await verifyAdminSession(req)).toBe(true);
  });

  it("should reject a tampered session token", async () => {
    const token = await createAdminSessionToken();
    // Flip the last hex char of the signature
    const tampered = token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");
    expect(await verifyAdminSessionToken(tampered)).toBe(false);
    const req = reqWithCookie(`${ADMIN_SESSION_COOKIE}=${tampered}`);
    expect(await verifyAdminSession(req)).toBe(false);
  });

  it("should reject an expired session token", async () => {
    const token = await createAdminSessionToken(Date.now() - 25 * 60 * 60 * 1000);
    expect(await verifyAdminSessionToken(token)).toBe(false);
  });

  it("should reject a token signed with a different secret", async () => {
    const token = await createAdminSessionToken();
    const real = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "a-different-secret";
    try {
      expect(await verifyAdminSessionToken(token)).toBe(false);
    } finally {
      process.env.SESSION_SECRET = real;
    }
  });

  it("should reject everything when SESSION_SECRET is not configured", async () => {
    const token = await createAdminSessionToken();
    const real = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    try {
      expect(await verifyAdminSessionToken(token)).toBe(false);
      const req = reqWithCookie(`${ADMIN_SESSION_COOKIE}=${token}`);
      expect(await verifyAdminSession(req)).toBe(false);
    } finally {
      process.env.SESSION_SECRET = real;
    }
  });
});
