import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData, saveUploadedFile } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_FILE_SIZE = 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface Course {
  id: string;
  [key: string]: unknown;
}

function readCourses(): Promise<Course[]> {
  return getStoreData<Course[]>("courses", "data/courses-new.json", []);
}

async function writeCourses(data: unknown[]) {
  await setStoreData("courses", "data/courses-new.json", data);
  await setStoreData("courses", "data/courses.json", data);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const courses = await readCourses();
  const course = courses.find((c) => c.id === id);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(course);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const formData = await req.formData();
  const courses = await readCourses();
  const idx = courses.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const course = courses[idx];
  const updates: Record<string, unknown> = { ...course, updated_at: new Date().toISOString() };

  for (const [key, value] of formData.entries()) {
    if (key === "cover") continue;
    if (["highlights", "subjects", "syllabus_preview"].includes(key)) updates[key] = JSON.parse(value.toString());
    else if (["is_active", "show_in_slider", "is_featured", "is_new_arrival"].includes(key)) updates[key] = value === "true";
    else if (["original_price", "price", "discount_percent", "rating", "priority", "featured_priority", "new_arrival_priority"].includes(key)) updates[key] = Number(value);
    else updates[key] = value.toString();
  }

  const cover = formData.get("cover") as File | null;
  if (cover && cover.size > 0) {
    if (cover.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 1MB allowed." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(cover.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP allowed." }, { status: 400 });
    }
    const safeId = id.replace(/[^a-z0-9-]/gi, "");
    updates.cover_image = await saveUploadedFile(cover, "images/bundles", safeId);
  }

  if (updates.original_price && updates.price) {
    updates.discount_percent = Math.round((((updates.original_price as number) - (updates.price as number)) / (updates.original_price as number)) * 100);
  }

  courses[idx] = updates as Course;
  await writeCourses(courses);
  return NextResponse.json(updates);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const courses = await readCourses();
  const filtered = courses.filter((c) => c.id !== id);
  if (filtered.length === courses.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await writeCourses(filtered);
  return NextResponse.json({ success: true });
}
