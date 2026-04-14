"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { formatUkDate } from "@/lib/format-date";

/**
 * /delivery/[id]/travel-costs
 *
 * Travel Cost Calculator page. Calculates delivery and collection costs
 * based on configurable rates from the settings. Allows manual override
 * for either leg of the journey.
 */

interface DeliverySchedule {
  id: string;
  orderId: string;
  deliveryDate?: string | null;
  deliveryAddress?: string | null;
  venueId?: string | null;
  order?: {
    enquiry?: {
      clientName: string;
      eventType?: string;
      eventDate?: string;
    };
    venue?: {
      name: string;
      address?: string;
    };
  };
  venue?: {
    name: string;
    address?: string;
  };
}

interface PriceSettings {
  fuelCostPerLitre: number;
  milesPerGallon: number;
  staffCostPerHour: number;
  staffMargin: number;
}

interface TravelCostsData {
  setupVehicles: number;
  setupDistanceMiles: number;
  setupStaff: number;
  setupTravelTimeMins: number;
  setupTimeOnSiteMins: number;
  setupCostCalculated: string;
  setupCostManual: string | null;
  useManualSetupCost: boolean;

  collectionVehicles: number;
  collectionDistanceMiles: number;
  collectionStaff: number;
  collectionTravelTimeMins: number;
  collectionTimeOnSiteMins: number;
  collectionCostCalculated: string;
  collectionCostManual: string | null;
  useManualCollectionCost: boolean;
}

interface Address {
  id: string;
  type: string;
  buildingName?: string;
  street?: string;
  town?: string;
  city?: string;
  postcode?: string;
}

function formatCurrency(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "0.00";
  return num.toFixed(2);
}

function calculateCost(
  distanceMiles: number,
  vehicles: number,
  travelTimeMins: number,
  timeOnSiteMins: number,
  staffCount: number,
  settings: PriceSettings
): string {
  const fuelCostPerMile =
    (settings.fuelCostPerLitre * 4.546) / settings.milesPerGallon;
  const vehicleCost = distanceMiles * fuelCostPerMile * vehicles;
  const staffCost =
    ((travelTimeMins + timeOnSiteMins) / 60) *
    settings.staffCostPerHour *
    settings.staffMargin *
    staffCount;
  return (vehicleCost + staffCost).toFixed(2);
}

function buildAddressString(address: Address): string {
  const parts = [
    address.buildingName,
    address.street,
    address.town,
    address.city,
    address.postcode,
  ].filter(Boolean);
  return parts.join(", ");
}

export default function TravelCostCalculatorPage() {
  const router = useRouter();
  const params = useParams();
  const deliveryId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [delivery, setDelivery] = useState<DeliverySchedule | null>(null);
  const [settings, setSettings] = useState<PriceSettings | null>(null);
  const [travelCosts, setTravelCosts] = useState<TravelCostsData>({
    setupVehicles: 1,
    setupDistanceMiles: 0,
    setupStaff: 0,
    setupTravelTimeMins: 0,
    setupTimeOnSiteMins: 0,
    setupCostCalculated: "0.00",
    setupCostManual: null,
    useManualSetupCost: false,

    collectionVehicles: 1,
    collectionDistanceMiles: 0,
    collectionStaff: 0,
    collectionTravelTimeMins: 0,
    collectionTimeOnSiteMins: 0,
    collectionCostCalculated: "0.00",
    collectionCostManual: null,
    useManualCollectionCost: false,
  });

  const [studioAddress, setStudioAddress] = useState<Address | null>(null);
  const [venueAddress, setVenueAddress] = useState<string>("");
  const [lookingUpDistance, setLookingUpDistance] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          deliveryRes,
          settingsRes,
          costsRes,
          addressesRes,
        ] = await Promise.all([
          fetch(`/api/delivery`),
          fetch(`/api/settings/pricing`),
          fetch(`/api/delivery/${deliveryId}/travel-costs`),
          fetch(`/api/settings/addresses`),
        ]);

        if (!deliveryRes.ok) {
          throw new Error("Failed to load delivery schedule");
        }
        const deliveries = await deliveryRes.json();
        const current = deliveries.find((d: DeliverySchedule) => d.id === deliveryId);
        if (!current) {
          throw new Error("Delivery schedule not found");
        }
        setDelivery(current);

        if (!settingsRes.ok) {
          throw new Error("Failed to load pricing settings");
        }
        const pricingSettings = await settingsRes.json();
        setSettings(pricingSettings);

        if (costsRes.ok) {
          const costs = await costsRes.json();
          setTravelCosts(costs);
        }

        if (addressesRes.ok) {
          const addrs = await addressesRes.json();
          const studio = addrs.find((a: Address) => a.type === "studio");
          setStudioAddress(studio || null);
        }

        // Determine venue address for display
        const addr =
          current.venue?.address ||
          current.order?.venue?.address ||
          current.deliveryAddress ||
          "";
        setVenueAddress(addr);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [deliveryId]);

  // Auto-calculate costs when inputs change
  useEffect(() => {
    if (!settings) return;

    const setupCalculated = calculateCost(
      travelCosts.setupDistanceMiles,
      travelCosts.setupVehicles,
      travelCosts.setupTravelTimeMins,
      travelCosts.setupTimeOnSiteMins,
      travelCosts.setupStaff,
      settings
    );

    const collectionCalculated = calculateCost(
      travelCosts.collectionDistanceMiles,
      travelCosts.collectionVehicles,
      travelCosts.collectionTravelTimeMins,
      travelCosts.collectionTimeOnSiteMins,
      travelCosts.collectionStaff,
      settings
    );

    setTravelCosts((prev) => ({
      ...prev,
      setupCostCalculated: setupCalculated,
      collectionCostCalculated: collectionCalculated,
    }));
  }, [
    travelCosts.setupDistanceMiles,
    travelCosts.setupVehicles,
    travelCosts.setupTravelTimeMins,
    travelCosts.setupTimeOnSiteMins,
    travelCosts.setupStaff,
    travelCosts.collectionDistanceMiles,
    travelCosts.collectionVehicles,
    travelCosts.collectionTravelTimeMins,
    travelCosts.collectionTimeOnSiteMins,
    travelCosts.collectionStaff,
    settings,
  ]);

  const handleInputChange = (
    field: keyof TravelCostsData,
    value: string | number | boolean
  ) => {
    setTravelCosts((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const totalDeliveryCost = (
    parseFloat(
      travelCosts.useManualSetupCost
        ? travelCosts.setupCostManual || "0"
        : travelCosts.setupCostCalculated
    ) +
    parseFloat(
      travelCosts.useManualCollectionCost
        ? travelCosts.collectionCostManual || "0"
        : travelCosts.collectionCostCalculated
    )
  ).toFixed(2);

  const handleLookupDistance = async (section: "setup" | "collection") => {
    if (!studioAddress || !venueAddress) {
      toast.error("Studio or venue address not available");
      return;
    }

    try {
      setLookingUpDistance(true);
      const studioAddr = buildAddressString(studioAddress);

      const response = await fetch("/api/maps/distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: studioAddr,
          destination: venueAddress,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to calculate distance");
      }

      const result = await response.json();

      if (section === "setup") {
        handleInputChange("setupDistanceMiles", result.distanceMiles || 0);
        handleInputChange("setupTravelTimeMins", result.durationMins || 0);
      } else {
        handleInputChange("collectionDistanceMiles", result.distanceMiles || 0);
        handleInputChange("collectionTravelTimeMins", result.durationMins || 0);
      }

      toast.success("Distance and time updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to lookup distance");
    } finally {
      setLookingUpDistance(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        setupVehicles: travelCosts.setupVehicles,
        setupDistanceMiles: travelCosts.setupDistanceMiles,
        setupStaff: travelCosts.setupStaff,
        setupTravelTimeMins: travelCosts.setupTravelTimeMins,
        setupTimeOnSiteMins: travelCosts.setupTimeOnSiteMins,
        setupCostCalculated: travelCosts.setupCostCalculated,
        setupCostManual: travelCosts.setupCostManual,
        useManualSetupCost: travelCosts.useManualSetupCost,

        collectionVehicles: travelCosts.collectionVehicles,
        collectionDistanceMiles: travelCosts.collectionDistanceMiles,
        collectionStaff: travelCosts.collectionStaff,
        collectionTravelTimeMins: travelCosts.collectionTravelTimeMins,
        collectionTimeOnSiteMins: travelCosts.collectionTimeOnSiteMins,
        collectionCostCalculated: travelCosts.collectionCostCalculated,
        collectionCostManual: travelCosts.collectionCostManual,
        useManualCollectionCost: travelCosts.useManualCollectionCost,
      };

      const response = await fetch(`/api/delivery/${deliveryId}/travel-costs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save travel costs");
      }

      toast.success("Travel costs saved");
      router.push("/delivery");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error("Failed to save travel costs");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]"></div>
          <p className="mt-4 text-gray-600">Loading travel cost calculator...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Link
          href="/delivery"
          className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-sage-100 text-[#1B4332] hover:bg-sage-200 transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </Link>
        <Card className="bg-red-50 border-red-200">
          <CardBody>
            <p className="text-red-800">Error: {error}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!delivery || !settings) {
    return (
      <div>
        <Link
          href="/delivery"
          className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-sage-100 text-[#1B4332] hover:bg-sage-200 transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </Link>
        <Card>
          <CardBody>
            <p className="text-gray-600">Data not available</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const clientName =
    delivery.order?.enquiry?.clientName || "Unknown Client";
  const eventType =
    delivery.order?.enquiry?.eventType || "Unknown Event";
  const venueName =
    delivery.venue?.name ||
    delivery.order?.venue?.name ||
    "Unknown Venue";
  const rawEventOrDeliveryDate =
    delivery.order?.enquiry?.eventDate ?? delivery.deliveryDate ?? null;
  const formattedDate = formatUkDate(
    rawEventOrDeliveryDate,
    undefined,
    "Unknown Date"
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">
            Travel Cost Calculator
          </h1>
          <div className="mt-2 text-sm text-gray-600 space-y-1">
            <p>Client: {clientName}</p>
            <p>Event: {eventType} at {venueName}</p>
            <p>Date: {formattedDate}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href="/delivery"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sage-100 text-[#1B4332] hover:bg-sage-200 transition-colors"
          >
            <ArrowLeft size={18} />
            Back
          </Link>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total Delivery Cost</p>
            <p className="text-2xl font-bold text-[#1B4332]">
              £{totalDeliveryCost}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardBody>
            <p className="text-red-800">{error}</p>
          </CardBody>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section 1: Travel & Set Up Cost */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardBody>
              <h2 className="text-lg font-serif font-bold text-gray-900 mb-4">
                Travel & Set Up Cost
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Vehicles
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={travelCosts.setupVehicles}
                    onChange={(e) =>
                      handleInputChange("setupVehicles", parseInt(e.target.value) || 0)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Distance to Venue Rtn
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={travelCosts.setupDistanceMiles}
                      onChange={(e) =>
                        handleInputChange("setupDistanceMiles", parseFloat(e.target.value) || 0)
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                    />
                    <span className="flex items-center text-gray-600">miles</span>
                  </div>
                  {studioAddress && venueAddress && (
                    <button
                      type="button"
                      onClick={() => handleLookupDistance("setup")}
                      disabled={lookingUpDistance}
                      className="mt-2 text-xs text-[#1B4332] hover:underline disabled:opacity-50"
                    >
                      {lookingUpDistance ? "Looking up..." : "Look up distance"}
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Staff
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={travelCosts.setupStaff}
                    onChange={(e) =>
                      handleInputChange("setupStaff", parseInt(e.target.value) || 0)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Travel Time Rtn
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={travelCosts.setupTravelTimeMins}
                      onChange={(e) =>
                        handleInputChange("setupTravelTimeMins", parseInt(e.target.value) || 0)
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                    />
                    <span className="flex items-center text-gray-600">mins</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time on Site
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={travelCosts.setupTimeOnSiteMins}
                      onChange={(e) =>
                        handleInputChange("setupTimeOnSiteMins", parseInt(e.target.value) || 0)
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                    />
                    <span className="flex items-center text-gray-600">mins</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="text-lg font-serif font-bold text-gray-900 mb-4">
                Delivery & Set Up Cost
              </h2>
              <div className="space-y-4">
                {/* Calculated cost option */}
                <div className="p-4 border-2 border-gray-300 rounded-lg bg-white hover:border-[#1B4332] transition-colors cursor-pointer"
                  onClick={() =>
                    handleInputChange("useManualSetupCost", false)
                  }
                >
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="setupCostOption"
                      checked={!travelCosts.useManualSetupCost}
                      onChange={() =>
                        handleInputChange("useManualSetupCost", false)
                      }
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        Calculated cost
                      </p>
                      <p className="text-2xl font-bold text-[#1B4332]">
                        £{formatCurrency(travelCosts.setupCostCalculated)}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Manual cost option */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Set Delivery Fee Yourself
                  </p>
                  <div className="p-4 border-2 border-gray-300 rounded-lg bg-white hover:border-[#1B4332] transition-colors"
                    onClick={() =>
                      handleInputChange("useManualSetupCost", true)
                    }
                  >
                    <label className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="setupCostOption"
                        checked={travelCosts.useManualSetupCost}
                        onChange={() =>
                          handleInputChange("useManualSetupCost", true)
                        }
                        className="w-4 h-4"
                      />
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-gray-600">£</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={travelCosts.setupCostManual || ""}
                          onChange={(e) =>
                            handleInputChange("setupCostManual", e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                          placeholder="0.00"
                          className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                        />
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Section 2: Travel & Collection Cost */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardBody>
              <h2 className="text-lg font-serif font-bold text-gray-900 mb-4">
                Travel & Collection Cost
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Vehicles
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={travelCosts.collectionVehicles}
                    onChange={(e) =>
                      handleInputChange("collectionVehicles", parseInt(e.target.value) || 0)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Distance to Venue Rtn
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={travelCosts.collectionDistanceMiles}
                      onChange={(e) =>
                        handleInputChange("collectionDistanceMiles", parseFloat(e.target.value) || 0)
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                    />
                    <span className="flex items-center text-gray-600">miles</span>
                  </div>
                  {studioAddress && venueAddress && (
                    <button
                      type="button"
                      onClick={() => handleLookupDistance("collection")}
                      disabled={lookingUpDistance}
                      className="mt-2 text-xs text-[#1B4332] hover:underline disabled:opacity-50"
                    >
                      {lookingUpDistance ? "Looking up..." : "Look up distance"}
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Staff
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={travelCosts.collectionStaff}
                    onChange={(e) =>
                      handleInputChange("collectionStaff", parseInt(e.target.value) || 0)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Travel Time Rtn
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={travelCosts.collectionTravelTimeMins}
                      onChange={(e) =>
                        handleInputChange("collectionTravelTimeMins", parseInt(e.target.value) || 0)
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                    />
                    <span className="flex items-center text-gray-600">mins</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time on Site
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={travelCosts.collectionTimeOnSiteMins}
                      onChange={(e) =>
                        handleInputChange("collectionTimeOnSiteMins", parseInt(e.target.value) || 0)
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                    />
                    <span className="flex items-center text-gray-600">mins</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="text-lg font-serif font-bold text-gray-900 mb-4">
                Collection & Teardown Cost
              </h2>
              <div className="space-y-4">
                {/* Calculated cost option */}
                <div className="p-4 border-2 border-gray-300 rounded-lg bg-white hover:border-[#1B4332] transition-colors cursor-pointer"
                  onClick={() =>
                    handleInputChange("useManualCollectionCost", false)
                  }
                >
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="collectionCostOption"
                      checked={!travelCosts.useManualCollectionCost}
                      onChange={() =>
                        handleInputChange("useManualCollectionCost", false)
                      }
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        Calculated cost
                      </p>
                      <p className="text-2xl font-bold text-[#1B4332]">
                        £{formatCurrency(travelCosts.collectionCostCalculated)}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Manual cost option */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Set Collection Fee Yourself
                  </p>
                  <div className="p-4 border-2 border-gray-300 rounded-lg bg-white hover:border-[#1B4332] transition-colors"
                    onClick={() =>
                      handleInputChange("useManualCollectionCost", true)
                    }
                  >
                    <label className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="collectionCostOption"
                        checked={travelCosts.useManualCollectionCost}
                        onChange={() =>
                          handleInputChange("useManualCollectionCost", true)
                        }
                        className="w-4 h-4"
                      />
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-gray-600">£</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={travelCosts.collectionCostManual || ""}
                          onChange={(e) =>
                            handleInputChange("collectionCostManual", e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                          placeholder="0.00"
                          className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                        />
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex justify-center">
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="px-8"
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save & Next"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
