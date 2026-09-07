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

export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await readCourses();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const courses = await readCourses();

  const slug = formData.get("slug")?.toString() || formData.get("title")?.toString().toLowerCase().replace(/\s+/g, "-") || `course-${Date.now()}`;

  const newCourse = {
    id: slug,
    exam_id: formData.get("exam_id")?.toString() || "",
    title: formData.get("title")?.toString() || "",
    slug,
    badge: formData.get("badge")?.toString() || "Complete Kit",
    short_description: formData.get("short_description")?.toString() || "",
    original_price: Number(formData.get("original_price") || 999),
    price: Number(formData.get("price") || 199),
    discount_percent: Math.round(((Number(formData.get("original_price") || 999) - Number(formData.get("price") || 199)) / Number(formData.get("original_price") || 999)) * 100),
    highlights: JSON.parse(formData.get("highlights")?.toString() || "[]"),
    subjects: JSON.parse(formData.get("subjects")?.toString() || "[]"),
    syllabus_preview: JSON.parse(formData.get("syllabus_preview")?.toString() || "[]"),
    pages_count: formData.get("pages_count")?.toString() || "",
    format: formData.get("format")?.toString() || "Printable PDF",
    language: formData.get("language")?.toString() || "Hindi",
    cover_image: formData.get("cover_image")?.toString() || "/images/bundles/cet_bundle_3d.jpg",
    show_in_slider: formData.get("show_in_slider") === "true",
    slider_tagline: formData.get("slider_tagline")?.toString() || "",
    sample_pdf_url: formData.get("sample_pdf_url")?.toString() || "https://drive.google.com",
    drive_url: formData.get("drive_url")?.toString() || "https://drive.google.com",
    rating: Number(formData.get("rating") || 4.9),
    rating_count: formData.get("rating_count")?.toString() || "0",
    is_active: formData.get("is_active") === "true",
    priority: Number(formData.get("priority") || courses.length + 1),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const cover = formData.get("cover") as File | null;
  if (cover && cover.size > 0) {
    const bytes = await cover.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = cover.name.split(".").pop() || "jpg";
    const fileName = `${slug}.${ext}`;
    const publicDir = join(process.cwd(), "public/images/bundles");
    await writeFile(join(publicDir, fileName), buffer);
    newCourse.cover_image = `/images/bundles/${fileName}`;
  }

  courses.push(newCourse);
  await writeCourses(courses);
  return NextResponse.json(newCourse);
}