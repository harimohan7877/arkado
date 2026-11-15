import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the official PhonePe SDK — tests cover OUR logic (env defaults,
// paisa conversion, status mapping, callback wiring), not the SDK itself.
const { mockPay, mockGetOrderStatus, mockValidateCallback, mockRefund, mockGetInstance } =
  vi.hoisted(() => ({
    mockPay: vi.fn(),
    mockGetOrderStatus: vi.fn(),
    mockValidateCallback: vi.fn(),
    mockRefund: vi.fn(),
    mockGetInstance: vi.fn(),
  }));

vi.mock("@phonepe-pg/pg-sdk-node", () => {
  const builder = () => {
    const chain: Record<string, unknown> = {};
    for (const m of ["merchantOrderId", "amount", "redirectUrl", "merchantRefundId", "originalMerchantOrderId"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.build = vi.fn().mockReturnValue({});
    return chain;
  };
  return {
    Env: { SANDBOX: "SANDBOX", PRODUCTION: "PRODUCTION" },
    StandardCheckoutClient: { getInstance: mockGetInstance },
    StandardCheckoutPayRequest: { builder },
    RefundRequest: { builder },
  };
});

const ENV_KEYS = [
  "PHONEPE_CLIENT_ID",
  "PHONEPE_CLIENT_SECRET",
  "PHONEPE_ENV",
  "PHONEPE_WEBHOOK_USERNAME",
  "PHONEPE_WEBHOOK_PASSWORD",
  "NEXT_PUBLIC_SITE_URL",
  "SITE_URL",
] as const;

let savedEnv: Record<string, string | undefined> = {};

async function loadPhonePe() {
  vi.resetModules();
  return await import("@/lib/phonepe");
}

beforeEach(() => {
  savedEnv = {};
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  vi.clearAllMocks();
  mockGetInstance.mockReturnValue({
    pay: mockPay,
    getOrderStatus: mockGetOrderStatus,
    validateCallback: mockValidateCallback,
    refund: mockRefund,
  });
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("PhonePe helpers (lib/phonepe.ts)", () => {
  describe("getPhonePeEnv — defaults to SANDBOX so a misconfig never charges real money", () => {
    it("defaults to SANDBOX when unset", async () => {
      const m = await loadPhonePe();
      expect(m.getPhonePeEnv()).toBe("SANDBOX");
    });

    it("returns PRODUCTION only for PHONEPE_ENV=PRODUCTION (case-insensitive)", async () => {
      process.env.PHONEPE_ENV = "production";
      const m = await loadPhonePe();
      expect(m.getPhonePeEnv()).toBe("PRODUCTION");
    });

    it("returns SANDBOX for any other value", async () => {
      process.env.PHONEPE_ENV = "live";
      const m = await loadPhonePe();
      expect(m.getPhonePeEnv()).toBe("SANDBOX");
    });
  });

  describe("hasPhonePeKeys", () => {
    it("is false when either key is missing", async () => {
      const m = await loadPhonePe();
      expect(m.hasPhonePeKeys()).toBe(false);
      process.env.PHONEPE_CLIENT_ID = "id-only";
      expect(m.hasPhonePeKeys()).toBe(false);
    });

    it("is true when both keys are set", async () => {
      process.env.PHONEPE_CLIENT_ID = "test-id";
      process.env.PHONEPE_CLIENT_SECRET = "test-secret";
      const m = await loadPhonePe();
      expect(m.hasPhonePeKeys()).toBe(true);
    });
  });

  describe("getPhonePeClient — lazy singleton", () => {
    it("throws without keys", async () => {
      const m = await loadPhonePe();
      expect(() => m.getPhonePeClient()).toThrow(/not configured/);
    });

    it("calls getInstance once and reuses the client", async () => {
      process.env.PHONEPE_CLIENT_ID = "test-id";
      process.env.PHONEPE_CLIENT_SECRET = "test-secret";
      const m = await loadPhonePe();
      const c1 = m.getPhonePeClient();
      const c2 = m.getPhonePeClient();
      expect(c1).toBe(c2);
      expect(mockGetInstance).toHaveBeenCalledTimes(1);
      expect(mockGetInstance).toHaveBeenCalledWith("test-id", "test-secret", 1, "SANDBOX");
    });
  });

  describe("rupeesToPaisa", () => {
    it("converts ₹ to paisa and enforces the ₹1 minimum", async () => {
      const m = await loadPhonePe();
      expect(m.rupeesToPaisa(99)).toBe(9900);
      expect(m.rupeesToPaisa(89.99)).toBe(8999);
      expect(m.rupeesToPaisa(0.5)).toBe(100);
      expect(m.rupeesToPaisa(0)).toBe(100);
    });
  });

  describe("getSiteUrl", () => {
    it("defaults to the live site and strips a trailing slash", async () => {
      const m = await loadPhonePe();
      expect(m.getSiteUrl()).toBe("https://www.arkado.store");
      process.env.NEXT_PUBLIC_SITE_URL = "https://arkado.store/";
      expect(m.getSiteUrl()).toBe("https://arkado.store");
    });
  });

  describe("createPhonePePayment", () => {
    it("returns the hosted-page URL from the SDK", async () => {
      process.env.PHONEPE_CLIENT_ID = "test-id";
      process.env.PHONEPE_CLIENT_SECRET = "test-secret";
      mockPay.mockResolvedValue({
        redirectUrl: "https://pay.phonepe.com/hosted/abc",
        orderId: "PP-ORDER-1",
        state: "PENDING",
        expireAt: 1730000000,
      });
      const m = await loadPhonePe();
      const r = await m.createPhonePePayment("ARK-2026-ABCDEFGH", 99, "https://arkado.store/payment/success?orderId=ARK-2026-ABCDEFGH");
      expect(r.redirectUrl).toBe("https://pay.phonepe.com/hosted/abc");
      expect(r.orderId).toBe("PP-ORDER-1");
      expect(r.state).toBe("PENDING");
      expect(mockPay).toHaveBeenCalledTimes(1);
    });

    it("throws when PhonePe returns no payment page URL", async () => {
      process.env.PHONEPE_CLIENT_ID = "test-id";
      process.env.PHONEPE_CLIENT_SECRET = "test-secret";
      mockPay.mockResolvedValue({ redirectUrl: "", orderId: "PP-1", state: "PENDING", expireAt: 0 });
      const m = await loadPhonePe();
      await expect(
        m.createPhonePePayment("ARK-2026-ABCDEFGH", 99, "https://arkado.store/payment/success")
      ).rejects.toThrow(/did not return a payment page URL/);
    });
  });

  describe("getPhonePeOrderStatus — server-side truth", () => {
    it("maps COMPLETED and takes the transaction id of the latest attempt", async () => {
      process.env.PHONEPE_CLIENT_ID = "test-id";
      process.env.PHONEPE_CLIENT_SECRET = "test-secret";
      mockGetOrderStatus.mockResolvedValue({
        state: "COMPLETED",
        orderId: "PP-ORDER-1",
        merchantOrderId: "ARK-2026-ABCDEFGH",
        amount: 9900,
        paymentDetails: [
          { transactionId: "TXN-OLD", paymentMode: "UPI" },
          { transactionId: "TXN-NEW", paymentMode: "CARD" },
        ],
      });
      const m = await loadPhonePe();
      const s = await m.getPhonePeOrderStatus("ARK-2026-ABCDEFGH");
      expect(s.state).toBe("COMPLETED");
      expect(s.transactionId).toBe("TXN-NEW");
      expect(s.paymentMode).toBe("CARD");
      expect(s.amount).toBe(9900);
    });

    it("handles orders with no payment attempts yet", async () => {
      process.env.PHONEPE_CLIENT_ID = "test-id";
      process.env.PHONEPE_CLIENT_SECRET = "test-secret";
      mockGetOrderStatus.mockResolvedValue({
        state: "PENDING",
        orderId: "PP-ORDER-1",
        merchantOrderId: "ARK-2026-ABCDEFGH",
        amount: 9900,
        paymentDetails: [],
      });
      const m = await loadPhonePe();
      const s = await m.getPhonePeOrderStatus("ARK-2026-ABCDEFGH");
      expect(s.state).toBe("PENDING");
      expect(s.transactionId).toBeUndefined();
    });
  });

  describe("validatePhonePeCallback", () => {
    it("throws when webhook credentials are not configured", async () => {
      process.env.PHONEPE_CLIENT_ID = "test-id";
      process.env.PHONEPE_CLIENT_SECRET = "test-secret";
      const m = await loadPhonePe();
      expect(() => m.validatePhonePeCallback("Basic abc", "{}")).toThrow(/webhook credentials/);
    });

    it("delegates to the SDK with the configured username/password", async () => {
      process.env.PHONEPE_CLIENT_ID = "test-id";
      process.env.PHONEPE_CLIENT_SECRET = "test-secret";
      process.env.PHONEPE_WEBHOOK_USERNAME = "hook-user";
      process.env.PHONEPE_WEBHOOK_PASSWORD = "hook-pass";
      mockValidateCallback.mockReturnValue({ type: 6, payload: { state: "COMPLETED" } });
      const m = await loadPhonePe();
      const r = m.validatePhonePeCallback("Basic abc", '{"x":1}');
      expect(mockValidateCallback).toHaveBeenCalledWith("hook-user", "hook-pass", "Basic abc", '{"x":1}');
      expect(r.payload.state).toBe("COMPLETED");
    });
  });
});
