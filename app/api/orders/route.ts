import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getStoreData, setStoreData } from "@/lib/store-data";
import { verifyAdminSession } from "@/lib/admin-auth";
import { notifyAdminNewOrder } from "@/lib/notify";
import { supabaseAdmin } from "@/lib/supabase";
import { getEffectiveTermsText } from "@/lib/legal";
import { DEFAULT_SETTINGS } from "@/lib/default-settings";
import {
  sanitizeInput,
  validateUtrSubmission,
  validateOrderPrices,
  generateOrderId,
  validateStatusTransitions,
  validateTermsAcceptance,
} from "@/lib/payment-gateway";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readOrders() {
  return getStoreData<any[]>("orders", "data/orders.json", []);
}

async function writeOrders(orders: unknown[]) {
  return setStoreData("orders", "data/orders.json", orders);
}

export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await readOrders();
  orders.sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return NextResponse.json({ success: true, orders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawName = body.name;
    const rawPhone = body.phone;
    const rawEmail = body.email;
    const rawUtr = body.utr;
    const rawCourseId = body.course_id;
    const rawCourseTitle = body.course_title;
    const delivery_mode = body.delivery_mode;
    const clientAmount = body.amount;
    // Analytics attribution (Phase E): anonymous session keys only.
    const rawVisitorId = body.visitor_id;
    const rawSessionId = body.session_id;
    const rawUtmSource = body.utm_source;

    // 1. Input Sanitization (Anti-XSS / Script Injection)
    const cleanName = sanitizeInput(rawName);
    const cleanPhone = sanitizeInput(rawPhone);
    const cleanEmail = sanitizeInput(rawEmail);
    const cleanUtr = sanitizeInput(rawUtr);
    const course_id = sanitizeInput(rawCourseId);
    // Attribution keys: sanitize like everything else; "anon" (storage
    // unavailable) and empty both become null — never a fake visitor.
    const normAttrKey = (v: unknown): string | null => {
      const s = sanitizeInput(typeof v === "string" ? v : null);
      if (!s || s === "anon") return null;
      return s;
    };
    const attrVisitorId = normAttrKey(rawVisitorId);
    const attrSessionId = normAttrKey(rawSessionId);
    const attrUtmSource = normAttrKey(rawUtmSource);

    if (!cleanName || !course_id) {
      return NextResponse.json(
        { success: false, error: "Name and course are required." },
        { status: 400 }
      );
    }

    const cleanMode = (delivery_mode || "both").toLowerCase().trim();
    const allowedModes = ["gmail", "whatsapp", "email", "drive", "both"];
    if (!allowedModes.includes(cleanMode)) {
      return NextResponse.json(
        { success: false, error: "Invalid delivery mode. Must be 'gmail', 'whatsapp', or 'both'." },
        { status: 400 }
      );
    }

    if (cleanMode === "both" && (!cleanEmail || !cleanPhone)) {
      return NextResponse.json(
        { success: false, error: "Both Mobile number and Email are required." },
        { status: 400 }
      );
    }

    if (!cleanEmail && (cleanMode === "gmail" || cleanMode === "email")) {
      return NextResponse.json(
        { success: false, error: "Email is required for Gmail delivery." },
        { status: 400 }
      );
    }

    if (!cleanPhone && cleanMode === "whatsapp") {
      return NextResponse.json(
        { success: false, error: "WhatsApp number is required." },
        { status: 400 }
      );
    }

    // 1b. Terms & Conditions acceptance gate — the checkbox must be actively
    // ticked. Never trust the client alone: reject without an explicit opt-in.
    const termsError = validateTermsAcceptance(body.terms_accepted);
    if (termsError) {
      return NextResponse.json(
        { success: false, error: termsError },
        { status: 400 }
      );
    }

    // Snapshot which Terms version the customer agreed to (terms text is
    // admin-editable, so record a hash of the effective text at order time).
    const termsAcceptedAt = new Date().toISOString();
    let termsVersion = "default";
    try {
      const settingsData = await getStoreData("settings", "data/settings.json", DEFAULT_SETTINGS) as typeof DEFAULT_SETTINGS & {
        policies?: { terms_of_service?: string };
      };
      const termsText = getEffectiveTermsText(settingsData?.policies);
      termsVersion = crypto.createHash("sha256").update(termsText, "utf8").digest("hex").slice(0, 12);
    } catch {
      // Non-fatal: the acceptance itself is what matters for compliance.
    }

    // 2. Server-Authoritative Price Validation (Anti-Price Tampering)
    // Bundle items (bundle-*) are validated by recomputing from their
    // constituent kits: sum of sale-adjusted kit prices, then the bundle
    // discount from settings. Regular items use the catalog lookup.
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const settingsForPricing = await getStoreData("settings", "data/settings.json", DEFAULT_SETTINGS) as typeof DEFAULT_SETTINGS;
    const { getSalePct, applySale } = await import("@/lib/sale-pricing");
    const { getFestivalOffer } = await import("@/lib/default-settings");
    const serverSalePct = getSalePct(settingsForPricing);
    const bundleDiscPct = (() => {
      const bc = (settingsForPricing as any)?.bundle_card;
      return typeof bc?.discount_percent === "number" ? bc.discount_percent : 5;
    })();

    // Resolve bundle contents to real kits for delivery (drive links)
    const allCourses = await getStoreData<any[]>("courses", "data/courses.json", []);
    const courseById = new Map<string, any>();
    for (const c of allCourses) {
      if (c.id) courseById.set(c.id, c);
      if (c.slug) courseById.set(c.slug, c);
    }

    type ValidatedLine = { id: string; title: string; price: number; drive_url: string; bundle_items?: Array<{ id: string; title: string; drive_url: string }> };
    const validatedLines: ValidatedLine[] = [];
    let computedTotal = 0;
    let bundleOk = true;

    const itemsToValidate = rawItems.length > 0
      ? rawItems
      : [{ id: course_id, title: rawCourseTitle, price: clientAmount }];

    for (const it of itemsToValidate) {
      const itemId = String(it.id || "");
      const isBundle = itemId.startsWith("bundle-");
      if (isBundle) {
        const kitIds: string[] = Array.isArray(it.bundle_items) ? it.bundle_items : [];
        const kits = kitIds.map((kid) => courseById.get(kid)).filter(Boolean);
        if (kits.length === 0) {
          bundleOk = false;
          break;
        }
        const kitSum = kits.reduce((s: number, k: any) => s + applySale(Number(k.price) || 0, serverSalePct), 0);
        const serverBundlePrice = Math.max(1, Math.round(kitSum * (1 - bundleDiscPct / 100)));
        const clientBundlePrice = Number(it.price) || 0;
        // Allow ±₹2 rounding tolerance
        if (Math.abs(serverBundlePrice - clientBundlePrice) > 2) {
          console.warn(`[orders] Bundle price mismatch for ${itemId}: client ₹${clientBundlePrice} vs server ₹${serverBundlePrice}`);
          bundleOk = false;
          break;
        }
        computedTotal += serverBundlePrice;
        validatedLines.push({
          id: itemId,
          title: String(it.title || kits[0]?.title || "Full Bundle"),
          price: serverBundlePrice,
          drive_url: "",
          bundle_items: kits.map((k: any) => ({
            id: k.id,
            title: k.title,
            drive_url: k.drive_url || "",
          })),
        });
      } else {
        const priceCheck = await validateOrderPrices([{ productId: itemId }], undefined);
        const mp = priceCheck.items[0];
        if (!priceCheck.isValid || !mp) {
          bundleOk = false;
          break;
        }
        const linePrice = applySale(Number(mp.price) || 0, serverSalePct);
        computedTotal += linePrice;
        validatedLines.push({
          id: itemId,
          title: mp.title,
          price: linePrice,
          drive_url: mp.drive_url || "",
        });
      }
    }

    if (!bundleOk || validatedLines.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order items could not be verified. Please try again." },
        { status: 400 }
      );
    }

    // Total must match what the client paid (allow ±₹2 rounding tolerance)
    if (typeof clientAmount === "number" && Math.abs(computedTotal - clientAmount) > 2) {
      console.warn(`[orders] Total mismatch: client ₹${clientAmount} vs server ₹${computedTotal}`);
      return NextResponse.json(
        { success: false, error: "Price verification failed. Please refresh and try again." },
        { status: 400 }
      );
    }

    const matchedProduct = validatedLines[0];
    const authoritativeAmount = computedTotal;
    // Bundle lines carry per-kit Drive URLs inside items[].bundle_items —
    // never store a fake placeholder link for them. A single-kit line keeps
    // its own drive_url; empty means "resolve at approval time".
    const secureDriveUrl = matchedProduct?.drive_url || "";

    // 3. UTR Validation & Duplicate Rejection (Phase 3 hardening)
    // UTR is optional, but if provided it must be exactly 12 digits.
    // A duplicate UTR is REJECTED outright (HTTP 409) — the old code only
    // flagged it and still created the order.
    if (cleanUtr) {
      const utrCheck = await validateUtrSubmission(cleanUtr);
      if (!utrCheck.isValid) {
        return NextResponse.json(
          { success: false, error: utrCheck.message || "Invalid UTR." },
          { status: 400 }
        );
      }
      if (utrCheck.isDuplicate) {
        console.warn(`[FRAUD BLOCKED] Duplicate UTR rejected: ${cleanUtr} by ${cleanPhone}`);
        return NextResponse.json(
          { success: false, error: "This UTR / Transaction reference has already been used for another order." },
          { status: 409 }
        );
      }
    }

    // Collision-resistant order ID: ARK-<year>-XXXXXXXX (8 crypto-random chars).
    // The old 4-digit suffix had only 9,000 possibilities.
    const existingOrdersForIdCheck = await readOrders();
    const existingIds = new Set(
      existingOrdersForIdCheck.flatMap((o: { order_id?: string; id?: string }) => [o.order_id, o.id].filter(Boolean))
    );
    let order_id = generateOrderId();
    for (let attempts = 0; attempts < 10 && existingIds.has(order_id); attempts++) {
      order_id = generateOrderId();
    }

    const newOrder = {
      id: order_id,
      order_id,
      name: cleanName,
      customer_name: cleanName,
      delivery_mode: cleanMode,
      phone: cleanPhone,
      customer_phone: cleanPhone,
      email: cleanEmail,
      customer_email: cleanEmail,
      course_id: course_id,
      course_title: matchedProduct?.title || rawCourseTitle || "Course Bundle",
      exam_name: matchedProduct?.title || rawCourseTitle || "Course Bundle",
      amount: authoritativeAmount,
      drive_url: secureDriveUrl,
      // Full line items with bundle constituents (for admin delivery)
      items: validatedLines,
      status: "pending",
      delivery_status: "pending",
      payment_status: "pending",
      utr: cleanUtr,
      terms_accepted: true,
      terms_accepted_at: termsAcceptedAt,
      terms_version: termsVersion,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 4. Primary Relational Storage: Insert into Supabase marketplace_orders
    try {
      const basePayload: Record<string, any> = {
        customer_name: cleanPhone ? `${cleanName} (${cleanPhone})` : cleanName,
        customer_email: cleanEmail || (cleanPhone ? `${cleanPhone}@arkado.store` : "order@arkado.store"),
        product_id: course_id,
        course_title: matchedProduct?.title || rawCourseTitle || "Course Bundle",
        drive_url: secureDriveUrl,
        amount: authoritativeAmount,
        payment_status: "pending",
        razorpay_order_id: order_id,
        razorpay_payment_id: cleanUtr || null,
        delivery_status: "pending",
        terms_accepted: true,
        terms_accepted_at: termsAcceptedAt,
        terms_version: termsVersion,
        // Analytics attribution (Phase E): anonymous session keys, nullable.
        visitor_id: attrVisitorId,
        session_id: attrSessionId,
        utm_source: attrUtmSource,
        // Validated line items (bundle constituents with per-kit Drive URLs)
        // — the approval email, WhatsApp message and admin panel read these.
        items: validatedLines,
      };

      let { error: insertErr } = await supabaseAdmin.from("marketplace_orders").insert(basePayload);
      if (insertErr && /items/.test(insertErr.message)) {
        // The items-column migration hasn't been run yet — retry without it
        // so the order row is still created (backup merge covers delivery).
        console.warn("[orders-post] items column missing in marketplace_orders, retrying without it. Run supabase-migrations/20261017_order_items.sql");
        const { items: _it, ...fallbackPayload } = basePayload;
        ({ error: insertErr } = await supabaseAdmin.from("marketplace_orders").insert(fallbackPayload));
      }
      if (insertErr && /terms_accepted/.test(insertErr.message)) {
        // The terms-columns migration hasn't been run yet — retry without the
        // new columns so the order row is still created (JSON remains the
        // source of truth for T&C evidence in that case).
        console.warn("[orders-post] terms columns missing in marketplace_orders, retrying without them. Run supabase-migrations/20261001_order_terms_acceptance.sql");
        const { terms_accepted: _ta, terms_accepted_at: _tat, terms_version: _tv, ...fallbackPayload } = basePayload;
        ({ error: insertErr } = await supabaseAdmin.from("marketplace_orders").insert(fallbackPayload));
      }
      if (insertErr && /course_title|drive_url/.test(insertErr.message)) {
        // Older marketplace_orders tables may lack these columns — retry
        // without them so the row is still created (JSON keeps the full data).
        console.warn("[orders-post] course_title/drive_url columns missing in marketplace_orders, retrying without them.");
        const { course_title: _ct, drive_url: _du, ...fallbackPayload } = basePayload;
        ({ error: insertErr } = await supabaseAdmin.from("marketplace_orders").insert(fallbackPayload));
      }
      if (insertErr && /visitor_id|session_id|utm_source/.test(insertErr.message)) {
        // The attribution-columns migration hasn't been run yet — retry
        // without them so the order row is STILL created. Order placement
        // must never fail for analytics. Run
        // supabase-migrations/20261027_order_attribution.sql for attribution.
        console.warn("[orders-post] attribution columns missing in marketplace_orders, retrying without them.");
        const { visitor_id: _vi, session_id: _si, utm_source: _us, ...fallbackPayload } = basePayload;
        ({ error: insertErr } = await supabaseAdmin.from("marketplace_orders").insert(fallbackPayload));
      }
      if (insertErr) {
        console.error("[orders-post] marketplace_orders insert error:", insertErr.message);
      } else {
        console.log("[orders-post] Successfully inserted order into Supabase:", order_id);
      }
    } catch (dbErr) {
      console.warn("[orders-post] marketplace_orders insert warning:", dbErr);
    }

    // 5. Dual-Write Backup: Store in orders JSON & admin_settings
    const orders = await readOrders();
    orders.unshift(newOrder);
    await writeOrders(orders);

    // 5b. VERIFY persistence — never show a fake success page.
    // Re-read via the same path the admin panel uses. If the order isn't
    // retrievable, tell the customer the truth (500) instead of "success".
    let persisted = false;
    try {
      const checkOrders = await readOrders();
      persisted = checkOrders.some(
        (o: { order_id?: string; id?: string }) =>
          o.order_id === order_id || o.id === order_id
      );
    } catch { /* verification best-effort */ }
    if (!persisted) {
      console.error(
        `[orders-post] CRITICAL: order ${order_id} NOT retrievable after write — storage failed!`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Order save failed. Please try again or contact us on WhatsApp.",
        },
        { status: 500 }
      );
    }

    // 6. Notify admin via email (fire-and-forget — an email failure must
    // never fail the order). Called as an internal helper, NOT via HTTP:
    // the old public /api/notify-admin endpoint was removed (Phase 2).
    notifyAdminNewOrder(newOrder).catch((err) =>
      console.error("Failed to notify admin:", err)
    );

    // Privacy & Anti-Theft: Never send drive_url in client response while payment is pending
    const { drive_url: _, ...safeOrderResponse } = newOrder;

    return NextResponse.json({ success: true, order: safeOrderResponse });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { order_id, status, payment_status, delivery_status } = body;

    if (!order_id) {
      return NextResponse.json(
        { success: false, error: "Missing order_id" },
        { status: 400 }
      );
    }

    const orders = await readOrders();
    const orderIndex = orders.findIndex(
      (o: { order_id: string; id: string }) => o.order_id === order_id || o.id === order_id
    );

    if (orderIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const target = orders[orderIndex];

    // Phase 3: enforce the order state machine — illegal regressions
    // (e.g. delivered → pending) are rejected with HTTP 409.
    {
      const nextStatus: Record<string, string> = {};
      if (status) {
        nextStatus.status = status;
        if (status === "delivered") nextStatus.delivery_status = "delivered";
        if (status === "approved" || status === "paid") nextStatus.payment_status = "paid";
      }
      if (payment_status) nextStatus.payment_status = payment_status;
      if (delivery_status) nextStatus.delivery_status = delivery_status;
      const transitionError = validateStatusTransitions(
        {
          status: target.status,
          payment_status: target.payment_status,
          delivery_status: target.delivery_status,
        },
        nextStatus
      );
      if (transitionError) {
        return NextResponse.json({ success: false, error: transitionError }, { status: 409 });
      }
    }

    if (status) {
      target.status = status;
      if (status === "delivered") target.delivery_status = "delivered";
      if (status === "approved" || status === "paid") target.payment_status = "paid";
    }
    if (payment_status) target.payment_status = payment_status;
    if (delivery_status) target.delivery_status = delivery_status;
    target.updated_at = new Date().toISOString();

    // Sync to Supabase marketplace_orders
    try {
      const updatePayload: Record<string, any> = {};
      if (target.payment_status) updatePayload.payment_status = target.payment_status;
      if (target.delivery_status) updatePayload.delivery_status = target.delivery_status;

      await supabaseAdmin
        .from("marketplace_orders")
        .update(updatePayload)
        .eq("razorpay_order_id", order_id);
    } catch {}

    await writeOrders(orders);

    return NextResponse.json({ success: true, order: target });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const order_id = searchParams.get("order_id");

    if (!order_id) {
      return NextResponse.json(
        { success: false, error: "order_id is required" },
        { status: 400 }
      );
    }

    let orders = await readOrders();
    orders = orders.filter((o: { order_id: string; id: string }) => o.order_id !== order_id && o.id !== order_id);
    await writeOrders(orders);

    try {
      await supabaseAdmin.from("marketplace_orders").delete().eq("razorpay_order_id", order_id);
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
