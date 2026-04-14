import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";

/**
 * GET /api/products/[id]/image
 *
 * Serves the product's stored image as a real HTTP image response with
 * caching headers, so the products list endpoint can return a lightweight
 * URL (`/api/products/{id}/image`) instead of inlining megabytes of
 * base64 in JSON.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requirePermissionApi("products:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;
  const { id } = await params;

  try {
    const row = await db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.companyId, ctx.companyId)),
      columns: { imageUrl: true },
    });

    if (!row?.imageUrl) {
      return new NextResponse(null, { status: 404 });
    }

    const dataUri = row.imageUrl;

    // If it's an actual URL (not a data URI), redirect to it.
    if (dataUri.startsWith("http://") || dataUri.startsWith("https://")) {
      return NextResponse.redirect(dataUri);
    }

    // Parse the data URI: data:<mime>;base64,<data>
    const match = dataUri.match(
      /^data:(image\/[a-z+]+);base64,(.+)$/i
    );
    if (!match) {
      return new NextResponse(null, { status: 404 });
    }

    const contentType = match[1];
    const buffer = Buffer.from(match[2], "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
        // Cache for 7 days in browser / 30 days on CDN. Images change
        // only when explicitly regenerated, so a long TTL is fine.
        "Cache-Control": "public, max-age=604800, s-maxage=2592000",
      },
    });
  } catch (error) {
    console.error(
      "Error serving product image:",
      error instanceof Error ? error.message : "unknown"
    );
    return new NextResponse(null, { status: 500 });
  }
}
