import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { revalidatePath } from "next/cache";
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
    let ext = file.name ? file.name.split(".").pop()?.toLowerCase() || "png" : "png";
    let mimeType = file.type || `image/${ext}`;

    try {
      // Dynamic import so sharp never breaks module evaluation on Linux / Vercel Serverless
      const sharpModule = await import("sharp");
      const sharp = sharpModule.default || sharpModule;
      outputBuffer = await sharp(buffer)
        .rotate() // Automatically orient based on EXIF (fixes camera rotation from smartphones)
        .resize({
          width: 1920,
          height: 1920,
          fit: "inside",
          withoutEnlargement: true,
        }) // Resize huge images down to max 1920px while preserving aspect ratio
        .webp({
          quality: 82, // Optimal visual quality vs byte size
          effort: 4,
        })
        .toBuffer();
      ext = "webp";
      mimeType = "image/webp";
    } catch (sharpErr) {
      console.warn("[saveUploadedFile] Sharp WebP conversion fallback, using original buffer:", sharpErr);
      ext = file.name ? file.name.split(".").pop()?.toLowerCase() || "png" : "png";
      outputBuffer = buffer;
    }

    // Clean customName and strip any existing extension like .jpg, .png, etc.
    const cleanBaseName = (customName || `${folder}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`)
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    const fileName = `${cleanBaseName}.${ext}`;
    const storagePath = `${folder}/${fileName}`;

    // 1. Primary: Upload to Supabase Storage (Public bucket 'arkado-uploads')
    // Gives permanent, high-speed CDN URL that never 404s or disappears on Vercel deployments
    try {
      const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
        .from("arkado-uploads")
        .upload(storagePath, outputBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!uploadErr && uploadData?.path) {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from("arkado-uploads")
          .getPublicUrl(storagePath);

        if (publicUrlData?.publicUrl) {
          // Also try writing to local disk for local dev
          try {
            const relativePath = `uploads/${folder}/${fileName}`;
            const candidates = getCandidatePaths(`public/${relativePath}`);
            for (const p of candidates) {
              const dir = dirname(p);
              await mkdir(dir, { recursive: true });
              await writeFile(p, outputBuffer);
            }
          } catch {}

          return publicUrlData.publicUrl;
        }
      } else if (uploadErr) {
        console.warn("[saveUploadedFile] Supabase storage upload warning:", uploadErr.message);
      }
    } catch (sbStorageErr) {
      console.warn("[saveUploadedFile] Supabase storage exception:", sbStorageErr);
    }

    // 2. Secondary: Fallback to Data URI for images <= 2MB so it ALWAYS displays without 404
    if (outputBuffer.length <= 2 * 1024 * 1024) {
      return `data:${mimeType};base64,${outputBuffer.toString("base64")}`;
    }

    // 3. Local disk write for development
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

export async function saveUploadedHtmlFile(file: File, customName?: string): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const cleanBaseName = (customName || `mock_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`)
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    const fileName = `${cleanBaseName}.html`;
    const storagePath = `mock-tests/${fileName}`;

    // 1. Primary: Upload to Supabase Storage (Public bucket 'arkado-uploads')
    try {
      const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
        .from("arkado-uploads")
        .upload(storagePath, buffer, {
          contentType: "text/html; charset=utf-8",
          upsert: true,
        });

      if (!uploadErr && uploadData?.path) {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from("arkado-uploads")
          .getPublicUrl(storagePath);

        if (publicUrlData?.publicUrl) {
          // Also try writing to local disk for local dev
          try {
            const relativePath = `mock-tests/${fileName}`;
            const candidates = getCandidatePaths(`public/${relativePath}`);
            for (const p of candidates) {
              const dir = dirname(p);
              await mkdir(dir, { recursive: true });
              await writeFile(p, buffer);
            }
          } catch {}

          return `/mock-tests/${fileName}`;
        }
      } else if (uploadErr) {
        console.warn("[saveUploadedHtmlFile] Supabase storage warning:", uploadErr.message);
      }
    } catch (sbErr) {
      console.warn("[saveUploadedHtmlFile] Supabase storage exception:", sbErr);
    }

    // 2. Fallback: Local disk write for development
    try {
      const relativePath = `mock-tests/${fileName}`;
      const candidates = getCandidatePaths(`public/${relativePath}`);
      for (const p of candidates) {
        const dir = dirname(p);
        await mkdir(dir, { recursive: true });
        await writeFile(p, buffer);
      }
    } catch (writeErr) {
      console.error("[saveUploadedHtmlFile] Local write error:", writeErr);
    }

    return `/mock-tests/${fileName}`;
  } catch (err) {
    console.error("[saveUploadedHtmlFile] Upload error:", err);
    return "";
  }
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

const SERVER_STORE_CACHE: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 10 * 1000; // 10 seconds server cache for instant admin reflection

const KEY_COLUMN_MAP: Record<string, string> = {
  courses: "openrouter_key",
  settings: "gemini_key",
  categories: "claude_key",
  featured_exams: "openai_key",
  orders: "openai_key",
};

export async function getStoreData<T>(key: string, localFilePath: string, defaultValue: T): Promise<T> {
  const cached = SERVER_STORE_CACHE[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }

  // 1. Check Supabase admin_settings targeted text column (Fast, lightweight ~2KB-23KB instead of 166KB)
  try {
    const colToFetch = KEY_COLUMN_MAP[key] || "openrouter_key, gemini_key, claude_key, openai_key";
    const { data: rawRow } = await supabaseAdmin
      .from("admin_settings")
      .select(`id, ${colToFetch}` as any)
      .limit(1)
      .maybeSingle();

    const adminRow = rawRow as Record<string, any> | null;
    if (adminRow) {
      if (key === "categories" && adminRow.claude_key && (adminRow.claude_key.startsWith("[") || adminRow.claude_key.startsWith("{"))) {
        const parsed = JSON.parse(adminRow.claude_key);
        if (Array.isArray(defaultValue) && !Array.isArray(parsed)) return defaultValue;
        SERVER_STORE_CACHE[key] = { data: parsed, timestamp: Date.now() };
        return parsed as T;
      }
      if (key === "featured_exams" && adminRow.openai_key && (adminRow.openai_key.startsWith("[") || adminRow.openai_key.startsWith("{"))) {
        const parsed = JSON.parse(adminRow.openai_key);
        SERVER_STORE_CACHE[key] = { data: parsed, timestamp: Date.now() };
        return parsed as T;
      }
      if (key === "orders") {
        if (adminRow.openai_key && (adminRow.openai_key.startsWith("[") || adminRow.openai_key.startsWith("{"))) {
          try {
            const parsed = JSON.parse(adminRow.openai_key);
            const ordersList = Array.isArray(parsed) ? parsed : (parsed.orders || []);
            SERVER_STORE_CACHE[key] = { data: ordersList, timestamp: Date.now() };
            return ordersList as T;
          } catch {}
        }
      }
      if (key === "courses" && adminRow.openrouter_key && (adminRow.openrouter_key.startsWith("[") || adminRow.openrouter_key.startsWith("{"))) {
        const parsed = JSON.parse(adminRow.openrouter_key);
        if (Array.isArray(defaultValue) && !Array.isArray(parsed)) return defaultValue;
        SERVER_STORE_CACHE[key] = { data: parsed, timestamp: Date.now() };
        return parsed as T;
      }
      if (key === "settings" && adminRow.gemini_key && adminRow.gemini_key.startsWith("{")) {
        const parsed = JSON.parse(adminRow.gemini_key);
        SERVER_STORE_CACHE[key] = { data: parsed, timestamp: Date.now() };
        return parsed as T;
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
        const parsed = JSON.parse(raw);
        if (Array.isArray(defaultValue) && !Array.isArray(parsed)) return defaultValue;
        SERVER_STORE_CACHE[key] = { data: parsed, timestamp: Date.now() };
        return parsed as T;
      }
    } catch {}
  }

  return defaultValue;
}

export async function setStoreData<T>(key: string, localFilePath: string, data: T): Promise<void> {
  // Clear all server cache entries on write so no stale cross-references remain
  delete SERVER_STORE_CACHE[key];
  if (key === "courses") delete SERVER_STORE_CACHE["featured_exams"];
  const jsonContent = JSON.stringify(data, null, 2);

  // 1. Persist directly to Supabase admin_settings (Persists across ALL Vercel deployments & restarts)
  try {
    const { data: existing } = await supabaseAdmin
      .from("admin_settings")
      .select("id, openai_key")
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (key === "categories") {
        updatePayload.claude_key = jsonContent;
      } else if (key === "featured_exams") {
        let merged: Record<string, any> = {};
        try {
          merged = existing.openai_key ? JSON.parse(existing.openai_key) : {};
        } catch {}
        if (typeof data === "object" && data !== null && !Array.isArray(data)) {
          merged = { ...merged, ...data };
        } else {
          merged.featured_exams = data;
        }
        updatePayload.openai_key = JSON.stringify(merged);
      } else if (key === "orders") {
        let merged: Record<string, any> = {};
        try {
          merged = existing.openai_key ? JSON.parse(existing.openai_key) : {};
        } catch {}
        merged.orders = data;
        updatePayload.openai_key = JSON.stringify(merged);
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

  // 2. On-demand Edge CDN & Next.js cache purge (Bust-on-write pattern)
  try {
    if (key === "courses" || key === "featured_exams") {
      revalidatePath("/api/courses");
      revalidatePath("/exams");
      revalidatePath("/");
    } else if (key === "categories") {
      revalidatePath("/api/categories");
      revalidatePath("/api/exams");
      revalidatePath("/");
    } else if (key === "settings") {
      revalidatePath("/api/settings");
      revalidatePath("/");
    }
  } catch {}

  // 3. Write to local candidate paths (for local development and git sync)
  const candidates = getCandidatePaths(localFilePath);
  for (const p of candidates) {
    try {
      const dir = dirname(p);
      await mkdir(dir, { recursive: true });
      await writeFile(p, jsonContent, "utf-8");
    } catch {}
  }
}