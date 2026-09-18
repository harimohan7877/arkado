import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData, saveUploadedFile, saveUploadedHtmlFile, isAllowedImageType, MAX_IMAGE_SIZE } from "@/lib/store-data";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CategoryRecord {
  id: string;
  name: string;
  boards?: {
    name: string;
    short_name?: string;
    exams?: {
      id: string;
      name: string;
      short_name?: string;
      logo_url?: string;
      is_active?: boolean;
      priority?: number;
      eligibility?: string;
      exam_pattern?: string;
      viral_subtext?: string;
      notes_link?: string;
    }[];
  }[];
}

function readCourses() {
  return getStoreData<any[]>("courses", "data/courses-new.json", []);
}

async function writeCourses(data: unknown[]) {
  await setStoreData("courses", "data/courses-new.json", data);
  await setStoreData("courses", "data/courses.json", data);
}

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const courses = await readCourses();
    return NextResponse.json(courses);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load courses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const contentType = req.headers.get("content-type") || "";
    let data: any = {};
    let coverFile: File | null = null;
    let mockHtmlFile: File | null = null;

    if (contentType.includes("application/json")) {
      data = await req.json();
    } else {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        if (key === "cover") {
          coverFile = value as File;
        } else if (key === "mock_html") {
          mockHtmlFile = value as File;
        } else if (
          [
            "price",
            "original_price",
            "priority",
            "featured_priority",
            "new_arrival_priority",
            "rating",
          ].includes(key)
        ) {
          data[key] = Number(value);
        } else if (
          [
            "show_in_slider",
            "is_featured",
            "is_new_arrival",
            "is_active",
            "demo_html_mock_enabled",
          ].includes(key)
        ) {
          data[key] = value === "true" || value === "1";
        } else if (
          [
            "highlights",
            "subjects",
            "syllabus_preview",
            "learning_outcomes",
            "target_audience",
          ].includes(key)
        ) {
          try {
            data[key] = JSON.parse(value.toString());
          } catch {
            data[key] = value.toString();
          }
        } else if (
          [
            "price",
            "original_price",
            "priority",
            "featured_priority",
            "new_arrival_priority",
          ].includes(
            key
          )
        ) {
          data[key] = Number(value);
        } else {
          data[key] = value.toString();
        }
      }
    }

    const courses = await readCourses();
    const slug = data.slug || data.title?.toLowerCase().replace(/\s+/g, "-") || `course-${Date.now()}`;
    const id = data.id || slug;

    let coverImage = data.cover_image || "";
    if (coverFile && coverFile.size > 0) {
      if (coverFile.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: "File too large. Max 10MB allowed." }, { status: 400 });
      }
      if (!isAllowedImageType(coverFile.type, coverFile.name)) {
        return NextResponse.json({ error: "Invalid file type. Please upload an image." }, { status: 400 });
      }
      coverImage = await saveUploadedFile(coverFile, "images/bundles", id);
    }

    // Handle optional HTML mock test demo file upload (saves to permanent Supabase Cloud Storage & disk)
    if (mockHtmlFile && mockHtmlFile.size > 0) {
      const safeName = id.replace(/[^a-zA-Z0-9_-]/g, "_");
      const uploadedHtmlUrl = await saveUploadedHtmlFile(mockHtmlFile, safeName);
      if (uploadedHtmlUrl) {
        data.demo_html_mock_url = uploadedHtmlUrl;
      }
    }

    const originalPrice = Number(data.original_price || 999);
    const price = Number(data.price || 199);
    const discountPercent = Math.round((1 - price / originalPrice) * 100);

    const newCourse = {
      ...data,
      id,
      exam_id: data.exam_id || "",
      title: data.title || "",
      slug,
      badge: data.badge || "Complete Kit",
      short_description: data.short_description || "",
      original_price: originalPrice,
      price,
      discount_percent: discountPercent,
      highlights: Array.isArray(data.highlights) ? data.highlights : [],
      subjects: Array.isArray(data.subjects) ? data.subjects : [],
      syllabus_preview: Array.isArray(data.syllabus_preview) ? data.syllabus_preview : [],
      pages_count: data.pages_count || "1,250+ Pages",
      format: data.format || "Printable PDF",
      language: data.language || "Hindi",
      cover_image: coverImage,
      show_in_slider: Boolean(data.show_in_slider),
      slider_tagline: data.slider_tagline || "",
      is_featured: Boolean(data.is_featured),
      featured_priority: Number(data.featured_priority || 1),
      is_new_arrival: Boolean(data.is_new_arrival),
      new_arrival_priority: Number(data.new_arrival_priority || 1),
      sample_pdf_url: data.sample_pdf_url || "https://drive.google.com",
      drive_url: data.drive_url || "https://drive.google.com",
      demo_html_mock_enabled: Boolean(data.demo_html_mock_enabled),
      demo_html_mock_url: data.demo_html_mock_url || "",
      rating: Number(data.rating || 4.9),
      rating_count: data.rating_count || "2,500+ छात्र",
      is_active: data.is_active !== false,
      priority: Number(data.priority || courses.length + 1),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update if course with same exact id exists, else append
    const existingIndex = courses.findIndex((c) => c.id === id);
    if (existingIndex >= 0) {
      courses[existingIndex] = { ...courses[existingIndex], ...newCourse };
    } else {
      courses.push(newCourse);
    }

    await writeCourses(courses);
    return NextResponse.json(newCourse, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create course" }, { status: 500 });
  }
}
