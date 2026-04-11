"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  OnboardingChecklist,
  OnboardingState,
} from "@/components/dashboard/onboarding-checklist";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import {
  Truck,
  Wrench,
  FileText,
  FileCheck,
  Receipt,
  ShoppingCart,
} from "lucide-react";

const WIZARD_DISMISSED_KEY = "pp.onboardingWizardDismissed";

interface DeliveryRow {
  id: string;
  orderId: string;
  status: string;
  clientName: string;
  venue?: string | null;
  eventDate?: string | null;
}

interface ProductionRow {
  id: string;
  orderId: string;
  status: string;
  clientName: string;
  eventDate?: string | null;
}

interface EnquiryRow {
  id: string;
  clientName: string;
  eventType?: string | null;
  eventDate?: string | null;
  progress?: string | null;
  createdAt?: string | null;
}

interface ProposalRow {
  id: string;
  status: string;
  clientName: string;
  eventDate?: string | null;
  createdAt?: string | null;
}

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  dueDate?: string | null;
  status: string;
}

interface DraftOrderRow {
  id: string;
  clientName: string;
  createdAt?: string | null;
}

interface DashboardData {
  today: {
    deliveries: DeliveryRow[];
    production: ProductionRow[];
  };
  thisWeek: {
    production: ProductionRow[];
    deliveries: DeliveryRow[];
  };
  needsAttention: {
    newEnquiries: EnquiryRow[];
    pendingProposals: ProposalRow[];
    overdueInvoices: InvoiceRow[];
    draftOrders: DraftOrderRow[];
  };
  onboarding: OnboardingState;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDay(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboard");
      if (!response.ok) {
        throw new Error("Failed to load dashboard");
      }
      const json = await response.json();
      setData(json);
      return json as DashboardData;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const json = await fetchDashboard();
      if (!json) return;
      // Auto-open the wizard for freshly-signed-up tenants: nothing
      // configured yet and the user hasn't already dismissed it.
      const untouched =
        !json.onboarding.hasLogo &&
        !json.onboarding.hasPricingConfigured &&
        !json.onboarding.hasTeamMember &&
        !json.onboarding.hasEnquiry;
      const dismissed =
        typeof window !== "undefined" &&
        window.localStorage.getItem(WIZARD_DISMISSED_KEY) === "1";
      if (untouched && !dismissed) {
        setWizardOpen(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWizardDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WIZARD_DISMISSED_KEY, "1");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardBody>
          <p className="text-red-800">Error: {error || "No data"}</p>
        </CardBody>
      </Card>
    );
  }

  const {
    today,
    thisWeek,
    needsAttention,
    onboarding,
  } = data;

  const nothingToday =
    today.deliveries.length === 0 && today.production.length === 0;
  const nothingThisWeek =
    thisWeek.production.length === 0 && thisWeek.deliveries.length === 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">
          Home
        </h1>
        <p className="text-gray-600 mt-1">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <OnboardingChecklist state={onboarding} />

      <OnboardingWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={fetchDashboard}
        onDismiss={handleWizardDismiss}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Today */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-serif font-semibold text-gray-900">
              Today
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Production and deliveries scheduled for today.
            </p>
          </CardHeader>
          <CardBody className="space-y-4">
            {nothingToday ? (
              <p className="text-sm text-gray-500">Nothing scheduled today.</p>
            ) : (
              <>
                {today.production.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Wrench size={16} />
                      Production
                    </div>
                    <ul className="space-y-1">
                      {today.production.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <Link
                            href={`/orders/${p.orderId}`}
                            className="text-gray-900 hover:text-[#2D6A4F]"
                          >
                            {p.clientName}
                          </Link>
                          <Badge variant="primary">
                            {p.status.replace(/_/g, " ")}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {today.deliveries.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Truck size={16} />
                      Deliveries
                    </div>
                    <ul className="space-y-1">
                      {today.deliveries.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <Link
                            href={`/orders/${d.orderId}`}
                            className="text-gray-900 hover:text-[#2D6A4F]"
                          >
                            {d.clientName}
                            {d.venue ? (
                              <span className="text-gray-500">
                                {" "}
                                &middot; {d.venue}
                              </span>
                            ) : null}
                          </Link>
                          <Badge variant="primary">{d.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>

        {/* This week */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-serif font-semibold text-gray-900">
              This week
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Events in the next 7 days.
            </p>
          </CardHeader>
          <CardBody>
            {nothingThisWeek ? (
              <p className="text-sm text-gray-500">
                Nothing scheduled this week.
              </p>
            ) : (
              <ul className="space-y-2">
                {thisWeek.production.map((p) => (
                  <li
                    key={`p-${p.id}`}
                    className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <Wrench size={14} className="text-gray-400" />
                      <Link
                        href={`/orders/${p.orderId}`}
                        className="text-gray-900 hover:text-[#2D6A4F]"
                      >
                        {p.clientName}
                      </Link>
                    </div>
                    <span className="text-gray-500">
                      {formatDay(p.eventDate)}
                    </span>
                  </li>
                ))}
                {thisWeek.deliveries.map((d) => (
                  <li
                    key={`d-${d.id}`}
                    className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-gray-400" />
                      <Link
                        href={`/orders/${d.orderId}`}
                        className="text-gray-900 hover:text-[#2D6A4F]"
                      >
                        {d.clientName}
                      </Link>
                    </div>
                    <span className="text-gray-500">
                      {formatDay(d.eventDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Needs attention */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-serif font-semibold text-gray-900">
            Needs attention
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Open items waiting on you.
          </p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FileText size={16} />
                  New enquiries
                </div>
                <span className="text-sm font-semibold text-[#1B4332]">
                  {needsAttention.newEnquiries.length}
                </span>
              </div>
              {needsAttention.newEnquiries.length === 0 ? (
                <p className="text-sm text-gray-500">All caught up.</p>
              ) : (
                <ul className="space-y-1">
                  {needsAttention.newEnquiries.slice(0, 5).map((e) => (
                    <li key={e.id} className="text-sm">
                      <Link
                        href={`/enquiries/${e.id}`}
                        className="text-gray-900 hover:text-[#2D6A4F]"
                      >
                        {e.clientName}
                      </Link>
                      {e.eventType && (
                        <span className="text-gray-500"> &middot; {e.eventType}</span>
                      )}
                      {e.eventDate && (
                        <span className="text-gray-400 text-xs ml-2">
                          {formatDate(e.eventDate)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FileCheck size={16} />
                  Pending proposals
                </div>
                <span className="text-sm font-semibold text-[#1B4332]">
                  {needsAttention.pendingProposals.length}
                </span>
              </div>
              {needsAttention.pendingProposals.length === 0 ? (
                <p className="text-sm text-gray-500">All caught up.</p>
              ) : (
                <ul className="space-y-1">
                  {needsAttention.pendingProposals.slice(0, 5).map((p) => (
                    <li key={p.id} className="text-sm flex justify-between">
                      <Link
                        href={`/proposals`}
                        className="text-gray-900 hover:text-[#2D6A4F]"
                      >
                        {p.clientName}
                      </Link>
                      <Badge variant="warning">{p.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Receipt size={16} />
                  Overdue invoices
                </div>
                <span className="text-sm font-semibold text-[#1B4332]">
                  {needsAttention.overdueInvoices.length}
                </span>
              </div>
              {needsAttention.overdueInvoices.length === 0 ? (
                <p className="text-sm text-gray-500">All caught up.</p>
              ) : (
                <ul className="space-y-1">
                  {needsAttention.overdueInvoices.slice(0, 5).map((inv) => (
                    <li key={inv.id} className="text-sm flex justify-between">
                      <Link
                        href={`/invoices`}
                        className="text-gray-900 hover:text-[#2D6A4F]"
                      >
                        {inv.invoiceNumber}
                      </Link>
                      <span className="text-gray-500">
                        £{inv.totalAmount}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <ShoppingCart size={16} />
                  Draft orders
                </div>
                <span className="text-sm font-semibold text-[#1B4332]">
                  {needsAttention.draftOrders.length}
                </span>
              </div>
              {needsAttention.draftOrders.length === 0 ? (
                <p className="text-sm text-gray-500">All caught up.</p>
              ) : (
                <ul className="space-y-1">
                  {needsAttention.draftOrders.slice(0, 5).map((o) => (
                    <li key={o.id} className="text-sm">
                      <Link
                        href={`/orders/${o.id}`}
                        className="text-gray-900 hover:text-[#2D6A4F]"
                      >
                        {o.clientName}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
