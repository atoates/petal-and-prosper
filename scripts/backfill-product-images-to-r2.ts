/**
 * One-off backfill: move any `data:image/...;base64,...` blob stored on
 * `products.image_url` into Cloudflare R2 and overwrite the column
 * with the public R2 URL.
 *
 * Safe to re-run -- rows already on http(s) URLs are skipped. If a
 * row fails to upload, it's logged and left untouched so a subsequent
 * run can retry it.
 *
 * Usage:
 *   1. Populate `.env` with R2_* credentials + DATABASE_URL pointing
 *      at the environment you want to migrate.
 *   2. Run: `npx tsx scripts/backfill-product-images-to-r2.ts`
 *   3. (Optional) `--dry-run` prints what would change without
 *      touching R2 or the database.
 *
 * Timing: ~0.5s per row over a typical broadband connection (1–2MB
 * PNGs). A tenant with 300 products finishes in ~3 minutes.
 */

// Load `.env` for DATABASE_URL + R2_* without requiring the caller
// to export them first. Silent fail-over when there's no file.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env -- env vars must already be in the process environment
}

import { Pool } from "pg";
import { buildImageKey, uploadObject } from "../src/lib/storage";

interface Row {
  id: string;
  company_id: string;
  image_url: string;
}

const DRY_RUN = process.argv.includes("--dry-run");

function parseDataUri(dataUri: string): { mime: string; buffer: Buffer } | null {
  const match = dataUri.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return null;
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function extFromMime(mime: string): string {
  // Cover the handful of types we actually emit. Anything weirder
  // falls back to `bin` so we still write the object and can fix the
  // content-type server-side later.
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  console.log(DRY_RUN ? "Dry run mode -- no writes." : "Live run.");

  // Pull every row that still holds a data URI. We select into memory
  // rather than iterate because the result set is bounded by the
  // product count and each row is small metadata-wise.
  const { rows } = await pool.query<Row>(
    `SELECT id, company_id, image_url
     FROM products
     WHERE image_url LIKE 'data:%'`
  );

  console.log(`Found ${rows.length} product image(s) to migrate.`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const parsed = parseDataUri(row.image_url);
    if (!parsed) {
      console.warn(`  [skip] ${row.id}: could not parse data URI`);
      skipped++;
      continue;
    }

    const ext = extFromMime(parsed.mime);
    const key = buildImageKey(row.company_id, "products", row.id, ext);

    if (DRY_RUN) {
      console.log(
        `  [dry] ${row.id} (${parsed.buffer.length} bytes, ${parsed.mime}) -> ${key}`
      );
      migrated++;
      continue;
    }

    try {
      const publicUrl = await uploadObject({
        key,
        body: parsed.buffer,
        contentType: parsed.mime,
      });
      await pool.query(
        `UPDATE products SET image_url = $1, updated_at = now() WHERE id = $2`,
        [publicUrl, row.id]
      );
      console.log(`  [ok]   ${row.id} -> ${publicUrl}`);
      migrated++;
    } catch (err) {
      failed++;
      console.error(
        `  [fail] ${row.id}: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  await pool.end();

  console.log(
    `\nDone. Migrated: ${migrated}, skipped: ${skipped}, failed: ${failed}.`
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
