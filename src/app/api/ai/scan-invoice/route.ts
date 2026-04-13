import { NextRequest, NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { extractInvoiceFromPdf } from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("orders:create");
  if ("response" in gate) return gate.response;

  try {
    const formData = await request.formData();
    const file = formData.get("pdf");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const result = await extractInvoiceFromPdf(base64);

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error scanning invoice:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to scan invoice" },
      { status: 500 }
    );
  }
}
