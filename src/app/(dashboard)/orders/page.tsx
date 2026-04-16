"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { InlineSelect } from "@/components/ui/inline-select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Plus, Edit2, Trash2, ExternalLink, Loader2, Search, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { OrderModal } from "@/components/orders/order-modal";
import { Can } from "@/components/auth/can";
import { formatUkDate } from "@/lib/format-date";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
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

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const PAGE_SIZE = 50;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  // Per-row delete state (#27): prevents double-click and shows a
  // spinner while the DELETE is in flight.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Per-row status-update guard (#14): same idea as deletingId, but
  // for inline status flips so a rapid double-click can't fire two
  // concurrent PUTs on the same order.
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>("eventDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Debounced search term used as the effect dependency; the raw
  // `searchTerm` keeps the input responsive while we avoid firing a
  // fetch per keystroke.
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  // Reset to page 1 whenever the search term meaningfully changes,
  // otherwise we might sit on page 4 of a now-empty result set.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchOrders = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());

        const response = await fetch(`/api/orders?${params.toString()}`, {
          signal,
        });
        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }
        const json = await response.json();
        setOrders(json.data);
        setPagination(json.pagination);
        setError(null);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [page, debouncedSearch]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchOrders(controller.signal);
    return () => controller.abort();
  }, [fetchOrders]);

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

      await fetchOrders();
    } catch (err) {
      console.error("Error saving order:", err);
      throw err;
    }
  };

  // Inline status update -- fetch the full order then PUT it back with
  // the new status. The PUT handler recomputes totals from items, so
  // we preserve items and totalPrice from the server's current state.
  // statusUpdatingId guards against rapid double-clicks on the select.
  const handleStatusUpdate = async (order: Order, next: OrderStatus) => {
    if (statusUpdatingId === order.id) return;
    setStatusUpdatingId(order.id);
    try {
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
    } finally {
      setStatusUpdatingId(null);
    }
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

      await fetchOrders();
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

  // Filtering/pagination/search are server-side now. This useMemo only
  // sorts the rows already on the current page -- a lightweight UX
  // nicety that avoids adding sortBy/sortDir to the API surface. If
  // users need cross-page sort, the server can take over later.
  const displayedOrders = useMemo(() => {
    if (!sortField) return orders;

    return [...orders].sort((a, b) => {
      let aValue: string | number | null;
      let bValue: string | number | null;

      switch (sortField) {
        case "client":
          aValue = (a.enquiry?.clientName || "").toLowerCase();
          bValue = (b.enquiry?.clientName || "").toLowerCase();
          break;
        case "eventDate":
          aValue = a.enquiry?.eventDate ? new Date(a.enquiry.eventDate).getTime() : null;
          bValue = b.enquiry?.eventDate ? new Date(b.enquiry.eventDate).getTime() : null;
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

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [orders, sortField, sortDirection]);

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
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-white">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search by client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-sm bg-transparent text-gray-900 placeholder-gray-500"
              aria-label="Search orders"
            />
          </div>
        </div>
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
                <p className="text-gray-500 text-lg">
                  {debouncedSearch
                    ? "No orders match your search"
                    : "No orders yet"}
                </p>
                {!debouncedSearch && (
                  <p className="text-gray-400 mt-1">Create your first order to get started</p>
                )}
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
                          aria-label="View order"
                        >
                          <ExternalLink size={16} />
                        </Link>
                        <button
                          onClick={() => handleOpenModal(order)}
                          className="p-1 text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded transition-colors"
                          title="Edit"
                          aria-label="Edit order"
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
        {!loading && pagination.total > 0 && (
          <div className="px-6 border-t border-gray-200">
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={setPage}
            />
          </div>
        )}
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
