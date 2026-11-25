import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, saveCatalogueCourse, deleteCatalogueCourse, saveUploadedFile, saveUploadedHtmlFile, isAllowedImageType, MAX_IMAGE_SIZE } from "@/lib/store-data";
import { isRealDriveLink } from "@/lib/deliver-order";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Course {
  id: string;
  [key: string]: unknown;
}

function readCourses(): Promise<Course[]> {
  return getStoreData<Course[]>("courses", "data/courses.json", []);
}

function findCatalogueCourse(courses: Course[], id: string) {
  return courses.find((course) => course.id === id) ??
    courses.find((course) => course.slug === id);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminSession(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const courses = await readCourses();
  const course = findCatalogueCourse(courses, id);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(course);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminSession(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const contentType = req.headers.get("content-type") || "";
  const courses = await readCourses();
  const course = findCatalogueCourse(courses, id);
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });

  let updates: Course = { ...course };
  updates.updated_at = new Date().toISOString();

  let coverFile: File | null = null;
  let mockHtmlFile: File | null = null;

  if (contentType.includes("application/json")) {
    const json = await req.json();
    updates = { ...updates, ...json };
  } else {
    const formData = await req.formData();
    for (const [key, value] of formData.entries()) {
      if (key === "cover") {
        coverFile = value as File;
      } else if (key === "mock_html_file") {
        mockHtmlFile = value as File;
      } else if (["highlights", "subjects", "syllabus_preview"].includes(key)) {
        updates[key] = JSON.parse(value.toString() || "[]");
      } else if (["is_active", "show_in_slider", "is_featured", "is_new_arrival", "demo_html_mock_enabled"].includes(key)) {
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

  // Never persist the bare Drive homepage as a link: delivery treats any
  // non-empty drive_url as a real file link, so a stored placeholder
  // would ship the Drive homepage to a paying customer as their
  // download. (The admin forms used to prefill it; the server strips it
  // here so no client can reintroduce it.)
  for (const key of ["drive_url", "sample_pdf_url"] as const) {
    if (!isRealDriveLink(updates[key] as string | undefined)) updates[key] = "";
  }

  const safeId = id.replace(/[^a-z0-9_-]/gi, "");

  if (coverFile && coverFile.size > 0) {
    if (coverFile.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 10MB allowed." }, { status: 400 });
    }
    if (!isAllowedImageType(coverFile.type, coverFile.name)) {
      return NextResponse.json({ error: "Invalid file type. Please upload an image." }, { status: 400 });
    }
    updates.cover_image = await saveUploadedFile(coverFile, "images/bundles", safeId);
  }

  // Handle optional HTML mock test demo file upload (saves to permanent Supabase Cloud Storage & disk)
  if (mockHtmlFile && mockHtmlFile.size > 0) {
    const uploadedHtmlUrl = await saveUploadedHtmlFile(mockHtmlFile, safeId);
    if (uploadedHtmlUrl) {
      updates.demo_html_mock_url = uploadedHtmlUrl;
    }
  }

  if (updates.original_price && updates.price) {
    const orig = Number(updates.original_price);
    const prc = Number(updates.price);
    if (orig > 0) {
      updates.discount_percent = Math.round(((orig - prc) / orig) * 100);
    }
  }

  // Use the canonical ID from the lookup even if a request includes an ID field.
  updates.id = course.id;
  try {
    await saveCatalogueCourse(updates, course);
    return NextResponse.json(updates);
  } catch (error) {
    console.error("[admin courses] Could not update course:", error);
    return NextResponse.json({ error: "Course could not be saved." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminSession(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const courses = await readCourses();
  const course = findCatalogueCourse(courses, id);
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  try {
    await deleteCatalogueCourse(course);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin courses] Could not delete course:", error);
    return NextResponse.json({ error: "Course could not be deleted." }, { status: 500 });
  }
}
