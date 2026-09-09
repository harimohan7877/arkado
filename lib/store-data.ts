import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { supabaseAdmin } from "@/lib/supabase";

function getCandidatePaths(localFilePath: string): string[] {
  const norm = localFilePath.replaceAll("\\", "/");
  return [join(process.cwd(), norm)];
}

export async function saveUploadedFile(file: File, folder: string = "logos", customName?: string): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name ? file.name.split(".").pop() || "png" : "png";
    const fileName = `${customName || Date.now()}.${ext}`;
    const relativePath = `uploads/${folder}/${fileName}`;

    const candidates = getCandidatePaths(`public/${relativePath}`);
    for (const p of candidates) {
      try {
        const dir = dirname(p);
        await mkdir(dir, { recursive: true });
        await writeFile(p, buffer);
      } catch {}
    }

    return `/${relativePath}`;
  } catch (err) {
    console.error("[store-data] Upload error:", err);
    return "";
  }
}

export async function getStoreData<T>(key: string, localFilePath: string, defaultValue: T): Promise<T> {
  // 1. Check Supabase admin_settings text columns (GUARANTEED TO PERSIST ON VERCEL & CLOUD)
  try {
    const { data: adminRow } = await supabaseAdmin
      .from("admin_settings")
      .select("id, gemini_key, claude_key, openai_key")
      .limit(1)
      .maybeSingle();

    if (adminRow) {
      if (key === "categories" && adminRow.claude_key && (adminRow.claude_key.startsWith("[") || adminRow.claude_key.startsWith("{"))) {
        return JSON.parse(adminRow.claude_key) as T;
      }
      if (key === "featured_exams" && adminRow.openai_key && (adminRow.openai_key.startsWith("[") || adminRow.openai_key.startsWith("{"))) {
        return JSON.parse(adminRow.openai_key) as T;
      }
      if (key === "settings" && adminRow.gemini_key && adminRow.gemini_key.startsWith("{")) {
        return JSON.parse(adminRow.gemini_key) as T;
      }
    }
  } catch (err) {
    console.warn(`[store-data] Supabase read error for key=${key}:`, err);
  }

  // 2. Fallback to candidate local JSON files
  const candidates = getCandidatePaths(localFilePath);
  for (const p of candidates) {
    try {
      if (existsSync(p)) {
        const raw = await readFile(p, "utf-8");
        return JSON.parse(raw) as T;
      }
    } catch {}
  }

  return defaultValue;
}

export async function setStoreData<T>(key: string, localFilePath: string, data: T): Promise<void> {
  const jsonContent = JSON.stringify(data, null, 2);

  // 1. Persist directly to Supabase admin_settings (Persists across ALL Vercel deployments & restarts)
  try {
    const { data: existing } = await supabaseAdmin
      .from("admin_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (key === "categories") {
        updatePayload.claude_key = jsonContent;
      } else if (key === "featured_exams") {
        updatePayload.openai_key = jsonContent;
      } else if (key === "settings") {
        updatePayload.gemini_key = jsonContent;
      }

      await supabaseAdmin
        .from("admin_settings")
        .update(updatePayload)
        .eq("id", existing.id);
    }
  } catch (err) {
    console.error(`[store-data] Supabase save error for key=${key}:`, err);
  }

  // 2. Write to local candidate paths (for local development and git sync)
  const candidates = getCandidatePaths(localFilePath);
  for (const p of candidates) {
    try {
      const dir = dirname(p);
      await mkdir(dir, { recursive: true });
      await writeFile(p, jsonContent, "utf-8");
    } catch {}
  }
}