import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";

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

    if (category) {
      return NextResponse.json(result.filter((p) => p.category === category));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching products:", error);
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

  try {
    const body = await request.json();

    const {
      name,
      category,
      subcategory,
      wholesalePrice,
      retailPrice,
      unit,
      stemCount,
      colour,
      season,
      supplier,
      notes,
      isActive,
    } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(products)
      .values({
        id: crypto.randomUUID(),
        companyId: ctx.companyId,
        name,
        category,
        subcategory: subcategory || null,
        wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice).toString() : null,
        retailPrice: retailPrice ? parseFloat(retailPrice).toString() : null,
        unit: unit || "stem",
        stemCount: stemCount ? parseInt(stemCount) : null,
        colour: colour || null,
        season: season || null,
        supplier: supplier || null,
        notes: notes || null,
        isActive: isActive !== undefined ? (isActive ? "true" : "false") : "true",
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
