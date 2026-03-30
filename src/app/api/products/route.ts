import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCompanyId } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const COMPANY_ID = await getCompanyId();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let query = db.query.products.findMany({
      where: eq(products.companyId, COMPANY_ID),
      orderBy: desc(products.createdAt),
    });

    if (category) {
      const result = await db.query.products.findMany({
        where: eq(products.companyId, COMPANY_ID),
        orderBy: desc(products.createdAt),
      });
      return NextResponse.json(
        result.filter((p) => p.category === category)
      );
    }

    const result = await query;
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
  try {
    const COMPANY_ID = await getCompanyId();
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
        companyId: COMPANY_ID,
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
