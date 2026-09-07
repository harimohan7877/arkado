import { NextRequest, NextResponse } from "next/server";

interface OrderData {
  order_id: string;
  name: string;
  email?: string;
  phone?: string;
  course_title: string;
  amount: number;
  delivery_mode: string;
}

export async function POST(req: NextRequest) {
  try {
    const order: OrderData = await req.json();

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || "support@arkado.in";
    const fromEmail = process.env.SMTP_FROM || "noreply@arkado.in";
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      return NextResponse.json({ error: "Email not configured" }, { status: 500 });
    }

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const subject = `🛒 नया ऑर्डर — ${order.order_id} — ₹${order.amount}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #b45309; border-bottom: 2px solid #b45309; padding-bottom: 10px;">
          🛒 नया ऑर्डर मिला — Arkado
        </h2>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; color: #666; font-weight: bold;">Order ID</td>
            <td style="padding: 8px; font-family: monospace; font-size: 16px;">${order.order_id}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; color: #666; font-weight: bold;">नाम</td>
            <td style="padding: 8px;">${order.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #666; font-weight: bold;">Email</td>
            <td style="padding: 8px;"><a href="mailto:${order.email || "N/A"}">${order.email || "N/A"}</a></td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; color: #666; font-weight: bold;">Phone</td>
            <td style="padding: 8px;">${order.phone || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #666; font-weight: bold;">कोर्स</td>
            <td style="padding: 8px; font-weight: bold;">${order.course_title}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; color: #666; font-weight: bold;">राशि</td>
            <td style="padding: 8px; font-size: 20px; font-weight: bold; color: #059669;">₹${order.amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #666; font-weight: bold;">डिलीवरी</td>
            <td style="padding: 8px; text-transform: uppercase; font-weight: bold;">${order.delivery_mode}</td>
          </tr>
          <tr style="background: #fef3c7;">
            <td style="padding: 8px; color: #92400e; font-weight: bold;">समय</td>
            <td style="padding: 8px; color: #92400e;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
          </tr>
        </table>

        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px; color: #92400e;">⚠️ कृपया manually verify करें</h3>
          <p style="margin: 0; color: #78350f; font-size: 14px;">
            UPI app में <strong>₹${order.amount}</strong> payment check करें।<br/>
            ${order.phone ? `<a href="https://wa.me/${order.phone.replace(/\D/g, "")}">WhatsApp पर ${order.phone} से संपर्क करें</a><br/>` : ""}
            ${order.email ? `<a href="mailto:${order.email}">${order.email} पर email भेजें</a>` : ""}
          </p>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          Arkado Admin Panel → <a href="https://arkado.in/admin">arkado.in/admin</a>
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
डिलीवरी: ${order.delivery_mode}
समय: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}

⚠️ कृपया manually verify करें — UPI app में payment check करें।
    `;

    await transporter.sendMail({
      from: `"Arkado" <${fromEmail}>`,
      to: adminEmail,
      subject,
      text,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Notify admin error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send notification" },
      { status: 500 }
    );
  }
}
