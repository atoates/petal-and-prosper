"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

interface ProposalSettings {
  headerText?: string;
  footerText?: string;
  termsAndConditions?: string;
}

interface ProposalTabProps {
  data: ProposalSettings;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export function ProposalTab({ data, onSave, saving }: ProposalTabProps) {
  const [proposalSettings, setProposalSettings] =
    useState<ProposalSettings>(data);

  useEffect(() => {
    setProposalSettings(data);
  }, [data]);

  const handleSave = async () => {
    await onSave({ proposalSettings });
    setProposalSettings(data);
  };

  return (
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
  );
}
