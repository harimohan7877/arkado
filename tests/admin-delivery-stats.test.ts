import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ orders: [] as Record<string, unknown>[] }));
vi.mock("@/lib/admin-auth", () => ({ verifyAdminSession: async () => true }));
vi.mock("@/lib/store-data", () => ({
  getStoreData: async (key: string) => key === "orders" ? fixture.orders : [],
}));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        count: 0,
        gte: () => ({ limit: async () => ({ data: [] }) }),
      }),
    }),
    storage: { from: () => ({ list: async () => ({ data: [] }) }) },
  },
}));

import { GET } from "@/app/api/admin/stats/route";

describe("admin delivery alerts", () => {
  it("counts paid delivery work across both states before limiting the preview", async () => {
    fixture.orders = [
      ...Array.from({ length: 11 }, (_, i) => ({
        order_id: `test-${i}`, payment_status: "paid", delivery_status: "pending_link",
      })),
      { order_id: "processing", payment_status: "paid", delivery_status: "pending" },
      { order_id: "delivered", payment_status: "paid", delivery_status: "delivered" },
      { order_id: "unpaid", payment_status: "pending", delivery_status: "pending" },
    ];
    const response = await GET(new NextRequest("http://localhost/api/admin/stats"));
    const result = await response.json();

    expect(result.pendingDelivery).toBe(12);
    expect(result.alerts.undeliveredPaid.count).toBe(12);
    expect(result.alerts.undeliveredPaid.items).toHaveLength(10);
  });
});
