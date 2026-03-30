"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SettingsTab = "company" | "pricing" | "proposal" | "invoice" | "addresses" | "demo";

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
}

interface Address {
  id: string;
  type: string;
  building?: string;
  street?: string;
  town?: string;
  city?: string;
  postcode?: string;
  country?: string;
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

  // Demo data state
  const [demoStatus, setDemoStatus] = useState<Record<string, number>>({});
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const tabs: { id: SettingsTab; name: string }[] = [
    { id: "company", name: "Company Details" },
    { id: "pricing", name: "Pricing" },
    { id: "proposal", name: "Proposals" },
    { id: "invoice", name: "Invoices" },
    { id: "addresses", name: "Addresses" },
    { id: "demo", name: "Demo Data" },
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
    fetchDemoStatus();
  }, []);

  const fetchDemoStatus = async () => {
    try {
      const response = await fetch("/api/demo-data");
      if (response.ok) {
        const data = await response.json();
        setDemoStatus(data);
      }
    } catch {
      // Silently fail
    }
  };

  const handleDemoAction = async (action: "seed" | "clear") => {
    setDemoLoading(true);
    setDemoMessage(null);
    setDemoError(null);
    setConfirmClear(false);
    try {
      const response = await fetch("/api/demo-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      setDemoMessage(data.message);
      await fetchDemoStatus();
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDemoLoading(false);
    }
  };

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
        <h1 className="text-3xl font-serif font-bold text-gray-900">Settings</h1>
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
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>
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
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>
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
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>
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
              </CardBody>
              <CardFooter>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </CardFooter>
            </Card>
          )}

          {activeTab === "addresses" && (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-serif font-semibold text-gray-900">
                  Addresses
                </h2>
              </CardHeader>
              <CardBody className="space-y-6">
                {addresses.length === 0 ? (
                  <p className="text-gray-600">No addresses configured yet</p>
                ) : (
                  addresses.map((address) => (
                    <div key={address.id} className="border-b pb-4">
                      <h3 className="font-medium text-gray-900 mb-3">
                        {address.type || "Address"}
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>{address.building}</div>
                        <div>{address.street}</div>
                        <div>{address.town}</div>
                        <div>{address.city}</div>
                        <div>{address.postcode}</div>
                        <div>{address.country}</div>
                      </div>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          )}

          {activeTab === "demo" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-serif font-semibold text-gray-900">
                    Demo Data Management
                  </h2>
                </CardHeader>
                <CardBody className="space-y-6">
                  <p className="text-gray-600">
                    Use these tools to populate your account with realistic sample data for
                    demonstrations, or to clear it when you are ready to go live with real data.
                  </p>

                  {/* Current data counts */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Current Data
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: "Enquiries", count: demoStatus.enquiries || 0 },
                        { label: "Orders", count: demoStatus.orders || 0 },
                        { label: "Invoices", count: demoStatus.invoices || 0 },
                        { label: "Proposals", count: demoStatus.proposals || 0 },
                        { label: "Products", count: demoStatus.products || 0 },
                        { label: "Wholesale", count: demoStatus.wholesaleOrders || 0 },
                        { label: "Production", count: demoStatus.productionSchedules || 0 },
                        { label: "Deliveries", count: demoStatus.deliverySchedules || 0 },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="bg-gray-50 rounded-lg p-3 text-center"
                        >
                          <p className="text-2xl font-serif font-bold text-[#1B4332]">
                            {item.count}
                          </p>
                          <p className="text-xs text-gray-600">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Messages */}
                  {demoMessage && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 text-sm">{demoMessage}</p>
                    </div>
                  )}
                  {demoError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800 text-sm">{demoError}</p>
                    </div>
                  )}
                </CardBody>
                <CardFooter className="flex flex-col sm:flex-row gap-4">
                  {/* Seed button */}
                  <Button
                    variant="primary"
                    onClick={() => handleDemoAction("seed")}
                    disabled={demoLoading}
                    className="bg-[#2D6A4F] hover:bg-[#1B4332] text-white"
                  >
                    {demoLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                        Processing...
                      </span>
                    ) : (
                      "Load demo data"
                    )}
                  </Button>

                  {/* Clear button with confirmation */}
                  {!confirmClear ? (
                    <Button
                      variant="outline"
                      onClick={() => setConfirmClear(true)}
                      disabled={demoLoading}
                      className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                    >
                      Clear all data
                    </Button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-red-700 font-medium">
                        Are you sure? This will delete all enquiries, orders, invoices, proposals, products, and schedules.
                      </span>
                      <Button
                        variant="primary"
                        onClick={() => handleDemoAction("clear")}
                        disabled={demoLoading}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Yes, clear everything
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmClear(false)}
                        disabled={demoLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>

              <Card className="bg-amber-50 border-amber-200">
                <CardBody>
                  <h3 className="text-sm font-semibold text-amber-900 mb-2">
                    Please note
                  </h3>
                  <p className="text-sm text-amber-800">
                    Loading demo data will first clear any existing transactional data (enquiries,
                    orders, etc.) and replace it with sample records. Your account settings, company
                    details, and user account will not be affected. Clearing data removes all
                    transactional records but keeps your settings intact.
                  </p>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
