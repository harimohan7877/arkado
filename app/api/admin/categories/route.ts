import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData, saveUploadedFile, isAllowedImageType, MAX_IMAGE_SIZE } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readCategories() {
  return getStoreData<any[]>("categories", "data/categories.json", []);
}

function writeCategories(data: unknown[]) {
  return setStoreData("categories", "data/categories.json", data);
}

// GET: Supports progressive/lazy loading by category_id and board_id
export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("category_id");
  const boardId = searchParams.get("board_id");
  const summaryOnly = searchParams.get("summary") === "true";

  const allCategories = await readCategories();

  // 1. If board_id specified, return exams of that board
  if (categoryId && boardId) {
    const cat = allCategories.find((c: any) => c.id === categoryId || c.category_id === categoryId);
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    const board = (cat.boards || []).find((b: any) => b.board_id === boardId || b.id === boardId);
    if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });
    return NextResponse.json({
      board: {
        board_id: board.board_id || board.id,
        name: board.name,
        short_name: board.short_name,
        icon: board.icon,
        logo_url: board.logo_url,
        priority: board.priority,
        is_active: board.is_active,
        viral_preview: board.viral_preview,
        viral_names: board.viral_names || [],
        official_portal: board.official_portal
      },
      exams: board.exams || []
    });
  }

  // 2. If category_id specified, return boards of that category
  if (categoryId) {
    const cat = allCategories.find((c: any) => c.id === categoryId || c.category_id === categoryId);
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    return NextResponse.json({
      category: {
        id: cat.id || cat.category_id,
        name: cat.name,
        name_hi: cat.name_hi,
        icon: cat.icon,
        logo_url: cat.logo_url,
        priority: cat.priority,
        is_active: cat.is_active,
        sub_preview: cat.sub_preview,
        viral_names: cat.viral_names || [],
        description: cat.description
      },
      boards: (cat.boards || []).map((b: any) => ({
        board_id: b.board_id || b.id,
        name: b.name,
        short_name: b.short_name,
        icon: b.icon,
        logo_url: b.logo_url,
        priority: b.priority,
        is_active: b.is_active,
        viral_preview: b.viral_preview,
        viral_names: b.viral_names || [],
        official_portal: b.official_portal,
        total_exams: (b.exams || []).length
      }))
    });
  }

  // 3. Summary only: returns lightweight categories list without loading nested boards/exams
  if (summaryOnly) {
    const summaries = allCategories.map((c: any) => ({
      id: c.id || c.category_id,
      name: c.name,
      name_hi: c.name_hi,
      icon: c.icon,
      logo_url: c.logo_url,
      priority: c.priority,
      is_active: c.is_active,
      sub_preview: c.sub_preview,
      viral_names: c.viral_names || [],
      description: c.description,
      total_boards: (c.boards || []).length,
      total_exams: (c.boards || []).reduce((acc: number, b: any) => acc + (b.exams || []).length, 0)
    }));
    return NextResponse.json(summaries);
  }

  // 4. Default: return all categories
  return NextResponse.json(allCategories);
}

// PUT: Bulk update or tree update
export async function PUT(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const updated = Array.isArray(body) ? body : body.categories;
      if (Array.isArray(updated)) {
        await writeCategories(updated);
        return NextResponse.json({ success: true, count: updated.length });
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}

// POST: Add new category or upload file
export async function POST(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const contentType = req.headers.get("content-type") || "";
    const categories = await readCategories();

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const targetType = formData.get("type")?.toString() || "category";
      const categoryId = formData.get("category_id")?.toString();
      const boardId = formData.get("board_id")?.toString();

      let logoUrl = "";
      const logo = formData.get("logo") as File | null;
      if (logo && logo.size > 0) {
        if (logo.size > MAX_IMAGE_SIZE) {
          return NextResponse.json({ error: "File too large. Max 10MB allowed." }, { status: 400 });
        }
        if (!isAllowedImageType(logo.type, logo.name)) {
          return NextResponse.json({ error: "Invalid file type. Please upload an image." }, { status: 400 });
        }
        const safeName = `item_${Date.now()}`;
        logoUrl = await saveUploadedFile(logo, "logos", safeName);
      }

      // Handle Category addition
      if (targetType === "category") {
        const newCat = {
          id: formData.get("id")?.toString() || `cat-${Date.now()}`,
          name: formData.get("name")?.toString() || "",
          name_hi: formData.get("name_hi")?.toString() || "",
          icon: formData.get("icon")?.toString() || "📁",
          logo_url: logoUrl || formData.get("logo_url")?.toString() || "",
          priority: Number(formData.get("priority") || categories.length + 1),
          is_active: formData.get("is_active") === "true",
          sub_preview: formData.get("sub_preview")?.toString() || "",
          viral_names: JSON.parse(formData.get("viral_names")?.toString() || "[]"),
          description: formData.get("description")?.toString() || "",
          boards: []
        };
        categories.push(newCat);
        await writeCategories(categories);
        return NextResponse.json({ success: true, item: newCat });
      }

      // Handle Board addition
      if (targetType === "board" && categoryId) {
        const catIdx = categories.findIndex((c: any) => c.id === categoryId || c.category_id === categoryId);
        if (catIdx === -1) return NextResponse.json({ error: "Parent category not found" }, { status: 404 });
        const boards = categories[catIdx].boards || [];
        const newBoard = {
          board_id: formData.get("board_id")?.toString() || `board-${Date.now()}`,
          name: formData.get("name")?.toString() || "",
          short_name: formData.get("short_name")?.toString() || "",
          icon: formData.get("icon")?.toString() || "🏛️",
          logo_url: logoUrl || formData.get("logo_url")?.toString() || "",
          priority: Number(formData.get("priority") || boards.length + 1),
          is_active: formData.get("is_active") === "true",
          viral_preview: formData.get("viral_preview")?.toString() || "",
          viral_names: JSON.parse(formData.get("viral_names")?.toString() || "[]"),
          official_portal: formData.get("official_portal")?.toString() || "",
          exams: []
        };
        boards.push(newBoard);
        categories[catIdx].boards = boards;
        await writeCategories(categories);
        return NextResponse.json({ success: true, item: newBoard });
      }

      // Handle Exam addition
      if (targetType === "exam" && categoryId && boardId) {
        const catIdx = categories.findIndex((c: any) => c.id === categoryId || c.category_id === categoryId);
        if (catIdx === -1) return NextResponse.json({ error: "Parent category not found" }, { status: 404 });
        const boards = categories[catIdx].boards || [];
        const boardIdx = boards.findIndex((b: any) => b.board_id === boardId || b.id === boardId);
        if (boardIdx === -1) return NextResponse.json({ error: "Parent board not found" }, { status: 404 });
        const exams = boards[boardIdx].exams || [];
        const newExam = {
          id: formData.get("id")?.toString() || `exam-${Date.now()}`,
          name: formData.get("name")?.toString() || "",
          short_name: formData.get("short_name")?.toString() || "",
          logo_url: logoUrl || formData.get("logo_url")?.toString() || "",
          priority: Number(formData.get("priority") || exams.length + 1),
          is_active: formData.get("is_active") === "true",
          eligibility: formData.get("eligibility")?.toString() || "",
          age_limit: formData.get("age_limit")?.toString() || "",
          applicant_scale: formData.get("applicant_scale")?.toString() || "",
          exam_pattern: formData.get("exam_pattern")?.toString() || "",
          viral_subtext: formData.get("viral_subtext")?.toString() || "",
          notes_link: formData.get("notes_link")?.toString() || ""
        };
        exams.push(newExam);
        boards[boardIdx].exams = exams;
        categories[catIdx].boards = boards;
        await writeCategories(categories);
        return NextResponse.json({ success: true, item: newExam });
      }
    }

    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (Array.isArray(body)) {
        await writeCategories(body);
        return NextResponse.json({ success: true, count: body.length });
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process request" }, { status: 500 });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
