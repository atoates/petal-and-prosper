"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Can } from "@/components/auth/can";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";

type AddressType = "billing" | "delivery" | "studio";

const ADDRESS_TYPE_OPTIONS: { value: AddressType; label: string }[] = [
  { value: "billing", label: "Billing" },
  { value: "delivery", label: "Delivery" },
  { value: "studio", label: "Studio" },
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

type SettingsTab = "company" | "pricing" | "proposal" | "invoice" | "addresses";

interface CompanyData {
  id: string;
  name?: string;
  registrationNo?: string;
  contactNo?: string;
  email?: string;
  website?: string;
  currency?: string;
  logoUrl?: string;
}

interface PriceSettings {
  multiple?: string;
  flowerBuffer?: string;
  fuelCostPerLitre?: string;
  milesPerGallon?: number;
  staffCostPerHour?: string;
  staffMargin?: string;
}

interface ProposalSettings {
  headerText?: string;
  footerText?: string;
  termsAndConditions?: string;
}

interface InvoiceSettings {
  paymentTerms?: string;
  bankDetails?: string;
  notes?: string;
  defaultVatRate?: string;
  vatNumber?: string;
}

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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("company");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [company, setCompany] = useState<CompanyData>({} as CompanyData);
  const [priceSettings, setPriceSettings] = useState<PriceSettings>({});
  const [proposalSettings, setProposalSettings] = useState<ProposalSettings>({});
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({});
  const [addresses, setAddresses] = useState<Address[]>([]);

  // #20 -- address CRUD state. A single modal handles both create and
  // edit: `editingAddress` is null for create, or points at the row
  // being edited. `savingAddress` disables the submit button during
  // the round-trip, `deletingAddressId` does the same for the delete
  // icon per-row to match the #27 pattern used elsewhere.
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(
    null
  );

  const tabs: { id: SettingsTab; name: string }[] = [
    { id: "company", name: "Company Details" },
    { id: "pricing", name: "Pricing" },
    { id: "proposal", name: "Proposals" },
    { id: "invoice", name: "Invoices" },
    { id: "addresses", name: "Addresses" },
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/settings");
        if (!response.ok) {
          throw new Error("Failed to fetch settings");
        }
        const data = await response.json();
        setCompany(data.company || {});
        setPriceSettings(data.priceSettings || {});
        setProposalSettings(data.proposalSettings || {});
        setInvoiceSettings(data.invoiceSettings || {});
        setAddresses(data.addresses || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: Record<string, unknown> = {};

      if (activeTab === "company") {
        payload.company = company;
      } else if (activeTab === "pricing") {
        payload.priceSettings = priceSettings;
      } else if (activeTab === "proposal") {
        payload.proposalSettings = proposalSettings;
      } else if (activeTab === "invoice") {
        payload.invoiceSettings = invoiceSettings;
      }

      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      const data = await response.json();
      if (activeTab === "company") setCompany(data.company || {});
      if (activeTab === "pricing") setPriceSettings(data.priceSettings || {});
      if (activeTab === "proposal") setProposalSettings(data.proposalSettings || {});
      if (activeTab === "invoice") setInvoiceSettings(data.invoiceSettings || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const refreshAddresses = async () => {
    const res = await fetch("/api/settings/addresses");
    if (!res.ok) {
      throw new Error("Failed to fetch addresses");
    }
    const data = await res.json();
    setAddresses(data);
  };

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
    } catch {
      toast.error("Failed to delete address");
    } finally {
      setDeletingAddressId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and business settings</p>
      </div>

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardBody>
            <p className="text-red-800">Error: {error}</p>
          </CardBody>
        </Card>
      )}

      <div className="flex gap-6">
        {/* Tabs */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-[#1B4332] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "company" && (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-serif font-semibold text-gray-900">
                  Company Details
                </h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <Input
                  label="Company Name"
                  value={company.name || ""}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                />
                <Input
                  label="Registration Number"
                  value={company.registrationNo || ""}
                  onChange={(e) =>
                    setCompany({ ...company, registrationNo: e.target.value })
                  }
                />
                <Input
                  label="Contact Number"
                  value={company.contactNo || ""}
                  onChange={(e) =>
                    setCompany({ ...company, contactNo: e.target.value })
                  }
                />
                <Input
                  label="Email"
                  type="email"
                  value={company.email || ""}
                  onChange={(e) => setCompany({ ...company, email: e.target.value })}
                />
                <Input
                  label="Website"
                  type="url"
                  value={company.website || ""}
                  onChange={(e) =>
                    setCompany({ ...company, website: e.target.value })
                  }
                />
              </CardBody>
              <CardFooter>
                <Can permission="company:update">
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </Can>
              </CardFooter>
            </Card>
          )}

          {activeTab === "pricing" && (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-serif font-semibold text-gray-900">
                  Pricing
                </h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <Input
                  label="Markup Multiple"
                  type="number"
                  step="0.1"
                  value={priceSettings.multiple || ""}
                  onChange={(e) =>
                    setPriceSettings({ ...priceSettings, multiple: e.target.value })
                  }
                />
                <Input
                  label="Flower Buffer %"
                  type="number"
                  step="0.1"
                  value={priceSettings.flowerBuffer || ""}
                  onChange={(e) =>
                    setPriceSettings({
                      ...priceSettings,
                      flowerBuffer: e.target.value,
                    })
                  }
                />
                <Input
                  label="Fuel Cost per Litre (£)"
                  type="number"
                  step="0.01"
                  value={priceSettings.fuelCostPerLitre || ""}
                  onChange={(e) =>
                    setPriceSettings({
                      ...priceSettings,
                      fuelCostPerLitre: e.target.value,
                    })
                  }
                />
                <Input
                  label="Miles per Gallon"
                  type="number"
                  value={priceSettings.milesPerGallon || ""}
                  onChange={(e) =>
                    setPriceSettings({
                      ...priceSettings,
                      milesPerGallon: parseInt(e.target.value),
                    })
                  }
                />
                <Input
                  label="Staff Cost per Hour (£)"
                  type="number"
                  step="0.01"
                  value={priceSettings.staffCostPerHour || ""}
                  onChange={(e) =>
                    setPriceSettings({
                      ...priceSettings,
                      staffCostPerHour: e.target.value,
                    })
                  }
                />
                <Input
                  label="Staff Margin"
                  type="number"
                  step="0.1"
                  value={priceSettings.staffMargin || ""}
                  onChange={(e) =>
                    setPriceSettings({
                      ...priceSettings,
                      staffMargin: e.target.value,
                    })
                  }
                />
              </CardBody>
              <CardFooter>
                <Can permission="pricing:update">
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </Can>
              </CardFooter>
            </Card>
          )}

          {activeTab === "proposal" && (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-serif font-semibold text-gray-900">
                  Proposal Settings
                </h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Header Text
                  </label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    value={proposalSettings.headerText || ""}
                    onChange={(e) =>
                      setProposalSettings({
                        ...proposalSettings,
                        headerText: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Footer Text
                  </label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    value={proposalSettings.footerText || ""}
                    onChange={(e) =>
                      setProposalSettings({
                        ...proposalSettings,
                        footerText: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Terms and Conditions
                  </label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={4}
                    value={proposalSettings.termsAndConditions || ""}
                    onChange={(e) =>
                      setProposalSettings({
                        ...proposalSettings,
                        termsAndConditions: e.target.value,
                      })
                    }
                  />
                </div>
              </CardBody>
              <CardFooter>
                <Can permission="templates:update">
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </Can>
              </CardFooter>
            </Card>
          )}

          {activeTab === "invoice" && (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-serif font-semibold text-gray-900">
                  Invoice Settings
                </h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Terms
                  </label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    value={invoiceSettings.paymentTerms || ""}
                    onChange={(e) =>
                      setInvoiceSettings({
                        ...invoiceSettings,
                        paymentTerms: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Details
                  </label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    value={invoiceSettings.bankDetails || ""}
                    onChange={(e) =>
                      setInvoiceSettings({
                        ...invoiceSettings,
                        bankDetails: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                    value={invoiceSettings.notes || ""}
                    onChange={(e) =>
                      setInvoiceSettings({
                        ...invoiceSettings,
                        notes: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default VAT Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g. 20"
                      value={invoiceSettings.defaultVatRate ?? ""}
                      onChange={(e) =>
                        setInvoiceSettings({
                          ...invoiceSettings,
                          defaultVatRate: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Applied to new invoices. Leave at 0 if not
                      VAT-registered.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      VAT Number
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g. GB123456789"
                      value={invoiceSettings.vatNumber || ""}
                      onChange={(e) =>
                        setInvoiceSettings({
                          ...invoiceSettings,
                          vatNumber: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Shown on invoice PDFs if set.
                    </p>
                  </div>
                </div>
              </CardBody>
              <CardFooter>
                <Can permission="templates:update">
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </Can>
              </CardFooter>
            </Card>
          )}

          {activeTab === "addresses" && (
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
                    No addresses configured yet. Add your studio, billing,
                    and delivery addresses so they can be reused on orders
                    and invoices.
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
                                <Loader2
                                  size={16}
                                  className="animate-spin"
                                />
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
          )}

        </div>
      </div>

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
            <CardFooter className="space-x-4">
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
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
