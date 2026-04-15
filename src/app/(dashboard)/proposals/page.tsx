"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Loader2, Search, ChevronUp, ChevronDown } from "lucide-react";
import { Can } from "@/components/auth/can";
import { formatUkDate } from "@/lib/format-date";

interface Proposal {
  id: string;
  orderId: string;
  status: string;
  sentAt?: string;
  createdAt: string;
  order?: {
    enquiry?: {
      clientName: string;
    };
  };
}

interface Order {
  id: string;
  enquiry?: {
    clientName: string;
  };
}

type SortField = "client" | "orderId" | "status" | "sentDate" | "created" | null;
type SortDirection = "asc" | "desc";

// Status colours from centralised utility
import { proposalStatusColours as statusColors } from "@/lib/status-colours";

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [formData, setFormData] = useState({ orderId: "", status: "draft" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/proposals");
        if (!response.ok) {
          throw new Error("Failed to fetch proposals");
        }
        const data = await response.json();
        setProposals(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, []);

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await fetch("/api/orders");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setFormError("Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormError(null);
    setFormData({ orderId: "", status: "draft" });
    setIsModalOpen(true);
    fetchOrders();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
    setFormData({ orderId: "", status: "draft" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.orderId) {
      setFormError("Please select an order");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: formData.orderId,
          status: formData.status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create proposal");
      }

      // Refresh proposals list
      const proposalsResponse = await fetch("/api/proposals");
      if (proposalsResponse.ok) {
        const data = await proposalsResponse.json();
        setProposals(data);
      }

      handleCloseModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      setDownloadingId(id);
      const response = await fetch(`/api/proposals/${id}/pdf`);
      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      toast.error("Failed to download proposal PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const displayedProposals = useMemo(() => {
    let filtered = proposals.filter((proposal) => {
      const clientName = (proposal.order?.enquiry?.clientName || "").toLowerCase();
      const status = proposal.status.toLowerCase();
      const search = searchTerm.toLowerCase();
      return clientName.includes(search) || status.includes(search);
    });

    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: string | number = "";
        let bValue: string | number = "";

        switch (sortField) {
          case "client":
            aValue = (a.order?.enquiry?.clientName || "").toLowerCase();
            bValue = (b.order?.enquiry?.clientName || "").toLowerCase();
            break;
          case "orderId":
            aValue = a.orderId.toLowerCase();
            bValue = b.orderId.toLowerCase();
            break;
          case "status":
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          case "sentDate":
            aValue = a.sentAt || "";
            bValue = b.sentAt || "";
            break;
          case "created":
            aValue = a.createdAt;
            bValue = b.createdAt;
            break;
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [proposals, searchTerm, sortField, sortDirection]);


  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">Proposals</h1>
          <p className="text-gray-600 mt-1">Create and send professional proposals</p>
        </div>
        <Can permission="proposals:create">
          <Button variant="primary" type="button" onClick={handleOpenModal}>
            <Plus size={20} className="mr-2" />
            New Proposal
          </Button>
        </Can>
      </div>

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardBody>
            <p className="text-red-800">Error: {error}</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by client name or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
            />
          </div>
        </div>
        <CardBody className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : displayedProposals.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-600">No proposals found. Create your first proposal to get started.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("client")}
                  >
                    <div className="flex items-center gap-2">
                      Client
                      {sortField === "client" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("orderId")}
                  >
                    <div className="flex items-center gap-2">
                      Order ID
                      {sortField === "orderId" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {sortField === "status" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("sentDate")}
                  >
                    <div className="flex items-center gap-2">
                      Sent Date
                      {sortField === "sentDate" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("created")}
                  >
                    <div className="flex items-center gap-2">
                      Created
                      {sortField === "created" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedProposals.map((proposal) => (
                  <tr key={proposal.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {proposal.order?.enquiry?.clientName || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {proposal.orderId.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <Badge variant={statusColors[proposal.status] || "secondary"}>
                        {proposal.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatUkDate(proposal.sentAt, undefined, "")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatUkDate(proposal.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <button
                        onClick={() => handleDownload(proposal.id)}
                        disabled={downloadingId === proposal.id}
                        className="inline-flex items-center justify-center p-2 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        title="Download PDF"
                        aria-label="Download proposal PDF"
                      >
                        {downloadingId === proposal.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Download size={18} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <h2 className="text-xl font-serif font-bold text-gray-900">Create New Proposal</h2>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardBody className="space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order
                  </label>
                  <select
                    value={formData.orderId}
                    onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                    disabled={ordersLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">
                      {ordersLoading ? "Loading orders..." : "Select an order"}
                    </option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.enquiry?.clientName || "Unknown Client"} ({order.id.slice(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </CardBody>

              <CardFooter className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting || ordersLoading}
                >
                  {submitting ? "Creating..." : "Create Proposal"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
