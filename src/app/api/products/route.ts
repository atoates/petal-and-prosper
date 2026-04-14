import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, productBodySchema } from "@/lib/validators/api";

export async function GET(request: NextRequest) {
  const gate = await requirePermissionApi("products:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const result = await db.query.products.findMany({
      where: eq(products.companyId, ctx.companyId),
      orderBy: desc(products.createdAt),
    });

    // Replace heavyweight data-URI blobs with a lightweight image-
    // endpoint URL.  The browser fetches actual pixels on demand
    // (with caching) via GET /api/products/[id]/image, which keeps
    // this JSON response small and fast regardless of how many
    // products carry generated images.
    const mapped = result.map((p) => ({
      ...p,
      imageUrl: p.imageUrl
        ? p.imageUrl.startsWith("data:")
          ? `/api/products/${p.id}/image`
          : p.imageUrl
        : null,
    }));

    if (category) {
      return NextResponse.json(mapped.filter((p) => p.category === category));
    }

    return NextResponse.json(mapped);
  } catch (error) {
    console.error(
      "Error fetching products:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("products:create");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, productBodySchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    const result = await db
      .insert(products)
      .values({
        id: crypto.randomUUID(),
        companyId: ctx.companyId,
        name: data.name,
        category: data.category,
        subcategory: data.subcategory,
        wholesalePrice: data.wholesalePrice,
        retailPrice: data.retailPrice,
        unit: data.unit ?? "stem",
        stemCount: data.stemCount ?? null,
        colour: data.colour,
        season: data.season,
        supplier: data.supplier,
        imageUrl: data.imageUrl,
        notes: data.notes,
        isActive: data.isActive ?? true,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error(
      "Error creating product:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
