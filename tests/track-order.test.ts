import { describe, it, expect } from "vitest";
import { normPhone, toSafeOrder, phaseOf, stepIndex, orderPhoneCandidates, orderPhoneMatches } from "@/lib/track-order";

describe("normPhone", () => {
  it("strips +91 prefix and spaces", () => {
    expect(normPhone("+91 98765 43210")).toBe("9876543210");
  });
  it("strips leading 0", () => {
    expect(normPhone("09876543210")).toBe("9876543210");
  });
  it("keeps plain 10-digit numbers", () => {
    expect(normPhone("9876543210")).toBe("9876543210");
  });
  it("handles dashes", () => {
    expect(normPhone("98765-43210")).toBe("9876543210");
  });
  it("returns short input as-is (validation happens at the API)", () => {
    expect(normPhone("123")).toBe("123");
  });
  it("handles empty input", () => {
    expect(normPhone("")).toBe("");
  });
});

describe("toSafeOrder — no sensitive fields leak", () => {
  const fullOrder = {
    id: "ARK-2026-ABCD1234",
    order_id: "ARK-2026-ABCD1234",
    name: "Ramesh Kumar",
    customer_name: "Ramesh Kumar",
    phone: "9876543210",
    customer_phone: "9876543210",
    email: "ramesh@example.com",
    customer_email: "ramesh@example.com",
    course_id: "c1",
    course_title: "SSC MTS Maths 1000 MCQ",
    amount: 99,
    drive_url: "https://drive.google.com/secret-link",
    utr: "123456789012",
    payment_status: "pending",
    delivery_status: "pending",
    created_at: "2026-10-05T10:00:00.000Z",
  };

  it("exposes only the safe subset", () => {
    const safe = toSafeOrder(fullOrder);
    expect(safe).toEqual({
      order_id: "ARK-2026-ABCD1234",
      course_title: "SSC MTS Maths 1000 MCQ",
      amount: 99,
      payment_status: "pending",
      delivery_status: "pending",
      created_at: "2026-10-05T10:00:00.000Z",
    });
  });

  it("never includes drive_url, utr, email, phone or name", () => {
    const safe = toSafeOrder(fullOrder)!;
    const keys = Object.keys(safe);
    for (const forbidden of ["drive_url", "utr", "email", "customer_email", "phone", "customer_phone", "name", "customer_name"]) {
      expect(keys).not.toContain(forbidden);
    }
    expect(JSON.stringify(safe)).not.toContain("drive.google.com");
    expect(JSON.stringify(safe)).not.toContain("123456789012");
  });

  it("returns null for invalid input", () => {
    expect(toSafeOrder(null as any)).toBeNull();
    expect(toSafeOrder({})).toBeNull();
  });

  it("falls back to legacy field names", () => {
    const safe = toSafeOrder({ id: "X1", exam_name: "Old Title", amount: "50" });
    expect(safe?.order_id).toBe("X1");
    expect(safe?.course_title).toBe("Old Title");
    expect(safe?.amount).toBe(50);
  });
});

describe("orderPhoneCandidates / orderPhoneMatches", () => {
  it("matches phone embedded in customer_name like 'Name (9876543210)'", () => {
    const order = { customer_name: "Pooja Sharma (9988776655)", phone: "", customer_phone: "" };
    expect(orderPhoneMatches(order, "9988776655")).toBe(true);
    expect(orderPhoneMatches(order, "+91 99887 76655")).toBe(true);
    expect(orderPhoneMatches(order, "9876543210")).toBe(false);
  });
  it("matches plain phone fields", () => {
    const order = { phone: "9876543210" };
    expect(orderPhoneMatches(order, "9876543210")).toBe(true);
    expect(orderPhoneMatches(order, "9111111111")).toBe(false);
  });
  it("rejects short input", () => {
    expect(orderPhoneMatches({ phone: "9876543210" }, "123")).toBe(false);
  });
  it("returns empty candidates when nothing present", () => {
    expect(orderPhoneCandidates({})).toEqual([]);
  });
});

describe("phaseOf", () => {
  const base = { order_id: "X", course_title: "C", amount: 1, created_at: "" };
  it("maps pending payment to verifying", () => {
    expect(phaseOf({ ...base, payment_status: "pending", delivery_status: "pending" })).toBe("verifying");
  });
  it("maps paid + pending delivery to approved", () => {
    expect(phaseOf({ ...base, payment_status: "paid", delivery_status: "pending" })).toBe("approved");
  });
  it("maps paid + delivered to delivered", () => {
    expect(phaseOf({ ...base, payment_status: "paid", delivery_status: "delivered" })).toBe("delivered");
  });
  it("maps failed payment to failed", () => {
    expect(phaseOf({ ...base, payment_status: "failed", delivery_status: "pending" })).toBe("failed");
  });
});

describe("stepIndex", () => {
  it("maps phases to timeline positions", () => {
    expect(stepIndex("verifying")).toBe(1);
    expect(stepIndex("approved")).toBe(2);
    expect(stepIndex("delivered")).toBe(3);
    expect(stepIndex("failed")).toBe(-1);
  });
});
