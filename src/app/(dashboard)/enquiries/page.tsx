"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { InlineSelect } from "@/components/ui/inline-select";
import { Plus, Search, Edit2, Trash2, FilePlus, Archive, ArchiveRestore, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { Can } from "@/components/auth/can";
import { EnquiryModal } from "@/components/enquiries/enquiry-modal";
import { formatUkDate } from "@/lib/format-date";

type EnquiryView = "active" | "archived";

interface Enquiry {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  eventType?: string;
  eventDate?: string;
  venueA?: string;
  venueB?: string;
  progress: string;
  createdAt: string;
  archivedAt?: string | null;
}

export default function EnquiriesPage() {
  const router = useRouter();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [filteredEnquiries, setFilteredEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [creatingOrderFor, setCreatingOrderFor] = useState<string | null>(null);
  // Per-row delete state (#27). Disables the delete button and
  // swaps the trash icon for a spinner while the DELETE is in
  // flight so users can't double-click the same row during the
  // round-trip.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<EnquiryView>("active");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const refreshEnquiries = async (nextView: EnquiryView = view) => {
    const response = await fetch(`/api/enquiries?view=${nextView}`);
    if (!response.ok) {
      throw new Error("Failed to fetch enquiries");
    }
    const data = await response.json();
    setEnquiries(data);
    setFilteredEnquiries(data);
  };

  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        setLoading(true);
        await refreshEnquiries(view);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchEnquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    let filtered = enquiries;

    if (searchTerm) {
      filtered = filtered.filter(
        (enquiry) =>
          enquiry.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          enquiry.clientEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedStatus) {
      filtered = filtered.filter((enquiry) => enquiry.progress === selectedStatus);
    }

    setFilteredEnquiries(filtered);
  }, [searchTerm, selectedStatus, enquiries]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const displayedEnquiries = useMemo(() => {
    if (!sortField) return filteredEnquiries;

    const sorted = [...filteredEnquiries].sort((a, b) => {
      let aValue: string | number | undefined;
      let bValue: string | number | undefined;

      switch (sortField) {
        case "clientName":
          aValue = a.clientName.toLowerCase();
          bValue = b.clientName.toLowerCase();
          break;
        case "clientEmail":
          aValue = a.clientEmail.toLowerCase();
          bValue = b.clientEmail.toLowerCase();
          break;
        case "clientPhone":
          aValue = (a.clientPhone || "").toLowerCase();
          bValue = (b.clientPhone || "").toLowerCase();
          break;
        case "eventType":
          aValue = (a.eventType || "").toLowerCase();
          bValue = (b.eventType || "").toLowerCase();
          break;
        case "eventDate":
          aValue = a.eventDate ? new Date(a.eventDate).getTime() : 0;
          bValue = b.eventDate ? new Date(b.eventDate).getTime() : 0;
          break;
        case "venue":
          aValue = (a.venueA || "").toLowerCase();
          bValue = (b.venueA || "").toLowerCase();
          break;
        case "progress":
          aValue = a.progress.toLowerCase();
          bValue = b.progress.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue === "" && bValue === "") return 0;
      if (aValue === "") return 1;
      if (bValue === "") return -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return sorted;
  }, [filteredEnquiries, sortField, sortDirection]);

  const handleOpenModal = (enquiry?: Enquiry) => {
    setSelectedEnquiry(enquiry || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEnquiry(null);
  };

  const handleSaveEnquiry = async (enquiryData: Partial<Enquiry>) => {
    try {
      if (selectedEnquiry) {
        const response = await fetch(`/api/enquiries/${selectedEnquiry.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(enquiryData),
        });

        if (!response.ok) {
          throw new Error("Failed to update enquiry");
        }
      } else {
        const response = await fetch("/api/enquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(enquiryData),
        });

        if (!response.ok) {
          throw new Error("Failed to create enquiry");
        }
      }

      await refreshEnquiries();
    } catch (err) {
      console.error("Error saving enquiry:", err);
      throw err;
    }
  };

  const handleArchiveEnquiry = async (id: string) => {
    try {
      const response = await fetch(`/api/enquiries/${id}/archive`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to archive enquiry");
      }
      await refreshEnquiries();
      toast.success("Enquiry archived");
    } catch (err) {
      console.error("Error archiving enquiry:", err);
      toast.error("Failed to archive enquiry");
    }
  };

  const handleUnarchiveEnquiry = async (id: string) => {
    try {
      const response = await fetch(`/api/enquiries/${id}/archive`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to restore enquiry");
      }
      await refreshEnquiries();
      toast.success("Enquiry restored");
    } catch (err) {
      console.error("Error unarchiving enquiry:", err);
      toast.error("Failed to restore enquiry");
    }
  };

  // Shortcut: create an empty draft order for this enquiry and jump
  // straight into its detail page. The POST /api/orders handler also
  // auto-advances the enquiry's progress to "Order", so the funnel
  // row flips to the terminal state without an extra round-trip.
  const handleCreateOrder = async (enquiryId: string) => {
    try {
      setCreatingOrderFor(enquiryId);
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enquiryId, status: "draft" }),
      });
      if (!response.ok) {
        throw new Error("Failed to create order");
      }
      const created = await response.json();
      router.push(`/orders/${created.id}`);
    } catch (err) {
      console.error("Error creating order from enquiry:", err);
      toast.error("Failed to create order for this enquiry");
      setCreatingOrderFor(null);
    }
  };

  const handleDeleteEnquiry = async (id: string) => {
    if (deletingId) return; // guard against double-click
    if (!confirm("Are you sure you want to delete this enquiry? This will also delete any associated orders.")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/enquiries/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete enquiry");
      }

      await refreshEnquiries();
    } catch (err) {
      console.error("Error deleting enquiry:", err);
      toast.error("Failed to delete enquiry");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">Enquiries</h1>
          <p className="text-gray-600 mt-1">Manage and track client enquiries</p>
        </div>
        <Can permission="enquiries:create">
          <Button variant="primary" type="button" onClick={() => handleOpenModal()}>
            <Plus size={20} className="mr-2" />
            Add New
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

      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by client name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
              />
            </div>

            <select
              value={selectedStatus || ""}
              onChange={(e) => setSelectedStatus(e.target.value || null)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
            >
              <option value="">All statuses</option>
              <option value="New">New</option>
              <option value="TBD">TBD</option>
              <option value="Live">Live</option>
              <option value="Done">Done</option>
              <option value="Placed">Placed</option>
              <option value="Order">Order</option>
            </select>

            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setView("active")}
                aria-pressed={view === "active"}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  view === "active"
                    ? "bg-[#1B4332] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setView("archived")}
                aria-pressed={view === "archived"}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                  view === "archived"
                    ? "bg-[#1B4332] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Archived
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]"></div>
                <p className="mt-4 text-gray-600">Loading enquiries...</p>
              </div>
            </div>
          ) : displayedEnquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-500 text-lg">No enquiries found</p>
              <p className="text-gray-400 mt-1">Try adjusting your filters or add a new enquiry</p>
            </div>
          ) : (
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("clientName")}
                  >
                    <div className="flex items-center gap-1">
                      Client Name
                      {sortField === "clientName" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("clientEmail")}
                  >
                    <div className="flex items-center gap-1">
                      Email
                      {sortField === "clientEmail" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("clientPhone")}
                  >
                    <div className="flex items-center gap-1">
                      Phone
                      {sortField === "clientPhone" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("eventType")}
                  >
                    <div className="flex items-center gap-1">
                      Event Type
                      {sortField === "eventType" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
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
                    onClick={() => handleSort("venue")}
                  >
                    <div className="flex items-center gap-1">
                      Venue
                      {sortField === "venue" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("progress")}
                  >
                    <div className="flex items-center gap-1">
                      Progress
                      {sortField === "progress" && (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedEnquiries.map((enquiry) => (
                  <tr
                    key={enquiry.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <button
                        onClick={() => handleOpenModal(enquiry)}
                        className="text-[#1B4332] hover:underline font-medium"
                      >
                        {enquiry.clientName}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {enquiry.clientEmail}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {enquiry.clientPhone || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {enquiry.eventType || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatUkDate(enquiry.eventDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {enquiry.venueA || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <InlineSelect
                          ariaLabel="Enquiry progress"
                          value={enquiry.progress || "New"}
                          options={[
                            { value: "New", label: "New", className: "bg-amber-50 text-amber-700 border border-amber-200" },
                            { value: "TBD", label: "TBD", className: "bg-gray-100 text-gray-700 border border-gray-200" },
                            { value: "Live", label: "Live", className: "bg-blue-50 text-blue-700 border border-blue-200" },
                            { value: "Done", label: "Done", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
                            { value: "Placed", label: "Placed", className: "bg-[#E8EFE5] text-[#1B4332] border border-[#1B4332]/20" },
                            { value: "Order", label: "Order", className: "bg-[#1B4332] text-white border border-[#1B4332]" },
                          ]}
                          onChange={async (next) => {
                            const res = await fetch(
                              `/api/enquiries/${enquiry.id}`,
                              {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  ...enquiry,
                                  progress: next,
                                }),
                              }
                            );
                            if (!res.ok)
                              throw new Error("Failed to update progress");
                            await refreshEnquiries();
                            toast.success("Progress updated");
                          }}
                        />
                        {enquiry.progress !== "Order" && (
                          <Can permission="orders:create">
                            <button
                              type="button"
                              onClick={() => handleCreateOrder(enquiry.id)}
                              disabled={creatingOrderFor === enquiry.id}
                              className="p-1 text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                              title="Create order from this enquiry"
                            >
                              <FilePlus size={16} />
                            </button>
                          </Can>
                        )}
                        <button
                          onClick={() => handleOpenModal(enquiry)}
                          className="p-1 text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <Can permission="enquiries:archive">
                          {view === "active" ? (
                            <button
                              type="button"
                              onClick={() => handleArchiveEnquiry(enquiry.id)}
                              className="p-1 text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded transition-colors"
                              title="Archive"
                              aria-label="Archive enquiry"
                            >
                              <Archive size={16} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnarchiveEnquiry(enquiry.id)}
                              className="p-1 text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded transition-colors"
                              title="Restore from archive"
                              aria-label="Restore enquiry from archive"
                            >
                              <ArchiveRestore size={16} />
                            </button>
                          )}
                        </Can>
                        <Can permission="enquiries:delete">
                          <button
                            type="button"
                            onClick={() => handleDeleteEnquiry(enquiry.id)}
                            disabled={deletingId === enquiry.id}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                            aria-label="Delete enquiry"
                          >
                            {deletingId === enquiry.id ? (
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

      <EnquiryModal
        isOpen={isModalOpen}
        enquiry={selectedEnquiry}
        onClose={handleCloseModal}
        onSave={handleSaveEnquiry}
      />
    </div>
  );
}
