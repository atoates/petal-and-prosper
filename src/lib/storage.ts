import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

// Note: we intentionally don't use `import "server-only"` here. The
// one-off scripts in `scripts/` need to import this module outside a
// Next.js context (via tsx), and `server-only` throws synchronously
// when evaluated outside a server component. The R2 credentials come
// from server-only environment variables, so a client-bundle import
// would still fail loudly at call time -- just at call time instead
// of build time.

/**
 * Cloudflare R2 storage for image assets (product photos, mood board
 * uploads, PDF exports).
 *
 * R2 is accessed via its S3-compatible API, so the same SDK works for
 * it and AWS S3 -- if we ever migrate, it's an env-var change, not a
 * code change.
 *
 * Design choices:
 *
 *   - Keys are prefixed by `tenantId/entity/uuid.ext`. Images are
 *     served from a public bucket (the default `pub-*.r2.dev` URL or
 *     a custom domain), so the unguessable UUID is the only thing
 *     keeping one tenant's URLs from leaking into another's view.
 *   - We don't use signed URLs for reads. Bride-facing proposal pages
 *     are already behind an unguessable 32-byte token; adding short-
 *     lived signed image URLs on top would just complicate rendering
 *     without raising the security floor.
 *   - If R2 env vars are missing we throw at call time rather than
 *     silently falling back to data URIs. A half-configured prod
 *     instance should fail loudly, not paper over the mis-deploy.
 */

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `${name} is not set. Configure R2 credentials in your environment (see .env.example).`
    );
  }
  return v;
}

function getClient(): S3Client {
  return new S3Client({
    // "auto" is the right value for R2; it uses the endpoint to
    // discover the actual region.
    region: "auto",
    endpoint: `https://${getEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

function getBucket(): string {
  return getEnv("R2_BUCKET");
}

function getPublicBase(): string {
  // Strip a trailing slash so key concatenation is predictable.
  return getEnv("R2_PUBLIC_URL").replace(/\/$/, "");
}

export interface UploadOptions {
  /** Full object key, e.g. `company-123/products/abc.png`. */
  key: string;
  /** Raw bytes. */
  body: Buffer;
  /** MIME type, e.g. `image/png`. */
  contentType: string;
  /**
   * Cache-Control header stored on the object. Defaults to 30 days on
   * the CDN -- product images and mood board images are immutable
   * once written, so a long TTL is fine.
   */
  cacheControl?: string;
}

/**
 * Upload an object to R2 and return its public URL.
 */
export async function uploadObject({
  key,
  body,
  contentType,
  cacheControl = "public, max-age=604800, s-maxage=2592000",
}: UploadOptions): Promise<string> {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    })
  );
  return `${getPublicBase()}/${key}`;
}

/**
 * Delete an object from R2. Safe to call even if the object doesn't
 * exist -- R2 returns 204 in that case.
 */
export async function deleteObject(key: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    })
  );
}

/**
 * Extract the object key from a public URL. Returns null if the URL
 * isn't one of ours (e.g. legacy data URIs or external http(s) links
 * before the backfill ran).
 */
export function keyFromPublicUrl(url: string): string | null {
  let base: string;
  try {
    base = getPublicBase();
  } catch {
    return null;
  }
  if (!url.startsWith(`${base}/`)) return null;
  return url.slice(base.length + 1);
}

/**
 * Build a canonical key for a tenant-owned image.
 *
 * Example: `abc-company/products/def-uuid.png`
 */
export function buildImageKey(
  tenantId: string,
  entity: "products" | "proposals" | "order-items" | "mood-boards",
  id: string,
  ext: string
): string {
  const safeExt = ext.replace(/^\./, "").toLowerCase();
  return `${tenantId}/${entity}/${id}.${safeExt}`;
}
