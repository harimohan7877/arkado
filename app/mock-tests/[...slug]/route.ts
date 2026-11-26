import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { supabaseAdmin } from "@/lib/supabase";
import { r2Get, r2PublicUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const fileName = slug.join("/");
  const cleanName = fileName.replace(/^\/+/, "");

  // Block path traversal: ".." segments and encoded variants (%2e, %252e, %5c, backslash).
  // Next.js normalizes ".." before routing, but this guard keeps the file read safe by construction.
  if (/(^|\/)\.\.(\/|$)/.test(cleanName) || /%2e|%5c|\\/i.test(cleanName)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // 1. Check local disk (for development & files committed to git)
  const localPath = join(process.cwd(), "public", "mock-tests", cleanName);
  if (existsSync(localPath)) {
    try {
      const content = await readFile(localPath, "utf-8");
      return new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    } catch (err) {
      console.warn("[mock-tests route] Local file read error:", err);
    }
  }

  // 2. Fetch from R2 public URL (Cloudflare R2 — primary storage)
  try {
    const storagePath = `mock-tests/${cleanName}`;
    const publicUrl = r2PublicUrl(storagePath);
    if (publicUrl) {
      const r2Res = await fetch(publicUrl);
      if (r2Res.ok) {
        const text = await r2Res.text();
        return new NextResponse(text, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      }
    }
  } catch (r2Err) {
    console.warn("[mock-tests route] R2 public URL fetch error:", r2Err);
  }

  // 3. Fetch from R2 via S3 GetObject (same bucket, signed request)
  try {
    const storagePath = `mock-tests/${cleanName}`;
    const buf = await r2Get(storagePath);
    if (buf) {
      return new NextResponse(buf.toString("utf-8"), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    }
  } catch (r2Err) {
    console.warn("[mock-tests route] R2 GetObject error:", r2Err);
  }

  // 4. Fetch directly from Supabase Cloud Storage (arkado-uploads/mock-tests/...)
  // Fallback only — Supabase Storage is currently 402-restricted, so this
  // silently fails until the quota resets; it stays for the recovery window.
  try {
    const storagePath = `mock-tests/${cleanName}`;
    const { data, error } = await supabaseAdmin.storage
      .from("arkado-uploads")
      .download(storagePath);

    if (!error && data) {
      const htmlText = await data.text();
      return new NextResponse(htmlText, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    }
  } catch (sbErr) {
    console.warn("[mock-tests route] Supabase download error:", sbErr);
  }

  // 5. Fallback: Check Supabase Public CDN URL
  try {
    const storagePath = `mock-tests/${cleanName}`;
    const { data: pubData } = supabaseAdmin.storage
      .from("arkado-uploads")
      .getPublicUrl(storagePath);

    if (pubData?.publicUrl) {
      const cdnRes = await fetch(pubData.publicUrl);
      if (cdnRes.ok) {
        const text = await cdnRes.text();
        return new NextResponse(text, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      }
    }
  } catch {}

  // 6. Return helpful fallback if file is truly not found
  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="hi">
      <head>
        <meta charset="utf-8">
        <title>मॉक टेस्ट उपलब्ध नहीं | Arkado</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 60px 20px; background: #f8fafc; color: #1e293b; }
          .card { max-width: 500px; margin: 0 auto; background: white; padding: 36px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
          .icon { font-size: 40px; margin-bottom: 16px; }
          h1 { font-size: 20px; font-weight: 800; margin-bottom: 12px; color: #b45309; }
          p { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 24px; }
          .btn { display: inline-block; padding: 12px 24px; background: #d97706; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 13px; }
          .btn:hover { background: #b45309; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">⚠️</div>
          <h1>मॉक टेस्ट फ़ाइल लोड नहीं हो सकी</h1>
          <p>यह डेमो टेस्ट फ़ाइल अभी उपलब्ध नहीं है। कृपया एडमिन पैनल से पुनः HTML फ़ाइल अपलोड करें या सही लिंक सेट करें।</p>
          <a href="/" class="btn">← मुख्य वेबसाइट पर लौटें</a>
        </div>
      </body>
    </html>`,
    {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}
