"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { Can } from "@/components/auth/can";
import { formatUkDate } from "@/lib/format-date";

/**
 * /production
 *
 * Lightweight production schedule board. Each row links a production
 * run back to an order, lets the team assign a lead and break the
 * work into a checklist of tasks, and tracks status through the
 * batch. Items/tasks are stored on the backend as JSON-stringified
 * arrays so we can evolve the shape without a schema migration.
 */
interface ProductionTask {
  id: string;
  label: string;
  done: boolean;
  assignedTo?: string | null;
}

interface ProductionScheduleItem {
  id: string;
  description: string;
  category?: string | null;
  quantity: number;
  notes?: string | null;
}

interface ProductionSchedule {
  id: string;
  orderId: string;
  productionDate?: string | null;
  // Items are now a proper child relation (#16) rather than a
  // JSON-encoded text column.
  items?: ProductionScheduleItem[];
  assignedTo?: string | null;
  tasks?: string | null;
  notes?: string | null;
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

interface TeamMember {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}

// Status options exposed in the UI. We only show the three values
// the DB enum actually supports so the API never rejects a save.
const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

const statusColors: Record<
  string,
  "primary" | "success" | "warning" | "danger" | "secondary"
> = {
  not_started: "secondary",
  in_progress: "primary",
  completed: "success",
};

function parseTasks(raw?: string | null): ProductionTask[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ProductionTask[];
    return [];
  } catch {
    return [];
  }
}

function staffLabel(members: TeamMember[], id?: string | null): string {
  if (!id) return "Unassigned";
  const m = members.find((x) => x.id === id);
  if (!m) return "Unknown";
  const name = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
  return name || m.email;
}

export default function ProductionPage() {
  const [schedules, setSchedules] = useState<ProductionSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionSchedule | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Per-row delete state (#27): one at a time, disables the row
  // and swaps the trash icon for a spinner during the round-trip.
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    orderId: "",
    productionDate: "",
    notes: "",
    status: "not_started",
    assignedTo: "",
  });
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [newTaskLabel, setNewTaskLabel] = useState("");

  const fetchSchedules = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Pull orders and team members only when the modal opens to keep
  // the list view cheap. Team is needed for both the lead-assignee
  // dropdown and the per-task assignee dropdown.
  useEffect(() => {
    if (!isModalOpen) return;
    const load = async () => {
      try {
        setOrdersLoading(true);
        const [ordersRes, usersRes] = await Promise.all([
          fetch("/api/orders"),
          fetch("/api/users"),
        ]);
        if (ordersRes.ok) setOrders(await ordersRes.json());
        if (usersRes.ok) setTeam(await usersRes.json());
      } catch (err) {
        console.error("Error loading modal data:", err);
      } finally {
        setOrdersLoading(false);
      }
    };
    load();
  }, [isModalOpen]);

  const resetForm = () => {
    setFormData({
      orderId: "",
      productionDate: "",
      notes: "",
      status: "not_started",
      assignedTo: "",
    });
    setTasks([]);
    setNewTaskLabel("");
    setEditing(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
    setError(null);
  };

  const handleEdit = (schedule: ProductionSchedule) => {
    setEditing(schedule);
    setFormData({
      orderId: schedule.orderId,
      productionDate: schedule.productionDate
        ? new Date(schedule.productionDate).toISOString().slice(0, 10)
        : "",
      notes: schedule.notes || "",
      status: schedule.status,
      assignedTo: schedule.assignedTo || "",
    });
    setTasks(parseTasks(schedule.tasks));
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleAddTask = () => {
    const label = newTaskLabel.trim();
    if (!label) return;
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label,
        done: false,
        assignedTo: null,
      },
    ]);
    setNewTaskLabel("");
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const handleRemoveTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAssignTask = (id: string, userId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, assignedTo: userId || null } : t
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.orderId || !formData.productionDate) {
      setError("Order and production date are required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        orderId: formData.orderId,
        productionDate: formData.productionDate,
        notes: formData.notes || null,
        status: formData.status,
        assignedTo: formData.assignedTo || null,
        tasks: tasks.length > 0 ? tasks : null,
      };

      // PATCH on edit, POST on create -- PATCH is narrower and
      // doesn't require orderId so we strip it there.
      const url = editing
        ? `/api/production/${editing.id}`
        : "/api/production";
      const method = editing ? "PATCH" : "POST";
      const body = editing
        ? JSON.stringify({
            productionDate: payload.productionDate,
            notes: payload.notes,
            status: payload.status,
            assignedTo: payload.assignedTo,
            tasks: payload.tasks,
          })
        : JSON.stringify(payload);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save production schedule");
      }

      await fetchSchedules();
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (schedule: ProductionSchedule) => {
    if (deletingId) return;
    if (
      !window.confirm(
        "Delete this production schedule? This cannot be undone."
      )
    ) {
      return;
    }
    setDeletingId(schedule.id);
    try {
      const response = await fetch(`/api/production/${schedule.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete production schedule");
      }
      setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDeletingId(null);
    }
  };

  const getTaskSummary = (raw?: string | null) => {
    const parsed = parseTasks(raw);
    if (parsed.length === 0) return "-";
    const done = parsed.filter((t) => t.done).length;
    return `${done}/${parsed.length}`;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">
            Production
          </h1>
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
                <p className="mt-4 text-gray-600">
                  Loading production schedules...
                </p>
              </div>
            </div>
          ) : schedules.length === 0 ? (
            <CardBody>
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500 text-lg">
                  No production schedules yet
                </p>
                <p className="text-gray-400 mt-1">
                  Create your first schedule to get started
                </p>
              </div>
            </CardBody>
          ) : (
            <table className="w-full min-w-[800px]">
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
                    Assigned
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Tasks
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Notes
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr
                    key={schedule.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatUkDate(schedule.productionDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {schedule.order?.enquiry?.clientName || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Badge variant={statusColors[schedule.status]}>
                        {STATUS_OPTIONS.find(
                          (o) => o.value === schedule.status
                        )?.label || schedule.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {staffLabel(team, schedule.assignedTo)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getTaskSummary(schedule.tasks)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {schedule.notes || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Can permission="production:update">
                          <button
                            type="button"
                            onClick={() => handleEdit(schedule)}
                            className="p-2 text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded"
                            aria-label="Edit schedule"
                          >
                            <Pencil size={16} />
                          </button>
                        </Can>
                        <Can permission="production:delete">
                          <button
                            type="button"
                            onClick={() => handleDelete(schedule)}
                            disabled={deletingId === schedule.id}
                            className="p-2 text-gray-600 hover:text-red-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Delete schedule"
                          >
                            {deletingId === schedule.id ? (
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">
                {editing
                  ? "Edit Production Schedule"
                  : "Create Production Schedule"}
              </h2>
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
                    disabled={ordersLoading || !!editing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[#1B4332] disabled:bg-gray-50"
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
                  {editing && (
                    <p className="text-xs text-gray-500 mt-1">
                      Order cannot be changed after creation.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Production Date
                    </label>
                    <Input
                      type="date"
                      value={formData.productionDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          productionDate: e.target.value,
                        })
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
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lead / assigned to
                  </label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignedTo: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[#1B4332]"
                  >
                    <option value="">Unassigned</option>
                    {team.map((m) => (
                      <option key={m.id} value={m.id}>
                        {[m.firstName, m.lastName].filter(Boolean).join(" ") ||
                          m.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task breakdown
                  </label>
                  <div className="space-y-2">
                    {tasks.length === 0 && (
                      <p className="text-xs text-gray-500">
                        No tasks yet. Add sub-tasks below to break this
                        production run into steps.
                      </p>
                    )}
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => handleToggleTask(task.id)}
                          className="h-4 w-4"
                        />
                        <span
                          className={`flex-1 text-sm ${
                            task.done
                              ? "line-through text-gray-500"
                              : "text-gray-900"
                          }`}
                        >
                          {task.label}
                        </span>
                        <select
                          value={task.assignedTo || ""}
                          onChange={(e) =>
                            handleAssignTask(task.id, e.target.value)
                          }
                          className="px-2 py-1 text-xs border border-gray-300 rounded"
                        >
                          <option value="">Unassigned</option>
                          {team.map((m) => (
                            <option key={m.id} value={m.id}>
                              {[m.firstName, m.lastName]
                                .filter(Boolean)
                                .join(" ") || m.email}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveTask(task.id)}
                          className="p-1 text-gray-500 hover:text-red-700"
                          aria-label="Remove task"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="text"
                      placeholder="Add a task (e.g. 'Condition stems')"
                      value={newTaskLabel}
                      onChange={(e) => setNewTaskLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTask();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddTask}
                    >
                      Add
                    </Button>
                  </div>
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
                  {isSubmitting
                    ? "Saving..."
                    : editing
                    ? "Save Changes"
                    : "Create Schedule"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
