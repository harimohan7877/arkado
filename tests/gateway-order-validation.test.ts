import { describe, it, expect, vi, beforeEach } from "vitest";

// validateGatewayOrder must apply the SAME pricing law as POST /api/orders
// (sale % + bundle discount from lib/sale-pricing.ts). These tests pin that:
// the old path charged raw catalog prices and would have overcharged during
// a sale. getStoreData is mocked to return canned settings + catalog.
const { mockData } = vi.hoisted(() => ({
  mockData: {
    settings: {} as any,
    courses: [] as any[],
  },
}));

vi.mock("@/lib/store-data", () => ({
  getStoreData: async (key: string) => {
    if (key === "settings") return mockData.settings;
    if (key === "courses") return mockData.courses;
    return [];
  },
  setStoreData: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: () => ({}) },
}));

import { validateGatewayOrder } from "@/lib/payment-gateway";

const SALE_OFF = {
  homepage: { festival_offer: { enabled: false, discount_percent: 0 } },
  bundle_card: { discount_percent: 5 },
};

const SALE_20 = {
  homepage: {
    festival_offer: { enabled: true, discount_percent: 20, sale_ends_at: "" },
  },
  bundle_card: { discount_percent: 5 },
};

const COURSES = [
  { id: "c1", slug: "c1", price: 99, title: "Course One", drive_url: "https://drive/x1" },
  { id: "k1", slug: "k1", price: 100, title: "Kit One", drive_url: "https://drive/k1" },
  { id: "k2", slug: "k2", price: 100, title: "Kit Two", drive_url: "https://drive/k2" },
];

describe("validateGatewayOrder (gateway pricing = /api/orders pricing)", () => {
  beforeEach(() => {
    mockData.settings = SALE_OFF;
    mockData.courses = COURSES;
  });

  it("charges the catalog price when no sale is running", async () => {
    const r = await validateGatewayOrder([{ productId: "c1" }], 99);
    expect(r.isValid).toBe(true);
    expect(r.totalAmount).toBe(99);
    expect(r.items[0].price).toBe(99);
  });

  it("applies the sale % — a 20% sale turns Rs.99 into Rs.79", async () => {
    mockData.settings = SALE_20;
    const r = await validateGatewayOrder([{ productId: "c1" }], 79);
    expect(r.isValid).toBe(true);
    expect(r.totalAmount).toBe(79);
    expect(r.items[0].price).toBe(79);
  });

  it("rejects when the client total is the pre-sale price during a sale", async () => {
    mockData.settings = SALE_20;
    const r = await validateGatewayOrder([{ productId: "c1" }], 99);
    expect(r.isValid).toBe(false);
  });

  it("recomputes bundles from kits (Rs.100 + Rs.100, 5% off = Rs.190)", async () => {
    const r = await validateGatewayOrder(
      [{ productId: "bundle-exam-test", bundle_items: ["k1", "k2"] }],
      190
    );
    expect(r.isValid).toBe(true);
    expect(r.totalAmount).toBe(190);
    expect(r.items[0].price).toBe(190);
    expect(r.items[0].bundle_items).toHaveLength(2);
    expect(r.items[0].bundle_items?.[0].drive_url).toBe("https://drive/k1");
  });

  it("rejects a bundle priced without the bundle discount", async () => {
    const r = await validateGatewayOrder(
      [{ productId: "bundle-exam-test", bundle_items: ["k1", "k2"] }],
      200
    );
    expect(r.isValid).toBe(false);
  });

  it("rejects a bundle with no kit ids", async () => {
    const r = await validateGatewayOrder([{ productId: "bundle-exam-test" }], 190);
    expect(r.isValid).toBe(false);
  });

  it("rejects an unknown product", async () => {
    const r = await validateGatewayOrder([{ productId: "nope" }], 99);
    expect(r.isValid).toBe(false);
  });

  it("rejects an empty cart", async () => {
    const r = await validateGatewayOrder([], 0);
    expect(r.isValid).toBe(false);
  });
});
