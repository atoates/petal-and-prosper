"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Can } from "@/components/auth/can";

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

interface CompanyTabProps {
  data: CompanyData;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export function CompanyTab({ data, onSave, saving }: CompanyTabProps) {
  const [company, setCompany] = useState<CompanyData>(data);

  useEffect(() => {
    setCompany(data);
  }, [data]);

  const handleSave = async () => {
    await onSave({ company });
    setCompany(data);
  };

  return (
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
  );
}
