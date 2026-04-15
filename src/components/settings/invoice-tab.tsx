"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

interface InvoiceSettings {
  paymentTerms?: string;
  bankDetails?: string;
  notes?: string;
  defaultVatRate?: string;
  vatNumber?: string;
}

interface InvoiceTabProps {
  data: InvoiceSettings;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export function InvoiceTab({ data, onSave, saving }: InvoiceTabProps) {
  const [invoiceSettings, setInvoiceSettings] =
    useState<InvoiceSettings>(data);

  useEffect(() => {
    setInvoiceSettings(data);
  }, [data]);

  const handleSave = async () => {
    await onSave({ invoiceSettings });
    setInvoiceSettings(data);
  };

  return (
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
              Applied to new invoices. Leave at 0 if not VAT-registered.
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
  );
}
