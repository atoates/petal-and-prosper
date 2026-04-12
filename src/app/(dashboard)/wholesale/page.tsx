"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Can } from "@/components/auth/can";

interface WholesaleLineItem {
  description: string;
  category?: string;
  quantity: number;
  unitPrice?: string;
}

interface WholesaleOrderItemRow {
  id: string;
  description: string;
  category?: string | null;
  quantity: number;
  unitPrice?: string | null;
}

interface WholesaleOrder {
  id: string;
  orderId: string;
  supplier: string;
  items?: WholesaleOrderItemRow[];
  status: string;
  orderDate: string;
  receivedDate?: string;
  createdAt: string;
  order?: {
    enquiry?: {
      clientName: string;
    };
  };
}

interface OrderOption {
  id: string;
  enquiry?: {
    clientName: string;
  };
}

interface Product {
  id: string;
  name: string;
  category?: string | null;
  wholesalePrice?: string | null;
  unit?: string | null;
  supplier?: string | null;
}

interface OrderItemRow {
  id: string;
  description: string;
  category?: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export default function WholesalePage() {
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderOptions, setOrderOptions] = useState<OrderOption[]>([]);
  const [orderOptionsLoading, setOrderOptionsLoading] = useState(false);
  const [productLibrary, setProductLibrary] = useState<Product[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState("pending");
  const [lineItems, setLineItems] = useState<WholesaleLineItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/wholesale");
        if (!response.ok) {
          throw new Error("Failed to fetch wholesale orders");
        }
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const statusColors: Record<string, "primary" | "success" | "warning" | "danger" | "secondary"> = {
    pending: "warning",
    confirmed: "primary",
    dispatched: "primary",
    received: "success",
    cancelled: "danger",
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Items are now a proper child relation (#16), so summarising
  // is just `items.length` rather than parsing a JSON text column.
  const getItemsSummary = (items?: WholesaleOrderItemRow[]) => {
    if (!items || items.length === 0) return "-";
    return `${items.length} item${items.length !== 1 ? "s" : ""}`;
  };

  const handleOpenModal = async () => {
    setFormError(null);
    setSelectedOrderId("");
    setSupplier("");
    setStatus("pending");
    setLineItems([]);
    setIsModalOpen(true);

    try {
      setOrderOptionsLoading(true);
      const [ordersRes, productsRes] = await Promise.all([
        fetch("/api/orders"),
        fetch("/api/products"),
      ]);
      if (!ordersRes.ok) throw new Error("Failed to load orders");
      const data = await ordersRes.json();
      setOrderOptions(data);
      // Product library is optional -- if the tenant has no products
      // yet, or the caller lacks products:read, we just silently skip
      // the autocomplete rather than blocking the wholesale flow.
      if (productsRes.ok) {
        const products = await productsRes.json();
        setProductLibrary(Array.isArray(products) ? products : []);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setOrderOptionsLoading(false);
    }
  };

  // When the user picks a product by typing its name (HTML datalist
  // selection fires a plain change event), copy its wholesale price
  // and category onto the row so the florist isn't retyping info that
  // already lives in the library.
  const handleDescriptionChange = (index: number, value: string) => {
    const match = productLibrary.find(
      (p) => p.name.toLowerCase() === value.toLowerCase()
    );
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next: WholesaleLineItem = { ...item, description: value };
        if (match) {
          if (match.wholesalePrice) next.unitPrice = match.wholesalePrice;
          if (match.category) next.category = match.category;
        }
        return next;
      })
    );
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  const handleSelectOrder = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setLineItems([]);
    if (!orderId) return;

    try {
      setLoadingItems(true);
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error("Failed to load order items");
      const data = await response.json();
      const items: OrderItemRow[] = data.items || [];
      // Pre-populate from source order's line items. Users can still edit
      // quantities and descriptions before committing the wholesale order.
      setLineItems(
        items.map((item) => ({
          description: item.description,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to load order items"
      );
    } finally {
      setLoadingItems(false);
    }
  };

  const handleUpdateLineItem = (
    index: number,
    field: keyof WholesaleLineItem,
    value: string | number
  ) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { description: "", category: "flower", quantity: 1, unitPrice: "0.00" },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedOrderId) {
      setFormError("Please select an order");
      return;
    }
    if (!supplier.trim()) {
      setFormError("Supplier is required");
      return;
    }
    if (lineItems.length === 0) {
      setFormError("Add at least one line item");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/wholesale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId,
          supplier: supplier.trim(),
          status,
          items: lineItems,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create wholesale order");
      }

      const refreshed = await fetch("/api/wholesale");
      if (refreshed.ok) {
        setOrders(await refreshed.json());
      }

      handleCloseModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">Wholesale</h1>
          <p className="text-gray-600 mt-1">Manage supplier orders and stock</p>
        </div>
        <Can permission="wholesale:create">
          <Button variant="primary" type="button" onClick={handleOpenModal}>
            <Plus size={20} className="mr-2" />
            New Wholesale Order
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
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]"></div>
                <p className="mt-4 text-gray-600">Loading wholesale orders...</p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <CardBody>
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500 text-lg">No wholesale orders yet</p>
                <p className="text-gray-400 mt-1">Create your first wholesale order to get started</p>
              </div>
            </CardBody>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Supplier
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Event Client
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Order Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Items
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {order.supplier}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.order?.enquiry?.clientName || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Badge variant={statusColors[order.status as keyof typeof statusColors]}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(order.orderDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getItemsSummary(order.items)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader>
              <h2 className="text-xl font-serif font-bold text-gray-900">
                New Wholesale Order
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Line items are pre-populated from the source order.
              </p>
            </CardHeader>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col flex-1 min-h-0"
            >
              {/*
                Shared datalist for all description inputs. A single
                <datalist> is cheaper than repeating one per row and is
                addressed by any input via `list="wholesale-product-library"`.
              */}
              <datalist id="wholesale-product-library">
                {productLibrary.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.wholesalePrice ? `£${p.wholesalePrice}` : ""}
                    {p.supplier ? ` • ${p.supplier}` : ""}
                  </option>
                ))}
              </datalist>
              <CardBody className="space-y-4 overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Order
                  </label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => handleSelectOrder(e.target.value)}
                    disabled={orderOptionsLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332] disabled:opacity-50"
                  >
                    <option value="">
                      {orderOptionsLoading
                        ? "Loading orders..."
                        : "Select an order"}
                    </option>
                    {orderOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.enquiry?.clientName || "Unknown"} ({o.id.slice(0, 8)}
                        ...)
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Supplier"
                  placeholder="e.g. New Covent Garden Market"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Line items
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddLineItem}
                      disabled={loadingItems}
                    >
                      <Plus size={14} className="mr-1" />
                      Add line
                    </Button>
                  </div>
                  {loadingItems ? (
                    <p className="text-sm text-gray-500">
                      Loading order items...
                    </p>
                  ) : lineItems.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      {selectedOrderId
                        ? "No items on this order yet. Add some manually."
                        : "Select an order to pre-populate items."}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {lineItems.map((item, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-12 gap-2 items-center"
                        >
                          <input
                            className="col-span-6 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Description"
                            list="wholesale-product-library"
                            value={item.description}
                            onChange={(e) =>
                              handleDescriptionChange(index, e.target.value)
                            }
                          />
                          <input
                            type="number"
                            className="col-span-2 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateLineItem(
                                index,
                                "quantity",
                                parseInt(e.target.value) || 0
                              )
                            }
                          />
                          <input
                            type="text"
                            className="col-span-3 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Unit £"
                            value={item.unitPrice || ""}
                            onChange={(e) =>
                              handleUpdateLineItem(
                                index,
                                "unitPrice",
                                e.target.value
                              )
                            }
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(index)}
                            className="col-span-1 text-gray-400 hover:text-red-600"
                            aria-label="Remove line"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardBody>

              <CardFooter className="flex justify-end gap-3">
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
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "Create Wholesale Order"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
