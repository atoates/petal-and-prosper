"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit2, Trash2, FilePlus } from "lucide-react";
import { Can } from "@/components/auth/can";
import { EnquiryModal } from "@/components/enquiries/enquiry-modal";

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

  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/enquiries");
        if (!response.ok) {
          throw new Error("Failed to fetch enquiries");
        }
        const data = await response.json();
        setEnquiries(data);
        setFilteredEnquiries(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchEnquiries();
  }, []);

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

  const statusColors: Record<string, "primary" | "success" | "warning" | "danger" | "secondary"> = {
    New: "warning",
    TBD: "secondary",
    Live: "success",
    Done: "primary",
    Placed: "primary",
    Order: "success",
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

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

      const response = await fetch("/api/enquiries");
      const data = await response.json();
      setEnquiries(data);
      setFilteredEnquiries(data);
    } catch (err) {
      console.error("Error saving enquiry:", err);
      throw err;
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
      alert("Failed to create order for this enquiry");
      setCreatingOrderFor(null);
    }
  };

  const handleDeleteEnquiry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this enquiry? This will also delete any associated orders.")) {
      return;
    }

    try {
      const response = await fetch(`/api/enquiries/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete enquiry");
      }

      const updatedResponse = await fetch("/api/enquiries");
      const data = await updatedResponse.json();
      setEnquiries(data);
      setFilteredEnquiries(data);
    } catch (err) {
      console.error("Error deleting enquiry:", err);
      alert("Failed to delete enquiry");
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

{/* Advanced filters and archive features coming in a future release */}
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
          ) : filteredEnquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-500 text-lg">No enquiries found</p>
              <p className="text-gray-400 mt-1">Try adjusting your filters or add a new enquiry</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Client Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Event Type
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Event Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Venue
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEnquiries.map((enquiry) => (
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
                      {formatDate(enquiry.eventDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {enquiry.venueA || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={statusColors[enquiry.progress as keyof typeof statusColors]}>
                          {enquiry.progress}
                        </Badge>
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
                        <Can permission="enquiries:delete">
                          <button
                            type="button"
                            onClick={() => handleDeleteEnquiry(enquiry.id)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
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
