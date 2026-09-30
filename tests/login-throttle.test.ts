import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Force the in-memory fallback path: no Supabase env in this test process.
const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const savedAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let checkLoginThrottle: typeof import("@/lib/login-throttle").checkLoginThrottle;
let recordFailedLogin: typeof import("@/lib/login-throttle").recordFailedLogin;
let clearLoginAttempts: typeof import("@/lib/login-throttle").clearLoginAttempts;

beforeAll(async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const mod = await import("@/lib/login-throttle");
  checkLoginThrottle = mod.checkLoginThrottle;
  recordFailedLogin = mod.recordFailedLogin;
  clearLoginAttempts = mod.clearLoginAttempts;
});

afterAll(() => {
  if (savedUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
  if (savedAnon !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedAnon;
});

describe("Login throttling (in-memory fallback)", () => {
  const ip = "192.0.2.99-login-throttle-test";

  it("starts unlocked for a fresh IP", async () => {
    await clearLoginAttempts(ip);
    const status = await checkLoginThrottle(ip);
    expect(status.locked).toBe(false);
  });

  it("locks the IP after 5 failed attempts", async () => {
    await clearLoginAttempts(ip);
    for (let i = 0; i < 5; i++) {
      await recordFailedLogin(ip);
      expect((await checkLoginThrottle(ip)).locked).toBe(i >= 4 ? true : false);
    }
    const status = await checkLoginThrottle(ip);
    expect(status.locked).toBe(true);
    expect(status.remainingMinutes).toBeGreaterThan(0);
    expect(status.remainingMinutes).toBeLessThanOrEqual(15);
  });

  it("unlocks after clearing attempts (successful login)", async () => {
    await clearLoginAttempts(ip);
    const status = await checkLoginThrottle(ip);
    expect(status.locked).toBe(false);
  });

  it("never throws when Supabase is unavailable", async () => {
    await expect(checkLoginThrottle("192.0.2.100")).resolves.toBeDefined();
    await expect(recordFailedLogin("192.0.2.100")).resolves.toBeUndefined();
    await expect(clearLoginAttempts("192.0.2.100")).resolves.toBeUndefined();
  });
});
