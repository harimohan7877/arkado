import { NextRequest, NextResponse } from "next/server";
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
  const course = courses.find((c) => c.id === id || c.exam_id === id);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(course);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const contentType = req.headers.get("content-type") || "";
  const courses = await readCourses();
  let idx = courses.findIndex((c) => c.id === id || c.exam_id === id || (id.startsWith("exam-") && c.exam_id === id.replace("exam-", "")));

  let updates: Record<string, unknown> = idx >= 0 ? { ...courses[idx] } : { id };
  updates.updated_at = new Date().toISOString();

  let coverFile: File | null = null;

  if (contentType.includes("application/json")) {
    const json = await req.json();
    updates = { ...updates, ...json };
  } else {
    const formData = await req.formData();
    for (const [key, value] of formData.entries()) {
      if (key === "cover") {
        coverFile = value as File;
      } else if (["highlights", "subjects", "syllabus_preview"].includes(key)) {
        updates[key] = JSON.parse(value.toString() || "[]");
      } else if (["is_active", "show_in_slider", "is_featured", "is_new_arrival"].includes(key)) {
        updates[key] = value === "true";
      } else if (
        ["original_price", "price", "discount_percent", "rating", "priority", "featured_priority", "new_arrival_priority"].includes(
          key
        )
      ) {
        updates[key] = Number(value);
      } else {
        updates[key] = value.toString();
      }
    }
  }

  if (coverFile && coverFile.size > 0) {
    if (coverFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 1MB allowed." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(coverFile.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP allowed." }, { status: 400 });
    }
    const safeId = id.replace(/[^a-z0-9-]/gi, "");
    updates.cover_image = await saveUploadedFile(coverFile, "images/bundles", safeId);
  }

  if (updates.original_price && updates.price) {
    const orig = Number(updates.original_price);
    const prc = Number(updates.price);
    if (orig > 0) {
      updates.discount_percent = Math.round(((orig - prc) / orig) * 100);
    }
  }

  if (idx >= 0) {
    courses[idx] = updates as Course;
  } else {
    // If not existing, append as new custom course!
    courses.push(updates as Course);
  }

  await writeCourses(courses);
  return NextResponse.json(updates);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const courses = await readCourses();
  const filtered = courses.filter((c) => c.id !== id && c.exam_id !== id && `exam-${c.exam_id}` !== id);
  await writeCourses(filtered);
  return NextResponse.json({ success: true });
}
