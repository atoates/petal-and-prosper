"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { Can } from "@/components/auth/can";

interface ProductionSchedule {
  id: string;
  orderId: string;
  eventDate?: string;
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

export default function ProductionPage() {
  const [schedules, setSchedules] = useState<ProductionSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [formData, setFormData] = useState({
    orderId: "",
    eventDate: "",
    notes: "",
    status: "not_started",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/production");
        if (!response.ok) {
          throw new Error("Failed to fetch production schedules");
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

  useEffect(() => {
    if (isModalOpen) {
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
        } finally {
          setOrdersLoading(false);
        }
      };

      fetchOrders();
    }
  }, [isModalOpen]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setFormData({
      orderId: "",
      eventDate: "",
      notes: "",
      status: "not_started",
    });
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      orderId: "",
      eventDate: "",
      notes: "",
      status: "not_started",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.orderId || !formData.eventDate) {
      setError("Order and event date are required");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/production", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: formData.orderId,
          eventDate: formData.eventDate,
          notes: formData.notes,
          status: formData.status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create production schedule");
      }

      const newSchedule = await response.json();
      setSchedules([...schedules, newSchedule]);
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColors: Record<string, "primary" | "success" | "warning" | "danger" | "secondary"> = {
    not_started: "secondary",
    in_progress: "primary",
    in_preparation: "warning",
    completed: "success",
    on_hold: "warning",
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">Production</h1>
          <p className="text-gray-600 mt-1">Schedule and manage production</p>
        </div>
        <Can permission="production:create">
          <Button variant="primary" type="button" onClick={handleOpenModal}>
            <Plus size={20} className="mr-2" />
            New Schedule
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
                <p className="mt-4 text-gray-600">Loading production schedules...</p>
              </div>
            </div>
          ) : schedules.length === 0 ? (
            <CardBody>
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500 text-lg">No production schedules yet</p>
                <p className="text-gray-400 mt-1">Create your first schedule to get started</p>
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
                    Client/Order
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
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {schedule.order?.enquiry?.clientName || "Unknown"}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Create Production Schedule</h2>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardBody className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order
                  </label>
                  <select
                    value={formData.orderId}
                    onChange={(e) =>
                      setFormData({ ...formData, orderId: e.target.value })
                    }
                    disabled={ordersLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[#1B4332]"
                  >
                    <option value="">
                      {ordersLoading ? "Loading orders..." : "Select an order"}
                    </option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.enquiry?.clientName || `Order ${order.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Date
                  </label>
                  <Input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) =>
                      setFormData({ ...formData, eventDate: e.target.value })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <Input
                    type="text"
                    placeholder="Add notes for this schedule"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[#1B4332]"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_preparation">In Preparation</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </CardBody>
              <CardFooter className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Schedule"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
