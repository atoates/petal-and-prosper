"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { InlineSelect } from "@/components/ui/inline-select";
import { Plus, Edit2, Trash2, ExternalLink, Loader2, Search, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { OrderModal } from "@/components/orders/order-modal";
import { Can } from "@/components/auth/can";
import { formatUkDate } from "@/lib/format-date";
import type { OrderStatus } from "@/types/orders";

interface Order {
  id: string;
  enquiryId?: string;
  status: OrderStatus;
  version: number;
  totalPrice?: string;
  createdAt: string;
  enquiry?: {
    clientName: string;
    eventDate?: string | null;
    eventType?: string | null;
  };
}

// Primary sort for the orders list is the event date on the
// linked enquiry (ascending, soonest-first), with null event
// dates bucketed to the end and createdAt (descending) as the
// tiebreaker. This matches how florists actually work the list:
// upcoming events first, then anything without a date, then the
// most recently touched.
function sortByEventDate(list: Order[]): Order[] {
  return [...list].sort((a, b) => {
    const aDate = a.enquiry?.eventDate ?? null;
    const bDate = b.enquiry?.eventDate ?? null;
    if (aDate && bDate) {
      const diff =
        new Date(aDate).getTime() - new Date(bDate).getTime();
      if (diff !== 0) return diff;
    } else if (aDate && !bDate) {
      return -1;
    } else if (!aDate && bDate) {
      return 1;
    }
    return (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  // Per-row delete state (#27): prevents double-click and shows a
  // spinner while the DELETE is in flight.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | null>("eventDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/orders");
        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }
        const data = await response.json();
        setOrders(sortByEventDate(data));
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Status pill styling is now handled inline via InlineSelect options.

  const formatPrice = (price?: string) => {
    if (!price) return "-";
    return `£${parseFloat(price).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleOpenModal = (order?: Order) => {
    if (order) {
      setSelectedOrder(order);
    } else {
      setSelectedOrder(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleSaveOrder = async (orderData: Partial<Order>) => {
    try {
      if (selectedOrder) {
        const response = await fetch(`/api/orders/${selectedOrder.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });

        if (!response.ok) {
          throw new Error("Failed to update order");
        }
      } else {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });

        if (!response.ok) {
          throw new Error("Failed to create order");
        }
      }

      const response = await fetch("/api/orders");
      const data = await response.json();
      setOrders(sortByEventDate(data));
    } catch (err) {
      console.error("Error saving order:", err);
      throw err;
    }
  };

  // Inline status update -- fetch the full order then PUT it back with
  // the new status. The PUT handler recomputes totals from items, so
  // we preserve items and totalPrice from the server's current state.
  const handleStatusUpdate = async (order: Order, next: OrderStatus) => {
    const res = await fetch(`/api/orders/${order.id}`);
    if (!res.ok) throw new Error("Failed to load order");
    const full = await res.json();
    const put = await fetch(`/api/orders/${order.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enquiryId: full.enquiryId,
        status: next,
        version: full.version ?? 1,
        totalPrice: full.totalPrice,
        items: full.items,
      }),
    });
    if (!put.ok) throw new Error("Failed to update status");
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: next } : o))
    );
    toast.success("Status updated");
  };

  const handleDeleteOrder = async (id: string) => {
    if (deletingId) return;
    if (!confirm("Are you sure you want to delete this order?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete order");
      }

      const updatedResponse = await fetch("/api/orders");
      const data = await updatedResponse.json();
      setOrders(sortByEventDate(data));
    } catch (err) {
      console.error("Error deleting order:", err);
      toast.error("Failed to delete order");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const displayedOrders = useMemo(() => {
    let filtered = orders;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((order) => {
        const clientName = (order.enquiry?.clientName || "").toLowerCase();
        const status = order.status.toLowerCase();
        const eventType = (order.enquiry?.eventType || "").toLowerCase();
        return (
          clientName.includes(term) ||
          status.includes(term) ||
          eventType.includes(term)
        );
      });
    }

    // Apply sorting
    if (!sortField) {
      return filtered;
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "client":
          aValue = (a.enquiry?.clientName || "").toLowerCase();
          bValue = (b.enquiry?.clientName || "").toLowerCase();
          break;
        case "eventDate":
          aValue = a.enquiry?.eventDate ? new Date(a.enquiry.eventDate).getTime() : null;
          bValue = b.enquiry?.eventDate ? new Date(b.enquiry.eventDate).getTime() : null;
          // Handle null dates (sort to end)
          if (aValue === null && bValue === null) return 0;
          if (aValue === null) return 1;
          if (bValue === null) return -1;
          break;
        case "status":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case "version":
          aValue = a.version;
          bValue = b.version;
          break;
        case "totalPrice":
          aValue = a.totalPrice ? parseFloat(a.totalPrice) : 0;
          bValue = b.totalPrice ? parseFloat(b.totalPrice) : 0;
          break;
        case "created":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      // String comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Numeric comparison
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [orders, searchTerm, sortField, sortDirection]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-1">Manage and track all orders</p>
        </div>
        <Can permission="orders:create">
          <Button variant="primary" type="button" onClick={() => handleOpenModal()}>
            <Plus size={20} className="mr-2" />
            New Order
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
        {!loading && orders.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-white">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search by client, status, or event type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none text-sm bg-transparent text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]"></div>
                <p className="mt-4 text-gray-600">Loading orders...</p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <CardBody>
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500 text-lg">No orders yet</p>
                <p className="text-gray-400 mt-1">Create your first order to get started</p>
              </div>
            </CardBody>
          ) : (
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("client")}
                  >
                    <div className="flex items-center gap-1">
                      Client
                      {sortField === "client" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("eventDate")}
                  >
                    <div className="flex items-center gap-1">
                      Event Date
                      {sortField === "eventDate" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {sortField === "status" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("version")}
                  >
                    <div className="flex items-center gap-1">
                      Version
                      {sortField === "version" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("totalPrice")}
                  >
                    <div className="flex items-center gap-1">
                      Total Price
                      {sortField === "totalPrice" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("created")}
                  >
                    <div className="flex items-center gap-1">
                      Created
                      {sortField === "created" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-[#1B4332] hover:underline font-medium"
                      >
                        {order.enquiry?.clientName || "Unknown"}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.enquiry?.eventDate
                        ? formatUkDate(order.enquiry.eventDate)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <InlineSelect
                        ariaLabel="Order status"
                        value={order.status}
                        options={[
                          { value: "draft", label: "Draft", className: "bg-gray-100 text-gray-700 border border-gray-200" },
                          { value: "quote", label: "Quote", className: "bg-amber-50 text-amber-700 border border-amber-200" },
                          { value: "confirmed", label: "Confirmed", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
                          { value: "completed", label: "Completed", className: "bg-[#E8EFE5] text-[#1B4332] border border-[#1B4332]/20" },
                          { value: "cancelled", label: "Cancelled", className: "bg-red-50 text-red-700 border border-red-200" },
                        ]}
                        onChange={async (next) => {
                          await handleStatusUpdate(order, next as OrderStatus);
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.version}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatPrice(order.totalPrice)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatUkDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/orders/${order.id}`}
                          className="p-1 text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded transition-colors"
                          title="View"
                        >
                          <ExternalLink size={16} />
                        </Link>
                        <button
                          onClick={() => handleOpenModal(order)}
                          className="p-1 text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <Can permission="orders:delete">
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order.id)}
                            disabled={deletingId === order.id}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                            aria-label="Delete order"
                          >
                            {deletingId === order.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <OrderModal
        isOpen={isModalOpen}
        order={selectedOrder}
        onClose={handleCloseModal}
        onSave={handleSaveOrder}
      />
    </div>
  );
}
