/**
 * Proposal versioning helpers.
 *
 * A "snapshot" is the frozen state of a proposal (its order header,
 * its line items, and its mood board) at the moment it was pinned.
 * We denormalise intentionally so later edits to the underlying rows
 * don't retroactively rewrite history -- a version dated a week ago
 * shows what was actually sent a week ago, not what's current.
 *
 * Every call to `pinProposalVersion()` does three things in one go:
 *   1. Reads the current state,
 *   2. Computes a human-readable summary of what changed vs the
 *      previous version (if any),
 *   3. Writes a `proposal_versions` row.
 *
 * Callers run this inside the same transaction as the action that
 * warranted a snapshot (typically the `send` flow) so the snapshot
 * and the send never diverge.
 */

import { and, asc, desc, eq } from "drizzle-orm";
import type { db as dbType } from "@/lib/db";
import {
  orderItems,
  orders,
  proposalMoodBoardImages,
  proposalVersions,
  proposals,
} from "@/lib/db/schema";

type Tx =
  | typeof dbType
  | Parameters<Parameters<typeof dbType.transaction>[0]>[0];

export interface ProposalSnapshotLine {
  description: string;
  category: string | null;
  quantity: number;
  baseCost: string | null;
  unitPrice: string;
  totalPrice: string;
  bundleId: string | null;
  bundleName: string | null;
  baseQuantity: number | null;
  imageUrl: string | null;
}

export interface ProposalSnapshotMoodImage {
  id: string;
  url: string;
  caption: string | null;
  position: number;
}

export interface ProposalSnapshot {
  order: {
    id: string;
    status: string | null;
    totalPrice: string | null;
    version: number | null;
  };
  proposal: {
    id: string;
    status: string | null;
    subject: string | null;
    bodyHtml: string | null;
  };
  items: ProposalSnapshotLine[];
  moodBoard: ProposalSnapshotMoodImage[];
}

/**
 * Reads the current state of a proposal + its order + items + mood
 * board into a JSON-serialisable snapshot.
 */
async function readCurrentSnapshot(
  tx: Tx,
  proposalId: string
): Promise<ProposalSnapshot | null> {
  const proposal = await (tx as typeof dbType).query.proposals.findFirst({
    where: eq(proposals.id, proposalId),
  });
  if (!proposal) return null;

  const order = await (tx as typeof dbType).query.orders.findFirst({
    where: eq(orders.id, proposal.orderId),
  });
  if (!order) return null;

  const items = await (tx as typeof dbType)
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  const moodBoard = await (tx as typeof dbType)
    .select({
      id: proposalMoodBoardImages.id,
      url: proposalMoodBoardImages.url,
      caption: proposalMoodBoardImages.caption,
      position: proposalMoodBoardImages.position,
    })
    .from(proposalMoodBoardImages)
    .where(eq(proposalMoodBoardImages.proposalId, proposal.id))
    .orderBy(asc(proposalMoodBoardImages.position));

  return {
    order: {
      id: order.id,
      status: order.status,
      totalPrice: order.totalPrice,
      version: order.version,
    },
    proposal: {
      id: proposal.id,
      status: proposal.status,
      subject: proposal.subject,
      bodyHtml: proposal.bodyHtml,
    },
    items: items.map((i) => ({
      description: i.description,
      category: i.category,
      quantity: i.quantity,
      baseCost: i.baseCost,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
      bundleId: i.bundleId,
      bundleName: i.bundleName,
      baseQuantity: i.baseQuantity,
      imageUrl: i.imageUrl,
    })),
    moodBoard: moodBoard.map((m) => ({
      id: m.id,
      url: m.url,
      caption: m.caption,
      position: m.position,
    })),
  };
}

/**
 * Produce a human-readable one-liner describing the change between
 * two snapshots. Deliberately keeps it short -- the timeline view
 * shows one summary per version, and verbose diffs clutter it.
 *
 * When `prev` is null (first version), returns "Initial version".
 */
export function summariseChange(
  prev: ProposalSnapshot | null,
  next: ProposalSnapshot
): string {
  if (!prev) return "Initial version";

  const parts: string[] = [];

  const itemDelta = next.items.length - prev.items.length;
  if (itemDelta > 0) parts.push(`+${itemDelta} line item${itemDelta === 1 ? "" : "s"}`);
  if (itemDelta < 0)
    parts.push(`-${Math.abs(itemDelta)} line item${Math.abs(itemDelta) === 1 ? "" : "s"}`);

  // Quantity or description changes that don't shift the count
  // still matter. Compare by index-normalised description+qty keys;
  // if any differ without counting as add/remove, flag it.
  if (itemDelta === 0) {
    const prevKey = prev.items
      .map((i) => `${i.description}|${i.quantity}|${i.totalPrice}`)
      .sort()
      .join(",");
    const nextKey = next.items
      .map((i) => `${i.description}|${i.quantity}|${i.totalPrice}`)
      .sort()
      .join(",");
    if (prevKey !== nextKey) parts.push("edited items");
  }

  const prevTotal = Number(prev.order.totalPrice ?? "0");
  const nextTotal = Number(next.order.totalPrice ?? "0");
  if (Number.isFinite(prevTotal) && Number.isFinite(nextTotal) && prevTotal !== nextTotal) {
    parts.push(
      `total £${prevTotal.toFixed(2)} -> £${nextTotal.toFixed(2)}`
    );
  }

  const moodDelta = next.moodBoard.length - prev.moodBoard.length;
  if (moodDelta > 0) parts.push(`+${moodDelta} mood image${moodDelta === 1 ? "" : "s"}`);
  if (moodDelta < 0)
    parts.push(`-${Math.abs(moodDelta)} mood image${Math.abs(moodDelta) === 1 ? "" : "s"}`);

  return parts.length > 0 ? parts.join("; ") : "No meaningful changes";
}

/**
 * Capture the current state as a new version. Returns the inserted
 * row, or null if the proposal couldn't be read.
 */
export async function pinProposalVersion(
  tx: Tx,
  proposalId: string,
  userId: string
): Promise<typeof proposalVersions.$inferSelect | null> {
  const snapshot = await readCurrentSnapshot(tx, proposalId);
  if (!snapshot) return null;

  // Look up the previous version (if any) to compute the diff.
  // Ordering desc lets us peek at the most recent without LIMIT-
  // tying to version_number arithmetic -- handy if a version is ever
  // deleted manually and the counter develops gaps.
  const [previousRow] = await (tx as typeof dbType)
    .select()
    .from(proposalVersions)
    .where(eq(proposalVersions.proposalId, proposalId))
    .orderBy(desc(proposalVersions.versionNumber))
    .limit(1);

  const previousSnapshot =
    (previousRow?.snapshotJson as ProposalSnapshot | undefined) ?? null;
  const nextVersionNumber = (previousRow?.versionNumber ?? 0) + 1;

  const changeSummary = summariseChange(previousSnapshot, snapshot);

  const [inserted] = await (tx as typeof dbType)
    .insert(proposalVersions)
    .values({
      id: crypto.randomUUID(),
      proposalId,
      versionNumber: nextVersionNumber,
      snapshotJson: snapshot,
      changeSummary,
      createdBy: userId,
    })
    .returning();

  return inserted;
}

/**
 * Tenant-scoped helper for the list UI: returns all versions for a
 * proposal, newest first, including change summaries but without
 * the heavy snapshot_json column unless the caller asks.
 *
 * Uses core `select()` rather than `db.query.*` so it works even if
 * the relational metadata for proposalVersions isn't fully
 * registered (happens during a partial deploy).
 */
export async function listProposalVersions(
  tx: Tx,
  proposalId: string,
  companyId: string,
  opts: { includeSnapshot?: boolean } = {}
) {
  const [parent] = await (tx as typeof dbType)
    .select({ id: proposals.id })
    .from(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.companyId, companyId)))
    .limit(1);
  if (!parent) return null;

  if (opts.includeSnapshot) {
    return (tx as typeof dbType)
      .select()
      .from(proposalVersions)
      .where(eq(proposalVersions.proposalId, proposalId))
      .orderBy(desc(proposalVersions.versionNumber));
  }

  return (tx as typeof dbType)
    .select({
      id: proposalVersions.id,
      proposalId: proposalVersions.proposalId,
      versionNumber: proposalVersions.versionNumber,
      changeSummary: proposalVersions.changeSummary,
      createdBy: proposalVersions.createdBy,
      createdAt: proposalVersions.createdAt,
    })
    .from(proposalVersions)
    .where(eq(proposalVersions.proposalId, proposalId))
    .orderBy(desc(proposalVersions.versionNumber));
}
