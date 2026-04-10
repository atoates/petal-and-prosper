"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { Can } from "@/components/auth/can";

interface DeliverySchedule {
  id: string;
  orderId: string;
  eventDate?: string;
  deliveryAddress?: string;
  items?: string;
  notes?: string;
  status: string;
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

interface CreateDeliveryForm {
  orderId: string;
  eventDate: string;
  deliveryAddress: string;
  notes: string;
  status: string;
}

export default function DeliveryPage() {
  const [schedules, setSchedules] = useState<DeliverySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateDeliveryForm>({
    orderId: "",
    eventDate: "",
    deliveryAddress: "",
    notes: "",
    status: "pending",
  });

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/delivery");
        if (!response.ok) {
          throw new Error("Failed to fetch delivery schedules");
        }
        const data = await response.json();
        setSchedules(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
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
      setFormError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleOpenModal = async () => {
    setIsModalOpen(true);
    setFormError(null);
    setFormData({
      orderId: "",
      eventDate: "",
      deliveryAddress: "",
      notes: "",
      status: "pending",
    });
    await fetchOrders();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.orderId || !formData.eventDate || !formData.deliveryAddress || !formData.status) {
      setFormError("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/delivery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: formData.orderId,
          eventDate: formData.eventDate,
          deliveryAddress: formData.deliveryAddress,
          notes: formData.notes,
          status: formData.status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create delivery");
      }

      handleCloseModal();

      const updatedResponse = await fetch("/api/delivery");
      if (updatedResponse.ok) {
        const data = await updatedResponse.json();
        setSchedules(data);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColors: Record<string, "primary" | "success" | "warning" | "danger" | "secondary"> = {
    pending: "warning",
    scheduled: "primary",
    in_transit: "primary",
    delivered: "success",
    cancelled: "danger",
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getItemsSummary = (itemsJson?: string) => {
    if (!itemsJson) return "-";
    try {
      const items = JSON.parse(itemsJson);
      if (Array.isArray(items)) {
        return `${items.length} item${items.length !== 1 ? "s" : ""}`;
      }
      return "-";
    } catch {
      return "-";
    }
  };

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "scheduled", label: "Scheduled" },
    { value: "in_transit", label: "In Transit" },
    { value: "delivered", label: "Delivered" },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">Delivery</h1>
          <p className="text-gray-600 mt-1">Plan and manage deliveries</p>
        </div>
        <Can permission="delivery:create">
          <Button variant="primary" type="button" onClick={handleOpenModal}>
            <Plus size={20} className="mr-2" />
            New Delivery
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
                <p className="mt-4 text-gray-600">Loading delivery schedules...</p>
              </div>
            </div>
          ) : schedules.length === 0 ? (
            <CardBody>
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500 text-lg">No deliveries scheduled yet</p>
                <p className="text-gray-400 mt-1">Create your first delivery to get started</p>
              </div>
            </CardBody>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Event Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Address
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Items
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr
                    key={schedule.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(schedule.eventDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {schedule.deliveryAddress || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Badge
                        variant={
                          statusColors[schedule.status as keyof typeof statusColors]
                        }
                      >
                        {schedule.status
                          .split("_")
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(" ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getItemsSummary(schedule.items)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {schedule.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardBody>
              <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">Create New Delivery</h2>

              {formError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{formError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                  label="Order"
                  name="orderId"
                  value={formData.orderId}
                  onChange={handleFormChange}
                  options={[
                    { value: "", label: ordersLoading ? "Loading orders..." : "Select an order" },
                    ...orders.map((order) => ({
                      value: order.id,
                      label: `${order.enquiry?.clientName || "Unknown"} (${order.id})`,
                    })),
                  ]}
                  disabled={ordersLoading}
                />

                <Input
                  label="Event Date"
                  type="date"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleFormChange}
                  required
                />

                <Input
                  label="Delivery Address"
                  type="text"
                  name="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={handleFormChange}
                  placeholder="Enter delivery address"
                  required
                />

                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    placeholder="Add any delivery notes"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent transition-colors"
                  />
                </div>

                <Select
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                  options={statusOptions}
                />

                <div className="flex gap-3 pt-6">
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creating..." : "Create Delivery"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
