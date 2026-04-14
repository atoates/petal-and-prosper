"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  BookUser,
  Building2,
  User,
  Phone,
  Mail,
  ExternalLink,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { ContactModal } from "@/components/contacts/contact-modal";

type ContactType = "customer" | "supplier" | "both";
type TabFilter = "all" | "customer" | "supplier";
type SortField = "name" | "company" | "email" | "phone" | "type" | "enquiries" | "location" | null;
type SortDirection = "asc" | "desc";

interface Contact {
  id: string;
  type: ContactType;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  county?: string | null;
  postcode?: string | null;
  country?: string | null;
  paymentTerms?: string | null;
  vatNumber?: string | null;
  accountRef?: string | null;
  tags?: string | null;
  notes?: string | null;
  enquiryCount?: number;
  createdAt: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const fetchContacts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("type", activeTab);
      if (searchTerm) params.set("search", searchTerm);
      const response = await fetch(`/api/contacts?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch contacts");
      const data = await response.json();
      setContacts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm]);

  useEffect(() => {
    setLoading(true);
    fetchContacts();
  }, [fetchContacts]);

  const handleOpenModal = (contact?: Contact) => {
    setSelectedContact(contact || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedContact(null);
  };

  const handleSaveContact = async (data: Partial<Contact>) => {
    if (selectedContact) {
      const response = await fetch(`/api/contacts/${selectedContact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update contact");
    } else {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create contact");
    }
    await fetchContacts();
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    if (!confirm("Are you sure you want to delete this contact?")) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete contact");
      await fetchContacts();
      toast.success("Contact deleted");
    } catch {
      toast.error("Failed to delete contact");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const displayName = (c: Contact) =>
    [c.firstName, c.lastName].filter(Boolean).join(" ");

  const displayedContacts = useMemo(() => {
    let sorted = [...contacts];
    if (sortField) {
      sorted.sort((a, b) => {
        let aValue: string | number = "";
        let bValue: string | number = "";

        switch (sortField) {
          case "name":
            aValue = displayName(a).toLowerCase();
            bValue = displayName(b).toLowerCase();
            break;
          case "company":
            aValue = (a.companyName || "").toLowerCase();
            bValue = (b.companyName || "").toLowerCase();
            break;
          case "email":
            aValue = (a.email || "").toLowerCase();
            bValue = (b.email || "").toLowerCase();
            break;
          case "phone":
            aValue = (a.phone || a.mobile || "").toLowerCase();
            bValue = (b.phone || b.mobile || "").toLowerCase();
            break;
          case "type":
            aValue = a.type;
            bValue = b.type;
            break;
          case "enquiries":
            aValue = a.enquiryCount || 0;
            bValue = b.enquiryCount || 0;
            break;
          case "location":
            aValue = ([a.city, a.postcode].filter(Boolean).join(", ") || "").toLowerCase();
            bValue = ([b.city, b.postcode].filter(Boolean).join(", ") || "").toLowerCase();
            break;
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [contacts, sortField, sortDirection]);

  const typeColour: Record<ContactType, "primary" | "warning" | "success"> = {
    customer: "primary",
    supplier: "warning",
    both: "success",
  };

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "customer", label: "Customers" },
    { key: "supplier", label: "Suppliers" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900 flex items-center gap-3">
            <BookUser size={28} className="text-primary-green" />
            Address Book
          </h1>
          <p className="text-gray-600 mt-1">
            Manage customers, suppliers, and contacts
          </p>
        </div>
        <Can permission="contacts:create">
          <Button
            variant="primary"
            type="button"
            onClick={() => handleOpenModal()}
          >
            <Plus size={18} />
            Add Contact
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

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-3 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
              />
            </div>

            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden self-start sm:self-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  aria-pressed={activeTab === tab.key}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-[#1B4332] text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  } ${tab.key !== "all" ? "border-l border-gray-300" : ""}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]" />
                <p className="mt-4 text-gray-600">Loading contacts...</p>
              </div>
            </div>
          ) : displayedContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BookUser size={48} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-lg">No contacts found</p>
              <p className="text-gray-400 mt-1">
                Try adjusting your filters or add a new contact
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-2">
                      Name
                      {sortField === "name" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("company")}
                  >
                    <div className="flex items-center gap-2">
                      Company
                      {sortField === "company" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      {sortField === "email" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("phone")}
                  >
                    <div className="flex items-center gap-2">
                      Phone
                      {sortField === "phone" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("type")}
                  >
                    <div className="flex items-center gap-2">
                      Type
                      {sortField === "type" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("enquiries")}
                  >
                    <div className="flex items-center gap-2">
                      Enquiries
                      {sortField === "enquiries" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("location")}
                  >
                    <div className="flex items-center gap-2">
                      Location
                      {sortField === "location" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="text-[#1B4332] hover:underline font-medium flex items-center gap-1.5"
                      >
                        <User size={14} className="text-gray-400" />
                        {displayName(contact)}
                      </Link>
                      {contact.jobTitle && (
                        <span className="text-xs text-gray-400 mt-0.5 block">
                          {contact.jobTitle}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contact.companyName ? (
                        <span className="flex items-center gap-1.5">
                          <Building2 size={14} className="text-gray-400" />
                          {contact.companyName}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contact.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail size={14} className="text-gray-400" />
                          {contact.email}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contact.phone || contact.mobile ? (
                        <span className="flex items-center gap-1.5">
                          <Phone size={14} className="text-gray-400" />
                          {contact.phone || contact.mobile}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Badge variant={typeColour[contact.type]}>
                        {contact.type.charAt(0).toUpperCase() +
                          contact.type.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contact.enquiryCount || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {[contact.city, contact.postcode]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="p-1.5 text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded transition-colors"
                          title="View details"
                          aria-label="View details"
                        >
                          <ExternalLink size={16} />
                        </Link>
                        <Can permission="contacts:update">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(contact)}
                            className="p-1.5 text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded transition-colors"
                            title="Edit"
                            aria-label="Edit contact"
                          >
                            <Edit2 size={16} />
                          </button>
                        </Can>
                        <Can permission="contacts:delete">
                          <button
                            type="button"
                            onClick={() => handleDelete(contact.id)}
                            disabled={deletingId === contact.id}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                            aria-label="Delete contact"
                          >
                            {deletingId === contact.id ? (
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

      <ContactModal
        isOpen={isModalOpen}
        contact={selectedContact}
        onClose={handleCloseModal}
        onSave={handleSaveContact}
      />
    </div>
  );
}
