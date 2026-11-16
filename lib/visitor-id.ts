/**
 * Anonymous visitor/session IDs for ORDER ATTRIBUTION only (Phase E).
 *
 * These helpers used to live in components/PageViewTracker.tsx. The
 * analytics tracker itself was removed on 2026-11-16 (DB-backed analytics
 * replaced by Cloudflare Web Analytics), but the checkout still attaches
 * these anonymous IDs to each order so Harimohan can see which session /
 * utm_source an order came from. NO event is sent anywhere from here —
 * this file only reads/writes the visitor's own browser storage.
 */

const VISITOR_KEY = "arkado-visitor-id";
const SESSION_KEY = "arkado-session";
const UTM_KEY = "arkado-utm";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function getSessionId(): string {
  try {
    const now = Date.now();
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: string; lastActive?: number };
      if (parsed?.id && parsed.lastActive && now - parsed.lastActive < SESSION_TIMEOUT_MS) {
        parsed.lastActive = now;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
        return parsed.id;
      }
    }
    const fresh = { id: crypto.randomUUID(), lastActive: now };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
    return fresh.id;
  } catch {
    return "anon";
  }
}

export function getUtmSource(): string {
  try {
    const existing = sessionStorage.getItem(UTM_KEY);
    if (existing) return existing;
    const utm = new URLSearchParams(window.location.search).get("utm_source") || "";
    if (utm) sessionStorage.setItem(UTM_KEY, utm);
    return utm;
  } catch {
    return "";
  }
}
