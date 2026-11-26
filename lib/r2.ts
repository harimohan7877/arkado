import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

// Cloudflare R2 (S3-compatible) client.
// Credentials live ONLY in env vars (Vercel) — never in code.
// Bucket + public URL are the same "arkado-uploads" bucket Supabase used,
// with the same object keys, so the DB rewrite is a pure prefix swap.

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || "arkado-uploads";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

export function isR2Configured(): boolean {
  return Boolean(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL);
}

let client: S3Client | null = null;

function getClient(): S3Client | null {
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

/** Public (r2.dev) URL for an object key, or null when R2 is not configured. */
export function r2PublicUrl(key: string): string | null {
  if (!R2_PUBLIC_URL) return null;
  const base = R2_PUBLIC_URL.replace(/\/+$/, "");
  const clean = key.replace(/^\/+/, "");
  return `${base}/${clean}`;
}

/**
 * Upload (upsert) a buffer to R2. Returns the public URL on success,
 * null when R2 is not configured or the upload fails (callers fall back).
 */
export async function r2Upload(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string | null> {
  const s3 = getClient();
  if (!s3) return null;
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return r2PublicUrl(key);
  } catch (err) {
    console.warn("[r2] upload failed for", key, err);
    return null;
  }
}

/** Download an object from R2 as a Buffer, or null when missing / not configured. */
export async function r2Get(key: string): Promise<Buffer | null> {
  const s3 = getClient();
  if (!s3) return null;
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch {
    return null;
  }
}

export interface R2BucketUsage {
  files: number;
  bytes: number;
}

/**
 * Count files + bytes in the R2 bucket (folder walk, capped like the old
 * Supabase version). Returns null when R2 is not configured.
 */
export async function r2BucketUsage(): Promise<R2BucketUsage | null> {
  const s3 = getClient();
  if (!s3) return null;
  const out: R2BucketUsage = { files: 0, bytes: 0 };
  try {
    const walk = async (prefix: string, depth: number): Promise<void> => {
      if (depth > 6 || out.files > 5000) return;
      let token: string | undefined;
      do {
        const res = await s3.send(
          new ListObjectsV2Command({
            Bucket: R2_BUCKET,
            Prefix: prefix || undefined,
            Delimiter: "/",
            MaxKeys: 1000,
            ContinuationToken: token,
          })
        );
        for (const item of res.Contents || []) {
          out.files++;
          out.bytes += Number(item.Size) || 0;
          if (out.files > 5000) return;
        }
        for (const folder of res.CommonPrefixes || []) {
          if (folder.Prefix) await walk(folder.Prefix, depth + 1);
        }
        token = res.NextContinuationToken;
      } while (token);
    };
    await walk("", 0);
  } catch (err) {
    console.warn("[r2] bucket usage failed:", err);
    return null;
  }
  return out;
}
