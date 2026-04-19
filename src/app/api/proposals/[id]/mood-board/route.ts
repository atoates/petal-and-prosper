import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { proposals, proposalMoodBoardImages } from "@/lib/db/schema";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { buildImageKey, uploadObject } from "@/lib/storage";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per image
const MAX_FILES_PER_REQUEST = 20;

/**
 * GET /api/proposals/[id]/mood-board
 *
 * Returns the images attached to the proposal, ordered by `position`.
 * The inverse (PATCH reorder) uses the same field so drag-and-drop
 * in the UI just sends back the new order.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("proposals:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    // Tenant check -- don't leak another company's proposal's images.
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

    const rows = await db
      .select({
        id: proposalMoodBoardImages.id,
        proposalId: proposalMoodBoardImages.proposalId,
        url: proposalMoodBoardImages.url,
        caption: proposalMoodBoardImages.caption,
        position: proposalMoodBoardImages.position,
        createdBy: proposalMoodBoardImages.createdBy,
        createdAt: proposalMoodBoardImages.createdAt,
      })
      .from(proposalMoodBoardImages)
      .where(eq(proposalMoodBoardImages.proposalId, params.id))
      .orderBy(asc(proposalMoodBoardImages.position));

    return NextResponse.json(rows);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    console.error("Error loading mood board:", detail);
    return NextResponse.json(
      { error: "Failed to load mood board", detail },
      { status: 500 }
    );
  }
}

/**
 * POST /api/proposals/[id]/mood-board
 *
 * Multipart upload of one or more images. Each `image` part is
 * uploaded to R2 and persisted as a new row appended to the end of
 * the board. Returns the created rows in their final order.
 *
 * Limits:
 *   - 10 MB per file
 *   - 20 files per request
 *   - image/* content-types only
 */
export async function POST(
  request: NextRequest,
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must be multipart/form-data" },
      { status: 400 }
    );
  }

  const files = form
    .getAll("image")
    .filter((v): v is File => v instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "No image files in request (field name must be 'image')" },
      { status: 400 }
    );
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      {
        error: `Too many files. Max ${MAX_FILES_PER_REQUEST} per request.`,
      },
      { status: 400 }
    );
  }

  // Find the current max position so new uploads append to the end
  // rather than colliding on position=0.
  //
  // Concurrency note: two simultaneous multi-file uploads for the
  // same proposal can read the same max, so the second upload
  // overlaps positions with the first. At the currently-expected
  // volume (a florist uploading a handful of inspiration photos for
  // a single bride) this is vanishingly unlikely and the UI tolerates
  // duplicate positions (same-position images just order by insert
  // time). If we need stronger guarantees later, move this into a
  // row-locking transaction or switch to a serial sequence column.
  const [{ maxPos }] = await db
    .select({
      maxPos: sql<number | null>`MAX(${proposalMoodBoardImages.position})`,
    })
    .from(proposalMoodBoardImages)
    .where(eq(proposalMoodBoardImages.proposalId, params.id));

  let nextPosition = (maxPos ?? -1) + 1;

  const uploaded: (typeof proposalMoodBoardImages.$inferSelect)[] = [];
  const errors: { filename: string; message: string }[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      errors.push({
        filename: file.name,
        message: `Unsupported content type: ${file.type}`,
      });
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      errors.push({
        filename: file.name,
        message: `File exceeds ${MAX_FILE_BYTES} bytes`,
      });
      continue;
    }

    try {
      const imageId = randomUUID();
      const ext =
        file.type.split("/")[1]?.replace("jpeg", "jpg").replace("+xml", "") ||
        "bin";
      const key = buildImageKey(
        ctx.companyId,
        "mood-boards",
        `${params.id}-${imageId}`,
        ext
      );

      const body = Buffer.from(await file.arrayBuffer());
      const publicUrl = await uploadObject({
        key,
        body,
        contentType: file.type,
      });

      const [row] = await db
        .insert(proposalMoodBoardImages)
        .values({
          id: imageId,
          proposalId: params.id,
          url: publicUrl,
          position: nextPosition,
          createdBy: ctx.userId,
        })
        .returning();
      uploaded.push(row);
      nextPosition++;
    } catch (err) {
      errors.push({
        filename: file.name,
        message: err instanceof Error ? err.message : "unknown error",
      });
    }
  }

  return NextResponse.json(
    { uploaded, errors },
    { status: errors.length && uploaded.length === 0 ? 500 : 201 }
  );
}
