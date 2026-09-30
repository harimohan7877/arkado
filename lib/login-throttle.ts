/**
 * Login brute-force throttling with persistent storage.
 *
 * The old in-memory Map lived per serverless instance, so on Vercel the
 * lockout could be bypassed by hitting a fresh instance. Attempts are now
 * recorded in the Supabase `admin_login_attempts` table (see
 * supabase-migrations/20260930_admin_login_attempts.sql), shared across all
 * instances.
 *
 * FAIL-SAFE CONTRACT: throttling must NEVER break login. If Supabase is
 * unreachable, misconfigured, or the migration hasn't been run yet, we fall
 * back to a per-instance in-memory map (same strength as the old code).
 * Every function catches its own errors.
 */

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

interface MemoryRecord {
  count: number;
  firstAttempt: number;
}

// Per-instance fallback when Supabase is unavailable.
const memoryAttempts = new Map<string, MemoryRecord>();

let warnedMissingTable = false;
function warnFallback(reason: string) {
  if (!warnedMissingTable) {
    warnedMissingTable = true;
    console.warn(
      `[login-throttle] Using in-memory fallback (${reason}). ` +
        `Run supabase-migrations/20260930_admin_login_attempts.sql for persistent throttling.`
    );
  }
}

async function getSupabaseAdmin() {
  try {
    // Dynamic import: lib/supabase throws at import time when env vars are
    // missing — we must not let that break the login route.
    const mod = await import("@/lib/supabase");
    return mod.supabaseAdmin ?? null;
  } catch {
    return null;
  }
}

export interface ThrottleStatus {
  locked: boolean;
  remainingMinutes: number;
}

function memoryCheck(ip: string, now: number): ThrottleStatus {
  const record = memoryAttempts.get(ip);
  if (!record) return { locked: false, remainingMinutes: 0 };
  if (now - record.firstAttempt >= LOCKOUT_MS) {
    memoryAttempts.delete(ip);
    return { locked: false, remainingMinutes: 0 };
  }
  if (record.count >= MAX_ATTEMPTS) {
    return {
      locked: true,
      remainingMinutes: Math.ceil((LOCKOUT_MS - (now - record.firstAttempt)) / 60000),
    };
  }
  return { locked: false, remainingMinutes: 0 };
}

/** Returns whether this IP is currently locked out. Never throws. */
export async function checkLoginThrottle(ip: string): Promise<ThrottleStatus> {
  const now = Date.now();
  try {
    const admin = await getSupabaseAdmin();
    if (!admin) {
      warnFallback("Supabase not configured");
      return memoryCheck(ip, now);
    }

    const { data, error } = await admin
      .from("admin_login_attempts")
      .select("fail_count, first_attempt")
      .eq("ip", ip)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { locked: false, remainingMinutes: 0 };

    const firstAttempt = new Date(data.first_attempt).getTime();
    if (Number.isNaN(firstAttempt) || now - firstAttempt >= LOCKOUT_MS) {
      // Window expired — reset
      await admin.from("admin_login_attempts").delete().eq("ip", ip);
      return { locked: false, remainingMinutes: 0 };
    }
    if (data.fail_count >= MAX_ATTEMPTS) {
      return {
        locked: true,
        remainingMinutes: Math.ceil((LOCKOUT_MS - (now - firstAttempt)) / 60000),
      };
    }
    return { locked: false, remainingMinutes: 0 };
  } catch (err) {
    warnFallback(err instanceof Error ? err.message : "Supabase error");
    return memoryCheck(ip, now);
  }
}

/** Records a failed login for this IP. Never throws. */
export async function recordFailedLogin(ip: string): Promise<void> {
  const now = Date.now();
  try {
    const admin = await getSupabaseAdmin();
    if (!admin) {
      warnFallback("Supabase not configured");
      const current = memoryAttempts.get(ip);
      if (!current || now - current.firstAttempt >= LOCKOUT_MS) {
        memoryAttempts.set(ip, { count: 1, firstAttempt: now });
      } else {
        current.count += 1;
      }
      return;
    }

    const { data, error } = await admin
      .from("admin_login_attempts")
      .select("fail_count, first_attempt")
      .eq("ip", ip)
      .maybeSingle();
    if (error) throw error;

    if (!data || now - new Date(data.first_attempt).getTime() >= LOCKOUT_MS) {
      const { error: upsertError } = await admin
        .from("admin_login_attempts")
        .upsert(
          {
            ip,
            fail_count: 1,
            first_attempt: new Date(now).toISOString(),
            updated_at: new Date(now).toISOString(),
          },
          { onConflict: "ip" }
        );
      if (upsertError) throw upsertError;
    } else {
      const { error: upsertError } = await admin
        .from("admin_login_attempts")
        .upsert(
          {
            ip,
            fail_count: data.fail_count + 1,
            first_attempt: data.first_attempt,
            updated_at: new Date(now).toISOString(),
          },
          { onConflict: "ip" }
        );
      if (upsertError) throw upsertError;
    }
  } catch (err) {
    warnFallback(err instanceof Error ? err.message : "Supabase error");
    const current = memoryAttempts.get(ip);
    if (!current || now - current.firstAttempt >= LOCKOUT_MS) {
      memoryAttempts.set(ip, { count: 1, firstAttempt: now });
    } else {
      current.count += 1;
    }
  }
}

/** Clears all recorded attempts for this IP (call on successful login). Never throws. */
export async function clearLoginAttempts(ip: string): Promise<void> {
  memoryAttempts.delete(ip);
  try {
    const admin = await getSupabaseAdmin();
    if (!admin) return;
    await admin.from("admin_login_attempts").delete().eq("ip", ip);
  } catch {
    // Non-fatal — the row (if any) simply expires via the lockout window.
  }
}
