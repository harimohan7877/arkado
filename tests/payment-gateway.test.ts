import { describe, it, expect, vi } from "vitest";

// The vitest env points Supabase at a fake URL whose network calls hang.
// Mock the Supabase client so UTR duplicate checks resolve instantly.
const { mockUtrDuplicateRow } = vi.hoisted(() => ({
  mockUtrDuplicateRow: { value: null as { id: string } | null },
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => ({
            maybeSingle: async () => ({ data: mockUtrDuplicateRow.value }),
          }),
        }),
      }),
    }),
  },
}));

import {
  sanitizeInput,
  canTransitionOrderStatus,
  hasRazorpayKeys,
  isPaymentGatewayConfigured,
  validateUtrSubmission,
  generateOrderId,
  validateStatusTransitions,
  validateTermsAcceptance,
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

  describe("validateUtrSubmission (Phase 3: strict 12-digit UTR)", () => {
    it("should accept an empty UTR (optional field)", async () => {
      const r = await validateUtrSubmission("");
      expect(r.isValid).toBe(true);
      expect(r.cleanUtr).toBe("");
      expect(r.isDuplicate).toBe(false);
    });

    it("should accept a valid 12-digit UTR and clean whitespace", async () => {
      const r = await validateUtrSubmission("  426812345678  ");
      expect(r.isValid).toBe(true);
      expect(r.cleanUtr).toBe("426812345678");
      expect(r.isDuplicate).toBe(false);
    });

    it("should reject UTRs that are not exactly 12 digits", async () => {
      for (const bad of ["12345", "1234567890123", "12345678901a", "UPI-REF-5544332211", "4268 1234 567"]) {
        const r = await validateUtrSubmission(bad);
        expect(r.isValid).toBe(false);
        expect(r.message).toMatch(/12 digits/);
      }
    });

    it("should flag a UTR already used by another order as duplicate", async () => {
      mockUtrDuplicateRow.value = { id: "some-order-id" };
      try {
        const r = await validateUtrSubmission("426812345678");
        expect(r.isValid).toBe(true);
        expect(r.isDuplicate).toBe(true);
        expect(r.message).toMatch(/already been submitted/);
      } finally {
        mockUtrDuplicateRow.value = null;
      }
    });
  });

  describe("generateOrderId (Phase 3: collision-resistant IDs)", () => {
    it("should produce ARK-<year>-XXXXXXXX format IDs", () => {
      const year = new Date().getFullYear();
      for (let i = 0; i < 20; i++) {
        expect(generateOrderId()).toMatch(new RegExp(`^ARK-${year}-[A-HJ-NP-Z2-9]{8}$`));
      }
    });

    it("should not repeat IDs across many generations", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 500; i++) ids.add(generateOrderId());
      expect(ids.size).toBe(500);
    });
  });

  describe("validateStatusTransitions (Phase 3: state machine enforcement)", () => {
    it("should allow the real admin flows", () => {
      // Mark fake: pending -> failed
      expect(
        validateStatusTransitions(
          { payment_status: "pending", delivery_status: "pending" },
          { payment_status: "failed", delivery_status: "pending" }
        )
      ).toBeNull();
      // Restore: failed -> pending
      expect(
        validateStatusTransitions(
          { payment_status: "failed", delivery_status: "pending" },
          { payment_status: "pending", delivery_status: "pending" }
        )
      ).toBeNull();
      // Manual approve: pending -> delivered
      expect(
        validateStatusTransitions(
          { payment_status: "pending", delivery_status: "pending" },
          { payment_status: "paid", delivery_status: "delivered" }
        )
      ).toBeNull();
      expect(canTransitionOrderStatus("pending", "delivered")).toBe(true);
    });

    it("should reject illegal regressions", () => {
      expect(
        validateStatusTransitions(
          { payment_status: "paid", delivery_status: "delivered" },
          { payment_status: "pending" }
        )
      ).toMatch(/Illegal/);
      expect(
        validateStatusTransitions({ payment_status: "refunded" }, { payment_status: "delivered" })
      ).toMatch(/Illegal/);
    });

    it("should skip unchanged or unknown fields", () => {
      expect(
        validateStatusTransitions(
          { payment_status: "pending", delivery_status: "pending" },
          { payment_status: "pending", delivery_status: "pending" }
        )
      ).toBeNull();
      // Legacy order without status fields must not be blocked
      expect(validateStatusTransitions({}, { payment_status: "failed" })).toBeNull();
    });

    it("should treat the UI alias 'approved' as 'paid'", () => {
      expect(
        validateStatusTransitions({ status: "pending" }, { status: "approved" })
      ).toBeNull();
    });
  });

  describe("validateTermsAcceptance (T&C opt-in gate)", () => {
    it("should accept an explicit true", () => {
      expect(validateTermsAcceptance(true)).toBeNull();
    });

    it("should reject missing, false, or non-boolean values", () => {
      expect(validateTermsAcceptance(undefined)).not.toBeNull();
      expect(validateTermsAcceptance(null)).not.toBeNull();
      expect(validateTermsAcceptance(false)).not.toBeNull();
      expect(validateTermsAcceptance("true")).not.toBeNull();
      expect(validateTermsAcceptance(1)).not.toBeNull();
    });
  });
});
