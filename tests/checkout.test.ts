import { describe, it, expect, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/default-settings";
import { applySale, getSalePct } from "@/lib/sale-pricing";

// Mock the data layer so pricing tests run against a fixed catalog.
const mockCourses = [
  { id: "kit-a", slug: "kit-a", title: "Kit A", price: 100, drive_url: "https://drive.google.com/kit-a" },
  { id: "kit-b", slug: "kit-b", title: "Kit B", price: 100, drive_url: "https://drive.google.com/kit-b" },
  { id: "kit-c", slug: "kit-c", title: "Kit C", price: 89, drive_url: "" },
];
const mockSettings = {
  ...DEFAULT_SETTINGS,
  bundle_card: { discount_percent: 5 },
};

vi.mock("@/lib/store-data", () => ({
  getStoreData: vi.fn(async (key: string, _path: string, fallback: unknown) => {
    if (key === "courses") return mockCourses;
    if (key === "settings") return mockSettings;
    return fallback;
  }),
  setStoreData: vi.fn(async () => true),
}));

import {
  sanitizeInput,
  canTransitionOrderStatus,
  generateOrderId,
  validateStatusTransitions,
  validateTermsAcceptance,
  validateCheckoutOrder,
  validateOrderPrices,
  insertMarketplaceOrderWithColumnFallback,
} from "@/lib/checkout";

describe("Checkout helpers (PhonePe migration)", () => {
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
      expect(canTransitionOrderStatus("pending", "delivered")).toBe(true);
      expect(canTransitionOrderStatus("pending", "cancelled")).toBe(true);
      expect(canTransitionOrderStatus("pending", "failed")).toBe(true);
      expect(canTransitionOrderStatus("paid", "delivered")).toBe(true);
      expect(canTransitionOrderStatus("paid", "refunded")).toBe(true);
      expect(canTransitionOrderStatus("delivered", "refunded")).toBe(true);
      expect(canTransitionOrderStatus("failed", "pending")).toBe(true);
    });

    it("should allow the pending_link (paid, link not ready) flow", () => {
      expect(canTransitionOrderStatus("pending", "pending_link")).toBe(true);
      expect(canTransitionOrderStatus("paid", "pending_link")).toBe(true);
      expect(canTransitionOrderStatus("pending_link", "delivered")).toBe(true);
      expect(canTransitionOrderStatus("pending_link", "refunded")).toBe(true);
    });

    it("should reject illegal status regressions", () => {
      expect(canTransitionOrderStatus("cancelled", "paid")).toBe(false);
      expect(canTransitionOrderStatus("refunded", "delivered")).toBe(false);
      expect(canTransitionOrderStatus("delivered", "pending")).toBe(false);
      expect(canTransitionOrderStatus("delivered", "pending_link")).toBe(false);
      expect(canTransitionOrderStatus("pending_link", "paid")).toBe(false);
      expect(canTransitionOrderStatus("pending_link", "pending")).toBe(false);
      expect(canTransitionOrderStatus("unknown_status", "paid")).toBe(false);
    });
  });

  describe("generateOrderId (collision-resistant IDs)", () => {
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

  describe("validateStatusTransitions (state machine enforcement)", () => {
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
      // Paid order whose link is pending: paid -> pending_link
      expect(
        validateStatusTransitions(
          { payment_status: "paid", delivery_status: "pending" },
          { payment_status: "paid", delivery_status: "pending_link" }
        )
      ).toBeNull();
      // Send link: pending_link -> delivered
      expect(
        validateStatusTransitions(
          { payment_status: "paid", delivery_status: "pending_link" },
          { payment_status: "paid", delivery_status: "delivered" }
        )
      ).toBeNull();
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

  describe("validateCheckoutOrder (server-side pricing law)", () => {
    const salePct = getSalePct(mockSettings);
    const kitPrice = applySale(100, salePct);
    // Bundle of kit-a + kit-b: sum of sale-adjusted kit prices, minus 5% bundle discount.
    const expectedBundlePrice = Math.max(1, Math.round(kitPrice * 2 * 0.95));

    it("should validate a single kit at its sale-adjusted price", async () => {
      const r = await validateCheckoutOrder([{ productId: "kit-a" }], kitPrice);
      expect(r.isValid).toBe(true);
      expect(r.totalAmount).toBe(kitPrice);
      expect(r.items[0].id).toBe("kit-a");
      expect(r.items[0].drive_url).toBe("https://drive.google.com/kit-a");
    });

    it("should price a bundle from its kits minus the bundle discount", async () => {
      const r = await validateCheckoutOrder(
        [{ productId: "bundle-full", title: "Full Bundle", bundle_items: ["kit-a", "kit-b"] }],
        expectedBundlePrice
      );
      expect(r.isValid).toBe(true);
      expect(r.totalAmount).toBe(expectedBundlePrice);
      expect(r.items[0].bundle_items?.map((k) => k.id)).toEqual(["kit-a", "kit-b"]);
    });

    it("should reject a tampered client total (beyond ±₹2)", async () => {
      const r = await validateCheckoutOrder([{ productId: "kit-a" }], 1);
      expect(r.isValid).toBe(false);
      expect(r.error).toMatch(/Price verification failed/);
    });

    it("should reject an unknown product", async () => {
      const r = await validateCheckoutOrder([{ productId: "no-such-kit" }], 99);
      expect(r.isValid).toBe(false);
      expect(r.error).toMatch(/not found/);
    });

    it("should reject a bundle with no verifiable kits", async () => {
      const r = await validateCheckoutOrder(
        [{ productId: "bundle-full", bundle_items: ["no-such-kit"] }],
        99
      );
      expect(r.isValid).toBe(false);
      expect(r.error).toMatch(/could not be verified/);
    });

    it("should reject empty items", async () => {
      const r = await validateCheckoutOrder([], 0);
      expect(r.isValid).toBe(false);
    });
  });

  describe("validateOrderPrices (raw catalog prices, tamper flag)", () => {
    it("should return raw prices and flag a tampered total", async () => {
      const r = await validateOrderPrices([{ productId: "kit-c" }], 1);
      expect(r.isValid).toBe(true);
      expect(r.totalAmount).toBe(89);
      expect(r.tamperingDetected).toBe(true);
    });

    it("should not flag a matching total", async () => {
      const r = await validateOrderPrices([{ productId: "kit-c" }], 89);
      expect(r.isValid).toBe(true);
      expect(r.tamperingDetected).toBe(false);
    });
  });
});

describe("insertMarketplaceOrderWithColumnFallback", () => {
  /** Fake PostgREST insert: fails naming the first missing column in payload order. */
  function makeFakeInsert(missing: Set<string>) {
    return async (row: Record<string, any>) => {
      const firstMissing = Object.keys(row).find((k) => missing.has(k));
      if (!firstMissing) return { error: null };
      return {
        error: {
          message: `Could not find the '${firstMissing}' column of 'marketplace_orders' in the schema cache`,
        },
      };
    };
  }

  const fullPayload = () => ({
    customer_name: "Test",
    customer_email: "t@example.com",
    product_id: "kit-a",
    course_title: "Kit A",
    drive_url: "https://drive.example/x",
    amount: 49,
    terms_accepted: true,
    terms_accepted_at: "2026-11-19T00:00:00.000Z",
    terms_version: "v1",
    visitor_id: "v1",
    session_id: "s1",
    utm_source: "ig",
    items: [{ id: "kit-a" }],
    user_id: "u1",
  });

  it("strips both groups when course_title and terms are missing (the reported bug)", async () => {
    const missing = new Set([
      "course_title",
      "terms_accepted",
      "terms_accepted_at",
      "terms_version",
    ]);
    const res = await insertMarketplaceOrderWithColumnFallback(
      makeFakeInsert(missing),
      fullPayload()
    );
    expect(res.error).toBeNull();
    expect(res.strippedGroups).toEqual(["course_title/drive_url", "terms"]);
    expect(res.payload).not.toHaveProperty("course_title");
    expect(res.payload).not.toHaveProperty("drive_url");
    expect(res.payload).not.toHaveProperty("terms_accepted");
    expect(res.payload).toHaveProperty("items");
    expect(res.payload).toHaveProperty("user_id");
  });

  it("strips terms when only terms_version is missing", async () => {
    const res = await insertMarketplaceOrderWithColumnFallback(
      makeFakeInsert(new Set(["terms_version"])),
      fullPayload()
    );
    expect(res.error).toBeNull();
    expect(res.strippedGroups).toEqual(["terms"]);
  });

  it("succeeds immediately when nothing is missing", async () => {
    const res = await insertMarketplaceOrderWithColumnFallback(
      makeFakeInsert(new Set()),
      fullPayload()
    );
    expect(res.error).toBeNull();
    expect(res.strippedGroups).toEqual([]);
    expect(Object.keys(res.payload)).toEqual(Object.keys(fullPayload()));
  });

  it("stops on an unmapped column error instead of looping forever", async () => {
    const res = await insertMarketplaceOrderWithColumnFallback(
      makeFakeInsert(new Set(["customer_name"])),
      fullPayload()
    );
    expect(res.error).not.toBeNull();
    expect(res.error?.message).toContain("customer_name");
    expect(res.strippedGroups).toEqual([]);
  });

  it("strips groups in any order (user_id + items)", async () => {
    const res = await insertMarketplaceOrderWithColumnFallback(
      makeFakeInsert(new Set(["user_id", "items"])),
      fullPayload()
    );
    expect(res.error).toBeNull();
    expect(res.strippedGroups).toEqual(["items", "user_id"]);
    expect(res.payload).not.toHaveProperty("items");
    expect(res.payload).not.toHaveProperty("user_id");
  });
});
