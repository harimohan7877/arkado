import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { verifyAdminSession } from "@/lib/admin-auth";

const FILE = join(process.cwd(), "data/courses-new.json");
const MAX_FILE_SIZE = 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface Course {
  id: string;
  [key: string]: unknown;
}

function readCourses(): Promise<Course[]> {
  return readFile(FILE, "utf-8").then(JSON.parse).catch(() => []);
}

function writeCourses(data: unknown[]) {
  return writeFile(FILE, JSON.stringify(data, null, 2));
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
    else if (key === "is_active" || key === "show_in_slider") updates[key] = value === "true";
    else if (["original_price", "price", "discount_percent", "rating", "priority"].includes(key)) updates[key] = Number(value);
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
    const bytes = await cover.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = cover.name.split(".").pop() || "jpg";
    const safeId = id.replace(/[^a-z0-9-]/gi, "");
    const fileName = `${safeId}.${ext}`;
    const publicDir = join(process.cwd(), "public/images/bundles");
    await writeFile(join(publicDir, fileName), buffer);
    updates.cover_image = `/images/bundles/${fileName}`;
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
