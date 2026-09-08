import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData, saveUploadedFile } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_FILE_SIZE = 500 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface Category {
  id: string;
  [key: string]: unknown;
}

function readCategories(): Promise<Category[]> {
  return getStoreData<Category[]>("categories", "data/categories.json", []);
}

function writeCategories(data: unknown[]) {
  return setStoreData("categories", "data/categories.json", data);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const categories = await readCategories();
  const cat = categories.find((c) => c.id === id);
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(cat);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const formData = await req.formData();
  const categories = await readCategories();
  const idx = categories.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cat = categories[idx];
  const updates: Record<string, unknown> = { ...cat, updated_at: new Date().toISOString() };

  for (const [key, value] of formData.entries()) {
    if (key === "logo") continue;
    if (key === "exam_ids") updates[key] = JSON.parse(value.toString());
    else if (key === "is_active") updates[key] = value === "true";
    else if (key === "priority") updates[key] = Number(value);
    else updates[key] = value.toString();
  }

  const logo = formData.get("logo") as File | null;
  if (logo && logo.size > 0) {
    if (logo.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 500KB allowed." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(logo.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP, GIF allowed." }, { status: 400 });
    }
    const safeId = id.replace(/[^a-z0-9-]/gi, "");
    updates.logo_url = await saveUploadedFile(logo, "logos", safeId);
  }

  categories[idx] = updates as Category;
  await writeCategories(categories);
  return NextResponse.json(updates);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const categories = await readCategories();
  const filtered = categories.filter((c) => c.id !== id);
  if (filtered.length === categories.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await writeCategories(filtered);
  return NextResponse.json({ success: true });
}
