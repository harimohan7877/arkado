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

    const subject = `🎉 आपका Arkado कोर्स अनलॉक हो गया है! — ${courseTitle}`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Arkado Course Access</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #b45309 0%, #78350f 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">Arkado Education</h1>
              <p style="margin: 8px 0 0; font-size: 13px; color: #fef3c7; font-weight: 500;">सरकारी साथी — आपकी परीक्षा तैयारी का भरोसेमंद साथी</p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 24px;">
              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
                <span style="font-size: 28px;">✅</span>
                <h2 style="margin: 8px 0 4px; font-size: 18px; font-weight: 700; color: #065f46;">भुगतान सत्यापित एवं स्वीकृत!</h2>
                <p style="margin: 0; font-size: 13px; color: #047857;">Payment Verified & Access Unlocked</p>
              </div>

              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
                नमस्ते <strong>${safeName}</strong> जी,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
                Arkado पर आपके ऑर्डर का सत्यापन पूरा हो चुका है। आपके द्वारा खरीदे गए कोर्स के Google Drive नोट्स व अध्ययन सामग्री का एक्सेस अनलॉक कर दिया गया है।
              </p>

              <!-- Order Summary Card -->
              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">ऑर्डर विवरण (Order Details)</h3>
                <table width="100%" cellspacing="0" cellpadding="6" border="0" style="font-size: 13px;">
                  <tr>
                    <td style="color: #64748b; width: 40%;">Order ID:</td>
                    <td style="font-family: monospace; font-weight: bold; color: #0f172a;">${safeOrderId}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b;">कोर्स / बंडल:</td>
                    <td style="font-weight: bold; color: #0f172a;">${safeCourse}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b;">भुगतान राशि:</td>
                    <td style="font-weight: 800; color: #059669; font-size: 15px;">₹${amount} (Paid)</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0 24px;">
                <a href="${resolvedDriveUrl}" target="_blank" rel="noopener noreferrer" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 800; display: inline-block; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4); letter-spacing: 0.3px;">
                  📚 Google Drive नोट्स खोलें (Download Notes)
                </a>
                <p style="margin: 12px 0 0; font-size: 12px; color: #64748b;">
                  (यदि ऊपर का बटन काम न करे तो इस लिंक को कॉपी करें:<br>
                  <a href="${resolvedDriveUrl}" style="color: #b45309; word-break: break-all;">${resolvedDriveUrl}</a>)
                </p>
              </div>

              <!-- Student Instructions -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 24px;">
                <h4 style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #0f172a;">💡 अध्ययन सामग्री का उपयोग कैसे करें:</h4>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                  <li>ऊपर दिए गए हरे बटन पर क्लिक करके Google Drive फोल्डर खोलें।</li>
                  <li>ऑफलाइन पढ़ने के लिए PDF फाइलों को डाउनलोड करें या 'Add shortcut to Drive' कर लें।</li>
                  <li>नोट्स में दिए गए प्रैक्टिस सेट्स व पिछले वर्षों के प्रश्नों का निरंतर अभ्यास करें।</li>
                </ul>
              </div>

              <!-- Support Box -->
              <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 16px; margin-top: 24px; text-align: center;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #854d0e;">कोई सहायता चाहिए या लिंक खुलने में समस्या है?</p>
                <a href="https://wa.me/919950252138?text=Hello%20Arkado%20Team%2C%20I%20need%20help%20with%20Order%20${safeOrderId}" target="_blank" rel="noopener noreferrer" style="color: #059669; font-weight: 700; font-size: 13px; text-decoration: underline;">
                  💬 WhatsApp सहायता: +91 9950252138
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
              <p style="margin: 0 0 4px;">© ${new Date().getFullYear()} Arkado Education. All rights reserved.</p>
              <p style="margin: 0;">यह एक स्वचालित ईमेल है। कृपया अपनी तैयारी जारी रखें और सफलता प्राप्त करें!</p>
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
नमस्ते ${customerName} जी,

Arkado पर आपके ऑर्डर (${orderId}) का भुगतान सत्यापित हो चुका है!

कोर्स: ${courseTitle}
राशि: ₹${amount} (Paid)

अध्ययन सामग्री व Google Drive नोट्स का डाउनलोड लिंक:
${resolvedDriveUrl}

सहायता के लिए WhatsApp पर संपर्क करें: +91 9950252138

Team Arkado
https://www.arkado.store
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
