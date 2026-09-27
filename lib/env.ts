/**
 * Application environment configuration and startup validation.
 * Ensures critical variables are defined and gives clear diagnostic messages.
 */

const isServer = typeof window === "undefined";

export const env = {
  // Client-safe variables (inlined by Next.js compiler)
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "Arkado",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  // Server-only variables (guarded so they never leak into client bundle)
  SUPABASE_SERVICE_ROLE_KEY: isServer ? (process.env.SUPABASE_SERVICE_ROLE_KEY || "") : "",
  ADMIN_PASSCODE: isServer ? (process.env.ADMIN_PASSCODE || "") : "",

  // Merchant & fallback defaults
  DEFAULT_UPI_ID: isServer ? (process.env.DEFAULT_UPI_ID || "") : "",
  DEFAULT_WHATSAPP_NUMBER: isServer ? (process.env.DEFAULT_WHATSAPP_NUMBER || "") : "",
  DEFAULT_SUPPORT_EMAIL: isServer ? (process.env.DEFAULT_SUPPORT_EMAIL || "") : "",
  DEFAULT_SUPPORT_PHONE: isServer ? (process.env.DEFAULT_SUPPORT_PHONE || "") : "",
} as const;

/**
 * Validates that all required environment variables are set.
 * Throws a descriptive error if critical keys are missing.
 */
export function validateRequiredEnv(): void {
  const missing: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. Please configure them in .env.local`
    );
  }
}
