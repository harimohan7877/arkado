/**
 * Shared order-delivery service — sends the Drive-link email and marks the
 * order delivered in BOTH stores (data/orders.json + Supabase
 * marketplace_orders).
 *
 * Extracted verbatim from app/api/admin/orders/[id]/approve/route.ts so the
 * manual approval flow and the automatic Razorpay flow (verify-marketplace
 * + webhook) send the exact same email. Only ONE copy of the delivery
 * email exists — fix it here, it fixes everywhere.
 *
 * Callers: approve route (admin, after the state guard), verify-marketplace
 * (after Razorpay payment-signature verification), webhook (after webhook
 * signature verification). Delivery runs ONLY after payment is proven —
 * never call this for an unpaid order.
 */

import { getStoreData, setStoreData } from "@/lib/store-data";
import { supabaseAdmin, buildOrderQueryFilter } from "@/lib/supabase";
import nodemailer from "nodemailer";

export interface DeliverableKit {
  title: string;
  drive_url: string;
}

/** Order in the JSON-store shape (what the admin panel and approve route use). */
export interface NormalizedOrder {
  id?: string;
  order_id?: string;
  customer_name?: string;
  name?: string;
  customer_email?: string;
  email?: string;
  customer_phone?: string;
  phone?: string;
  amount?: number;
  course_id?: string;
  course_title?: string;
  drive_url?: string;
  items?: any[];
  delivery_mode?: string;
  payment_status?: string;
  delivery_status?: string;
  status?: string;
  [key: string]: unknown;
}

export type DeliveryResult =
  | {
      ok: true;
      messageId: string;
      kits: DeliverableKit[];
      order: NormalizedOrder;
      alreadyDelivered: boolean;
    }
  | { ok: false; error: string; status: number };

function readOrders() {
  return getStoreData<any[]>("orders", "data/orders.json", []);
}

function writeOrders(data: unknown[]) {
  return setStoreData("orders", "data/orders.json", data);
}

function escapeHtml(str: string | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Build a NormalizedOrder from marketplace_orders rows that share one
 * Razorpay order id (one row per item). The first row carries the
 * customer; items come from the stored `items` JSONB (full validated
 * lines, written by create-marketplace-order / /api/orders).
 */
export function normalizeGatewayRows(
  rows: any[],
  courses: any[]
): NormalizedOrder {
  const first = rows[0] || {};
  const storedItems: any[] = Array.isArray(first.items) ? first.items : [];
  const items =
    storedItems.length > 0
      ? storedItems
      : rows.map((r: any) => {
          const course = courses.find(
            (c: any) => c.id === r.product_id || c.slug === r.product_id
          );
          return {
            id: r.product_id,
            title: r.course_title || course?.title || r.product_id,
            price: Number(r.amount) || 0,
            drive_url: r.drive_url || course?.drive_url || "",
          };
        });
  return {
    id: first.razorpay_order_id || first.id,
    order_id: first.razorpay_order_id || first.id,
    customer_name: first.customer_name || "Student",
    name: first.customer_name || "Student",
    customer_email: first.customer_email || "",
    email: first.customer_email || "",
    customer_phone: first.customer_phone || "",
    phone: first.customer_phone || "",
    amount: rows.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0),
    course_id: first.product_id || "",
    course_title: first.course_title || items[0]?.title || "Course Bundle",
    drive_url: first.drive_url || "",
    items,
    delivery_mode: first.delivery_mode || "both",
    payment_status: first.payment_status || "pending",
    delivery_status: first.delivery_status || "pending",
    created_at: first.created_at || new Date().toISOString(),
  };
}

/** Deliverable kits for an order — each becomes one download card. */
export function resolveDeliverableKits(
  order: NormalizedOrder,
  courses: any[],
  resolvedDriveUrl: string
): DeliverableKit[] {
  const deliverableKits: DeliverableKit[] = [];
  const courseTitle = String(order.course_title || "Course Bundle");
  const orderItems = Array.isArray(order.items) ? order.items : [];
  for (const li of orderItems) {
    if (Array.isArray(li.bundle_items) && li.bundle_items.length > 0) {
      for (const k of li.bundle_items) {
        if (k.drive_url)
          deliverableKits.push({
            title: String(k.title || "Study Kit"),
            drive_url: String(k.drive_url),
          });
      }
    } else if (li.drive_url) {
      deliverableKits.push({
        title: String(li.title || courseTitle),
        drive_url: String(li.drive_url),
      });
    }
  }
  if (deliverableKits.length === 0) {
    // Bundle order without stored items (pre-migration order):
    // a bundle id looks like "bundle-exam-<examId>" and its kits are the
    // exam's active courses — resolve them live from the catalog.
    const bundleCourseId = String(order.course_id || "");
    if (bundleCourseId.startsWith("bundle-")) {
      const examId = bundleCourseId
        .replace(/^bundle-exam-/, "")
        .replace(/^bundle-/, "");
      for (const c of courses as any[]) {
        if (
          (c.exam_id === examId || c.id === examId || c.slug === examId) &&
          c.is_active !== false &&
          c.drive_url
        ) {
          deliverableKits.push({
            title: String(c.title || "Study Kit"),
            drive_url: String(c.drive_url),
          });
        }
      }
    }
  }
  if (
    deliverableKits.length === 0 &&
    resolvedDriveUrl &&
    !resolvedDriveUrl.includes("arkado.store/dashboard")
  ) {
    deliverableKits.push({ title: courseTitle, drive_url: resolvedDriveUrl });
  }
  return deliverableKits;
}

/**
 * Deliver an order: resolve kits, send the delivery email, mark delivered
 * in both stores (unless resend — re-sending must not rewrite
 * delivered_at/approved_at or touch the state machine).
 *
 * Returns { ok: false } instead of throwing for email failures, so callers
 * can decide: the approve route surfaces it (502 on reject), while
 * verify/webhook treat a failed email as a warning — the payment itself
 * is already proven and the links are shown on screen.
 */
export async function deliverOrder(
  order: NormalizedOrder,
  opts?: { customDriveUrl?: string; resend?: boolean }
): Promise<DeliveryResult> {
  const isResend = opts?.resend === true;

  // Already delivered and not a resend: never email twice.
  if (!isResend && (order.delivery_status || "").toLowerCase() === "delivered") {
    const courses = await getStoreData<any[]>("courses", "data/courses.json", []);
    const kits = resolveDeliverableKits(order, courses, String(order.drive_url || ""));
    return { ok: true, messageId: "", kits, order, alreadyDelivered: true };
  }

  const recipientEmail = (order.customer_email || order.email || "").trim();
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return {
      ok: false,
      error: "Order does not have a valid customer email address.",
      status: 400,
    };
  }

  const courses = await getStoreData<any[]>("courses", "data/courses.json", []);
  const matchedCourse = courses.find(
    (c: any) => c.id === order.course_id || c.slug === order.course_id
  );

  let resolvedDriveUrl = (opts?.customDriveUrl || order.drive_url || "").trim();
  if ((!resolvedDriveUrl || resolvedDriveUrl.length < 10) && matchedCourse?.drive_url) {
    resolvedDriveUrl = matchedCourse.drive_url;
  }
  if (!resolvedDriveUrl) {
    resolvedDriveUrl = "https://www.arkado.store/dashboard";
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  // Default From to the authenticated Gmail account — a mismatched From
  // (e.g. noreply@arkado.in via a Gmail account) hurts deliverability and
  // pushes mail to spam. Set SMTP_FROM explicitly to override.
  const fromEmail = process.env.SMTP_FROM || smtpUser;

  if (!smtpUser || !smtpPass) {
    return {
      ok: false,
      error: "SMTP credentials (SMTP_USER / SMTP_PASS) are not configured.",
      status: 500,
    };
  }

  // Supabase stores customer_name as "Name (phone)" — strip the phone part
  // so the greeting doesn't show the number.
  const rawName = String(order.customer_name || order.name || "Student");
  const customerName =
    rawName.replace(/\s*\(\+?\d[\d\s-]{7,}\d\)\s*$/, "").trim() || "Student";
  const rawTitle = String(order.course_title || "").trim();
  const courseTitle =
    rawTitle && rawTitle !== "Course Bundle"
      ? rawTitle
      : matchedCourse?.title || "Course Bundle";
  const orderId = order.order_id || order.id || "";
  const amount = Number(order.amount) || 0;

  const safeName = escapeHtml(customerName);
  const safeCourse = escapeHtml(courseTitle);
  const safeOrderId = escapeHtml(orderId);

  const deliverableKits = resolveDeliverableKits(order, courses, resolvedDriveUrl);
  const isBundleOrder = deliverableKits.length > 1;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const subject = isBundleOrder
    ? `Your Arkado bundle is ready (Order ${orderId})`
    : `Your Arkado course is ready (Order ${orderId})`;
  const heroTitle = isBundleOrder ? "Your bundle is ready" : "Your course is ready";
  const heroSub = isBundleOrder
    ? `Your payment of <strong>&#8377;${amount}</strong> for order <strong>${safeOrderId}</strong> is verified. Your complete study bundle is ready below.`
    : `Your payment of <strong>&#8377;${amount}</strong> for order <strong>${safeOrderId}</strong> is verified. Your study material is ready below.`;
  const kitsIntro = isBundleOrder
    ? `<p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#18181b;">Your bundle includes ${deliverableKits.length} study kits:</p><p style="margin:0 0 6px;font-size:12px;color:#71717a;">Each kit has its own download button &mdash; open the subject you want to study.</p>`
    : `<p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#18181b;">Your study material:</p>`;

  // One download card per kit: subject name + Download button + small
  // fallback link. No raw URL dumps — professional, not unprofessional.
  const kitCardsHtml = deliverableKits
    .map((k, i) => {
      const safeKitTitle = escapeHtml(k.title);
      const safeKitUrl = escapeHtml(k.drive_url);
      const shortUrl = escapeHtml(k.drive_url.replace(/^https?:\/\//, "").slice(0, 42));
      return `<tr><td style="padding:8px 32px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffdf7;border:1px solid #f0e2cc;border-radius:10px;">
          <tr><td style="padding:14px 16px;">
            <div style="font-size:14px;font-weight:700;color:#18181b;">${i + 1}. ${safeKitTitle}</div>
            <div style="margin-top:10px;">
              <a href="${safeKitUrl}" style="display:inline-block;background-color:#b45309;color:#ffffff;text-decoration:none;padding:10px 30px;border-radius:8px;font-size:14px;font-weight:700;">Download</a>
            </div>
            <div style="margin-top:8px;font-size:11px;color:#a1a1aa;word-break:break-all;">If the button doesn&rsquo;t work, use this link:<br><a href="${safeKitUrl}" style="color:#b45309;">${shortUrl}...</a></div>
          </td></tr>
        </table>
      </td></tr>`;
    })
    .join("");

  // Text logo instead of an image: SVG doesn't render in Gmail/Outlook
  // (most customers), and external images are often blocked. Styled text
  // renders everywhere and never breaks.
  // color-scheme meta reduces Gmail dark-mode mangling.
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${heroTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;">
          <tr>
            <td align="center" style="padding:30px 24px 4px;">
              <div style="font-size:30px;font-weight:800;letter-spacing:8px;color:#b45309;line-height:1;">ARKADO</div>
              <div style="font-size:10px;letter-spacing:3px;color:#a1a1aa;margin-top:6px;">DEEP-LEVEL EXAM ANALYSIS</div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 0;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#18181b;">${heroTitle}</h1>
              <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#3f3f46;">Hi <strong>${safeName}</strong>,</p>
              <p style="margin:8px 0 0;font-size:14px;line-height:1.7;color:#3f3f46;">${heroSub}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;">
                <tr>
                  <td style="padding:12px 16px;font-size:12px;color:#71717a;">Order ID</td>
                  <td align="right" style="padding:12px 16px;font-size:13px;font-weight:700;color:#18181b;font-family:'Courier New',monospace;">${safeOrderId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:12px;color:#71717a;border-top:1px solid #e4e4e7;">${isBundleOrder ? "Bundle" : "Course"}</td>
                  <td align="right" style="padding:12px 16px;font-size:13px;font-weight:600;color:#18181b;border-top:1px solid #e4e4e7;">${safeCourse}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:12px;color:#71717a;border-top:1px solid #e4e4e7;">Amount paid</td>
                  <td align="right" style="padding:12px 16px;font-size:15px;font-weight:800;color:#15803d;border-top:1px solid #e4e4e7;">&#8377;${amount}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="padding:22px 32px 0;">${kitsIntro}</td></tr>
          ${kitCardsHtml}
          <tr>
            <td style="padding:20px 32px 26px;">
              <p style="margin:0;font-size:12px;line-height:1.7;color:#71717a;">Any link not working or need help? WhatsApp us at <a href="https://wa.me/917852004401" style="color:#b45309;font-weight:700;text-decoration:none;">+91 78520 04401</a></p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#fafafa;padding:16px 32px;border-top:1px solid #e4e4e7;border-radius:0 0 12px 12px;">
              <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;">&copy; 2026 Arkado &middot; <a href="https://www.arkado.store" style="color:#b45309;text-decoration:none;">arkado.store</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

  const textKitLines = deliverableKits
    .map((k, i) => `${i + 1}. ${k.title}\n   ${k.drive_url}`)
    .join("\n");
  const textContent = `
Hi ${customerName},

Your payment for order ${orderId} has been verified!

${isBundleOrder ? "Bundle" : "Course"}: ${courseTitle}
Amount: Rs. ${amount} (Paid)

${isBundleOrder ? `Your bundle includes ${deliverableKits.length} study kits:` : "Your study material:"}
${textKitLines}

Any link not working or need help? WhatsApp us at +91 78520 04401

Team Arkado
https://www.arkado.store
    `;

  // Send email to student
  const info = await transporter.sendMail({
    from: `"Arkado Education" <${fromEmail}>`,
    to: recipientEmail,
    subject,
    text: textContent,
    html: htmlContent,
  });

  // Delivery diagnostics — a green UI message alone doesn't prove delivery.
  // Nodemailer resolves even when the SMTP server rejects the recipient
  // (typo'd address, closed account), so check `rejected` explicitly.
  console.log("[deliver-order] sendMail result:", {
    orderId,
    to: recipientEmail,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  });

  if (info.rejected && info.rejected.length > 0) {
    return {
      ok: false,
      error: `Mail server ne email reject kar diya: ${info.rejected.join(", ")} — address check karo.`,
      status: 502,
    };
  }

  // Update order status in memory & JSON (skipped in resend mode —
  // the order is already paid/delivered; re-sending must not rewrite
  // delivered_at/approved_at or touch the state machine).
  if (!isResend) {
    order.payment_status = "paid";
    order.delivery_status = "delivered";
    order.status = "delivered";
    order.drive_url = resolvedDriveUrl;
    order.delivered_at = new Date().toISOString();
    order.approved_at = new Date().toISOString();
    order.updated_at = new Date().toISOString();

    const orders = await readOrders();
    const orderIndex = orders.findIndex(
      (o: Record<string, unknown>) => o.id === orderId || o.order_id === orderId
    );
    if (orderIndex !== -1) {
      orders[orderIndex] = { ...orders[orderIndex], ...order };
    } else {
      orders.unshift(order);
    }
    await writeOrders(orders);

    // Sync to Supabase marketplace_orders
    try {
      const filter = buildOrderQueryFilter(orderId);
      const { error: sbErr } = await supabaseAdmin
        .from("marketplace_orders")
        .update({
          payment_status: "paid",
          delivery_status: "delivered",
        })
        .or(filter);

      if (sbErr) {
        console.warn("[deliver-order] Supabase sync warning:", sbErr.message);
      }
    } catch (dbErr) {
      console.warn("[deliver-order] Supabase sync exception:", dbErr);
    }
  }

  return {
    ok: true,
    messageId: info.messageId,
    kits: deliverableKits,
    order,
    alreadyDelivered: false,
  };
}
