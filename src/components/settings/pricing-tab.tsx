"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Can } from "@/components/auth/can";

interface PriceSettings {
  multiple?: string;
  flowerBuffer?: string;
  fuelCostPerLitre?: string;
  milesPerGallon?: number;
  staffCostPerHour?: string;
  staffMargin?: string;
}

interface PricingTabProps {
  data: PriceSettings;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export function PricingTab({ data, onSave, saving }: PricingTabProps) {
  const [priceSettings, setPriceSettings] = useState<PriceSettings>(data);

  useEffect(() => {
    setPriceSettings(data);
  }, [data]);

  const handleSave = async () => {
    await onSave({ priceSettings });
    setPriceSettings(data);
  };

  return (
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
  );
}
