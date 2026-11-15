/**
 * Internal admin notification helpers.
 *
 * SECURITY: these run server-side only and are called directly from API
 * routes. They are NOT exposed as public HTTP endpoints — the old
 * /api/notify-admin route was publicly callable and let anyone trigger
 * admin emails (spam / Gmail quota burn). Never re-expose this as a route
 * without admin authentication.
 */

export interface NewOrderNotification {
  order_id: string;
  name: string;
  email?: string;
  phone?: string;
  course_title: string;
  amount: number;
  delivery_mode: string;
  /** PhonePe transaction id (was UTR before the PhonePe migration). */
  transaction_id?: string;
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
 * Emails the admin about a new order. Returns true on success, false on any
 * failure — callers must never fail an order just because the email failed.
 */
export async function notifyAdminNewOrder(
  order: NewOrderNotification
): Promise<boolean> {
  try {
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || "support@arkado.in";
    const fromEmail = process.env.SMTP_FROM || "noreply@arkado.in";
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.warn("[notify] SMTP not configured — skipping admin email");
      return false;
    }

    const safeOrderId = escapeHtml(order.order_id);
    const safeName = escapeHtml(order.name);
    const safeEmail = escapeHtml(order.email);
    const safePhone = escapeHtml(order.phone);
    const safeCourse = escapeHtml(order.course_title);
    const safeDelivery = escapeHtml(order.delivery_mode);
    const safeTxnId = escapeHtml(order.transaction_id);
    const cleanPhoneDigits = (order.phone || "").replace(/\D/g, "");

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const subject = `🛒 नया ऑर्डर — ${safeOrderId} — ₹${order.amount}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #b45309; border-bottom: 2px solid #b45309; padding-bottom: 10px;">
          🛒 नया ऑर्डर मिला — Arkado
        </h2>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; color: #666; font-weight: bold;">Order ID</td>
            <td style="padding: 8px; font-family: monospace; font-size: 16px;">${safeOrderId}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; color: #666; font-weight: bold;">नाम</td>
            <td style="padding: 8px;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #666; font-weight: bold;">Email</td>
            <td style="padding: 8px;"><a href="mailto:${safeEmail || "N/A"}">${safeEmail || "N/A"}</a></td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; color: #666; font-weight: bold;">Phone</td>
            <td style="padding: 8px;">${safePhone || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #666; font-weight: bold;">कोर्स</td>
            <td style="padding: 8px; font-weight: bold;">${safeCourse}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; color: #666; font-weight: bold;">राशि</td>
            <td style="padding: 8px; font-size: 20px; font-weight: bold; color: #059669;">₹${Number(order.amount) || 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #666; font-weight: bold;">डिलीवरी</td>
            <td style="padding: 8px; text-transform: uppercase; font-weight: bold;">${safeDelivery}</td>
          </tr>
          ${
            safeTxnId
              ? `<tr style="background: #ecfdf5;">
                   <td style="padding: 8px; color: #065f46; font-weight: bold;">Transaction ID (PhonePe)</td>
                   <td style="padding: 8px; font-family: monospace; font-size: 15px; font-weight: bold; color: #047857;">${safeTxnId}</td>
                 </tr>`
              : ""
          }
          <tr style="background: #fef3c7;">
            <td style="padding: 8px; color: #92400e; font-weight: bold;">समय</td>
            <td style="padding: 8px; color: #92400e;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
          </tr>
        </table>

        <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px; color: #065f46;">✅ Payment received via PhonePe — no manual verification needed</h3>
          <p style="margin: 0; color: #064e3b; font-size: 14px;">
            The download link is sent automatically when available. If the link is still pending, add it from the admin panel (Orders → Link Pending) and it will be emailed at once.<br/>
            ${cleanPhoneDigits ? `<a href="https://wa.me/${cleanPhoneDigits}">WhatsApp ${safePhone}</a><br/>` : ""}
            ${safeEmail ? `<a href="mailto:${safeEmail}">Email ${safeEmail}</a>` : ""}
          </p>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          Arkado Admin Panel → <a href="https://www.arkado.store/ranjeet/admin">arkado.store/ranjeet/admin</a>
        </p>
      </div>
    `;

    const text = `
नया ऑर्डर — ${order.order_id}

नाम: ${order.name}
Email: ${order.email || "N/A"}
Phone: ${order.phone || "N/A"}
कोर्स: ${order.course_title}
राशि: ₹${order.amount}
${order.transaction_id ? `Transaction ID: ${order.transaction_id}\n` : ""}डिलीवरी: ${order.delivery_mode}
समय: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}

✅ Payment received via PhonePe — no manual verification needed.
Admin Panel: https://www.arkado.store/ranjeet/admin
    `;

    await transporter.sendMail({
      from: `"Arkado" <${fromEmail}>`,
      to: adminEmail,
      subject,
      text,
      html,
    });

    return true;
  } catch (err: unknown) {
    console.error(
      "[notify] Failed to send admin email:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}
