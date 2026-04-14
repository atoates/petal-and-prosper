"use client";

import React, { useId, useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Plus, UserCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { AddressAutocomplete, type PlaceSelection } from "@/components/ui/address-autocomplete";
import Link from "next/link";

interface ContactOption {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
}

interface Enquiry {
  id: string;
  contactId?: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  enquiryType?: string;
  status?: string;
  progress: string;
  eventType?: string;
  eventDate?: string;
  enquiryDate?: string;
  colourScheme?: string;
  guestNumbers?: number | null;
  budget?: string | null;
  venueA?: string;
  venueATown?: string;
  venueAPhone?: string;
  venueAContact?: string;
  venueB?: string;
  venueBTown?: string;
  venueBPhone?: string;
  venueBContact?: string;
  plannerName?: string;
  plannerCompany?: string;
  plannerPhone?: string;
  plannerEmail?: string;
  notes?: string;
  createdAt: string;
}

interface EnquiryModalProps {
  isOpen: boolean;
  enquiry?: Enquiry | null;
  onClose: () => void;
  onSave: (enquiry: Partial<Enquiry>) => Promise<void>;
}

const EVENT_TYPES = [
  "Wedding",
  "Corporate",
  "Birthday",
  "Sympathy",
  "Anniversary",
  "Baby Shower",
  "Engagement Party",
  "Prom",
  "Other",
];

const ENQUIRY_TYPES = [
  "Telephone",
  "Email",
  "Website",
  "Social Media",
  "Referral",
  "Walk-in",
  "Other",
];

const ENQUIRY_STATUSES = [
  "Pending",
  "Responded",
  "Meeting Booked",
  "Quote Sent",
  "Awaiting Response",
  "Won",
  "Lost",
];

const PROGRESS_OPTIONS = ["New", "TBD", "Live", "Done", "Placed", "Order"];

const emptyForm: Partial<Enquiry> = {
  contactId: null,
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  enquiryType: "",
  status: "",
  progress: "New",
  eventType: "",
  eventDate: "",
  enquiryDate: "",
  colourScheme: "",
  guestNumbers: null,
  budget: "",
  venueA: "",
  venueATown: "",
  venueAPhone: "",
  venueAContact: "",
  venueB: "",
  venueBTown: "",
  venueBPhone: "",
  venueBContact: "",
  plannerName: "",
  plannerCompany: "",
  plannerPhone: "",
  plannerEmail: "",
  notes: "",
};

function CollapsibleSection({
  title,
  defaultOpen,
  hasContent,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  hasContent?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors ${
          open
            ? "bg-sage-50 text-gray-900"
            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
        }`}
      >
        <span className="flex items-center gap-2">
          {title}
          {!open && hasContent && (
            <span className="w-2 h-2 rounded-full bg-primary-green" />
          )}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

export function EnquiryModal({
  isOpen,
  enquiry,
  onClose,
  onSave,
}: EnquiryModalProps) {
  const titleId = useId();
  const { dialogRef } = useModalA11y(isOpen, onClose);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [selectedContact, setSelectedContact] = useState<ContactOption | null>(
    null
  );
  const [formData, setFormData] = useState<Partial<Enquiry>>({ ...emptyForm });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch contacts for the selector (include type=both since they are also customers)
  useEffect(() => {
    if (!isOpen) return;
    const fetchContacts = async () => {
      try {
        const res = await fetch("/api/contacts");
        if (res.ok) {
          const all: ContactOption[] = await res.json();
          setContacts(all);
        }
      } catch {
        // Manual entry fallback
      }
    };
    fetchContacts();
  }, [isOpen]);

  // Click-outside handler for the dropdown
  useEffect(() => {
    if (!showContactDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowContactDropdown(false);
        setHighlightedIdx(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showContactDropdown]);

  useEffect(() => {
    if (enquiry) {
      setFormData({
        contactId: enquiry.contactId || null,
        clientName: enquiry.clientName || "",
        clientEmail: enquiry.clientEmail || "",
        clientPhone: enquiry.clientPhone || "",
        enquiryType: enquiry.enquiryType || "",
        status: enquiry.status || "",
        progress: enquiry.progress || "New",
        eventType: enquiry.eventType || "",
        eventDate: enquiry.eventDate
          ? new Date(enquiry.eventDate).toISOString().split("T")[0]
          : "",
        enquiryDate: enquiry.enquiryDate
          ? new Date(enquiry.enquiryDate).toISOString().split("T")[0]
          : "",
        colourScheme: enquiry.colourScheme || "",
        guestNumbers: enquiry.guestNumbers ?? null,
        budget: enquiry.budget || "",
        venueA: enquiry.venueA || "",
        venueATown: enquiry.venueATown || "",
        venueAPhone: enquiry.venueAPhone || "",
        venueAContact: enquiry.venueAContact || "",
        venueB: enquiry.venueB || "",
        venueBTown: enquiry.venueBTown || "",
        venueBPhone: enquiry.venueBPhone || "",
        venueBContact: enquiry.venueBContact || "",
        plannerName: enquiry.plannerName || "",
        plannerCompany: enquiry.plannerCompany || "",
        plannerPhone: enquiry.plannerPhone || "",
        plannerEmail: enquiry.plannerEmail || "",
        notes: enquiry.notes || "",
      });
      if (enquiry.contactId) {
        const match = contacts.find((c) => c.id === enquiry.contactId);
        setSelectedContact(match || null);
      } else {
        setSelectedContact(null);
      }
    } else {
      setFormData({ ...emptyForm });
      setSelectedContact(null);
      setContactSearch("");
    }
  }, [enquiry, isOpen, contacts]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value || undefined,
    }));
  };

  const handleSelectContact = useCallback(
    (contact: ContactOption) => {
      setSelectedContact(contact);
      const name = [contact.firstName, contact.lastName]
        .filter(Boolean)
        .join(" ");
      setFormData((prev) => ({
        ...prev,
        contactId: contact.id,
        clientName: name,
        clientEmail: contact.email || "",
        clientPhone: contact.phone || "",
      }));
      setShowContactDropdown(false);
      setContactSearch("");
      setHighlightedIdx(-1);
    },
    []
  );

  const handleClearContact = () => {
    setSelectedContact(null);
    setFormData((prev) => ({
      ...prev,
      contactId: null,
      clientName: "",
      clientEmail: "",
      clientPhone: "",
    }));
    // Re-focus search after clearing
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const filteredContacts = contactSearch
    ? contacts.filter((c) => {
        const full = [c.firstName, c.lastName, c.email, c.companyName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return full.includes(contactSearch.toLowerCase());
      })
    : contacts;

  const visibleContacts = filteredContacts.slice(0, 10);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showContactDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIdx((prev) =>
          prev < visibleContacts.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIdx((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIdx >= 0 && highlightedIdx < visibleContacts.length) {
          handleSelectContact(visibleContacts[highlightedIdx]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowContactDropdown(false);
        setHighlightedIdx(-1);
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName || !formData.clientEmail) {
      toast.error("Client name and email are required");
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving enquiry:", error);
      toast.error("Failed to save enquiry");
    } finally {
      setLoading(false);
    }
  };

  const hasVenueContent = !!(
    formData.venueA ||
    formData.venueATown ||
    formData.venueAPhone ||
    formData.venueAContact ||
    formData.venueB ||
    formData.venueBTown ||
    formData.venueBPhone ||
    formData.venueBContact
  );

  const hasPlannerContent = !!(
    formData.plannerName ||
    formData.plannerCompany ||
    formData.plannerPhone ||
    formData.plannerEmail
  );

  const hasExtraEventContent = !!(
    formData.colourScheme ||
    formData.guestNumbers ||
    formData.budget ||
    formData.enquiryDate
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto focus:outline-none"
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2
            id={titleId}
            className="text-lg sm:text-2xl font-serif font-bold text-gray-900"
          >
            {enquiry ? "Edit Enquiry" : "New Enquiry"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-5"
        >
          {/* ── Top classification row ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type of Enquiry
              </label>
              <select
                name="enquiryType"
                value={formData.enquiryType || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors text-sm"
              >
                <option value="">Select type</option>
                {ENQUIRY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors text-sm"
              >
                <option value="">Select status</option>
                {ENQUIRY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progress
              </label>
              <select
                name="progress"
                value={formData.progress || "New"}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors text-sm"
              >
                {PROGRESS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Client selector ── */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">
              Client
            </label>

            {selectedContact ? (
              <div className="flex items-center justify-between bg-sage-50 border border-sage-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <UserCircle size={20} className="text-primary-green" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formData.clientName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {[formData.clientEmail, formData.clientPhone]
                        .filter(Boolean)
                        .join(" \u00b7 ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/contacts/${selectedContact.id}`}
                    className="text-xs text-[#1B4332] hover:underline"
                    target="_blank"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={handleClearContact}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-3 text-gray-400"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search contacts or type a name..."
                    value={contactSearch}
                    onChange={(e) => {
                      setContactSearch(e.target.value);
                      setShowContactDropdown(true);
                      setHighlightedIdx(-1);
                    }}
                    onFocus={() => setShowContactDropdown(true)}
                    onKeyDown={handleSearchKeyDown}
                    role="combobox"
                    aria-expanded={showContactDropdown}
                    aria-autocomplete="list"
                    aria-controls="contact-listbox"
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] text-sm"
                  />
                </div>

                {showContactDropdown && (
                  <div
                    id="contact-listbox"
                    role="listbox"
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  >
                    {visibleContacts.length > 0 ? (
                      visibleContacts.map((c, idx) => (
                        <button
                          key={c.id}
                          type="button"
                          role="option"
                          aria-selected={idx === highlightedIdx}
                          className={`w-full text-left px-4 py-2.5 transition-colors border-b border-gray-100 last:border-b-0 ${
                            idx === highlightedIdx
                              ? "bg-sage-50"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => handleSelectContact(c)}
                          onMouseEnter={() => setHighlightedIdx(idx)}
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {[c.firstName, c.lastName]
                              .filter(Boolean)
                              .join(" ")}
                          </p>
                          <p className="text-xs text-gray-500">
                            {[c.email, c.companyName]
                              .filter(Boolean)
                              .join(" \u00b7 ")}
                          </p>
                        </button>
                      ))
                    ) : contactSearch.length > 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No contacts match &ldquo;{contactSearch}&rdquo;
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No contacts found
                      </div>
                    )}
                    <Link
                      href="/contacts"
                      target="_blank"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1B4332] hover:bg-gray-50 border-t border-gray-200 font-medium"
                      onClick={() => setShowContactDropdown(false)}
                    >
                      <Plus size={14} />
                      Create new contact
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Manual client fields when no contact selected */}
            {!selectedContact && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                <Input
                  label="Client Name *"
                  name="clientName"
                  value={formData.clientName || ""}
                  onChange={handleChange}
                  placeholder="e.g. Sarah Smith"
                  required
                />
                <Input
                  label="Client Email *"
                  name="clientEmail"
                  type="email"
                  value={formData.clientEmail || ""}
                  onChange={handleChange}
                  placeholder="e.g. sarah@example.com"
                  required
                />
                <Input
                  label="Client Phone"
                  name="clientPhone"
                  type="tel"
                  value={formData.clientPhone || ""}
                  onChange={handleChange}
                  placeholder="e.g. 07700 000000"
                />
              </div>
            )}
          </div>

          {/* ── Core event details (always visible) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <select
                name="eventType"
                value={formData.eventType || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors text-sm"
              >
                <option value="">Select an event type</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Event Date"
              name="eventDate"
              type="date"
              value={formData.eventDate || ""}
              onChange={handleChange}
            />

            <Input
              label="Venue"
              name="venueA"
              value={formData.venueA || ""}
              onChange={handleChange}
              placeholder="e.g. Town Hall"
            />
          </div>

          {/* ── Extra event details (collapsible) ── */}
          <CollapsibleSection
            title="Extra Event Details"
            defaultOpen={!!hasExtraEventContent}
            hasContent={hasExtraEventContent}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="Enquiry Date"
                name="enquiryDate"
                type="date"
                value={formData.enquiryDate || ""}
                onChange={handleChange}
              />
              <Input
                label="Colour Scheme"
                name="colourScheme"
                value={formData.colourScheme || ""}
                onChange={handleChange}
                placeholder="e.g. Blush & ivory"
              />
              <Input
                label="Guest Numbers"
                name="guestNumbers"
                type="number"
                value={formData.guestNumbers ?? ""}
                onChange={handleChange}
                placeholder="0"
              />
              <Input
                label="Budget (approx.)"
                name="budget"
                value={formData.budget || ""}
                onChange={handleChange}
                placeholder="e.g. 2000"
              />
            </div>
          </CollapsibleSection>

          {/* ── Venue details (collapsible) ── */}
          <CollapsibleSection
            title="Venue Details"
            defaultOpen={!!hasVenueContent}
            hasContent={hasVenueContent}
          >
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Venue A
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <AddressAutocomplete
                    value={formData.venueA || ""}
                    onChange={(v) =>
                      setFormData((prev) => ({ ...prev, venueA: v || undefined }))
                    }
                    onPlaceSelected={(place: PlaceSelection) => {
                      setFormData((prev) => ({
                        ...prev,
                        venueA: place.name || place.formattedAddress,
                        venueATown: place.town || prev.venueATown,
                        venueAPhone: place.phone || prev.venueAPhone,
                      }));
                    }}
                    searchType="establishment"
                    placeholder="Search UK venues..."
                  />
                </div>
                <Input
                  label="Town"
                  name="venueATown"
                  value={formData.venueATown || ""}
                  onChange={handleChange}
                  placeholder="Town"
                />
                <Input
                  label="Phone"
                  name="venueAPhone"
                  type="tel"
                  value={formData.venueAPhone || ""}
                  onChange={handleChange}
                  placeholder="Phone"
                />
                <Input
                  label="Contact"
                  name="venueAContact"
                  value={formData.venueAContact || ""}
                  onChange={handleChange}
                  placeholder="Contact name"
                />
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">
                Venue B
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <AddressAutocomplete
                    value={formData.venueB || ""}
                    onChange={(v) =>
                      setFormData((prev) => ({ ...prev, venueB: v || undefined }))
                    }
                    onPlaceSelected={(place: PlaceSelection) => {
                      setFormData((prev) => ({
                        ...prev,
                        venueB: place.name || place.formattedAddress,
                        venueBTown: place.town || prev.venueBTown,
                        venueBPhone: place.phone || prev.venueBPhone,
                      }));
                    }}
                    searchType="establishment"
                    placeholder="Search UK venues..."
                  />
                </div>
                <Input
                  label="Town"
                  name="venueBTown"
                  value={formData.venueBTown || ""}
                  onChange={handleChange}
                  placeholder="Town"
                />
                <Input
                  label="Phone"
                  name="venueBPhone"
                  type="tel"
                  value={formData.venueBPhone || ""}
                  onChange={handleChange}
                  placeholder="Phone"
                />
                <Input
                  label="Contact"
                  name="venueBContact"
                  value={formData.venueBContact || ""}
                  onChange={handleChange}
                  placeholder="Contact name"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* ── Planner details (collapsible) ── */}
          <CollapsibleSection
            title="Planner Details"
            defaultOpen={!!hasPlannerContent}
            hasContent={hasPlannerContent}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="Planner Name"
                name="plannerName"
                value={formData.plannerName || ""}
                onChange={handleChange}
                placeholder="Name"
              />
              <Input
                label="Company"
                name="plannerCompany"
                value={formData.plannerCompany || ""}
                onChange={handleChange}
                placeholder="Company"
              />
              <Input
                label="Phone"
                name="plannerPhone"
                type="tel"
                value={formData.plannerPhone || ""}
                onChange={handleChange}
                placeholder="Phone"
              />
              <Input
                label="Email"
                name="plannerEmail"
                type="email"
                value={formData.plannerEmail || ""}
                onChange={handleChange}
                placeholder="Email"
              />
            </div>
          </CollapsibleSection>

          {/* ── Notes ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes || ""}
              onChange={handleChange}
              placeholder="Add any additional notes about this enquiry..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors resize-none text-sm"
            />
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Enquiry"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
