import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData } from "@/lib/store-data";
import { supabaseAdmin } from "@/lib/supabase";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    let body: { customDriveUrl?: string } = {};
    try {
      body = await req.json();
    } catch {}

    const orders = await readOrders();
    let orderIndex = orders.findIndex(
      (o: Record<string, unknown>) => o.id === id || o.order_id === id
    );

    let order = orderIndex !== -1 ? orders[orderIndex] : null;

    // If not found in JSON, search Supabase marketplace_orders
    if (!order) {
      const { data: dbOrder } = await supabaseAdmin
        .from("marketplace_orders")
        .select("*")
        .or(`razorpay_order_id.eq.${id},id.eq.${id}`)
        .limit(1)
        .maybeSingle();

      if (dbOrder) {
        order = {
          id: dbOrder.razorpay_order_id || dbOrder.id,
          order_id: dbOrder.razorpay_order_id || dbOrder.id,
          customer_name: dbOrder.customer_name || "Student",
          name: dbOrder.customer_name || "Student",
          customer_email: dbOrder.customer_email || "",
          email: dbOrder.customer_email || "",
          customer_phone: dbOrder.customer_phone || "",
          phone: dbOrder.customer_phone || "",
          amount: Number(dbOrder.amount) || 0,
          course_id: dbOrder.product_id || "",
          course_title: dbOrder.course_title || "Course Bundle",
          drive_url: dbOrder.drive_url || "",
          delivery_mode: dbOrder.delivery_mode || "both",
          payment_status: dbOrder.payment_status || "pending",
          delivery_status: dbOrder.delivery_status || "pending",
          created_at: dbOrder.created_at || new Date().toISOString(),
        };
        orders.unshift(order);
        orderIndex = 0;
      }
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const recipientEmail = (order.customer_email || order.email || "").trim();
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return NextResponse.json(
        { error: "Order does not have a valid customer email address." },
        { status: 400 }
      );
    }

    // Resolve Drive URL
    let resolvedDriveUrl = (body.customDriveUrl || order.drive_url || "").trim();

    // If drive_url is missing or placeholder, look up from catalog
    if (!resolvedDriveUrl || resolvedDriveUrl.length < 10) {
      const courses = await getStoreData<any[]>("courses", "data/courses-new.json", []);
      const matched = courses.find(
        (c: any) => c.id === order.course_id || c.slug === order.course_id
      );
      if (matched?.drive_url) {
        resolvedDriveUrl = matched.drive_url;
      }
    }

    if (!resolvedDriveUrl) {
      resolvedDriveUrl = "https://www.arkado.store/dashboard";
    }

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM || "noreply@arkado.in";

    if (!smtpUser || !smtpPass) {
      return NextResponse.json(
        { error: "SMTP credentials (SMTP_USER / SMTP_PASS) are not configured." },
        { status: 500 }
      );
    }

    const customerName = order.customer_name || order.name || "Student";
    const courseTitle = order.course_title || "Course Bundle";
    const orderId = order.order_id || order.id || id;
    const amount = Number(order.amount) || 0;

    const safeName = escapeHtml(customerName);
    const safeCourse = escapeHtml(courseTitle);
    const safeOrderId = escapeHtml(orderId);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const subject = `Your Course Access is Ready — Arkado (Order ${orderId})`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Course Access is Ready — Arkado</title>
</head>
<body style="margin:0;padding:0;background-color:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a1a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">

              <!-- Logo Bar -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background:#ffffff;padding:30px 40px 26px;">
                    <img src="https://sarkari-sathi-ecru.vercel.app/logo.svg" alt="Arkado" width="180" style="display:block;margin:0 auto;border:0;width:180px;height:auto;" />
                  </td>
                </tr>
              </table>

              <!-- Hero Banner -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(160deg,#b91c1c 0%,#991b1b 40%,#7f1d1d 100%);padding:36px 40px 38px;text-align:center;">
                    <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:20px;">
                      <tr>
                        <td style="background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%);border-radius:50px;padding:8px 24px;">
                          <span style="font-size:11px;font-weight:800;color:#111111;letter-spacing:1.2px;text-transform:uppercase;">&#10003; &nbsp;Payment Verified</span>
                        </td>
                      </tr>
                    </table>
                    <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;line-height:1.3;">Your Course Access<br>is Ready!</h1>
                    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;">Study materials unlocked &mdash; ready to download.</p>
                    <table width="60" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-top:22px;">
                      <tr><td style="height:3px;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.5) 50%,rgba(255,255,255,0) 100%);border-radius:2px;"></td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
                <tr>
                  <td style="padding:36px 40px 0;">
                    <p style="margin:0 0 6px;font-size:16px;color:#111111;line-height:1.7;">Hi <strong>${safeName}</strong>,</p>
                    <p style="margin:0 0 30px;font-size:14px;color:#555555;line-height:1.8;">We have verified your payment successfully. Your Google Drive notes are now unlocked and ready to access &mdash; click below to open your course folder.</p>
                  </td>
                </tr>
              </table>

              <!-- Order Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
                <tr>
                  <td style="padding:0 28px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
                      <tr>
                        <td colspan="2" style="background:linear-gradient(135deg,#fef2f2 0%,#fff1f2 100%);padding:14px 20px;border-bottom:1px solid #fecaca;">
                          <span style="font-size:11px;font-weight:800;color:#b91c1c;text-transform:uppercase;letter-spacing:1px;">&#128203; &nbsp;Order Details</span>
                        </td>
                      </tr>
                      <tr>
                        <td width="36%" style="padding:14px 20px;background:#fafafa;border-bottom:1px solid #f0f0f0;vertical-align:top;">
                          <span style="font-size:11px;font-weight:700;color:#999999;text-transform:uppercase;letter-spacing:0.6px;">Order ID</span>
                        </td>
                        <td style="padding:14px 20px;background:#ffffff;border-bottom:1px solid #f0f0f0;">
                          <span style="font-size:14px;font-weight:700;color:#111111;font-family:'Courier New',monospace;">${safeOrderId}</span>
                        </td>
                      </tr>
                      <tr>
                        <td width="36%" style="padding:14px 20px;background:#fafafa;border-bottom:1px solid #f0f0f0;vertical-align:top;">
                          <span style="font-size:11px;font-weight:700;color:#999999;text-transform:uppercase;letter-spacing:0.6px;">Course</span>
                        </td>
                        <td style="padding:14px 20px;background:#ffffff;border-bottom:1px solid #f0f0f0;">
                          <span style="font-size:14px;font-weight:600;color:#111111;">${safeCourse}</span>
                        </td>
                      </tr>
                      <tr>
                        <td width="36%" style="padding:14px 20px;background:#fafafa;vertical-align:middle;">
                          <span style="font-size:11px;font-weight:700;color:#999999;text-transform:uppercase;letter-spacing:0.6px;">Amount</span>
                        </td>
                        <td style="padding:14px 20px;background:#ffffff;">
                          <span style="font-size:22px;font-weight:900;color:#111111;">&rupee;${amount}</span>
                          <span style="display:inline-block;background:#dcfce7;color:#166534;font-size:11px;font-weight:700;padding:3px 10px;border-radius:50px;margin-left:10px;vertical-align:middle;">PAID &#10003;</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
                <tr>
                  <td align="center" style="padding:8px 40px 32px;">
                    <a href="${resolvedDriveUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);color:#ffffff;text-decoration:none;padding:16px 52px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:0.3px;box-shadow:0 6px 20px rgba(185,28,28,0.40);text-align:center;">Open Google Drive Notes &nbsp;&rarr;</a>
                  </td>
                </tr>
              </table>

              <!-- Help Strip -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
                <tr>
                  <td style="padding:0 28px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef2f2;border-radius:10px;border:1px solid #fecaca;">
                      <tr>
                        <td style="padding:18px 22px;text-align:center;">
                          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#991b1b;">Having trouble accessing your notes?</p>
                          <p style="margin:0;font-size:13px;color:#666666;">WhatsApp us anytime at <a href="https://wa.me/919950252138?text=Hi%20Arkado%2C%20I%20need%20help%20with%20order%20${safeOrderId}" style="color:#dc2626;font-weight:700;text-decoration:none;">+91 99502 52138</a></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#111111;padding:22px 40px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:11px;color:#888888;">&copy; ${new Date().getFullYear()} Arkado Education &nbsp;&middot;&nbsp; <a href="https://arkado.store" style="color:#f87171;text-decoration:none;font-weight:600;">arkado.store</a> &nbsp;&middot;&nbsp; <a href="https://wa.me/919950252138" style="color:#f87171;text-decoration:none;font-weight:600;">Support</a></p>
                    <p style="margin:0;font-size:10px;color:#555555;">This is an automated email &mdash; please do not reply.</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `
Hi ${customerName},

Your payment for order ${orderId} has been verified!

Course: ${courseTitle}
Amount: Rs. ${amount} (Paid)

Access your Google Drive study notes here:
${resolvedDriveUrl}

Need help? WhatsApp us at +91 99502 52138

Team Arkado
https://arkado.store
    `;

    // Send email to student
    await transporter.sendMail({
      from: `"Arkado Education" <${fromEmail}>`,
      to: recipientEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    // Update order status in memory & JSON
    order.payment_status = "paid";
    order.delivery_status = "delivered";
    order.status = "delivered";
    order.drive_url = resolvedDriveUrl;
    order.delivered_at = new Date().toISOString();
    order.approved_at = new Date().toISOString();
    order.updated_at = new Date().toISOString();

    if (orderIndex !== -1) {
      orders[orderIndex] = order;
    } else {
      orders.unshift(order);
    }
    await writeOrders(orders);

    // Sync to Supabase marketplace_orders
    try {
      await supabaseAdmin
        .from("marketplace_orders")
        .update({
          payment_status: "paid",
          delivery_status: "delivered",
        })
        .or(`razorpay_order_id.eq.${id},id.eq.${id}`);
    } catch (dbErr) {
      console.warn("[approve-route] Supabase sync warning:", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Course notes successfully sent to ${recipientEmail}`,
      order,
    });
  } catch (err: unknown) {
    console.error("[approve-route] Approval error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to approve and send email",
      },
      { status: 500 }
    );
  }
}
