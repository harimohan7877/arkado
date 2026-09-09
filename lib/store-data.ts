import sharp from "sharp";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { supabaseAdmin } from "@/lib/supabase";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/svg+xml",
  "image/avif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

export function isAllowedImageType(mimeType?: string | null, fileName?: string | null): boolean {
  if (mimeType && (mimeType.startsWith("image/") || ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase()))) {
    return true;
  }
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "svg", "avif", "ico"].includes(ext || "")) {
      return true;
    }
  }
  return false;
}

function getCandidatePaths(localFilePath: string): string[] {
  const norm = localFilePath.replaceAll("\\", "/");
  return [join(process.cwd(), norm)];
}

export async function saveUploadedFile(file: File, folder: string = "logos", customName?: string): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let outputBuffer: Buffer = buffer;
    let ext = "webp";

    try {
      // Always convert to WebP format for optimal site performance, minimal bandwidth and instant load times
      outputBuffer = await sharp(buffer)
        .rotate() // Automatically orient based on EXIF (fixes camera rotation from smartphones)
        .resize({
          width: 1920,
          height: 1920,
          fit: "inside",
          withoutEnlargement: true,
        }) // Resize huge DSLR/4K phone images down to max 1920px while preserving aspect ratio
        .webp({
          quality: 82, // Optimal visual quality vs byte size
          effort: 4,
        })
        .toBuffer();
    } catch (sharpErr) {
      console.warn("[saveUploadedFile] Sharp WebP conversion fallback, using original buffer:", sharpErr);
      ext = file.name ? file.name.split(".").pop() || "png" : "png";
      outputBuffer = buffer;
    }

    // Clean customName and strip any existing extension like .jpg, .png, etc.
    const cleanBaseName = (customName || `${folder}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`)
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    const fileName = `${cleanBaseName}.${ext}`;
    const relativePath = `uploads/${folder}/${fileName}`;

    const candidates = getCandidatePaths(`public/${relativePath}`);
    for (const p of candidates) {
      try {
        const dir = dirname(p);
        await mkdir(dir, { recursive: true });
        await writeFile(p, outputBuffer);
      } catch (writeErr) {
        console.error("[saveUploadedFile] Write error at path:", p, writeErr);
      }
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
      .select("id, gemini_key, claude_key, openai_key, openrouter_key")
      .limit(1)
      .maybeSingle();

    if (adminRow) {
      if (key === "categories" && adminRow.claude_key && (adminRow.claude_key.startsWith("[") || adminRow.claude_key.startsWith("{"))) {
        return JSON.parse(adminRow.claude_key) as T;
      }
      if (key === "featured_exams" && adminRow.openai_key && (adminRow.openai_key.startsWith("[") || adminRow.openai_key.startsWith("{"))) {
        return JSON.parse(adminRow.openai_key) as T;
      }
      if (key === "courses" && adminRow.openrouter_key && (adminRow.openrouter_key.startsWith("[") || adminRow.openrouter_key.startsWith("{"))) {
        return JSON.parse(adminRow.openrouter_key) as T;
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
      } else if (key === "courses") {
        updatePayload.openrouter_key = jsonContent;
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