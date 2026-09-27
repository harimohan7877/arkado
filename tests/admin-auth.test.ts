import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { verifyAdminSession, ADMIN_PASSCODE } from "@/lib/admin-auth";

describe("Admin Authentication Module", () => {
  it("should have a non-empty test ADMIN_PASSCODE", () => {
    expect(ADMIN_PASSCODE).toBeTruthy();
  });

  it("should reject unauthorized request without credentials", () => {
    const req = new NextRequest("https://arkado.in/api/admin/stats");
    expect(verifyAdminSession(req)).toBe(false);
  });

  it("should reject request with wrong passcode", () => {
    const req = new NextRequest("https://arkado.in/api/admin/stats", {
      headers: {
        authorization: "Bearer wrong-passcode",
      },
    });
    expect(verifyAdminSession(req)).toBe(false);
  });

  it("should accept request with valid Bearer token in Authorization header", () => {
    const req = new NextRequest("https://arkado.in/api/admin/stats", {
      headers: {
        authorization: `Bearer ${ADMIN_PASSCODE}`,
      },
    });
    expect(verifyAdminSession(req)).toBe(true);
  });

  it("should accept request with valid passcode in x-admin-passcode header", () => {
    const req = new NextRequest("https://arkado.in/api/admin/stats", {
      headers: {
        "x-admin-passcode": ADMIN_PASSCODE,
      },
    });
    expect(verifyAdminSession(req)).toBe(true);
  });

  it("should accept request with valid passcode in arkado-admin-verified cookie", () => {
    const req = new NextRequest("https://arkado.in/api/admin/stats", {
      headers: {
        cookie: `arkado-admin-verified=${ADMIN_PASSCODE}`,
      },
    });
    expect(verifyAdminSession(req)).toBe(true);
  });

  it("should reject request with spoofed cookie value like 'true'", () => {
    const req = new NextRequest("https://arkado.in/api/admin/stats", {
      headers: {
        cookie: "arkado-admin-verified=true",
      },
    });
    expect(verifyAdminSession(req)).toBe(false);
  });
});
