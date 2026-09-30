import { describe, it, expect } from "vitest";
import { notifyAdminNewOrder } from "@/lib/notify";

describe("Admin notify helper", () => {
  it("returns false (never throws) when SMTP is not configured", async () => {
    const savedUser = process.env.SMTP_USER;
    const savedPass = process.env.SMTP_PASS;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    try {
      const ok = await notifyAdminNewOrder({
        order_id: "ARK-2026-TEST",
        name: "Test User",
        email: "test@example.com",
        phone: "9999999999",
        course_title: "Test Course",
        amount: 99,
        delivery_mode: "both",
        utr: "123456789012",
      });
      expect(ok).toBe(false);
    } finally {
      if (savedUser !== undefined) process.env.SMTP_USER = savedUser;
      if (savedPass !== undefined) process.env.SMTP_PASS = savedPass;
    }
  });
});
