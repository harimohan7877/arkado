import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminSession: vi.fn(),
}));
vi.mock("@/lib/store-data", () => ({
  getStoreData: vi.fn(),
  setStoreData: vi.fn(),
}));

import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData } from "@/lib/store-data";
import { GET } from "@/app/api/admin/featured/route";

const mockedVerify = vi.mocked(verifyAdminSession);
const mockedGet = vi.mocked(getStoreData);

// The backing column is shared with the orders backup: the stored object
// can carry an `orders` array with customer PII. The GET must never leak it.
const STORE_WITH_ORDERS = {
  featured_exams: [{ id: "1", name: "SSC" }],
  new_arrivals: [{ id: "2", name: "Railway" }],
  orders: [
    {
      order_id: "ARK-2026-TEST",
      name: "Test User",
      email: "t@example.com",
      phone: "9999999999",
      items: [{ drive_url: "https://drive.google.com/file/d/xxx" }],
    },
  ],
};

function makeReq() {
  return new NextRequest("http://localhost/api/admin/featured");
}

describe("GET /api/admin/featured (P0 #2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGet.mockResolvedValue(STORE_WITH_ORDERS as never);
  });

  it("returns 401 without an admin session and does not read the store", async () => {
    mockedVerify.mockResolvedValue(false);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("never returns the orders key, even when the store holds it", async () => {
    mockedVerify.mockResolvedValue(true);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["featured_exams", "new_arrivals"]);
    expect(body).not.toHaveProperty("orders");
    expect(JSON.stringify(body)).not.toContain("t@example.com");
    expect(body.featured_exams).toEqual(STORE_WITH_ORDERS.featured_exams);
    expect(body.new_arrivals).toEqual(STORE_WITH_ORDERS.new_arrivals);
  });

  it("falls back to empty lists when the stored fields are not arrays", async () => {
    mockedVerify.mockResolvedValue(true);
    mockedGet.mockResolvedValue({ featured_exams: "junk", new_arrivals: null } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ featured_exams: [], new_arrivals: [] });
  });
});
