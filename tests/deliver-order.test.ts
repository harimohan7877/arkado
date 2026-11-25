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
  isRealDriveLink,
  type NormalizedOrder,
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

describe("isRealDriveLink — bare Drive homepage is not a link", () => {
  it("rejects the bare homepage placeholder (and empty values)", () => {
    expect(isRealDriveLink("https://drive.google.com")).toBe(false);
    expect(isRealDriveLink("https://drive.google.com/")).toBe(false);
    expect(isRealDriveLink("https://drive.google.com?usp=sharing")).toBe(false);
    expect(isRealDriveLink("http://drive.google.com")).toBe(false);
    expect(isRealDriveLink("")).toBe(false);
    expect(isRealDriveLink(undefined)).toBe(false);
    expect(isRealDriveLink(null)).toBe(false);
  });

  it("accepts real file/folder links", () => {
    expect(isRealDriveLink("https://drive.google.com/file/d/ABC123/view")).toBe(true);
    expect(isRealDriveLink("https://drive.google.com/drive/folders/ABC123")).toBe(true);
    expect(isRealDriveLink("https://drive.google.com/open?id=ABC123")).toBe(true);
    expect(isRealDriveLink("https://drive.google.com/kit-a")).toBe(true);
  });
});

describe("placeholder drive_url counts as missing (Fix A)", () => {
  const placeholderBundleOrder: NormalizedOrder = {
    ...baseOrder,
    items: [
      {
        id: "bundle-full",
        title: "Full Bundle",
        price: 199,
        drive_url: "",
        bundle_items: [
          { id: "kit-a", title: "Kit A", drive_url: "https://drive.google.com" },
          {
            id: "kit-b",
            title: "Kit B",
            drive_url: "https://drive.google.com/file/d/REAL/view",
          },
        ],
      },
    ],
  };

  it("findMissingKitTitles lists the placeholder kit", () => {
    expect(findMissingKitTitles(placeholderBundleOrder, [])).toEqual(["Kit A"]);
  });

  it("resolveDeliverableKits drops the placeholder card", () => {
    const kits = resolveDeliverableKits(placeholderBundleOrder, [], "");
    expect(kits).toHaveLength(1);
    expect(kits[0].title).toBe("Kit B");
  });

  it("deliverOrder refuses the placeholder bundle (409, names the kit)", async () => {
    const r = await deliverOrder(placeholderBundleOrder);
    expect(r.ok).toBe(false);
    expect((r as { status?: number }).status).toBe(409);
    expect((r as { error?: string }).error).toMatch(/Kit A/);
  });

  it("a single kit with only the placeholder is missing", () => {
    const single: NormalizedOrder = {
      ...baseOrder,
      items: [{ id: "kit-a", title: "Kit A", price: 99, drive_url: "https://drive.google.com" }],
    };
    expect(findMissingKitTitles(single, [])).toEqual(["Kit A"]);
    expect(resolveDeliverableKits(single, [], "")).toHaveLength(0);
  });
});
