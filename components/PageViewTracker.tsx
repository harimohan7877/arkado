"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const VISITOR_KEY = "arkado-visitor-id";
const SESSION_KEY = "arkado-session";
const UTM_KEY = "arkado-utm";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Anonymous analytics (Phase 1).
 * Privacy rules: visitor_id is a random UUID in the visitor's own localStorage
 * (never linked to any identity); referrer stores ONLY the origin, never full
 * URLs with query strings; no name, phone, email, UTR, or IP is ever sent.
 * Every send is background + fail-silent — tracking can never break a page.
 */

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

function getReferrerOrigin(): string {
  try {
    const ref = document.referrer;
    if (!ref) return "";
    return new URL(ref).origin;
  } catch {
    return "";
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

function getDevice(): string {
  try {
    return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "desktop";
  } catch {
    return "";
  }
}

export function trackEvent(event: {
  event_type: string;
  page_path?: string;
  product_id?: string;
  element?: string;
  search_query?: string;
}) {
  try {
    // Client-side kill switch (build-time public flag). Server-side flag in
    // /api/track-event is the real gate; this just avoids wasted requests.
    if (
      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "0" ||
      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "false"
    ) {
      return;
    }
    const body = {
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      event_type: event.event_type,
      page_path: event.page_path || window.location.pathname,
      product_id: event.product_id || null,
      element: event.element || null,
      search_query: event.search_query || null,
      referrer: getReferrerOrigin(),
      utm_source: getUtmSource(),
      device: getDevice(),
    };
    fetch("/api/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* tracking must never break the page */
  }
}

/**
 * Mounted once in app/layout.tsx (already there — layout file itself untouched).
 * Sends BOTH:
 *  - legacy POST /api/track (page_views table, unchanged behavior), and
 *  - new analytics page_view event (analytics_events table).
 * Plus a delegated click listener: only elements explicitly marked with a
 * data-track attribute fire click events (no blanket click spying).
 */
export default function PageViewTracker() {
  // useSearchParams needs a Suspense boundary; it lives INSIDE this component
  // so app/layout.tsx (ring-fenced) stays untouched.
  return (
    <Suspense fallback={null}>
      <PageViewTrackerInner />
    </Suspense>
  );
}

function PageViewTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSent = useRef<string | null>(null);
  const lastSearch = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastSent.current === pathname) return;
    lastSent.current = pathname;
    // Legacy page-view counter (unchanged)
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* tracking must never break the page */
    }
    // New analytics event
    trackEvent({ event_type: "page_view", page_path: pathname });
  }, [pathname]);

  // Phase A: search terms. Fires on /search pages from the URL's q param.
  // Pathname alone doesn't change between searches (only ?q= does), so this
  // effect watches the query too. Same query twice in a row is one search;
  // leaving /search resets the guard so a repeat search counts again.
  const searchQuery = (searchParams?.get("q") || "").trim();
  useEffect(() => {
    if (pathname !== "/search") {
      lastSearch.current = null;
      return;
    }
    if (!searchQuery) return;
    const key = `/search|${searchQuery}`;
    if (lastSearch.current === key) return;
    lastSearch.current = key;
    trackEvent({ event_type: "search", page_path: "/search", search_query: searchQuery });
  }, [pathname, searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.("[data-track]");
      if (!target) return;
      const element = target.getAttribute("data-track") || "";
      if (!element) return;
      const productId = target.getAttribute("data-product") || undefined;
      trackEvent({ event_type: "click", element, product_id: productId });
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return null;
}
