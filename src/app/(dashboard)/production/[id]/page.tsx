"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineSelect } from "@/components/ui/inline-select";
import { Can } from "@/components/auth/can";
import { ArrowLeft, Loader2, CheckSquare, Square } from "lucide-react";
import { formatUkDate } from "@/lib/format-date";
import { productionStatusColours, formatStatus } from "@/lib/status-colours";

interface ProductionTask {
  id: string;
  label: string;
  done: boolean;
  assignedTo?: string | null;
}

interface ProductionItem {
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
  assignedTo?: string | null;
  tasks?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  items?: ProductionItem[];
  order?: {
    id: string;
    enquiry?: {
      clientName: string;
      eventType?: string | null;
      eventDate?: string | null;
    } | null;
  } | null;
}

export default function ProductionDetailPage() {
  const params = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<ProductionSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/production/${params.id}`);
      if (!res.ok) throw new Error("Failed to load production schedule");
      setSchedule(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleStatusChange = async (next: string) => {
    if (!schedule) return;
    try {
      const res = await fetch(`/api/production/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setSchedule((prev) => (prev ? { ...prev, status: next } : prev));
      toast.success(`Status updated to ${formatStatus(next)}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const toggleTask = async (taskId: string) => {
    if (!schedule) return;
    const tasks: ProductionTask[] = schedule.tasks
      ? JSON.parse(schedule.tasks)
      : [];
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, done: !t.done } : t
    );
    try {
      const res = await fetch(`/api/production/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: JSON.stringify(updated) }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      setSchedule((prev) =>
        prev ? { ...prev, tasks: JSON.stringify(updated) } : prev
      );
    } catch {
      toast.error("Failed to update task");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-green" />
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600">{error || "Schedule not found"}</p>
        <Link
          href="/production"
          className="mt-4 inline-block text-sm text-primary-green hover:underline"
        >
          Back to production
        </Link>
      </div>
    );
  }

  const enquiry = schedule.order?.enquiry;
  const tasks: ProductionTask[] = schedule.tasks
    ? JSON.parse(schedule.tasks)
    : [];
  const completedTasks = tasks.filter((t) => t.done).length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/production"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Back to production"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-gray-900">
              Production: {enquiry?.clientName || "Unknown client"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Order{" "}
              <Link
                href={`/orders/${schedule.orderId}`}
                className="text-primary-green hover:underline"
              >
                {schedule.orderId.slice(0, 8)}...
              </Link>
              {enquiry?.eventType && ` · ${enquiry.eventType}`}
              {enquiry?.eventDate &&
                ` · ${formatUkDate(enquiry.eventDate)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Status
            </p>
            <Can permission="production:update">
              <InlineSelect
                ariaLabel="Production status"
                value={schedule.status}
                options={[
                  { value: "not_started", label: "Not Started", className: "bg-gray-100 text-gray-700 border border-gray-200" },
                  { value: "in_progress", label: "In Progress", className: "bg-blue-50 text-blue-700 border border-blue-200" },
                  { value: "completed", label: "Completed", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
                ]}
                onChange={(next) => handleStatusChange(next)}
              />
            </Can>
            <Can permission="production:update" fallback={
              <Badge variant={productionStatusColours[schedule.status] || "secondary"}>
                {formatStatus(schedule.status)}
              </Badge>
            }>
              <></>
            </Can>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Production date
            </p>
            <p className="text-sm font-medium text-gray-900">
              {formatUkDate(schedule.productionDate) || "Not set"}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Assigned to
            </p>
            <p className="text-sm text-gray-900">
              {schedule.assignedTo || "Unassigned"}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Tasks
            </p>
            <p className="text-sm font-medium text-gray-900">
              {tasks.length > 0
                ? `${completedTasks} / ${tasks.length} done`
                : "No tasks"}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Tasks checklist */}
      {tasks.length > 0 && (
        <Card className="mb-6">
          <CardBody>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Tasks
            </h2>
            <div className="space-y-2">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  aria-label={`${task.done ? "Unmark" : "Mark"} "${task.label}" as done`}
                >
                  {task.done ? (
                    <CheckSquare
                      size={18}
                      className="text-emerald-600 shrink-0"
                    />
                  ) : (
                    <Square size={18} className="text-gray-400 shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      task.done
                        ? "text-gray-400 line-through"
                        : "text-gray-900"
                    }`}
                  >
                    {task.label}
                  </span>
                  {task.assignedTo && (
                    <span className="text-xs text-gray-400 ml-auto">
                      {task.assignedTo}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Line items */}
      {schedule.items && schedule.items.length > 0 && (
        <Card className="mb-6">
          <CardBody className="p-0">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Items ({schedule.items.length})
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-2.5 text-left font-semibold">
                    Description
                  </th>
                  <th className="px-5 py-2.5 text-left font-semibold">
                    Category
                  </th>
                  <th className="px-5 py-2.5 text-right font-semibold">
                    Qty
                  </th>
                  <th className="px-5 py-2.5 text-left font-semibold">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schedule.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3 text-gray-900">
                      {item.description}
                    </td>
                    <td className="px-5 py-3 text-gray-600 capitalize">
                      {item.category || "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-900 text-right tabular-nums">
                      {item.quantity}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {item.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* Notes */}
      {schedule.notes && (
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Notes
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {schedule.notes}
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
