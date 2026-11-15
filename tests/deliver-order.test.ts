import { describe, it, expect, vi } from "vitest";

// deliverOrder reads the catalog via getStoreData — mock it to an empty
// catalog so the tests run offline. The pure kit functions don't need it,
// but deliverOrder loads courses before its guards run.
vi.mock("@/lib/store-data", () => ({
  getStoreData: vi.fn(async () => []),
  setStoreData: vi.fn(async () => true),
}));

import {
  findMissingKitTitles,
  resolveDeliverableKits,
  deliverOrder,
} from "@/lib/deliver-order";

const baseOrder = {
  id: "ARK-2026-TEST0001",
  order_id: "ARK-2026-TEST0001",
  customer_name: "Test User",
  name: "Test User",
  customer_email: "test@example.com",
  email: "test@example.com",
  customer_phone: "9876543210",
  phone: "9876543210",
  amount: 199,
  course_id: "bundle-full",
  course_title: "Full Bundle",
  drive_url: "",
  delivery_mode: "both",
  payment_status: "paid",
  delivery_status: "pending_link",
  created_at: new Date().toISOString(),
};

const partialBundleOrder = {
  ...baseOrder,
  items: [
    {
      id: "bundle-full",
      title: "Full Bundle",
      price: 199,
      drive_url: "",
      bundle_items: [
        { id: "kit-a", title: "Kit A", drive_url: "https://drive.google.com/kit-a" },
        { id: "kit-b", title: "Kit B", drive_url: "" },
      ],
    },
  ],
};

const completeBundleOrder = {
  ...baseOrder,
  items: [
    {
      id: "bundle-full",
      title: "Full Bundle",
      price: 199,
      drive_url: "",
      bundle_items: [
        { id: "kit-a", title: "Kit A", drive_url: "https://drive.google.com/kit-a" },
        { id: "kit-b", title: "Kit B", drive_url: "https://drive.google.com/kit-b" },
      ],
    },
  ],
};

describe("findMissingKitTitles — partial-bundle detection", () => {
  it("lists bundle kits without a Drive link", () => {
    expect(findMissingKitTitles(partialBundleOrder as any, [])).toEqual(["Kit B"]);
  });

  it("returns [] when every kit has a link", () => {
    expect(findMissingKitTitles(completeBundleOrder as any, [])).toEqual([]);
  });

  it("lists a single kit without a link", () => {
    const single = {
      ...baseOrder,
      items: [{ id: "kit-a", title: "Kit A", price: 99, drive_url: "" }],
    };
    expect(findMissingKitTitles(single as any, [])).toEqual(["Kit A"]);
  });

  it("returns [] for orders without stored items (pre-migration)", () => {
    expect(findMissingKitTitles({ ...baseOrder, items: [] } as any, [])).toEqual([]);
    expect(findMissingKitTitles({ ...baseOrder, items: undefined } as any, [])).toEqual([]);
  });
});

describe("resolveDeliverableKits — admin-pasted link fills the gap", () => {
  it("returns only linked kits when no extra URL is given", () => {
    const kits = resolveDeliverableKits(partialBundleOrder as any, [], "");
    expect(kits).toHaveLength(1);
    expect(kits[0].title).toBe("Kit A");
  });

  it("adds a card for each missing kit from the pasted link", () => {
    const kits = resolveDeliverableKits(
      partialBundleOrder as any,
      [],
      "",
      "https://drive.google.com/pasted-link"
    );
    expect(kits).toHaveLength(2);
    expect(kits[1]).toEqual({ title: "Kit B", drive_url: "https://drive.google.com/pasted-link" });
  });

  it("adds no extra card when nothing is missing", () => {
    const kits = resolveDeliverableKits(
      completeBundleOrder as any,
      [],
      "",
      "https://drive.google.com/pasted-link"
    );
    expect(kits).toHaveLength(2);
  });
});

describe("deliverOrder — partial-bundle guard", () => {
  it("refuses a partial bundle without a pasted link (409, names the kit)", async () => {
    const r = await deliverOrder(partialBundleOrder as any);
    expect(r.ok).toBe(false);
    expect((r as { status?: number }).status).toBe(409);
    expect((r as { error?: string }).error).toMatch(/Kit B/);
  });

  it("accepts the same order once the admin pastes a link (passes the guard)", async () => {
    // No SMTP creds in the test env, so it stops at the SMTP check with
    // 500 — the point is the 409 guard did NOT trigger.
    const r = await deliverOrder(partialBundleOrder as any, {
      customDriveUrl: "https://drive.google.com/pasted-link",
    });
    expect(r.ok).toBe(false);
    expect((r as { status?: number }).status).toBe(500);
    expect((r as { error?: string }).error).toMatch(/SMTP/);
  });

  it("does not false-positive on a complete bundle", async () => {
    const r = await deliverOrder(completeBundleOrder as any);
    expect(r.ok).toBe(false);
    expect((r as { status?: number }).status).toBe(500);
    expect((r as { error?: string }).error).toMatch(/SMTP/);
  });
});
