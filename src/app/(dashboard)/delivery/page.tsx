"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { InlineSelect } from "@/components/ui/inline-select";
import { Input } from "@/components/ui/input";
import { UkDateInput } from "@/components/ui/uk-date-input";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Select } from "@/components/ui/select";
import { Pencil, Plus, Trash2, Loader2, Map, Calculator, Search, ChevronUp, ChevronDown } from "lucide-react";
import { Can } from "@/components/auth/can";
import Link from "next/link";
import { DeliveryMap } from "@/components/delivery/delivery-map";
import { formatUkDate } from "@/lib/format-date";

/**
 * /delivery
 *
 * Delivery schedule board. Each row pins an order to a date, a
 * delivery address (or a saved venue), a driver, and a time slot.
 * Saved venues let the team reuse frequent locations without
 * retyping the address; picking one auto-fills the address field
 * but the field stays editable for one-off tweaks.
 */

interface DeliveryScheduleItem {
  id: string;
  description: string;
  category?: string | null;
  quantity: number;
  notes?: string | null;
}

interface DeliverySchedule {
  id: string;
  orderId: string;
  deliveryDate?: string | null;
  deliveryAddress?: string | null;
  deliveryLat?: string | null;
  deliveryLng?: string | null;
  venueId?: string | null;
  driverId?: string | null;
  timeSlot?: string | null;
  // Items are now a proper child relation (#16) rather than a
  // JSON-encoded text column.
  items?: DeliveryScheduleItem[];
  notes?: string | null;
  status: string;
  createdAt: string;
  order?: {
    enquiry?: {
      clientName: string;
    };
  };
  venue?: Venue | null;
}

interface Order {
  id: string;
  enquiry?: {
    clientName: string;
    venueA?: string | null;
    venueB?: string | null;
  };
}

interface TeamMember {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}

interface Venue {
  id: string;
  name: string;
  address?: string | null;
  lat?: string | null;
  lng?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
}

interface DeliveryForm {
  orderId: string;
  deliveryDate: string;
  deliveryAddress: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  venueId: string;
  driverId: string;
  timeSlot: string;
  notes: string;
  status: string;
}

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "ready", label: "Ready" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
];

function driverLabel(members: TeamMember[], id?: string | null): string {
  if (!id) return "Unassigned";
  const m = members.find((x) => x.id === id);
  if (!m) return "Unknown";
  const name = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
  return name || m.email;
}

export default function DeliveryPage() {
  const [schedules, setSchedules] = useState<DeliverySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<DeliverySchedule | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Per-row delete state (#27). Separate ids for the schedule
  // list and the saved-venue book inside the delivery modal so
  // each widget manages its own spinner state.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);

  // Saved venue book modal -- opened from a small link in the main
  // delivery modal so venue management happens inline rather than
  // on a separate page.
  const [isVenueModalOpen, setIsVenueModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [venueForm, setVenueForm] = useState({
    name: "",
    address: "",
    contactName: "",
    contactPhone: "",
    notes: "",
  });
  const [venueSubmitting, setVenueSubmitting] = useState(false);
  const [venueError, setVenueError] = useState<string | null>(null);

  // Search and sort state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("deliveryDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [formData, setFormData] = useState<DeliveryForm>({
    orderId: "",
    deliveryDate: "",
    deliveryAddress: "",
    deliveryLat: null,
    deliveryLng: null,
    venueId: "",
    driverId: "",
    timeSlot: "",
    notes: "",
    status: "pending",
  });

  const fetchSchedules = useCallback(async () => {
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
  }, []);

  const fetchVenues = useCallback(async () => {
    try {
      const response = await fetch("/api/venues");
      if (response.ok) {
        setVenues(await response.json());
      }
    } catch (err) {
      console.error("Error loading venues:", err);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    if (!isModalOpen) return;
    const load = async () => {
      try {
        setOrdersLoading(true);
        const [ordersRes, usersRes] = await Promise.all([
          fetch("/api/orders"),
          fetch("/api/users"),
          fetchVenues(),
        ]);
        if (ordersRes.ok) setOrders(await ordersRes.json());
        if (usersRes.ok) setTeam(await usersRes.json());
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Failed to load modal data"
        );
      } finally {
        setOrdersLoading(false);
      }
    };
    load();
  }, [isModalOpen, fetchVenues]);

  const resetForm = () => {
    setFormData({
      orderId: "",
      deliveryDate: "",
      deliveryAddress: "",
      deliveryLat: null,
      deliveryLng: null,
      venueId: "",
      driverId: "",
      timeSlot: "",
      notes: "",
      status: "pending",
    });
    setEditing(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleEdit = (schedule: DeliverySchedule) => {
    setEditing(schedule);
    setFormData({
      orderId: schedule.orderId,
      deliveryDate: schedule.deliveryDate
        ? new Date(schedule.deliveryDate).toISOString().slice(0, 10)
        : "",
      deliveryAddress: schedule.deliveryAddress || "",
      deliveryLat: schedule.deliveryLat ? parseFloat(schedule.deliveryLat) : null,
      deliveryLng: schedule.deliveryLng ? parseFloat(schedule.deliveryLng) : null,
      venueId: schedule.venueId || "",
      driverId: schedule.driverId || "",
      timeSlot: schedule.timeSlot || "",
      notes: schedule.notes || "",
      status: schedule.status,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
    resetForm();
  };

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // When an order is chosen, pre-fill the delivery address from the
  // linked enquiry's venue (venueA is the ceremony/primary address,
  // venueB the reception/secondary). We only auto-fill if the user
  // hasn't already typed an address, so we never clobber manual input.
  const handleOrderSelect = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const orderId = e.target.value;
    setFormData((prev) => {
      const order = orders.find((o) => o.id === orderId);
      const fromOrder =
        order?.enquiry?.venueA || order?.enquiry?.venueB || "";
      return {
        ...prev,
        orderId,
        deliveryAddress:
          prev.deliveryAddress && prev.deliveryAddress.trim() !== ""
            ? prev.deliveryAddress
            : fromOrder,
      };
    });
  };

  // When a saved venue is chosen, auto-fill the address field so
  // the user doesn't have to copy it by hand. They can still edit
  // the address after; we never force it to stay in sync.
  const handleVenueSelect = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const venueId = e.target.value;
    const venue = venues.find((v) => v.id === venueId);
    setFormData((prev) => ({
      ...prev,
      venueId,
      deliveryAddress:
        venue && venue.address ? venue.address : prev.deliveryAddress,
      deliveryLat:
        venue?.lat ? parseFloat(venue.lat) : prev.deliveryLat,
      deliveryLng:
        venue?.lng ? parseFloat(venue.lng) : prev.deliveryLng,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (
      !formData.orderId ||
      !formData.deliveryDate ||
      !formData.deliveryAddress ||
      !formData.status
    ) {
      setFormError("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        orderId: formData.orderId,
        deliveryDate: formData.deliveryDate,
        deliveryAddress: formData.deliveryAddress,
        deliveryLat: formData.deliveryLat,
        deliveryLng: formData.deliveryLng,
        venueId: formData.venueId || null,
        driverId: formData.driverId || null,
        timeSlot: formData.timeSlot || null,
        notes: formData.notes || null,
        status: formData.status,
      };

      // On edit, strip orderId from the PATCH body (the API doesn't
      // accept it there) and keep everything else.
      const url = editing
        ? `/api/delivery/${editing.id}`
        : "/api/delivery";
      const method = editing ? "PATCH" : "POST";
      const body = editing
        ? JSON.stringify({
            deliveryDate: payload.deliveryDate,
            deliveryAddress: payload.deliveryAddress,
            deliveryLat: payload.deliveryLat,
            deliveryLng: payload.deliveryLng,
            venueId: payload.venueId,
            driverId: payload.driverId,
            timeSlot: payload.timeSlot,
            notes: payload.notes,
            status: payload.status,
          })
        : JSON.stringify(payload);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save delivery");
      }

      handleCloseModal();
      await fetchSchedules();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (schedule: DeliverySchedule) => {
    if (deletingId) return;
    if (
      !window.confirm("Delete this delivery schedule? This cannot be undone.")
    )
      return;
    setDeletingId(schedule.id);
    try {
      const response = await fetch(`/api/delivery/${schedule.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete delivery");
      setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDeletingId(null);
    }
  };

  /* -------- venue book helpers -------- */

  const openVenueModal = (venue: Venue | null = null) => {
    setEditingVenue(venue);
    setVenueForm({
      name: venue?.name || "",
      address: venue?.address || "",
      contactName: venue?.contactName || "",
      contactPhone: venue?.contactPhone || "",
      notes: venue?.notes || "",
    });
    setVenueError(null);
    setIsVenueModalOpen(true);
  };

  const closeVenueModal = () => {
    setIsVenueModalOpen(false);
    setEditingVenue(null);
    setVenueError(null);
  };

  const handleVenueFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setVenueForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleVenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueForm.name.trim()) {
      setVenueError("Venue name is required");
      return;
    }
    try {
      setVenueSubmitting(true);
      setVenueError(null);
      const url = editingVenue
        ? `/api/venues/${editingVenue.id}`
        : "/api/venues";
      const method = editingVenue ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: venueForm.name,
          address: venueForm.address || null,
          contactName: venueForm.contactName || null,
          contactPhone: venueForm.contactPhone || null,
          notes: venueForm.notes || null,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save venue");
      }
      await fetchVenues();
      closeVenueModal();
    } catch (err) {
      setVenueError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setVenueSubmitting(false);
    }
  };

  const handleVenueDelete = async (venue: Venue) => {
    if (deletingVenueId) return;
    if (!window.confirm(`Delete venue "${venue.name}"?`)) return;
    setDeletingVenueId(venue.id);
    try {
      const response = await fetch(`/api/venues/${venue.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete venue");
      await fetchVenues();
      // If the currently-edited delivery pointed at this venue, clear
      // the reference so we don't save a dangling FK.
      setFormData((prev) =>
        prev.venueId === venue.id ? { ...prev, venueId: "" } : prev
      );
    } catch (err) {
      setVenueError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDeletingVenueId(null);
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

  const displayedSchedules = useMemo(() => {
    let filtered = schedules;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = schedules.filter((schedule) => {
        const clientName = schedule.order?.enquiry?.clientName || "";
        const venueName = schedule.venue?.name || "";
        const address = schedule.deliveryAddress || "";
        const driver = driverLabel(team, schedule.driverId);
        const status = schedule.status;

        return (
          clientName.toLowerCase().includes(term) ||
          venueName.toLowerCase().includes(term) ||
          address.toLowerCase().includes(term) ||
          driver.toLowerCase().includes(term) ||
          status.toLowerCase().includes(term)
        );
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "deliveryDate":
          aVal = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 0;
          bVal = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 0;
          break;
        case "timeSlot":
          aVal = a.timeSlot || "";
          bVal = b.timeSlot || "";
          break;
        case "venue":
          aVal = (a.venue?.name || a.deliveryAddress || "").toLowerCase();
          bVal = (b.venue?.name || b.deliveryAddress || "").toLowerCase();
          break;
        case "driver":
          aVal = driverLabel(team, a.driverId).toLowerCase();
          bVal = driverLabel(team, b.driverId).toLowerCase();
          break;
        case "status":
          aVal = a.status.toLowerCase();
          bVal = b.status.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [schedules, searchTerm, sortField, sortDirection, team]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">
            Delivery
          </h1>
          <p className="text-gray-600 mt-1">Plan and manage deliveries</p>
        </div>
        <div className="flex items-center gap-3">
          <Can permission="delivery:read">
            <Link href="/delivery/route-planner">
              <Button variant="outline" type="button">
                <Map size={18} className="mr-2" />
                Route Planner
              </Button>
            </Link>
          </Can>
          <Can permission="delivery:read">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                fetchVenues();
                openVenueModal(null);
              }}
            >
              Manage venues
            </Button>
          </Can>
          <Can permission="delivery:create">
            <Button variant="primary" type="button" onClick={handleOpenModal}>
              <Plus size={20} className="mr-2" />
              New Delivery
            </Button>
          </Can>
        </div>
      </div>

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardBody>
            <p className="text-red-800">Error: {error}</p>
          </CardBody>
        </Card>
      )}

      {/* Delivery map */}
      {!loading && schedules.length > 0 && (
        <DeliveryMap
          deliveries={schedules
            .filter((s) => s.deliveryAddress || s.venue?.address)
            .map((s) => ({
              id: s.id,
              address: s.deliveryAddress || s.venue?.address || "",
              lat: s.deliveryLat ? parseFloat(s.deliveryLat) : (s.venue?.lat ? parseFloat(s.venue.lat) : null),
              lng: s.deliveryLng ? parseFloat(s.deliveryLng) : (s.venue?.lng ? parseFloat(s.venue.lng) : null),
              clientName: s.order?.enquiry?.clientName || "Unknown client",
              venueName: s.venue?.name || undefined,
              date: s.deliveryDate || undefined,
              timeSlot: s.timeSlot || undefined,
              status: s.status,
              driverName: driverLabel(team, s.driverId) !== "Unassigned"
                ? driverLabel(team, s.driverId)
                : undefined,
            }))}
        />
      )}

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]"></div>
                <p className="mt-4 text-gray-600">
                  Loading delivery schedules...
                </p>
              </div>
            </div>
          ) : schedules.length === 0 ? (
            <CardBody>
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500 text-lg">
                  No deliveries scheduled yet
                </p>
                <p className="text-gray-400 mt-1">
                  Create your first delivery to get started
                </p>
              </div>
            </CardBody>
          ) : (
            <>
              <div className="px-6 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2 bg-white">
                  <Search size={18} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by client, venue, address, driver, or status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-3 py-2 border-0 focus:outline-none text-sm text-gray-900 placeholder-gray-500"
                  />
                </div>
              </div>
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => handleSort("deliveryDate")}>
                      <div className="flex items-center gap-1">
                        Event Date
                        {sortField === "deliveryDate" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => handleSort("timeSlot")}>
                      <div className="flex items-center gap-1">
                        Time Slot
                        {sortField === "timeSlot" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => handleSort("venue")}>
                      <div className="flex items-center gap-1">
                        Venue / Address
                        {sortField === "venue" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => handleSort("driver")}>
                      <div className="flex items-center gap-1">
                        Driver
                        {sortField === "driver" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => handleSort("status")}>
                      <div className="flex items-center gap-1">
                        Status
                        {sortField === "status" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSchedules.map((schedule) => (
                    <tr
                      key={schedule.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatUkDate(schedule.deliveryDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {schedule.timeSlot || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                        {schedule.venue?.name && (
                          <div className="font-medium text-gray-900">
                            {schedule.venue.name}
                          </div>
                        )}
                        <div className="truncate">
                          {schedule.deliveryAddress || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {driverLabel(team, schedule.driverId)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <InlineSelect
                          ariaLabel="Delivery status"
                          value={schedule.status}
                          options={[
                            { value: "pending", label: "Pending", className: "bg-amber-50 text-amber-700 border border-amber-200" },
                            { value: "ready", label: "Ready", className: "bg-blue-50 text-blue-700 border border-blue-200" },
                            { value: "dispatched", label: "Dispatched", className: "bg-[#E8EFE5] text-[#1B4332] border border-[#1B4332]/20" },
                            { value: "delivered", label: "Delivered", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
                          ]}
                          onChange={async (next) => {
                            const res = await fetch(
                              `/api/delivery/${schedule.id}`,
                              {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: next }),
                              }
                            );
                            if (!res.ok)
                              throw new Error("Failed to update status");
                            setSchedules((prev) =>
                              prev.map((s) =>
                                s.id === schedule.id
                                  ? { ...s, status: next }
                                  : s
                              )
                            );
                            toast.success("Status updated");
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Can permission="delivery:read">
                            <Link
                              href={`/delivery/${schedule.id}/travel-costs`}
                              className="p-2 text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded"
                              title="Travel costs"
                              aria-label="View travel costs"
                            >
                              <Calculator size={16} />
                            </Link>
                          </Can>
                          <Can permission="delivery:update">
                            <button
                              type="button"
                              onClick={() => handleEdit(schedule)}
                              className="p-2 text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded"
                              aria-label="Edit delivery"
                            >
                              <Pencil size={16} />
                            </button>
                          </Can>
                          <Can permission="delivery:delete">
                            <button
                              type="button"
                              onClick={() => handleDelete(schedule)}
                              disabled={deletingId === schedule.id}
                              className="p-2 text-gray-600 hover:text-red-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Delete delivery"
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
            </>
          )}
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardBody>
              <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">
                {editing ? "Edit Delivery" : "Create New Delivery"}
              </h2>

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
                  onChange={handleOrderSelect}
                  options={[
                    {
                      value: "",
                      label: ordersLoading
                        ? "Loading orders..."
                        : "Select an order",
                    },
                    ...orders.map((order) => ({
                      value: order.id,
                      label: `${order.enquiry?.clientName || "Unknown"} (${order.id})`,
                    })),
                  ]}
                  disabled={ordersLoading || !!editing}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <UkDateInput
                    label="Delivery Date"
                    name="deliveryDate"
                    value={formData.deliveryDate}
                    onChange={(v) =>
                      setFormData((prev) => ({ ...prev, deliveryDate: v }))
                    }
                    required
                  />
                  <Input
                    label="Time Slot"
                    type="text"
                    name="timeSlot"
                    value={formData.timeSlot}
                    onChange={handleFormChange}
                    placeholder="e.g. 09:00 - 10:30"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Saved venue
                    </label>
                    <button
                      type="button"
                      onClick={() => openVenueModal(null)}
                      className="text-xs text-[#1B4332] hover:underline"
                    >
                      Manage venues
                    </button>
                  </div>
                  <select
                    name="venueId"
                    value={formData.venueId}
                    onChange={handleVenueSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[#1B4332]"
                  >
                    <option value="">None (enter address below)</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Address
                  </label>
                  <AddressAutocomplete
                    value={formData.deliveryAddress}
                    onChange={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        deliveryAddress: v,
                      }))
                    }
                    onPlaceSelected={(place) =>
                      setFormData((prev) => ({
                        ...prev,
                        deliveryAddress: place.formattedAddress,
                        deliveryLat: place.lat || null,
                        deliveryLng: place.lng || null,
                      }))
                    }
                    placeholder="Start typing a UK address..."
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Autocompletes UK addresses. Pre-filled from the linked order&rsquo;s venue when you pick an order.
                  </p>
                </div>

                <Select
                  label="Driver"
                  name="driverId"
                  value={formData.driverId}
                  onChange={handleFormChange}
                  options={[
                    { value: "", label: "Unassigned" },
                    ...team.map((m) => ({
                      value: m.id,
                      label:
                        [m.firstName, m.lastName].filter(Boolean).join(" ") ||
                        m.email,
                    })),
                  ]}
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
                    {isSubmitting
                      ? "Saving..."
                      : editing
                      ? "Save Changes"
                      : "Create Delivery"}
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

      {isVenueModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <CardBody>
              <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">
                {editingVenue ? "Edit Venue" : "Venue Book"}
              </h2>

              {venueError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{venueError}</p>
                </div>
              )}

              {!editingVenue && venues.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Saved venues
                  </h3>
                  <div className="border border-gray-200 rounded divide-y divide-gray-200">
                    {venues.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="min-w-0 flex-1 pr-4">
                          <div className="font-medium text-gray-900 truncate">
                            {v.name}
                          </div>
                          {v.address && (
                            <div className="text-xs text-gray-500 truncate">
                              {v.address}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openVenueModal(v)}
                            className="p-2 text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded"
                            aria-label="Edit venue"
                          >
                            <Pencil size={14} />
                          </button>
                          <Can permission="delivery:delete">
                            <button
                              type="button"
                              onClick={() => handleVenueDelete(v)}
                              disabled={deletingVenueId === v.id}
                              className="p-2 text-gray-600 hover:text-red-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Delete venue"
                            >
                              {deletingVenueId === v.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </Can>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleVenueSubmit} className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">
                  {editingVenue ? "Edit venue details" : "Add a new venue"}
                </h3>
                <Input
                  label="Name"
                  type="text"
                  name="name"
                  value={venueForm.name}
                  onChange={handleVenueFormChange}
                  placeholder="e.g. St Andrew's Church"
                  required
                />
                <Input
                  label="Address"
                  type="text"
                  name="address"
                  value={venueForm.address}
                  onChange={handleVenueFormChange}
                  placeholder="Full address"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Contact name"
                    type="text"
                    name="contactName"
                    value={venueForm.contactName}
                    onChange={handleVenueFormChange}
                    placeholder="On-site contact"
                  />
                  <Input
                    label="Contact phone"
                    type="text"
                    name="contactPhone"
                    value={venueForm.contactPhone}
                    onChange={handleVenueFormChange}
                    placeholder="Phone number"
                  />
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={venueForm.notes}
                    onChange={handleVenueFormChange}
                    placeholder="Access instructions, parking, etc."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent transition-colors"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={venueSubmitting}
                  >
                    {venueSubmitting
                      ? "Saving..."
                      : editingVenue
                      ? "Save Changes"
                      : "Add Venue"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={closeVenueModal}
                    disabled={venueSubmitting}
                  >
                    Close
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
