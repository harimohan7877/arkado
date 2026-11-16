"use client";

import { useEffect } from "react";
import { getUtmSource } from "@/lib/visitor-id";

/**
 * Captures the landing page's utm_source once, on first page load, and
 * stores it in sessionStorage (via getUtmSource). The checkout attaches it
 * to the order for attribution.
 *
 * This replaces the capture that used to happen inside PageViewTracker
 * (removed 2026-11-16 with the DB analytics). Without it, utm_source on
 * orders would always be empty, because by checkout time the URL no longer
 * carries the utm params. Renders nothing.
 */
export default function UtmCapture() {
  useEffect(() => {
    getUtmSource();
  }, []);
  return null;
}
