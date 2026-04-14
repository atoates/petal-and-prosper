"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";
import { Card, CardBody, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatUkDateTime } from "@/lib/format-date";
// Plus icon removed -- quote creation handled via Orders workflow

interface PriceSettings {
  id?: string;
  multiple?: string;
  flowerBuffer?: string;
  fuelCostPerLitre?: string;
  milesPerGallon?: number;
  staffCostPerHour?: string;
  staffMargin?: string;
  updatedAt?: string;
}

export default function PricingPage() {
  const [settings, setSettings] = useState<PriceSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/settings/pricing");
        if (!response.ok) {
          throw new Error("Failed to fetch pricing settings");
        }
        const data = await response.json();
        setSettings(data);
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
      setSuccess(false);
      const response = await fetch("/api/settings/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to save pricing settings");
      }

      const data = await response.json();
      setSettings(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
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
          <p className="mt-4 text-gray-600">Loading pricing settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">Pricing</h1>
          <p className="text-gray-600 mt-1">Configure pricing multipliers and costs</p>
        </div>
{/* Quote creation is handled via the Orders workflow */}
      </div>

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardBody>
            <p className="text-red-800">Error: {error}</p>
          </CardBody>
        </Card>
      )}

      {success && (
        <Card className="mb-6 bg-green-50 border-green-200">
          <CardBody>
            <p className="text-green-800">Settings saved successfully!</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-xl font-serif font-semibold text-gray-900">
            Pricing Multipliers and Costs
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            These settings are used to calculate prices for orders and proposals
          </p>
        </CardHeader>

        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Input
              label="Markup Multiple"
              type="number"
              step="0.1"
              value={settings.multiple || ""}
              onChange={(e) =>
                setSettings({ ...settings, multiple: e.target.value })
              }
            />
            <Input
              label="Flower Buffer %"
              type="number"
              step="0.1"
              value={settings.flowerBuffer || ""}
              onChange={(e) =>
                setSettings({ ...settings, flowerBuffer: e.target.value })
              }
            />
            <Input
              label="Fuel Cost per Litre (£)"
              type="number"
              step="0.01"
              value={settings.fuelCostPerLitre || ""}
              onChange={(e) =>
                setSettings({ ...settings, fuelCostPerLitre: e.target.value })
              }
            />
            <Input
              label="Miles per Gallon"
              type="number"
              value={settings.milesPerGallon || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  milesPerGallon: parseInt(e.target.value),
                })
              }
            />
            <Input
              label="Staff Cost per Hour (£)"
              type="number"
              step="0.01"
              value={settings.staffCostPerHour || ""}
              onChange={(e) =>
                setSettings({ ...settings, staffCostPerHour: e.target.value })
              }
            />
            <Input
              label="Staff Margin %"
              type="number"
              step="0.1"
              value={settings.staffMargin || ""}
              onChange={(e) =>
                setSettings({ ...settings, staffMargin: e.target.value })
              }
            />
          </div>

          {settings.updatedAt && (
            <div className="pt-4 border-t border-gray-200 text-xs text-gray-500">
              Last updated: {formatUkDateTime(settings.updatedAt)}
            </div>
          )}
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
    </div>
  );
}
