"use client";

import { notFound } from "next/navigation";
import toast from "react-hot-toast";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { featureFlags } from "@/lib/feature-flags";
import { formatUkDate } from "@/lib/format-date";

export default function SubscriptionPage() {
  // Billing UI is a placeholder until the payments integration lands.
  // Gate it behind NEXT_PUBLIC_FEATURE_SUBSCRIPTION so customers don't
  // see features they can't actually use.
  if (!featureFlags.subscriptionBilling) {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Subscription & Billing</h1>
        <p className="text-gray-600 mt-1">Manage your subscription and billing</p>
      </div>

      {/* Current Plan */}
      <Card className="mb-8">
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
        </CardHeader>
        <CardBody>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Growth Plan</h3>
              <p className="text-gray-600 mb-4">
                Up to 500 orders per month with all core features
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-light-green" size={20} />
                  <span>Advanced enquiry management</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-light-green" size={20} />
                  <span>Full order and proposal features</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-light-green" size={20} />
                  <span>Priority email support</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-light-green" size={20} />
                  <span>Custom pricing settings</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900 mb-2">£79</div>
              <div className="text-gray-600 mb-4">/month</div>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
        </CardBody>
        <CardFooter className="space-x-4">
          <Button variant="outline" onClick={() => toast("Plan management will be available once billing integration is set up.")}>Change Plan</Button>
          <Button variant="outline" onClick={() => toast("Subscription cancellation will be available once billing integration is set up.")}>Cancel Subscription</Button>
        </CardFooter>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Billing History</h2>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900"></th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatUkDate(new Date())}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    Growth Plan - Monthly
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    £79.00
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant="success">Paid</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => toast("Invoice downloads will be available once billing integration is set up.")}
                      className="text-primary-green hover:text-light-green font-medium"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
