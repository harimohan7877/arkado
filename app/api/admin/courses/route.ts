import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData, saveUploadedFile } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_FILE_SIZE = 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function readCourses() {
  return getStoreData<any[]>("courses", "data/courses-new.json", []);
}

async function writeCourses(data: unknown[]) {
  await setStoreData("courses", "data/courses-new.json", data);
  await setStoreData("courses", "data/courses.json", data);
}

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await readCourses();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    discount_percent: Math.round((1 - (Number(formData.get("price") || 199) / Number(formData.get("original_price") || 999))) * 100),
    highlights: JSON.parse(formData.get("highlights")?.toString() || "[]"),
    subjects: JSON.parse(formData.get("subjects")?.toString() || "[]"),
    syllabus_preview: JSON.parse(formData.get("syllabus_preview")?.toString() || "[]"),
    pages_count: formData.get("pages_count")?.toString() || "",
    format: formData.get("format")?.toString() || "Printable PDF",
    language: formData.get("language")?.toString() || "Hindi",
    cover_image: formData.get("cover_image")?.toString() || "/images/bundles/cet_bundle_3d.jpg",
    show_in_slider: formData.get("show_in_slider") === "true",
    slider_tagline: formData.get("slider_tagline")?.toString() || "",
    is_featured: formData.get("is_featured") === "true",
    featured_priority: Number(formData.get("featured_priority") || 1),
    is_new_arrival: formData.get("is_new_arrival") === "true",
    new_arrival_priority: Number(formData.get("new_arrival_priority") || 1),
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
    if (cover.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 1MB allowed." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(cover.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP allowed." }, { status: 400 });
    }
    const safeSlug = slug.replace(/[^a-z0-9-]/gi, "");
    newCourse.cover_image = await saveUploadedFile(cover, "images/bundles", safeSlug);
  }

  courses.push(newCourse);
  await writeCourses(courses);
  return NextResponse.json(newCourse);
}
