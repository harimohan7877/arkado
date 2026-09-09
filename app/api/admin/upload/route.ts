import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { saveUploadedFile, isAllowedImageType, MAX_IMAGE_SIZE } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder")?.toString() || "logos").replace(/[^a-zA-Z0-9_-]/g, "");

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum 10MB allowed." }, { status: 400 });
    }

    if (!isAllowedImageType(file.type, file.name)) {
      return NextResponse.json({ error: "Invalid file type. Please upload an image file." }, { status: 400 });
    }

    const safeName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fileUrl = await saveUploadedFile(file, folder, safeName);

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
