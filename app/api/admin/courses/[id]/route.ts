import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const FILE = join(process.cwd(), "data/courses-new.json");

function verifyAuth(req: NextRequest) {
  const auth = req.headers.get("authorization");
  return auth === "7877";
}

function readCourses() {
  return readFile(FILE, "utf-8").then(JSON.parse).catch(() => []);
}

function writeCourses(data: any[]) {
  return writeFile(FILE, JSON.stringify(data, null, 2));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const courses = await readCourses();
  const course = courses.find((c: any) => c.id === id);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(course);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const formData = await req.formData();
  const courses = await readCourses();
  const idx = courses.findIndex((c: any) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const course = courses[idx];
  const updates: any = { ...course, updated_at: new Date().toISOString() };

  for (const [key, value] of formData.entries()) {
    if (key === "cover") continue;
    if (["highlights", "subjects", "syllabus_preview"].includes(key)) updates[key] = JSON.parse(value.toString());
    else if (key === "is_active" || key === "show_in_slider") updates[key] = value === "true";
    else if (["original_price", "price", "discount_percent", "rating", "priority"].includes(key)) updates[key] = Number(value);
    else updates[key] = value.toString();
  }

  const cover = formData.get("cover") as File | null;
  if (cover && cover.size > 0) {
    const bytes = await cover.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = cover.name.split(".").pop() || "jpg";
    const fileName = `${id}.${ext}`;
    const publicDir = join(process.cwd(), "public/images/bundles");
    await writeFile(join(publicDir, fileName), buffer);
    updates.cover_image = `/images/bundles/${fileName}`;
  }

  // Recalculate discount
  if (updates.original_price && updates.price) {
    updates.discount_percent = Math.round(((updates.original_price - updates.price) / updates.original_price) * 100);
  }

  courses[idx] = updates;
  await writeCourses(courses);
  return NextResponse.json(updates);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const courses = await readCourses();
  const filtered = courses.filter((c: any) => c.id !== id);
  if (filtered.length === courses.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await writeCourses(filtered);
  return NextResponse.json({ success: true });
}