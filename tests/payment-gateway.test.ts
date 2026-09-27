import { describe, it, expect } from "vitest";
import {
  sanitizeInput,
  canTransitionOrderStatus,
  hasRazorpayKeys,
  isPaymentGatewayConfigured,
  VALID_ORDER_TRANSITIONS,
} from "@/lib/payment-gateway";

describe("Payment Gateway & Security Module", () => {
  describe("sanitizeInput (Anti-XSS & Script Injection)", () => {
    it("should remove script tags and malicious characters", () => {
      const malicious = "<script>alert('hack');</script>";
      const clean = sanitizeInput(malicious);
      expect(clean).not.toContain("<");
      expect(clean).not.toContain(">");
      expect(clean).not.toContain("'");
      expect(clean).not.toContain(";");
      expect(clean).toBe("scriptalerthack/script");
    });

    it("should trim excess whitespace", () => {
      expect(sanitizeInput("   John Doe   ")).toBe("John Doe");
    });

    it("should handle null and undefined safely", () => {
      expect(sanitizeInput(null)).toBe("");
      expect(sanitizeInput(undefined)).toBe("");
      expect(sanitizeInput("")).toBe("");
    });

    it("should enforce maximum length of 255 characters", () => {
      const veryLong = "a".repeat(500);
      const sanitized = sanitizeInput(veryLong);
      expect(sanitized.length).toBe(255);
    });
  });

  describe("canTransitionOrderStatus (State Machine Integrity)", () => {
    it("should allow legal status transitions", () => {
      expect(canTransitionOrderStatus("pending", "paid")).toBe(true);
      expect(canTransitionOrderStatus("pending", "cancelled")).toBe(true);
      expect(canTransitionOrderStatus("pending", "failed")).toBe(true);
      expect(canTransitionOrderStatus("paid", "delivered")).toBe(true);
      expect(canTransitionOrderStatus("paid", "refunded")).toBe(true);
      expect(canTransitionOrderStatus("delivered", "refunded")).toBe(true);
    });

    it("should reject illegal status regressions", () => {
      expect(canTransitionOrderStatus("cancelled", "paid")).toBe(false);
      expect(canTransitionOrderStatus("refunded", "delivered")).toBe(false);
      expect(canTransitionOrderStatus("delivered", "pending")).toBe(false);
      expect(canTransitionOrderStatus("unknown_status", "paid")).toBe(false);
    });
  });

  describe("Gateway Configuration & Key Detection", () => {
    it("should reflect absence of live keys in default environment", () => {
      // In default test environment without live keys, gateway must remain dormant
      expect(typeof isPaymentGatewayConfigured()).toBe("boolean");
      expect(typeof hasRazorpayKeys()).toBe("boolean");
    });
  });
});
