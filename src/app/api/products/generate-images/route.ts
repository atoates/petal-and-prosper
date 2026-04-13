import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { z } from "zod";
import { parseJsonBody } from "@/lib/validators/api";

/**
 * POST /api/products/generate-images
 *
 * Generates AI stock images for products that don't yet have one (or for
 * a specific set of product ids). Images are produced via the OpenAI
 * Images API and stored inline as `data:image/png;base64,...` URIs on
 * `products.imageUrl`, which avoids the need for an external object
 * store (Railway's filesystem is ephemeral).
 *
 * Body:
 *   { missingOnly?: boolean, ids?: string[] }
 *
 * Requires OPENAI_API_KEY to be set.
 */

// Each OpenAI image call can take 10-30s. To avoid hitting platform
// request timeouts (Railway, Vercel, etc.), we cap how many we generate
// per request and let the client call repeatedly until all are done.
const BATCH_SIZE = 3;

// Let the Next.js runtime know this route is long-running.
export const maxDuration = 300; // seconds
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  missingOnly: z.boolean().optional(),
  ids: z.array(z.string().uuid()).optional(),
  limit: z.number().int().positive().max(20).optional(),
});

type Product = typeof products.$inferSelect;

async function generateImage(
  apiKey: string,
  product: Product
): Promise<string> {
  const parts: string[] = [
    `Professional product photograph of ${product.name}`,
  ];
  if (product.category) parts.push(`a ${product.category}`);
  if (product.colour) parts.push(`colour: ${product.colour}`);
  parts.push(
    "used in floral arrangements, clean white background, soft studio lighting, centred, square composition, high detail, natural colours"
  );
  const prompt = parts.join(", ");

  const resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      n: 1,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `OpenAI Images API failed (${resp.status}): ${text.slice(0, 300)}`
    );
  }

  const json = (await resp.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const item = json.data?.[0];
  if (!item) throw new Error("OpenAI returned no image data");

  if (item.b64_json) {
    return `data:image/png;base64,${item.b64_json}`;
  }
  if (item.url) {
    // Fetch and inline as base64 so the image survives without an
    // external URL that might expire.
    const imgResp = await fetch(item.url);
    if (!imgResp.ok) {
      throw new Error(`Failed to fetch generated image from ${item.url}`);
    }
    const buf = Buffer.from(await imgResp.arrayBuffer());
    return `data:image/png;base64,${buf.toString("base64")}`;
  }
  throw new Error("OpenAI response missing both b64_json and url");
}

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("products:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it to your Railway environment variables and redeploy.",
      },
      { status: 503 }
    );
  }

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.success) return parsed.response;
  const { ids, missingOnly, limit } = parsed.data;

  try {
    // Pick the target products for this tenant
    const whereClauses = [eq(products.companyId, ctx.companyId)];
    if (ids && ids.length > 0) {
      whereClauses.push(inArray(products.id, ids));
    }
    if (missingOnly) {
      whereClauses.push(isNull(products.imageUrl));
    }

    const allTargets = await db
      .select()
      .from(products)
      .where(and(...whereClauses));

    const totalRemaining = allTargets.length;
    const batchLimit = Math.min(limit ?? BATCH_SIZE, BATCH_SIZE);
    const targets = allTargets.slice(0, batchLimit);
    const remaining = Math.max(0, totalRemaining - targets.length);

    if (targets.length === 0) {
      return NextResponse.json({
        updated: [],
        errors: [],
        remaining: 0,
        done: true,
      });
    }

    const updated: Product[] = [];
    const errors: Array<{ id: string; name: string; message: string }> = [];

    // Process sequentially to avoid hitting OpenAI rate limits and to
    // keep memory usage predictable (base64 images are large).
    for (const product of targets) {
      try {
        const dataUri = await generateImage(apiKey, product);
        const result = await db
          .update(products)
          .set({ imageUrl: dataUri, updatedBy: ctx.userId, updatedAt: new Date() })
          .where(eq(products.id, product.id))
          .returning();
        if (result[0]) updated.push(result[0]);
      } catch (err) {
        errors.push({
          id: product.id,
          name: product.name,
          message: err instanceof Error ? err.message : "unknown error",
        });
      }
    }

    return NextResponse.json({
      updated,
      errors,
      remaining,
      done: remaining === 0,
    });
  } catch (error) {
    console.error(
      "Error generating product images:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to generate product images" },
      { status: 500 }
    );
  }
}
