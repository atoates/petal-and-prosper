"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Can } from "@/components/auth/can";
import { Pencil, Trash2, Loader2 } from "lucide-react";

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

interface VenueBookModalProps {
  isOpen: boolean;
  venues: Venue[];
  onClose: () => void;
  onVenuesChanged: () => Promise<void>;
}

export function VenueBookModal({
  isOpen,
  venues,
  onClose,
  onVenuesChanged,
}: VenueBookModalProps) {
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
  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);

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
  };

  const closeVenueModal = () => {
    setEditingVenue(null);
    setVenueError(null);
    onClose();
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
      await onVenuesChanged();
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
      await onVenuesChanged();
    } catch (err) {
      setVenueError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDeletingVenueId(null);
    }
  };

  if (!isOpen) return null;

  return (
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
  );
}
