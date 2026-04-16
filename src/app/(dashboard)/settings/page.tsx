"use client";

import { useState, useEffect } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { CompanyTab } from "@/components/settings/company-tab";
import { PricingTab } from "@/components/settings/pricing-tab";
import { ProposalTab } from "@/components/settings/proposal-tab";
import { InvoiceTab } from "@/components/settings/invoice-tab";
import { AddressesTab } from "@/components/settings/addresses-tab";

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

type AddressType = "billing" | "delivery" | "studio" | "registered";

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

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Tabs */}
        <div className="sm:w-48 flex-shrink-0">
          <nav role="tablist" aria-label="Settings sections" className="flex sm:block gap-1 sm:gap-0 sm:space-y-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 sm:w-full text-left px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
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
        <div className="flex-1 min-w-0">
          {activeTab === "company" && (
            <CompanyTab data={company} onSave={handleSave} saving={saving} />
          )}

          {activeTab === "pricing" && (
            <PricingTab data={priceSettings} onSave={handleSave} saving={saving} />
          )}

          {activeTab === "proposal" && (
            <ProposalTab data={proposalSettings} onSave={handleSave} saving={saving} />
          )}

          {activeTab === "invoice" && (
            <InvoiceTab data={invoiceSettings} onSave={handleSave} saving={saving} />
          )}

          {activeTab === "addresses" && (
            <AddressesTab
              addresses={addresses}
              onAddressesChanged={refreshAddresses}
            />
          )}

        </div>
      </div>

    </div>
  );
}
