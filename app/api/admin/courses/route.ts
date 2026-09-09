import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData, saveUploadedFile, isAllowedImageType, MAX_IMAGE_SIZE } from "@/lib/store-data";

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
    const categories = await getStoreData<CategoryRecord[]>("categories", "data/categories.json", []);

    // Extract all active exams from the exam section
    const activeExams: any[] = [];
    for (const c of categories) {
      for (const b of c.boards || []) {
        for (const e of b.exams || []) {
          if (e.is_active) {
            activeExams.push({
              ...e,
              board_name: b.short_name || b.name,
              category_name: c.name,
            });
          }
        }
      }
    }

    // Combine: Keep custom courses, and for any active exam that doesn't have a custom course, auto-sync it!
    const combined: any[] = [...courses];
    const coveredExamIds = new Set(courses.map((c: any) => c.exam_id).filter(Boolean));

    for (const exam of activeExams) {
      if (!coveredExamIds.has(exam.id)) {
        combined.push({
          id: `exam-${exam.id}`,
          exam_id: exam.id,
          title: `${exam.name} - Complete Selection Kit`,
          slug: `exam-${exam.id}`,
          badge: "Selection Kit",
          short_description:
            exam.viral_subtext ||
            `${exam.name} (${exam.board_name}) हेतु 2026 नए सिलेबस पर आधारित सम्पूर्ण हस्तलिखित थ्योरी नोट्स, 3000+ MCQs और फुल मॉक टेस्ट।`,
          original_price: 999,
          price: 199,
          discount_percent: 80,
          highlights: [
            "सम्पूर्ण विषयवार हस्तलिखित थ्योरी नोट्स",
            "3000+ विषयवार वस्तुनिष्ठ प्रश्नोत्तर (MCQs) व्याख्या सहित",
            "5 फुल लेंथ मॉडल टेस्ट पेपर्स (ओरिजिनल परीक्षा पैटर्न पर)",
            "प्रिंट हेतु तैयार A4 साइज PDF फॉर्मेट",
          ],
          subjects: [
            `${exam.name} थ्योरी नोट्स एवं संपूर्ण सिलेबस`,
            "विषयवार वस्तुनिष्ठ प्रश्नोत्तर (MCQs)",
            "पिछले वर्षों के हल प्रश्न-पत्र (PYQs)",
            "मॉडल टेस्ट पेपर्स एवं अभ्यास प्रश्न",
          ],
          syllabus_preview: [],
          pages_count: "1,250+ Pages",
          format: "Printable PDF",
          language: "हिन्दी (Hindi)",
          cover_image: exam.logo_url || "/images/bundles/cet_bundle_3d.jpg",
          show_in_slider: false,
          slider_tagline: "",
          is_featured: false,
          featured_priority: 1,
          is_new_arrival: false,
          new_arrival_priority: 1,
          sample_pdf_url: exam.notes_link || "https://drive.google.com",
          drive_url: exam.notes_link || "https://drive.google.com",
          rating: 4.9,
          rating_count: "3,500+ छात्र",
          is_active: true,
          is_auto_synced: true,
          priority: exam.priority || combined.length + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json(combined);
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

    if (contentType.includes("application/json")) {
      data = await req.json();
    } else {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        if (key === "cover") {
          coverFile = value as File;
        } else if (["highlights", "subjects", "syllabus_preview"].includes(key)) {
          data[key] = JSON.parse(value.toString() || "[]");
        } else if (["is_active", "show_in_slider", "is_featured", "is_new_arrival"].includes(key)) {
          data[key] = value === "true";
        } else if (
          ["original_price", "price", "discount_percent", "rating", "priority", "featured_priority", "new_arrival_priority"].includes(
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

    let coverImage = data.cover_image || "/images/bundles/cet_bundle_3d.webp";
    if (coverFile && coverFile.size > 0) {
      if (coverFile.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: "File too large. Max 10MB allowed." }, { status: 400 });
      }
      if (!isAllowedImageType(coverFile.type, coverFile.name)) {
        return NextResponse.json({ error: "Invalid file type. Please upload an image." }, { status: 400 });
      }
      coverImage = await saveUploadedFile(coverFile, "images/bundles", id);
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
      rating: Number(data.rating || 4.9),
      rating_count: data.rating_count || "2,500+ छात्र",
      is_active: data.is_active !== false,
      priority: Number(data.priority || courses.length + 1),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // If course with same id or exam_id exists, update it, else append
    const existingIndex = courses.findIndex((c) => c.id === id || (c.exam_id && c.exam_id === newCourse.exam_id));
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
