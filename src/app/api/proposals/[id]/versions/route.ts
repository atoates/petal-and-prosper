import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { proposals } from "@/lib/db/schema";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import {
  listProposalVersions,
  pinProposalVersion,
} from "@/lib/proposal-snapshot";

/**
 * GET /api/proposals/[id]/versions
 *
 * Returns the version timeline for a proposal, newest first, with
 * change summaries but without the heavy snapshot_json column (use
 * GET /api/proposals/[id]/versions/[n] to fetch a single full
 * snapshot).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("proposals:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const rows = await listProposalVersions(db, params.id, ctx.companyId);
    if (rows === null) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(rows);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    console.error("Error loading proposal versions:", detail);
    return NextResponse.json(
      { error: "Failed to load versions", detail },
      { status: 500 }
    );
  }
}

/**
 * POST /api/proposals/[id]/versions
 *
 * Pin the current state as a new version explicitly. The send flow
 * does this automatically before a proposal goes out; this endpoint
 * is for manual "save as version" checkpoints between sends.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("proposals:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parent = await db.query.proposals.findFirst({
    where: and(
      eq(proposals.id, params.id),
      eq(proposals.companyId, ctx.companyId)
    ),
    columns: { id: true },
  });
  if (!parent) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const inserted = await db.transaction(async (tx) =>
    pinProposalVersion(tx, params.id, ctx.userId)
  );
  if (!inserted) {
    return NextResponse.json(
      { error: "Failed to pin version" },
      { status: 500 }
    );
  }
  return NextResponse.json(inserted, { status: 201 });
}
