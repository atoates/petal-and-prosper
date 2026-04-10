"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardFooter } from "@/components/ui/card";
import { Plus, Download } from "lucide-react";
import { ColDef } from "ag-grid-community";
import { DataGrid } from "@/components/ui/data-grid";
import { StatusBadgeRenderer, DateRenderer } from "@/components/ui/grid-renderers";
import { Can } from "@/components/auth/can";

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
      alert("Failed to download proposal PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const columnDefs: ColDef[] = [
    {
      field: "order.enquiry.clientName",
      headerName: "Client",
      width: 180,
      sortable: true,
      filter: true,
      valueGetter: (params) => params.data?.order?.enquiry?.clientName || "Unknown",
    },
    {
      field: "orderId",
      headerName: "Order ID",
      width: 150,
      sortable: true,
      filter: true,
      valueFormatter: (params) => {
        const orderId = params.value || "";
        return `${orderId.slice(0, 8)}...`;
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      cellRenderer: StatusBadgeRenderer,
      sortable: true,
      filter: true,
    },
    {
      field: "sentAt",
      headerName: "Sent Date",
      width: 130,
      cellRenderer: DateRenderer,
      sortable: true,
      filter: true,
    },
    {
      field: "createdAt",
      headerName: "Created Date",
      width: 130,
      cellRenderer: DateRenderer,
      sortable: true,
      filter: true,
    },
    {
      field: "id",
      headerName: "Actions",
      width: 100,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => (
        <div className="flex items-center justify-center h-full">
          <button
            onClick={() => handleDownload(params.value)}
            disabled={downloadingId === params.value}
            className="inline-flex items-center justify-center p-2 rounded hover:bg-gray-200 disabled:opacity-50"
            title="Download PDF"
          >
            <Download size={18} />
          </button>
        </div>
      ),
    },
  ];

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
        <CardBody className="p-0">
          <DataGrid
            rowData={proposals}
            columnDefs={columnDefs}
            loading={loading}
            emptyMessage="No proposals yet. Create your first proposal to get started."
            pageSize={20}
          />
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
