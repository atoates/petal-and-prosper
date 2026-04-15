"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Can } from "@/components/auth/can";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";

type AddressType = "billing" | "delivery" | "studio" | "registered";

const ADDRESS_TYPE_OPTIONS: { value: AddressType; label: string }[] = [
  { value: "billing", label: "Billing" },
  { value: "delivery", label: "Delivery" },
  { value: "studio", label: "Studio" },
  { value: "registered", label: "Registered" },
];

const emptyAddressForm = {
  type: "studio" as AddressType,
  buildingName: "",
  street: "",
  town: "",
  city: "",
  postcode: "",
  country: "United Kingdom",
};

interface Address {
  id: string;
  type: AddressType;
  buildingName?: string | null;
  street: string;
  town?: string | null;
  city: string;
  postcode: string;
  country?: string | null;
}

interface AddressesTabProps {
  addresses: Address[];
  onAddressesChanged: () => Promise<void>;
}

export function AddressesTab({
  addresses: initialAddresses,
  onAddressesChanged,
}: AddressesTabProps) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(
    null
  );

  const handleOpenAddressModal = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setAddressForm({
        type: address.type,
        buildingName: address.buildingName ?? "",
        street: address.street ?? "",
        town: address.town ?? "",
        city: address.city ?? "",
        postcode: address.postcode ?? "",
        country: address.country ?? "United Kingdom",
      });
    } else {
      setEditingAddress(null);
      setAddressForm(emptyAddressForm);
    }
    setShowAddressModal(true);
  };

  const handleCloseAddressModal = () => {
    if (savingAddress) return;
    setShowAddressModal(false);
    setEditingAddress(null);
    setAddressForm(emptyAddressForm);
  };

  const refreshAddresses = async () => {
    const res = await fetch("/api/settings/addresses");
    if (!res.ok) {
      throw new Error("Failed to fetch addresses");
    }
    const data = await res.json();
    setAddresses(data);
  };

  const handleSaveAddress = async () => {
    // Client-side mirror of the zod required fields so we can fail
    // fast before the round-trip. The server still validates.
    if (!addressForm.street.trim()) {
      toast.error("Street is required");
      return;
    }
    if (!addressForm.city.trim()) {
      toast.error("City is required");
      return;
    }
    if (!addressForm.postcode.trim()) {
      toast.error("Postcode is required");
      return;
    }

    setSavingAddress(true);
    try {
      const body = {
        type: addressForm.type,
        buildingName: addressForm.buildingName || null,
        street: addressForm.street,
        town: addressForm.town || null,
        city: addressForm.city,
        postcode: addressForm.postcode,
        country: addressForm.country || null,
      };

      const url = editingAddress
        ? `/api/settings/addresses/${editingAddress.id}`
        : "/api/settings/addresses";
      const method = editingAddress ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to save address");
        return;
      }

      toast.success(editingAddress ? "Address updated" : "Address added");
      await refreshAddresses();
      setShowAddressModal(false);
      setEditingAddress(null);
      setAddressForm(emptyAddressForm);
      await onAddressesChanged();
    } catch {
      toast.error("Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (deletingAddressId) return;
    if (!confirm("Delete this address? This cannot be undone.")) return;

    setDeletingAddressId(id);
    try {
      const res = await fetch(`/api/settings/addresses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to delete address");
        return;
      }
      toast.success("Address deleted");
      await refreshAddresses();
      await onAddressesChanged();
    } catch {
      toast.error("Failed to delete address");
    } finally {
      setDeletingAddressId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-semibold text-gray-900">
              Addresses
            </h2>
            <Can permission="company:update">
              <Button
                variant="primary"
                type="button"
                onClick={() => handleOpenAddressModal()}
              >
                <Plus size={16} className="mr-2" />
                Add Address
              </Button>
            </Can>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          {addresses.length === 0 ? (
            <p className="text-gray-600">
              No addresses configured yet. Add your studio, billing, and
              delivery addresses so they can be reused on orders and invoices.
            </p>
          ) : (
            addresses.map((address) => (
              <div
                key={address.id}
                className="border-b border-gray-200 pb-4 last:border-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2 capitalize">
                      {address.type}
                    </h3>
                    <div className="text-sm text-gray-600 space-y-0.5">
                      {address.buildingName && (
                        <div>{address.buildingName}</div>
                      )}
                      <div>{address.street}</div>
                      {address.town && <div>{address.town}</div>}
                      <div>{address.city}</div>
                      <div>{address.postcode}</div>
                      {address.country && <div>{address.country}</div>}
                    </div>
                  </div>
                  <Can permission="company:update">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAddressModal(address)}
                        className="p-1 text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded transition-colors"
                        title="Edit address"
                        aria-label="Edit address"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(address.id)}
                        disabled={deletingAddressId === address.id}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete address"
                        aria-label="Delete address"
                      >
                        {deletingAddressId === address.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </Can>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      {showAddressModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="address-modal-title"
        >
          <Card className="w-full max-w-md">
            <CardHeader>
              <h2
                id="address-modal-title"
                className="text-lg font-semibold text-gray-900"
              >
                {editingAddress ? "Edit Address" : "Add Address"}
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <Select
                label="Type"
                value={addressForm.type}
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    type: e.target.value as AddressType,
                  })
                }
                options={ADDRESS_TYPE_OPTIONS}
              />
              <Input
                label="Building name (optional)"
                value={addressForm.buildingName}
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    buildingName: e.target.value,
                  })
                }
              />
              <Input
                label="Street"
                value={addressForm.street}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, street: e.target.value })
                }
              />
              <Input
                label="Town (optional)"
                value={addressForm.town}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, town: e.target.value })
                }
              />
              <Input
                label="City"
                value={addressForm.city}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, city: e.target.value })
                }
              />
              <Input
                label="Postcode"
                value={addressForm.postcode}
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    postcode: e.target.value,
                  })
                }
              />
              <Input
                label="Country"
                value={addressForm.country}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, country: e.target.value })
                }
              />
            </CardBody>
            <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={handleCloseAddressModal}
                disabled={savingAddress}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={handleSaveAddress}
                disabled={savingAddress}
              >
                {savingAddress
                  ? "Saving..."
                  : editingAddress
                    ? "Save changes"
                    : "Add address"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
