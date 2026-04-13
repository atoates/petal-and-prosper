"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Map,
  Sparkles,
  ExternalLink,
  Clock,
  MapPin,
  CheckSquare,
  Square,
  Copy,
  Check,
  Smartphone,
} from "lucide-react";

/**
 * /delivery/route-planner
 *
 * Lets florists pick a delivery date and optimise the route for all
 * deliveries that day. Uses the Google Maps Directions API (with
 * waypoint optimisation) and optionally asks Claude for scheduling
 * advice.
 */

interface Venue {
  id: string;
  name: string;
  address?: string | null;
}

interface DeliverySchedule {
  id: string;
  orderId: string;
  deliveryDate?: string | null;
  deliveryAddress?: string | null;
  venueId?: string | null;
  timeSlot?: string | null;
  status: string;
  order?: {
    enquiry?: {
      clientName: string;
    };
  };
  venue?: Venue | null;
}

interface Address {
  type: string;
  buildingName?: string;
  street: string;
  town?: string;
  city: string;
  postcode: string;
  country?: string;
}

interface OrderedStop {
  address: string;
  label?: string;
  lat?: number;
  lng?: number;
  legDistanceMiles: number;
  legDurationMinutes: number;
}

interface OptimisedRouteResult {
  orderedStops: OrderedStop[];
  totalDistanceMiles: number;
  totalDurationMinutes: number;
  waypointOrder: number[];
  mapUrl: string;
}

const statusColors: Record<
  string,
  "primary" | "success" | "warning" | "danger" | "secondary"
> = {
  pending: "warning",
  ready: "primary",
  dispatched: "primary",
  delivered: "success",
};

function formatDateForInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${Math.round(mins)} mins`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Build a Google Maps Embed API URL to show the route as an interactive
 * map. Uses the Directions mode with origin, destination (last stop),
 * and any intermediate stops as waypoints.
 */
function buildEmbedUrl(
  origin: string,
  stops: Array<{ address: string; label?: string }>
): string {
  if (stops.length === 0) return "";
  const destination = stops[stops.length - 1].address;
  const waypoints = stops.slice(0, -1).map((s) => s.address).join("|");
  const params = new URLSearchParams({
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    origin,
    destination,
    mode: "driving",
    avoid: "tolls",
  });
  if (waypoints) {
    params.append("waypoints", waypoints);
  }
  return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
}

export default function RoutePlannerPage() {
  const [allSchedules, setAllSchedules] = useState<DeliverySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    formatDateForInput(new Date())
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [startingPoint, setStartingPoint] = useState("");

  // Route result state
  const [optimising, setOptimising] = useState(false);
  const [routeResult, setRouteResult] = useState<OptimisedRouteResult | null>(
    null
  );

  // AI advice state
  const [askingAi, setAskingAi] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  // Copy link state
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyRouteLink = () => {
    if (!routeResult?.mapUrl) return;
    navigator.clipboard.writeText(routeResult.mapUrl).then(() => {
      setLinkCopied(true);
      toast.success("Route link copied to clipboard");
      setTimeout(() => setLinkCopied(false), 3000);
    });
  };

  // Fetch all deliveries and studio address on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [deliveryRes, addressRes] = await Promise.all([
          fetch("/api/delivery"),
          fetch("/api/settings/addresses"),
        ]);

        if (deliveryRes.ok) {
          setAllSchedules(await deliveryRes.json());
        }

        if (addressRes.ok) {
          const addresses: Address[] = await addressRes.json();
          const studio = addresses.find((a) => a.type === "studio");
          if (studio) {
            const parts = [
              studio.buildingName,
              studio.street,
              studio.town,
              studio.city,
              studio.postcode,
            ].filter(Boolean);
            const addr = parts.join(", ");
            setStartingPoint(addr);
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
        toast.error("Failed to load delivery data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter deliveries by selected date
  const daySchedules = useMemo(() => {
    return allSchedules.filter((s) => {
      if (!s.deliveryDate) return false;
      const d = new Date(s.deliveryDate).toISOString().slice(0, 10);
      return d === selectedDate;
    });
  }, [allSchedules, selectedDate]);

  // Reset selections when date changes
  useEffect(() => {
    setSelectedIds(new Set());
    setRouteResult(null);
    setAiAdvice(null);
  }, [selectedDate]);

  const selectedSchedules = useMemo(
    () => daySchedules.filter((s) => selectedIds.has(s.id)),
    [daySchedules, selectedIds]
  );

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(daySchedules.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const getAddress = (s: DeliverySchedule): string => {
    return s.deliveryAddress || s.venue?.address || "";
  };

  const getClientName = (s: DeliverySchedule): string => {
    return s.order?.enquiry?.clientName || "Unknown client";
  };

  // Optimise route via Google Maps
  const handleOptimise = async () => {
    if (selectedSchedules.length < 2) {
      toast.error("Select at least 2 deliveries to optimise a route");
      return;
    }
    if (!startingPoint.trim()) {
      toast.error(
        "Please enter a starting point address above."
      );
      return;
    }

    setOptimising(true);
    setRouteResult(null);

    try {
      const stops = selectedSchedules.map((s) => ({
        address: getAddress(s),
        label: getClientName(s),
      }));

      const res = await fetch("/api/maps/optimise-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: startingPoint.trim(), stops }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to optimise route");
      }

      const result: OptimisedRouteResult = await res.json();
      setRouteResult(result);
      toast.success("Route optimised");
    } catch (err) {
      console.error("Route optimisation error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to optimise route"
      );
    } finally {
      setOptimising(false);
    }
  };

  // Ask Claude for delivery advice
  const handleAskAi = async () => {
    if (selectedSchedules.length === 0) {
      toast.error("Select at least one delivery first");
      return;
    }

    setAskingAi(true);
    setAiAdvice(null);

    try {
      const deliveries = selectedSchedules.map((s) => ({
        address: getAddress(s),
        clientName: getClientName(s),
        timeWindow: s.timeSlot || undefined,
      }));

      const res = await fetch("/api/ai/suggest-delivery-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveries }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get AI advice");
      }

      const { suggestion } = await res.json();
      setAiAdvice(suggestion);
    } catch (err) {
      console.error("AI advice error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to get AI advice"
      );
    } finally {
      setAskingAi(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">
            Route Planner
          </h1>
          <p className="text-gray-600 mt-1">
            Plan the most efficient delivery route for the day
          </p>
        </div>
        <Link href="/delivery">
          <Button variant="outline" type="button">
            <ArrowLeft size={18} className="mr-2" />
            Back to Delivery
          </Button>
        </Link>
      </div>

      {/* Settings: date and starting point */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Delivery date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent text-sm"
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {daySchedules.length} delivery
                {daySchedules.length !== 1 ? "ies" : "y"}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-1">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap flex items-center gap-1.5">
                <MapPin size={14} className="text-[#1B4332]" />
                Starting point
              </label>
              <input
                type="text"
                value={startingPoint}
                onChange={(e) => setStartingPoint(e.target.value)}
                placeholder="Enter starting address..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent text-sm"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-[#1B4332]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: delivery list */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-serif font-semibold text-gray-900">
                Deliveries
              </h2>
              {daySchedules.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-[#1B4332] hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Deselect all
                  </button>
                </div>
              )}
            </div>

            {daySchedules.length === 0 ? (
              <Card>
                <CardBody>
                  <p className="text-center text-gray-500 py-8">
                    No deliveries scheduled for this date
                  </p>
                </CardBody>
              </Card>
            ) : (
              daySchedules.map((schedule) => {
                const isSelected = selectedIds.has(schedule.id);
                return (
                  <button
                    key={schedule.id}
                    type="button"
                    onClick={() => toggleSelection(schedule.id)}
                    className={`w-full text-left border rounded-lg p-4 transition-colors ${
                      isSelected
                        ? "bg-sage-50 border-[#1B4332]"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isSelected ? (
                          <CheckSquare
                            size={18}
                            className="text-[#1B4332]"
                          />
                        ) : (
                          <Square size={18} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {getClientName(schedule)}
                          </p>
                          <Badge
                            variant={
                              statusColors[schedule.status] || "secondary"
                            }
                          >
                            {schedule.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          <MapPin size={12} />
                          <span className="truncate">
                            {schedule.venue?.name ||
                              schedule.deliveryAddress ||
                              "No address"}
                          </span>
                        </div>
                        {schedule.timeSlot && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={12} />
                            <span>{schedule.timeSlot}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right panel: route results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                type="button"
                onClick={handleOptimise}
                disabled={optimising || selectedSchedules.length < 2}
              >
                {optimising ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Optimising...
                  </>
                ) : (
                  <>
                    <Map size={18} className="mr-2" />
                    Optimise Route
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={handleAskAi}
                disabled={askingAi || selectedSchedules.length === 0}
              >
                {askingAi ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="mr-2" />
                    Ask AI for Advice
                  </>
                )}
              </Button>
            </div>

            {/* Route results */}
            {!routeResult && !aiAdvice && (
              <Card>
                <CardBody>
                  <div className="text-center py-12 text-gray-500">
                    <Map size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-1">
                      Plan your delivery route
                    </p>
                    <p className="text-sm">
                      Select deliveries on the left and click
                      &ldquo;Optimise Route&rdquo; to find the most efficient
                      order.
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}

            {routeResult && (
              <>
                {/* Embedded Google Map */}
                <Card className="overflow-hidden">
                  <div className="relative w-full" style={{ height: 420 }}>
                    <iframe
                      title="Route map"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={buildEmbedUrl(startingPoint, routeResult.orderedStops)}
                      allowFullScreen
                    />
                  </div>
                </Card>

                <Card>
                  <CardBody>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <h3 className="text-lg font-serif font-semibold text-gray-900">
                        Optimised Route
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyRouteLink}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded-lg transition-colors font-medium"
                          title="Copy route link to send to your device"
                        >
                          {linkCopied ? (
                            <>
                              <Check size={14} className="text-green-600" />
                              <span className="text-green-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Smartphone size={14} />
                              Send to device
                            </>
                          )}
                        </button>
                        <a
                          href={routeResult.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#1B4332] hover:bg-sage-50 rounded-lg transition-colors font-medium"
                        >
                          Open in Maps
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>

                    {/* Start point */}
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                      <div className="w-8 h-8 rounded-full bg-[#1B4332] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        S
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Start
                        </p>
                        <p className="text-xs text-gray-500">
                          {startingPoint}
                        </p>
                      </div>
                    </div>

                    {/* Ordered stops */}
                    <div className="space-y-3">
                      {routeResult.orderedStops.map((stop, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-sage-100 text-[#1B4332] flex items-center justify-center text-xs font-bold shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {stop.label || `Stop ${idx + 1}`}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {stop.address}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              <span>
                                {stop.legDistanceMiles.toFixed(1)} miles
                              </span>
                              <span>
                                {formatDuration(stop.legDurationMinutes)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Total:</span>{" "}
                        {routeResult.totalDistanceMiles.toFixed(1)} miles,{" "}
                        {formatDuration(routeResult.totalDurationMinutes)}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </>
            )}

            {/* AI advice */}
            {aiAdvice && (
              <Card className="border-blue-200 bg-blue-50">
                <CardBody>
                  <div className="flex items-start gap-3">
                    <Sparkles
                      size={20}
                      className="text-blue-600 shrink-0 mt-0.5"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">
                        AI Delivery Advice
                      </h4>
                      <div className="text-sm text-blue-800 whitespace-pre-wrap">
                        {aiAdvice}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
