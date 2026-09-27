/**
 * Central constants for Arkado / Sarkari-Sathi
 */

/**
 * Legacy Supabase admin_settings column mappings.
 * Maps logical data keys to their legacy storage column in admin_settings.
 * Used for dual-write compatibility and legacy fallback reads.
 */
export const SUPABASE_COLUMN_MAP = {
  courses: "openrouter_key",
  courses_new: "openrouter_key",
  settings: "gemini_key",
  categories: "claude_key",
  featured_exams: "openai_key",
  orders: "openai_key",
} as const;

export type SupabaseColumnMapKey = keyof typeof SUPABASE_COLUMN_MAP;
