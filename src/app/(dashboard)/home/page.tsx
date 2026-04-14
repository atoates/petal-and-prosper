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
import {
  formatUkDate,
  UK_DATE_LONG,
  UK_DATE_WEEKDAY_SHORT,
} from "@/lib/format-date";

const WIZARD_DISMISSED_KEY = "pp.onboardingWizardDismissed";

interface DeliveryRow {
  id: string;
  orderId: string;
  status: string;
  clientName: string;
  venue?: string | null;
  deliveryDate?: string | null;
}

interface ProductionRow {
  id: string;
  orderId: string;
  status: string;
  clientName: string;
  productionDate?: string | null;
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
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-sage-200 border-t-dark-green"></div>
          <p className="mt-4 text-sm text-gray-500">Loading your dashboard...</p>
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

  const attentionCards: Array<{
    title: string;
    icon: typeof FileText;
    count: number;
    colour: string;
    items: Array<{ id: string; href: string; label: string; detail?: string; badge?: string }>;
  }> = [
    {
      title: "New enquiries",
      icon: FileText,
      count: needsAttention.newEnquiries.length,
      colour: "text-blue-600 bg-blue-50",
      items: needsAttention.newEnquiries.slice(0, 5).map((e) => ({
        id: e.id,
        href: `/enquiries/${e.id}`,
        label: e.clientName,
        detail: [e.eventType, e.eventDate ? formatUkDate(e.eventDate) : null]
          .filter(Boolean)
          .join(" · "),
      })),
    },
    {
      title: "Pending proposals",
      icon: FileCheck,
      count: needsAttention.pendingProposals.length,
      colour: "text-amber-600 bg-amber-50",
      items: needsAttention.pendingProposals.slice(0, 5).map((p) => ({
        id: p.id,
        href: "/proposals",
        label: p.clientName,
        badge: p.status,
      })),
    },
    {
      title: "Overdue invoices",
      icon: Receipt,
      count: needsAttention.overdueInvoices.length,
      colour: "text-red-600 bg-red-50",
      items: needsAttention.overdueInvoices.slice(0, 5).map((inv) => ({
        id: inv.id,
        href: "/invoices",
        label: inv.invoiceNumber,
        detail: `£${inv.totalAmount}`,
      })),
    },
    {
      title: "Draft orders",
      icon: ShoppingCart,
      count: needsAttention.draftOrders.length,
      colour: "text-sage-700 bg-sage-50",
      items: needsAttention.draftOrders.slice(0, 5).map((o) => ({
        id: o.id,
        href: `/orders/${o.id}`,
        label: o.clientName,
      })),
    },
  ];

  return (
    <div className="stagger-children">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 tracking-tight">
          Good{" "}
          {new Date().getHours() < 12
            ? "morning"
            : new Date().getHours() < 18
            ? "afternoon"
            : "evening"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {formatUkDate(new Date(), UK_DATE_LONG)}
        </p>
      </div>

      <OnboardingChecklist state={onboarding} />

      <OnboardingWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={fetchDashboard}
        onDismiss={handleWizardDismiss}
      />

      {/* Today + This Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Wrench size={16} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 tracking-tight">
                  Today
                </h2>
                <p className="text-xs text-gray-500">
                  Production &amp; deliveries
                </p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {nothingToday ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Nothing scheduled for today.
              </p>
            ) : (
              <>
                {today.production.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-2">
                      Production
                    </p>
                    <ul className="space-y-2">
                      {today.production.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between"
                        >
                          <Link
                            href={`/orders/${p.orderId}`}
                            className="text-sm text-gray-800 hover:text-dark-green transition-colors font-medium"
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
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-2">
                      Deliveries
                    </p>
                    <ul className="space-y-2">
                      {today.deliveries.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between"
                        >
                          <Link
                            href={`/orders/${d.orderId}`}
                            className="text-sm text-gray-800 hover:text-dark-green transition-colors font-medium"
                          >
                            {d.clientName}
                            {d.venue && (
                              <span className="text-gray-400 font-normal">
                                {" "}
                                &middot; {d.venue}
                              </span>
                            )}
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Truck size={16} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 tracking-tight">
                  This week
                </h2>
                <p className="text-xs text-gray-500">Next 7 days</p>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {nothingThisWeek ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Nothing scheduled this week.
              </p>
            ) : (
              <ul className="space-y-0 divide-y divide-gray-100">
                {thisWeek.production.map((p) => (
                  <li
                    key={`p-${p.id}`}
                    className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                        <Wrench size={12} className="text-gray-500" />
                      </div>
                      <Link
                        href={`/orders/${p.orderId}`}
                        className="text-sm text-gray-800 hover:text-dark-green transition-colors font-medium"
                      >
                        {p.clientName}
                      </Link>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatUkDate(p.productionDate, UK_DATE_WEEKDAY_SHORT)}
                    </span>
                  </li>
                ))}
                {thisWeek.deliveries.map((d) => (
                  <li
                    key={`d-${d.id}`}
                    className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                        <Truck size={12} className="text-gray-500" />
                      </div>
                      <Link
                        href={`/orders/${d.orderId}`}
                        className="text-sm text-gray-800 hover:text-dark-green transition-colors font-medium"
                      >
                        {d.clientName}
                      </Link>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatUkDate(d.deliveryDate, UK_DATE_WEEKDAY_SHORT)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Needs attention */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 tracking-tight mb-4">
          Needs attention
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {attentionCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="overflow-hidden">
                <CardBody className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.colour}`}
                      >
                        <Icon size={15} />
                      </div>
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {card.title}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-gray-900 tabular-nums">
                      {card.count}
                    </span>
                  </div>
                  {card.count === 0 ? (
                    <p className="text-xs text-gray-400">All caught up.</p>
                  ) : (
                    <ul className="space-y-2">
                      {card.items.map((item) => (
                        <li key={item.id} className="text-sm">
                          <Link
                            href={item.href}
                            className="text-gray-700 hover:text-dark-green transition-colors font-medium"
                          >
                            {item.label}
                          </Link>
                          {item.detail && (
                            <span className="text-xs text-gray-400 ml-1.5">
                              {item.detail}
                            </span>
                          )}
                          {item.badge && (
                            <Badge variant="warning" className="ml-2">
                              {item.badge}
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
