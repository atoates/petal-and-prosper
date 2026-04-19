/**
 * Connection smoke test for Cloudflare R2.
 *
 * Uploads a tiny test object, reads it back over HTTP via the public
 * URL, then deletes it. Exits non-zero on any failure so it can be
 * wired into a pre-deploy check later.
 *
 * Usage: `npx tsx scripts/verify-r2.ts`
 *
 * Requires R2_* env vars to be set. Does not touch the database.
 */

// Load `.env` if present so one-off runs pick up R2 credentials
// without the caller having to export them first. Silent fail-over
// when there's no file: callers in CI/Railway inject vars directly.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env -- env vars must already be in the process environment
}

import { randomUUID } from "crypto";
import {
  buildImageKey,
  deleteObject,
  uploadObject,
} from "../src/lib/storage";

async function main() {
  const testId = randomUUID();
  const key = buildImageKey("__verify", "products", testId, "txt");
  const body = Buffer.from(
    `petal-and-prosper r2 verification at ${new Date().toISOString()}`
  );

  console.log(`1/3 uploading test object -> ${key}`);
  let publicUrl: string;
  try {
    publicUrl = await uploadObject({
      key,
      body,
      contentType: "text/plain",
      // Short cache so a stale test object never lingers on the CDN.
      cacheControl: "no-store",
    });
  } catch (err) {
    console.error(
      `FAIL upload: ${err instanceof Error ? err.message : err}`
    );
    process.exit(1);
  }
  console.log(`     OK  ${publicUrl}`);

  console.log("2/3 fetching public URL");
  try {
    const resp = await fetch(publicUrl);
    if (!resp.ok) {
      throw new Error(
        `public URL returned ${resp.status} ${resp.statusText}`
      );
    }
    const text = await resp.text();
    if (!text.startsWith("petal-and-prosper")) {
      throw new Error(`unexpected body: ${text.slice(0, 80)}`);
    }
    console.log("     OK  public read works");
  } catch (err) {
    console.error(
      `FAIL public read: ${err instanceof Error ? err.message : err}`
    );
    console.error(
      "     Check that the bucket has the r2.dev subdomain enabled and"
    );
    console.error("     that R2_PUBLIC_URL matches it.");
    process.exit(1);
  }

  console.log("3/3 deleting test object");
  try {
    await deleteObject(key);
    console.log("     OK  cleanup complete");
  } catch (err) {
    console.error(
      `WARN delete: ${err instanceof Error ? err.message : err}`
    );
    console.error(
      `     Manual cleanup: remove ${key} from the bucket via the dashboard.`
    );
    // Don't exit non-zero -- the core write/read worked.
  }

  console.log("\nAll checks passed. R2 is ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
