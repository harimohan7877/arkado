import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData, saveUploadedFile } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_FILE_SIZE = 500 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function readCategories() {
  return getStoreData<any[]>("categories", "data/categories.json", []);
}

function writeCategories(data: unknown[]) {
  return setStoreData("categories", "data/categories.json", data);
}

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await readCategories();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const categories = await readCategories();

  const newCategory = {
    id: formData.get("name")?.toString().toLowerCase().replace(/\s+/g, "-") || `cat-${Date.now()}`,
    name: formData.get("name")?.toString() || "",
    name_hi: formData.get("name_hi")?.toString() || "",
    icon: formData.get("icon")?.toString() || "📁",
    color: formData.get("color")?.toString() || "bg-blue-600",
    priority: Number(formData.get("priority") || categories.length + 1),
    is_active: formData.get("is_active") === "true",
    exam_ids: JSON.parse(formData.get("exam_ids")?.toString() || "[]"),
    logo_url: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const logo = formData.get("logo") as File | null;
  if (logo && logo.size > 0) {
    if (logo.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 500KB allowed." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(logo.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP, GIF allowed." }, { status: 400 });
    }
    const safeName = newCategory.id.replace(/[^a-z0-9-]/gi, "");
    newCategory.logo_url = await saveUploadedFile(logo, "logos", safeName);
  }

  categories.push(newCategory);
  await writeCategories(categories);
  return NextResponse.json(newCategory);
}