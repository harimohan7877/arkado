import { NextRequest, NextResponse } from "next/server";
import { getStoreData, setStoreData } from "@/lib/store-data";
import { verifyAdminSession } from "@/lib/admin-auth";

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

interface FeaturedExamConfig {
  id: string;
  name: string;
  short_name?: string;
  logo_url?: string;
  board_name?: string;
  category_name?: string;
  priority?: number;
}

interface FeaturedStore {
  featured_exams?: FeaturedExamConfig[];
  new_arrivals?: FeaturedExamConfig[];
}

function buildDynamicCourseForExam(exam: any, type?: "featured" | "new_arrival") {
  const priority = exam.priority || 1;
  const boardName = exam.board_name || exam.board || "Exam Board";
  const catName = exam.category_name || "General";

  return {
    id: `bundle-exam-${exam.id}`,
    exam_id: exam.id,
    title: `${exam.name} - Complete Selection Kit`,
    slug: exam.slug || `exam-${exam.id}`,
    badge: "Complete Selection Kit",
    short_description:
      exam.viral_subtext ||
      `${exam.name} (${boardName}) हेतु 2026 नए सिलेबस पर आधारित सम्पूर्ण हस्तलिखित थ्योरी नोट्स, 3000+ MCQs और फुल मॉक टेस्ट पेपर्स।`,
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
    show_in_slider: true,
    slider_tagline: "सलेक्शन का पक्का साथी — 80% विशेष छूट",
    sample_pdf_url: exam.notes_link || "https://drive.google.com",
    drive_url: exam.notes_link || "https://drive.google.com",
    rating: 4.9,
    rating_count: "3,850+ छात्र",
    is_active: true,
    is_featured: type === "featured",
    featured_priority: priority,
    is_new_arrival: type === "new_arrival",
    new_arrival_priority: priority,
    priority: priority,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const exam = searchParams.get("exam");
  const slider = searchParams.get("slider");
  const featured = searchParams.get("featured");
  const newArrivals = searchParams.get("new_arrivals");
  const includeInactive = searchParams.get("all") === "true";

  try {
    const customCourses = await getStoreData<any[]>("courses", "data/courses-new.json", []);
    const categories = await getStoreData<CategoryRecord[]>("categories", "data/categories.json", []);

    // Extract all active exams from categories
    const activeExams: any[] = [];
    for (const c of categories) {
      for (const b of c.boards || []) {
        for (const e of b.exams || []) {
          if (includeInactive || e.is_active) {
            activeExams.push({
              ...e,
              board_name: b.short_name || b.name,
              category_name: c.name,
              category_id: c.id,
            });
          }
        }
      }
    }

    // Combine custom courses and active exams
    const allMergedCourses: any[] = [...customCourses];
    const coveredExamIds = new Set(customCourses.map((c: any) => c.exam_id).filter(Boolean));

    for (const actExam of activeExams) {
      if (!coveredExamIds.has(actExam.id)) {
        allMergedCourses.push(buildDynamicCourseForExam(actExam));
      }
    }

    // Read featured configuration from admin panel
    const featuredConfig = await getStoreData<FeaturedStore>("featured_exams", "data/featured_exams.json", {
      featured_exams: [],
      new_arrivals: [],
    });

    if (featured === "true") {
      const configList = Array.isArray(featuredConfig.featured_exams) ? featuredConfig.featured_exams : [];
      const result: any[] = [];
      const usedIds = new Set<string>();

      for (const featExam of configList) {
        const matched = allMergedCourses.find(
          (c) =>
            c.exam_id === featExam.id ||
            c.id === featExam.id ||
            c.slug === featExam.id ||
            (featExam.name && c.title.toLowerCase().includes(featExam.name.toLowerCase().split(" ")[0]))
        );

        if (matched) {
          result.push({
            ...matched,
            is_active: true,
            is_featured: true,
            featured_priority: featExam.priority || result.length + 1,
          });
          usedIds.add(matched.id);
        } else {
          const syn = buildDynamicCourseForExam(featExam, "featured");
          result.push(syn);
          usedIds.add(syn.id);
        }
      }

      for (const c of allMergedCourses) {
        if ((includeInactive || c.is_active) && c.is_featured && !usedIds.has(c.id)) {
          result.push(c);
          usedIds.add(c.id);
        }
      }

      if (result.length === 0) {
        return NextResponse.json(allMergedCourses.filter((c) => c.is_active).slice(0, 4));
      }

      result.sort((a, b) => (a.featured_priority || 99) - (b.featured_priority || 99));
      return NextResponse.json(result);
    }

    if (newArrivals === "true") {
      const configList = Array.isArray(featuredConfig.new_arrivals) ? featuredConfig.new_arrivals : [];
      const result: any[] = [];
      const usedIds = new Set<string>();

      for (const arrExam of configList) {
        const matched = allMergedCourses.find(
          (c) =>
            c.exam_id === arrExam.id ||
            c.id === arrExam.id ||
            c.slug === arrExam.id ||
            (arrExam.name && c.title.toLowerCase().includes(arrExam.name.toLowerCase().split(" ")[0]))
        );

        if (matched) {
          result.push({
            ...matched,
            is_active: true,
            is_new_arrival: true,
            new_arrival_priority: arrExam.priority || result.length + 1,
          });
          usedIds.add(matched.id);
        } else {
          const syn = buildDynamicCourseForExam(arrExam, "new_arrival");
          result.push(syn);
          usedIds.add(syn.id);
        }
      }

      for (const c of allMergedCourses) {
        if ((includeInactive || c.is_active) && c.is_new_arrival && !usedIds.has(c.id)) {
          result.push(c);
          usedIds.add(c.id);
        }
      }

      if (result.length === 0) {
        return NextResponse.json(allMergedCourses.filter((c) => c.is_active).slice(0, 4));
      }

      result.sort((a, b) => (a.new_arrival_priority || 99) - (b.new_arrival_priority || 99));
      return NextResponse.json(result);
    }

    if (slider === "true") {
      let sliderList = allMergedCourses.filter((c) => (includeInactive || c.is_active) && c.show_in_slider);
      if (sliderList.length === 0) {
        sliderList = allMergedCourses.filter((c) => c.is_active).slice(0, 4);
      }
      return NextResponse.json(sliderList);
    }

    if (exam) {
      const filtered = allMergedCourses.filter(
        (c) => (includeInactive || c.is_active) && (c.exam_id === exam || c.id === exam || c.slug === exam)
      );
      return NextResponse.json(filtered);
    }

    let finalCourses = allMergedCourses;
    if (!includeInactive) {
      finalCourses = finalCourses.filter((c) => c.is_active);
    }

    return NextResponse.json(finalCourses.sort((a, b) => (a.priority || 0) - (b.priority || 0)));
  } catch {
    return NextResponse.json([]);
  }
}

export async function PUT(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const updatedCourses = Array.isArray(body) ? body : body.courses;
    if (Array.isArray(updatedCourses)) {
      await setStoreData("courses", "data/courses-new.json", updatedCourses);
      await setStoreData("courses", "data/courses.json", updatedCourses);
      return NextResponse.json({ success: true, count: updatedCourses.length });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update courses" }, { status: 500 });
  }

  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}
