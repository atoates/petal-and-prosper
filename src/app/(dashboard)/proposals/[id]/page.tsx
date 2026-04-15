"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Can } from "@/components/auth/can";
import { InlineSelect } from "@/components/ui/inline-select";
import {
  ArrowLeft,
  Download,
  Send,
  Loader2,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { formatUkDate } from "@/lib/format-date";
import { proposalStatusColours, formatStatus } from "@/lib/status-colours";

interface Proposal {
  id: string;
  orderId: string;
  status: string;
  sentAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  subject?: string | null;
  bodyHtml?: string | null;
  content?: string | null;
  publicToken?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  order?: {
    id: string;
    enquiry?: {
      clientName: string;
      clientEmail?: string | null;
      eventType?: string | null;
      eventDate?: string | null;
    } | null;
  } | null;
}

export default function ProposalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchProposal = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/proposals/${params.id}`);
      if (!res.ok) throw new Error("Failed to load proposal");
      setProposal(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  const handleStatusChange = async (next: string) => {
    if (!proposal) return;
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updated = await res.json();
      setProposal((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success(`Status updated to ${formatStatus(next)}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDownload = async () => {
    if (!proposal) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/pdf`);
      if (!res.ok) throw new Error("Failed to download PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal-${proposal.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleSend = async () => {
    if (!proposal) return;
    setSending(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send proposal");
      }
      toast.success("Proposal sent");
      fetchProposal();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send proposal"
      );
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!proposal) return;
    if (!confirm("Delete this draft proposal? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete proposal");
      }
      toast.success("Proposal deleted");
      router.push("/proposals");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete"
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-green" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600">{error || "Proposal not found"}</p>
        <Link
          href="/proposals"
          className="mt-4 inline-block text-sm text-primary-green hover:underline"
        >
          Back to proposals
        </Link>
      </div>
    );
  }

  const enquiry = proposal.order?.enquiry;
  const publicUrl = proposal.publicToken
    ? `/p/${proposal.publicToken}`
    : null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/proposals"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Back to proposals"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-gray-900">
              Proposal for {enquiry?.clientName || "Unknown client"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Order{" "}
              <Link
                href={`/orders/${proposal.orderId}`}
                className="text-primary-green hover:underline"
              >
                {proposal.orderId.slice(0, 8)}...
              </Link>
              {enquiry?.eventType && ` · ${enquiry.eventType}`}
              {enquiry?.eventDate &&
                ` · ${formatUkDate(enquiry.eventDate)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={downloading}
            aria-label="Download PDF"
          >
            {downloading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Download PDF
          </Button>

          {proposal.status === "draft" && (
            <Can permission="proposals:update">
              <Button variant="primary" onClick={handleSend} disabled={sending}>
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Send to client
              </Button>
            </Can>
          )}

          {proposal.status === "draft" && (
            <Can permission="proposals:delete">
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleting}
                className="text-red-600 border-red-200 hover:bg-red-50"
                aria-label="Delete proposal"
              >
                <Trash2 size={16} />
              </Button>
            </Can>
          )}
        </div>
      </div>

      {/* Status and details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Status
            </p>
            <Can permission="proposals:update">
              <InlineSelect
                ariaLabel="Proposal status"
                value={proposal.status}
                options={[
                  { value: "draft", label: "Draft", className: "bg-gray-100 text-gray-700 border border-gray-200" },
                  { value: "sent", label: "Sent", className: "bg-amber-50 text-amber-700 border border-amber-200" },
                  { value: "accepted", label: "Accepted", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
                  { value: "rejected", label: "Rejected", className: "bg-red-50 text-red-700 border border-red-200" },
                ]}
                onChange={(next) => handleStatusChange(next)}
              />
            </Can>
            <Can permission="proposals:update" fallback={
              <Badge variant={proposalStatusColours[proposal.status] || "secondary"}>
                {formatStatus(proposal.status)}
              </Badge>
            }>
              <></>
            </Can>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Dates
            </p>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-gray-500">Created:</span>{" "}
                {formatUkDate(proposal.createdAt)}
              </p>
              {proposal.sentAt && (
                <p>
                  <span className="text-gray-500">Sent:</span>{" "}
                  {formatUkDate(proposal.sentAt)}
                </p>
              )}
              {proposal.acceptedAt && (
                <p>
                  <span className="text-gray-500">Accepted:</span>{" "}
                  {formatUkDate(proposal.acceptedAt)}
                </p>
              )}
              {proposal.rejectedAt && (
                <p>
                  <span className="text-gray-500">Rejected:</span>{" "}
                  {formatUkDate(proposal.rejectedAt)}
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Client link
            </p>
            {publicUrl ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary-green hover:underline"
              >
                <ExternalLink size={14} />
                View public proposal
              </a>
            ) : (
              <p className="text-sm text-gray-400">
                Send the proposal to generate a public link.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Content preview */}
      {proposal.subject && (
        <Card className="mb-6">
          <CardBody>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Subject
            </p>
            <p className="text-sm text-gray-900">{proposal.subject}</p>
          </CardBody>
        </Card>
      )}

      {proposal.bodyHtml && (
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Proposal content
            </p>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: proposal.bodyHtml }}
            />
          </CardBody>
        </Card>
      )}

      {!proposal.bodyHtml && proposal.content && (
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Proposal content
            </p>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {proposal.content}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
