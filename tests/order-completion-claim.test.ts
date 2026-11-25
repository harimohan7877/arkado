import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NormalizedOrder, DeliveryResult } from "@/lib/deliver-order";

/**
 * Atomic delivery claim (Fix B) — the webhook and the status check can
 * run completePhonePeOrder concurrently. The conditional Supabase update
 * in claimDelivery is the single atomic step: exactly one runner's
 * update matches rows, the loser gets zero rows and must send nothing.
 *
 * The fake Supabase client below simulates PostgREST conditional-update
 * atomicity in memory: the first claim wins, later claims match zero
 * rows, and later order reads see delivery_status 'delivered'.
 */

// ---- Types for the fake Supabase client ----
type QueryResult = { data: unknown; error: { message: string } | null };

interface FakeUpdateChain {
  or: () => FakeUpdateChain;
  neq: () => { select: () => Promise<QueryResult> };
  then: (resolve: (value: unknown) => void) => void;
}

interface FakeSupabaseClient {
  from: (table: string) => {
    select: () => { eq: () => Promise<QueryResult> };
    update: () => FakeUpdateChain;
  };
}

// ---- Hoisted fakes (vi.mock factories run before imports) ----
const { db, makeFakeSupabase, deliverOrderMock, sendPendingLinkEmailMock } =
  vi.hoisted(() => {
    function makeFakeSupabase(opts: {
      orderRows: Array<Record<string, unknown>>;
      claimError?: string;
    }): { client: FakeSupabaseClient } {
      let claimed = false;
      let delivered = false;
      const query = {
        select: () => ({
          eq: async (): Promise<QueryResult> => ({
            data: opts.orderRows.map((r) => ({
              ...r,
              delivery_status: delivered ? "delivered" : r.delivery_status,
            })),
            error: null,
          }),
        }),
        update: (): FakeUpdateChain => {
          const chain: FakeUpdateChain = {
            or: () => chain,
            neq: () => ({
              select: async (): Promise<QueryResult> => {
                if (opts.claimError)
                  return { data: null, error: { message: opts.claimError } };
                if (claimed) return { data: [], error: null };
                claimed = true;
                delivered = true;
                return {
                  data: [{ razorpay_order_id: opts.orderRows[0]?.razorpay_order_id }],
                  error: null,
                };
              },
            }),
            // Thenable so `await .update().or()` resolves (syncOrderState path).
            then: (resolve: (value: unknown) => void) =>
              resolve({ data: [], error: null }),
          };
          return chain;
        },
      };
      return { client: { from: () => query } };
    }
    const db = { fake: makeFakeSupabase({ orderRows: [] }) };
    return {
      db,
      makeFakeSupabase,
      deliverOrderMock: vi.fn(),
      sendPendingLinkEmailMock: vi.fn(),
    };
  });

vi.mock("@/lib/supabase", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/supabase")>();
  return {
    ...orig,
    supabaseAdmin: {
      from: (table: string) => db.fake.client.from(table),
    } as unknown as typeof orig.supabaseAdmin,
  };
});

const kitUrl = "https://drive.google.com/file/d/REAL123/view";
const orderId = "ARK-2026-TEST0001";

const courses = [
  { id: "kit-a", slug: "kit-a", title: "Kit A", drive_url: kitUrl, is_active: true },
];

const orderRow: Record<string, unknown> = {
  razorpay_order_id: orderId,
  id: orderId,
  customer_name: "Test User",
  customer_email: "test@example.com",
  customer_phone: "9876543210",
  product_id: "kit-a",
  course_title: "Kit A",
  amount: 99,
  drive_url: "",
  items: [{ id: "kit-a", title: "Kit A", price: 99, drive_url: kitUrl }],
  delivery_mode: "both",
  payment_status: "pending",
  delivery_status: "pending",
  created_at: new Date().toISOString(),
};

vi.mock("@/lib/store-data", () => ({
  getStoreData: vi.fn(async (key: string) => (key === "courses" ? courses : [])),
  setStoreData: vi.fn(async () => true),
}));

vi.mock("@/lib/phonepe", () => ({
  getPhonePeOrderStatus: vi.fn(async () => ({
    state: "COMPLETED",
    transactionId: "TXN123",
  })),
}));

vi.mock("@/lib/notify", () => ({
  notifyAdminNewOrder: vi.fn(async () => undefined),
}));

vi.mock("@/lib/deliver-order", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/deliver-order")>();
  return {
    ...orig,
    deliverOrder: deliverOrderMock as unknown as typeof orig.deliverOrder,
    sendPendingLinkEmail:
      sendPendingLinkEmailMock as unknown as typeof orig.sendPendingLinkEmail,
  };
});

import { completePhonePeOrder, claimDelivery } from "@/lib/order-completion";

type SupabaseClientType = Parameters<typeof claimDelivery>[2];
const asSupabaseClient = (c: FakeSupabaseClient): SupabaseClientType =>
  c as unknown as SupabaseClientType;

describe("claimDelivery — unit", () => {
  function claimClient(result: QueryResult): FakeSupabaseClient {
    return {
      from: () => ({
        select: () => ({
          eq: async (): Promise<QueryResult> => ({ data: [], error: null }),
        }),
        update: (): FakeUpdateChain => {
          const chain: FakeUpdateChain = {
            or: () => chain,
            neq: () => ({ select: async (): Promise<QueryResult> => result }),
            then: (resolve: (value: unknown) => void) =>
              resolve({ data: [], error: null }),
          };
          return chain;
        },
      }),
    };
  }

  it("claims when rows match", async () => {
    const client = claimClient({
      data: [{ razorpay_order_id: orderId }],
      error: null,
    });
    await expect(
      claimDelivery(orderId, true, asSupabaseClient(client))
    ).resolves.toEqual({
      claimed: true,
      alreadyDelivered: false,
    });
  });

  it("loses when zero rows match (already delivered)", async () => {
    const client = claimClient({ data: [], error: null });
    await expect(
      claimDelivery(orderId, true, asSupabaseClient(client))
    ).resolves.toEqual({
      claimed: false,
      alreadyDelivered: true,
    });
  });

  it("surfaces a DB error instead of claiming", async () => {
    const client = claimClient({ data: null, error: { message: "db down" } });
    await expect(
      claimDelivery(orderId, true, asSupabaseClient(client))
    ).resolves.toEqual({
      claimed: false,
      alreadyDelivered: false,
      error: "db down",
    });
  });

  it("skips Supabase entirely for a JSON-only order", async () => {
    const throwing: FakeSupabaseClient = {
      from: () => {
        throw new Error("must not touch Supabase");
      },
    };
    await expect(
      claimDelivery(orderId, false, asSupabaseClient(throwing))
    ).resolves.toEqual({
      claimed: true,
      alreadyDelivered: false,
    });
  });
});

describe("completePhonePeOrder — concurrent webhook + status check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deliverOrderMock.mockImplementation(
      async (order: NormalizedOrder): Promise<DeliveryResult> => ({
        ok: true,
        messageId: "test-msg-1",
        kits: [{ title: "Kit A", drive_url: kitUrl }],
        order,
        alreadyDelivered: false,
      })
    );
    sendPendingLinkEmailMock.mockImplementation(async () => ({
      ok: true,
      messageId: "test-msg-2",
    }));
  });

  it("two concurrent completions email exactly once", async () => {
    db.fake = makeFakeSupabase({ orderRows: [orderRow] });
    const [r1, r2] = await Promise.all([
      completePhonePeOrder(orderId),
      completePhonePeOrder(orderId),
    ]);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r1.state).toBe("COMPLETED");
    expect(r2.state).toBe("COMPLETED");
    expect(deliverOrderMock).toHaveBeenCalledTimes(1);
    expect(sendPendingLinkEmailMock).not.toHaveBeenCalled();
  });

  it("claim DB error returns UNKNOWN and sends nothing", async () => {
    db.fake = makeFakeSupabase({ orderRows: [orderRow], claimError: "db down" });
    const r = await completePhonePeOrder(orderId);
    expect(r.ok).toBe(false);
    expect(r.state).toBe("UNKNOWN");
    expect(deliverOrderMock).not.toHaveBeenCalled();
    expect(sendPendingLinkEmailMock).not.toHaveBeenCalled();
  });
});
