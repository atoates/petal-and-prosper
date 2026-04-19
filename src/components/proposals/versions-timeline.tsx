"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Bookmark, Loader2 } from "lucide-react";
import { formatUkDateTime } from "@/lib/format-date";

interface VersionRow {
  id: string;
  versionNumber: number;
  changeSummary: string | null;
  createdAt: string;
}

interface Props {
  proposalId: string;
  /** When true, hide the explicit "Save as version" button. */
  readOnly?: boolean;
}

/**
 * Timeline of a proposal's pinned versions.
 *
 * Every send produces a new version automatically (see
 * src/app/api/proposals/[id]/send/route.ts). This component also
 * surfaces a "Save as new version" button for the case where the
 * florist wants to checkpoint a draft before making risky edits
 * without triggering a send.
 *
 * Clicking a version number currently fetches the full snapshot and
 * logs it to the console -- a read-only timeline view of the frozen
 * state is the natural follow-up.
 */
export function ProposalVersionsTimeline({
  proposalId,
  readOnly = false,
}: Props) {
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinning, setPinning] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/proposals/${proposalId}/versions`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const serverMsg = body?.detail || body?.error;
        throw new Error(
          serverMsg
            ? `Failed to load versions: ${serverMsg}`
            : "Failed to load versions"
        );
      }
      setVersions(await res.json());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePin = async () => {
    if (pinning) return;
    setPinning(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/versions`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to pin version");
      const row = await res.json();
      setVersions((prev) => [row, ...prev]);
      toast.success(`Pinned v${row.versionNumber}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pin failed");
    } finally {
      setPinning(false);
    }
  };

  const handleView = async (v: VersionRow) => {
    setOpeningId(v.id);
    try {
      const res = await fetch(
        `/api/proposals/${proposalId}/versions/${v.versionNumber}`
      );
      if (!res.ok) throw new Error("Failed to load version");
      const full = await res.json();
      // Temporary: dump the snapshot to the console. A proper read-
      // only preview is the natural follow-up once the core timeline
      // is in use.
      console.log(`Proposal version ${v.versionNumber}`, full);
      toast.success(
        `Version ${v.versionNumber} logged to console (preview UI coming soon)`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Open failed");
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div>
      {!readOnly && (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            A version is pinned every time the proposal is sent. Use the
            button to checkpoint between sends.
          </p>
          <button
            type="button"
            onClick={handlePin}
            disabled={pinning}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {pinning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Bookmark size={14} />
            )}
            Save as new version
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6 text-gray-500">
          <Loader2 size={16} className="animate-spin mr-2" />
          Loading versions...
        </div>
      ) : versions.length === 0 ? (
        <p className="py-4 text-center text-xs text-gray-500">
          No versions yet. A version will be pinned the first time you
          send this proposal.
        </p>
      ) : (
        <ol className="relative space-y-3 border-l border-gray-200 pl-5">
          {versions.map((v) => (
            <li key={v.id} className="relative">
              <span className="absolute -left-[25px] top-2 flex h-3 w-3 items-center justify-center rounded-full border border-gray-300 bg-white" />
              <button
                type="button"
                onClick={() => handleView(v)}
                disabled={openingId === v.id}
                className="w-full text-left rounded-md border border-gray-200 bg-white px-3 py-2 hover:border-primary-green hover:shadow-sm transition"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-gray-900">
                    Version {v.versionNumber}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatUkDateTime(v.createdAt)}
                  </span>
                </div>
                {v.changeSummary && (
                  <p className="mt-0.5 text-xs text-gray-600">
                    {v.changeSummary}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
