"use client";

import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export interface OnboardingState {
  hasLogo: boolean;
  hasPricingConfigured: boolean;
  hasTeamMember: boolean;
  hasEnquiry: boolean;
}

interface Step {
  key: keyof OnboardingState;
  title: string;
  description: string;
  href: string;
  cta: string;
}

const steps: Step[] = [
  {
    key: "hasLogo",
    title: "Add your logo",
    description: "Your logo appears on proposals and invoices.",
    href: "/settings",
    cta: "Go to settings",
  },
  {
    key: "hasPricingConfigured",
    title: "Set your pricing rules",
    description:
      "Markup, flower buffer, fuel and staff costs drive every quote.",
    href: "/pricing",
    cta: "Open pricing",
  },
  {
    key: "hasTeamMember",
    title: "Invite a team member",
    description: "Add colleagues so they can work on enquiries with you.",
    href: "/user",
    cta: "Manage users",
  },
  {
    key: "hasEnquiry",
    title: "Log your first enquiry",
    description: "Capture a client enquiry to start the order flow.",
    href: "/enquiries",
    cta: "New enquiry",
  },
];

interface OnboardingChecklistProps {
  state: OnboardingState;
}

export function OnboardingChecklist({ state }: OnboardingChecklistProps) {
  const completedCount = steps.filter((s) => state[s.key]).length;
  const allDone = completedCount === steps.length;

  if (allDone) return null;

  return (
    <Card className="mb-6 border-[#D4A0A7] bg-[#FDF8F9]">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-serif font-semibold text-gray-900">
              Finish setting up Petal & Prosper
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              A few quick steps to get the most out of the app.
            </p>
          </div>
          <div className="text-sm font-medium text-[#1B4332]">
            {completedCount} of {steps.length} complete
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        {steps.map((step) => {
          const done = state[step.key];
          return (
            <div
              key={step.key}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                done ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {done ? (
                  <Check size={20} className="text-green-600" />
                ) : (
                  <Circle size={20} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`font-medium ${
                    done ? "text-green-900 line-through" : "text-gray-900"
                  }`}
                >
                  {step.title}
                </div>
                <div className="text-sm text-gray-600">{step.description}</div>
              </div>
              {!done && (
                <Link
                  href={step.href}
                  className="text-sm font-medium text-[#2D6A4F] hover:text-[#1B4332] whitespace-nowrap"
                >
                  {step.cta}
                </Link>
              )}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
