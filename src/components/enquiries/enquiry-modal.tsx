"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

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

const PROGRESS_OPTIONS = ["New", "TBD", "Live", "Done", "Placed", "Order"];

export function EnquiryModal({
  isOpen,
  enquiry,
  onClose,
  onSave,
}: EnquiryModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Enquiry>>({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    eventType: "",
    eventDate: "",
    venueA: "",
    venueB: "",
    progress: "New",
    notes: "",
  });

  useEffect(() => {
    if (enquiry) {
      setFormData({
        clientName: enquiry.clientName || "",
        clientEmail: enquiry.clientEmail || "",
        clientPhone: enquiry.clientPhone || "",
        eventType: enquiry.eventType || "",
        eventDate: enquiry.eventDate
          ? new Date(enquiry.eventDate).toISOString().split("T")[0]
          : "",
        venueA: enquiry.venueA || "",
        venueB: enquiry.venueB || "",
        progress: enquiry.progress || "New",
        notes: enquiry.notes || "",
      });
    } else {
      setFormData({
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        eventType: "",
        eventDate: "",
        venueA: "",
        venueB: "",
        progress: "New",
        notes: "",
      });
    }
  }, [enquiry, isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-2xl font-serif font-bold text-gray-900">
            {enquiry ? "Edit Enquiry" : "New Enquiry"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <select
                name="eventType"
                value={formData.eventType || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progress
              </label>
              <select
                name="progress"
                value={formData.progress || "New"}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors"
              >
                {PROGRESS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Venue A"
              name="venueA"
              value={formData.venueA || ""}
              onChange={handleChange}
              placeholder="e.g. Town Hall"
            />

            <Input
              label="Venue B"
              name="venueB"
              value={formData.venueB || ""}
              onChange={handleChange}
              placeholder="e.g. Church"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes || ""}
              onChange={handleChange}
              placeholder="Add any additional notes about this enquiry..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Enquiry"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
