"use client";

/**
 * First-run onboarding wizard
 * ============================
 *
 * Four-step modal that walks a freshly-signed-up florist through the
 * bare minimum of configuration needed for the rest of the app to be
 * useful:
 *
 *   1. Company details   (name, phone, email, website)
 *   2. Logo URL          (so proposals/invoices aren't anonymous)
 *   3. Pricing rules     (the numbers the engine needs to quote)
 *   4. First team member (optional, since most florists fly solo
 *                         and will add staff later)
 *
 * It's fully skippable. "Skip for now" just dismisses the modal for the
 * current tab; "Do this later" persists a dismissal flag in
 * localStorage so it stops auto-opening after signup. We deliberately
 * do NOT persist dismissal on the server yet: a future pass can add
 * `onboardingCompletedAt` on companies once we're sure we like this
 * flow. Until then, the OnboardingChecklist card on /home remains the
 * source of truth for "has this tenant actually finished setup", and
 * the wizard just runs on top.
 *
 * The wizard expects the parent (HomePage) to pass in the onboarding
 * state it already loaded from /api/dashboard, decide whether to open
 * itself, and call onComplete to refresh dashboard data after each
 * step. That keeps the wizard free of its own fetches.
 */

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Check, Circle, ArrowRight, ArrowLeft } from "lucide-react";

export interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  /** Persist a "don't show again" flag so the wizard won't auto-open. */
  onDismiss?: () => void;
}

interface CompanyForm {
  name: string;
  contactNo: string;
  email: string;
  website: string;
}

interface LogoForm {
  logoUrl: string;
}

interface PricingForm {
  multiple: string;
  flowerBuffer: string;
  fuelCostPerLitre: string;
  milesPerGallon: string;
  staffCostPerHour: string;
  staffMargin: string;
}

interface TeamForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "staff";
}

const STEPS = [
  { key: "company", title: "Company details" },
  { key: "logo", title: "Logo" },
  { key: "pricing", title: "Pricing rules" },
  { key: "team", title: "Team member" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function OnboardingWizard({
  isOpen,
  onClose,
  onComplete,
  onDismiss,
}: WizardProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState<CompanyForm>({
    name: "",
    contactNo: "",
    email: "",
    website: "",
  });
  const [logo, setLogo] = useState<LogoForm>({ logoUrl: "" });
  const [pricing, setPricing] = useState<PricingForm>({
    multiple: "2.5",
    flowerBuffer: "1.15",
    fuelCostPerLitre: "1.80",
    milesPerGallon: "45",
    staffCostPerHour: "15",
    staffMargin: "1.5",
  });
  const [team, setTeam] = useState<TeamForm>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "staff",
  });

  const currentStep = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const isFirst = stepIdx === 0;

  const goBack = () => {
    setError(null);
    if (!isFirst) setStepIdx(stepIdx - 1);
  };

  const goForward = () => {
    setError(null);
    if (!isLast) setStepIdx(stepIdx + 1);
  };

  // Each step saves to its own endpoint when the user clicks "Save &
  // continue". We don't block navigation if saving fails -- we surface
  // the error and let the user either retry or skip.
  const saveStep = async (step: StepKey): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      if (step === "company") {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: {
              name: company.name || undefined,
              contactNo: company.contactNo || undefined,
              email: company.email || undefined,
              website: company.website || undefined,
            },
          }),
        });
        if (!res.ok) throw new Error("Failed to save company details");
      } else if (step === "logo") {
        if (!logo.logoUrl.trim()) return true; // skip empty
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: { logoUrl: logo.logoUrl.trim() },
          }),
        });
        if (!res.ok) throw new Error("Failed to save logo");
      } else if (step === "pricing") {
        const res = await fetch("/api/settings/pricing", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            multiple: pricing.multiple,
            flowerBuffer: pricing.flowerBuffer,
            fuelCostPerLitre: pricing.fuelCostPerLitre,
            milesPerGallon: Number(pricing.milesPerGallon),
            staffCostPerHour: pricing.staffCostPerHour,
            staffMargin: pricing.staffMargin,
          }),
        });
        if (!res.ok) {
          // Fall back to the bulk settings endpoint if the dedicated
          // pricing route isn't present on this deployment.
          const fallback = await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              priceSettings: {
                multiple: pricing.multiple,
                flowerBuffer: pricing.flowerBuffer,
                fuelCostPerLitre: pricing.fuelCostPerLitre,
                milesPerGallon: Number(pricing.milesPerGallon),
                staffCostPerHour: pricing.staffCostPerHour,
                staffMargin: pricing.staffMargin,
              },
            }),
          });
          if (!fallback.ok) throw new Error("Failed to save pricing rules");
        }
      } else if (step === "team") {
        if (!team.email.trim()) return true; // skip empty
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(team),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to invite team member");
        }
      }
      onComplete();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndContinue = async () => {
    const ok = await saveStep(currentStep.key);
    if (!ok) return;
    if (isLast) {
      onDismiss?.();
      onClose();
    } else {
      goForward();
    }
  };

  const handleSkipStep = () => {
    if (isLast) {
      onDismiss?.();
      onClose();
    } else {
      goForward();
    }
  };

  const handleSkipAll = () => {
    onDismiss?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Welcome to Petal & Prosper"
      size="lg"
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          Let&apos;s get your studio set up. You can skip any step and come back later.
        </p>

        {/* Stepper */}
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <div key={s.key} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      done
                        ? "bg-[#1B4332] border-[#1B4332] text-white"
                        : active
                        ? "border-[#1B4332] text-[#1B4332]"
                        : "border-gray-300 text-gray-400"
                    }`}
                  >
                    {done ? <Check size={16} /> : <Circle size={10} />}
                  </div>
                  <span
                    className={`text-xs mt-1 ${
                      active ? "text-[#1B4332] font-medium" : "text-gray-500"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      done ? "bg-[#1B4332]" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Step body */}
        <div className="min-h-[220px]">
          {currentStep.key === "company" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                These details appear on your proposals and invoices.
              </p>
              <Input
                label="Company name"
                value={company.name}
                onChange={(e) =>
                  setCompany({ ...company, name: e.target.value })
                }
                placeholder="Petal &amp; Prosper Studio"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Contact number"
                  value={company.contactNo}
                  onChange={(e) =>
                    setCompany({ ...company, contactNo: e.target.value })
                  }
                  placeholder="+44 20 1234 5678"
                />
                <Input
                  label="Email"
                  type="email"
                  value={company.email}
                  onChange={(e) =>
                    setCompany({ ...company, email: e.target.value })
                  }
                  placeholder="hello@example.co.uk"
                />
              </div>
              <Input
                label="Website"
                value={company.website}
                onChange={(e) =>
                  setCompany({ ...company, website: e.target.value })
                }
                placeholder="https://example.co.uk"
              />
            </div>
          )}

          {currentStep.key === "logo" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Paste the URL of your logo. We&apos;ll use it on proposals and
                invoices. You can upload a proper file later from Settings.
              </p>
              <Input
                label="Logo URL"
                value={logo.logoUrl}
                onChange={(e) => setLogo({ logoUrl: e.target.value })}
                placeholder="https://example.co.uk/logo.png"
              />
              {logo.logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logo.logoUrl}
                  alt="Logo preview"
                  className="max-h-24 border border-gray-200 rounded p-2"
                />
              )}
            </div>
          )}

          {currentStep.key === "pricing" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                The pricing engine uses these to mark up cost prices into sell
                prices on quotes. Defaults are reasonable for UK florists.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Markup multiple"
                  type="number"
                  step="0.01"
                  value={pricing.multiple}
                  onChange={(e) =>
                    setPricing({ ...pricing, multiple: e.target.value })
                  }
                  helperText="e.g. 2.5 = 2.5x cost"
                />
                <Input
                  label="Flower buffer"
                  type="number"
                  step="0.01"
                  value={pricing.flowerBuffer}
                  onChange={(e) =>
                    setPricing({ ...pricing, flowerBuffer: e.target.value })
                  }
                  helperText="Wastage allowance"
                />
                <Input
                  label="Fuel cost (£/litre)"
                  type="number"
                  step="0.01"
                  value={pricing.fuelCostPerLitre}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      fuelCostPerLitre: e.target.value,
                    })
                  }
                />
                <Input
                  label="Miles per gallon"
                  type="number"
                  value={pricing.milesPerGallon}
                  onChange={(e) =>
                    setPricing({ ...pricing, milesPerGallon: e.target.value })
                  }
                />
                <Input
                  label="Staff cost (£/hour)"
                  type="number"
                  step="0.01"
                  value={pricing.staffCostPerHour}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      staffCostPerHour: e.target.value,
                    })
                  }
                />
                <Input
                  label="Staff margin"
                  type="number"
                  step="0.01"
                  value={pricing.staffMargin}
                  onChange={(e) =>
                    setPricing({ ...pricing, staffMargin: e.target.value })
                  }
                  helperText="e.g. 1.5 = 50% uplift"
                />
              </div>
            </div>
          )}

          {currentStep.key === "team" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Invite your first team member. Leave blank to skip. You can
                add more people any time from Settings.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First name"
                  value={team.firstName}
                  onChange={(e) =>
                    setTeam({ ...team, firstName: e.target.value })
                  }
                />
                <Input
                  label="Last name"
                  value={team.lastName}
                  onChange={(e) =>
                    setTeam({ ...team, lastName: e.target.value })
                  }
                />
              </div>
              <Input
                label="Email"
                type="email"
                value={team.email}
                onChange={(e) => setTeam({ ...team, email: e.target.value })}
                placeholder="colleague@example.co.uk"
              />
              <Input
                label="Temporary password"
                type="password"
                value={team.password}
                onChange={(e) =>
                  setTeam({ ...team, password: e.target.value })
                }
                helperText="They'll use this to sign in; ask them to change it afterwards."
              />
              <Select
                label="Role"
                value={team.role}
                onChange={(e) =>
                  setTeam({
                    ...team,
                    role: e.target.value as TeamForm["role"],
                  })
                }
                options={[
                  { value: "staff", label: "Staff" },
                  { value: "manager", label: "Manager" },
                  { value: "admin", label: "Admin" },
                ]}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSkipAll}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Do this later
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                type="button"
                variant="secondary"
                onClick={goBack}
                disabled={saving}
              >
                <ArrowLeft size={16} className="mr-1" />
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={handleSkipStep}
              disabled={saving}
            >
              Skip
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveAndContinue}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : isLast
                ? "Finish"
                : "Save & continue"}
              {!isLast && !saving && (
                <ArrowRight size={16} className="ml-1" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
