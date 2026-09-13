import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const fileName = slug.join("/");
  const cleanName = fileName.replace(/^\/+/, "");

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

  // 2. Fetch directly from Supabase Cloud Storage (arkado-uploads/mock-tests/...)
  // This ensures files uploaded via Admin on Vercel NEVER return 404!
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

  // 3. Fallback: Check Supabase Public CDN URL
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

  // 4. Return helpful fallback if file is truly not found
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
