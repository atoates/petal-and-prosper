import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireSessionApi } from "@/lib/auth/permissions-api";
import {
  buildImageKey,
  deleteObject,
  uploadObject,
} from "@/lib/storage";

/**
 * GET /api/admin/verify-r2
 *
 * Admin-only smoke test for the Cloudflare R2 configuration. Runs the
 * same upload / public-read / delete cycle as `scripts/verify-r2.ts`
 * but against whatever env vars the running Next.js process has, so
 * Railway deploys can be verified without the CLI.
 *
 * Intended to be removed (or gated behind a feature flag) once R2 has
 * been used in anger for a while. Doesn't touch the database.
 */
export async function GET() {
  const gate = await requireSessionApi();
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  if (ctx.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const steps: Array<{ step: string; ok: boolean; detail?: string }> = [];
  const testId = randomUUID();
  const key = buildImageKey("__verify", "products", testId, "txt");
  const body = Buffer.from(
    `petal-and-prosper r2 verification at ${new Date().toISOString()}`
  );

  // 1. Upload
  let publicUrl: string;
  try {
    publicUrl = await uploadObject({
      key,
      body,
      contentType: "text/plain",
      cacheControl: "no-store",
    });
    steps.push({ step: "upload", ok: true, detail: publicUrl });
  } catch (err) {
    steps.push({
      step: "upload",
      ok: false,
      detail: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }

  // 2. Public read
  try {
    const resp = await fetch(publicUrl, { cache: "no-store" });
    if (!resp.ok) {
      throw new Error(`${resp.status} ${resp.statusText}`);
    }
    const text = await resp.text();
    if (!text.startsWith("petal-and-prosper")) {
      throw new Error(`unexpected body: ${text.slice(0, 80)}`);
    }
    steps.push({ step: "public-read", ok: true });
  } catch (err) {
    steps.push({
      step: "public-read",
      ok: false,
      detail:
        (err instanceof Error ? err.message : "unknown") +
        " -- check that the bucket has the r2.dev subdomain enabled and R2_PUBLIC_URL matches it.",
    });
    // Try to clean up anyway so the bucket doesn't accumulate test
    // objects on every failed verify attempt.
    try {
      await deleteObject(key);
    } catch {
      /* best effort */
    }
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }

  // 3. Delete
  try {
    await deleteObject(key);
    steps.push({ step: "delete", ok: true });
  } catch (err) {
    steps.push({
      step: "delete",
      ok: false,
      detail: err instanceof Error ? err.message : "unknown",
    });
    // Upload + read worked, so still return 200 -- but surface the
    // cleanup failure so the operator knows to delete the object by
    // hand.
  }

  return NextResponse.json({ ok: true, steps });
}
