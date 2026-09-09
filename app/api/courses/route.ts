import { NextRequest, NextResponse } from "next/server";
import { getStoreData, setStoreData } from "@/lib/store-data";
import { verifyAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function buildSyntheticCourse(exam: FeaturedExamConfig, type: "featured" | "new_arrival") {
  const priority = exam.priority || 1;
  const isCet = (exam.name || "").includes("CET");
  const isGrad = (exam.name || "").includes("स्नातक") || (exam.name || "").toLowerCase().includes("grad");
  
  return {
    id: `bundle-exam-${exam.id}`,
    exam_id: exam.id,
    title: `${exam.name} - Complete Selection Kit`,
    slug: isCet ? (isGrad ? "rajasthan-cet-grad" : "rajasthan-cet") : `exam-${exam.id}`,
    badge: "Notes + MCQs + Mock Tests",
    short_description: `${exam.name} हेतु 2026 नए सिलेबस पर आधारित सम्पूर्ण हस्तलिखित थ्योरी नोट्स, 3000+ MCQs और फुल मॉक टेस्ट पेपर्स।`,
    original_price: 999,
    price: 199,
    discount_percent: 80,
    highlights: [
      "सम्पूर्ण विषयवार हस्तलिखित थ्योरी नोट्स",
      "3000+ विषयवार वस्तुनिष्ठ प्रश्नोत्तर (MCQs) व्याख्या सहित",
      "5 फुल लेंथ मॉडल टेस्ट पेपर्स (ओरिजिनल परीक्षा पैटर्न पर)",
      "A4 साइज प्रिंटेबल PDF नोट्स"
    ],
    subjects: [
      "राजस्थान का इतिहास, कला एवं संस्कृति",
      "राजस्थान का भूगोल व नए जिले",
      "दैनिक विज्ञान एवं कंप्यूटर ज्ञान",
      "तार्किक विवेचन एवं सामान्य हिन्दी"
    ],
    syllabus_preview: [
      {
        subject: "राजस्थान का इतिहास व संस्कृति",
        chapters: ["प्रमुख राजवंश", "स्थापत्य कला", "मेले व त्योहार", "लोकदेवता व लोकदेवियां"]
      },
      {
        subject: "भूगोल एवं अर्थव्यवस्था",
        chapters: ["भौतिक स्वरूप व जलवायु", "नदियां व झीलें", "खनिज संसाधन", "कृषि एवं फसलें"]
      }
    ],
    pages_count: "1,350+ Pages",
    format: "Printable PDF",
    language: "हिन्दी (Hindi)",
    cover_image: exam.logo_url || (isCet ? "/images/bundles/cet_bundle_3d.jpg" : "/images/bundles/patwari_bundle_3d.jpg"),
    show_in_slider: true,
    slider_tagline: "सलेक्शन का पक्का साथी — 80% विशेष छूट",
    sample_pdf_url: "https://drive.google.com",
    drive_url: "https://drive.google.com",
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
    let courses = await getStoreData<any[]>("courses", "data/courses-new.json", []);

    // Also read featured exams configured by admin in "फीचर्ड एवं न्यू अराइवल्स"
    const featuredConfig = await getStoreData<FeaturedStore>("featured_exams", "data/featured_exams.json", {
      featured_exams: [],
      new_arrivals: [],
    });

    if (featured === "true") {
      const configList = Array.isArray(featuredConfig.featured_exams) ? featuredConfig.featured_exams : [];
      const result: any[] = [];
      const usedCourseIds = new Set<string>();

      // 1. First prioritize exams explicitly configured in admin Featured tab
      for (const featExam of configList) {
        // Try to match with an existing course bundle
        const matched = courses.find(
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
          usedCourseIds.add(matched.id);
        } else {
          // Construct course kit for this exam
          const syn = buildSyntheticCourse(featExam, "featured");
          result.push(syn);
          usedCourseIds.add(syn.id);
        }
      }

      // 2. Add any courses in courses-new.json with is_featured: true
      for (const c of courses) {
        if ((includeInactive || c.is_active) && c.is_featured && !usedCourseIds.has(c.id)) {
          result.push(c);
          usedCourseIds.add(c.id);
        }
      }

      // Fallback: if empty, return active courses
      if (result.length === 0) {
        return NextResponse.json(courses.filter((c: any) => c.is_active).slice(0, 4));
      }

      result.sort((a, b) => (a.featured_priority || 99) - (b.featured_priority || 99));
      return NextResponse.json(result);
    }

    if (newArrivals === "true") {
      const configList = Array.isArray(featuredConfig.new_arrivals) ? featuredConfig.new_arrivals : [];
      const result: any[] = [];
      const usedCourseIds = new Set<string>();

      // 1. Prioritize exams configured in admin New Arrivals tab
      for (const arrExam of configList) {
        const matched = courses.find(
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
          usedCourseIds.add(matched.id);
        } else {
          const syn = buildSyntheticCourse(arrExam, "new_arrival");
          result.push(syn);
          usedCourseIds.add(syn.id);
        }
      }

      // 2. Add any courses in courses-new.json with is_new_arrival: true
      for (const c of courses) {
        if ((includeInactive || c.is_active) && c.is_new_arrival && !usedCourseIds.has(c.id)) {
          result.push(c);
          usedCourseIds.add(c.id);
        }
      }

      // Fallback: if empty, return active courses
      if (result.length === 0) {
        return NextResponse.json(courses.filter((c: any) => c.is_active).slice(0, 4));
      }

      result.sort((a, b) => (a.new_arrival_priority || 99) - (b.new_arrival_priority || 99));
      return NextResponse.json(result);
    }

    if (slider === "true") {
      let sliderList = courses.filter((c: any) => (includeInactive || c.is_active) && c.show_in_slider);
      if (sliderList.length === 0) {
        sliderList = courses.filter((c: any) => c.is_active).slice(0, 4);
      }
      return NextResponse.json(sliderList);
    }

    if (exam) {
      courses = courses.filter((c: any) => (includeInactive || c.is_active) && (c.exam_id === exam || c.id === exam || c.slug === exam));
    } else {
      if (!includeInactive) {
        courses = courses.filter((c: any) => c.is_active);
      }
    }

    return NextResponse.json(courses.sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0)));
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
