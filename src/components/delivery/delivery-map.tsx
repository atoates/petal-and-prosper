"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import {
  loadGoogleMaps,
  getGoogleMapsApiKey,
  onGoogleMapsAuthFailure,
} from "@/lib/google-maps-loader";
import { formatUkDate } from "@/lib/format-date";

interface DeliveryPin {
  id: string;
  address: string;
  clientName: string;
  venueName?: string;
  date?: string;
  timeSlot?: string;
  status: string;
  driverName?: string;
}

interface DeliveryMapProps {
  deliveries: DeliveryPin[];
}

/**
 * Renders an interactive Google Map with a marker for each delivery.
 * Uses the Maps JavaScript API loaded via a script tag. Each marker
 * opens an info window showing order details on click.
 *
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to be set.
 */
export function DeliveryMap({ deliveries }: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiKey = getGoogleMapsApiKey();

  // Subscribe to auth failures from the shared loader so that a bad
  // API key / disabled Places API surfaces a useful message instead of
  // the grey "Sorry! Something went wrong" overlay.
  useEffect(() => {
    return onGoogleMapsAuthFailure((msg) => {
      setError(msg);
      setLoading(false);
    });
  }, []);

  // Geocode an address and return lat/lng
  const geocode = async (
    address: string
  ): Promise<{ lat: number; lng: number } | null> => {
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address });
      if (result.results.length > 0) {
        const loc = result.results[0].geometry.location;
        return { lat: loc.lat(), lng: loc.lng() };
      }
      return null;
    } catch {
      return null;
    }
  };

  // Format the status for display
  const formatStatus = (status: string) =>
    status
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const statusColour = (status: string): string => {
    switch (status) {
      case "delivered":
        return "#16a34a";
      case "dispatched":
        return "#1B4332";
      case "ready":
        return "#2563eb";
      default:
        return "#d97706";
    }
  };

  // Build and render markers
  useEffect(() => {
    if (!apiKey) {
      setError("Google Maps API key not configured");
      setLoading(false);
      return;
    }

    if (deliveries.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        await loadGoogleMaps();
        if (cancelled) return;

        // Initialise map centred on the UK
        if (!mapInstanceRef.current && mapRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            zoom: 7,
            center: { lat: 52.5, lng: -1.5 },
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
              {
                featureType: "poi.business",
                stylers: [{ visibility: "off" }],
              },
              {
                featureType: "transit",
                elementType: "labels.icon",
                stylers: [{ visibility: "off" }],
              },
              {
                featureType: "road",
                elementType: "labels.icon",
                stylers: [{ visibility: "off" }],
              },
              {
                featureType: "water",
                elementType: "geometry.fill",
                stylers: [{ color: "#d4e6f1" }],
              },
              {
                featureType: "landscape.natural",
                elementType: "geometry.fill",
                stylers: [{ color: "#f0f4e8" }],
              },
            ],
          });
          infoWindowRef.current = new google.maps.InfoWindow();
        }

        const map = mapInstanceRef.current;
        if (!map) return;

        // Clear existing markers
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

        const bounds = new google.maps.LatLngBounds();
        let hasValidMarker = false;

        // Geocode each delivery and place a marker
        await Promise.allSettled(
          deliveries.map(async (delivery) => {
            const pos = await geocode(delivery.address);
            if (!pos || cancelled) return null;

            hasValidMarker = true;
            bounds.extend(pos);

            const marker = new google.maps.Marker({
              position: pos,
              map,
              title: delivery.clientName,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: statusColour(delivery.status),
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              },
            });

            // Info window content
            const dateStr = delivery.date ? formatUkDate(delivery.date, undefined, "") : "";

            const content = `
              <div style="font-family: system-ui, sans-serif; min-width: 200px; max-width: 280px;">
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #111827;">
                  ${delivery.clientName}
                </div>
                ${
                  delivery.venueName
                    ? `<div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">${delivery.venueName}</div>`
                    : ""
                }
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
                  ${delivery.address}
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; font-size: 12px; margin-bottom: 6px;">
                  ${dateStr ? `<span style="color: #374151;">${dateStr}</span>` : ""}
                  ${delivery.timeSlot ? `<span style="color: #374151;">${delivery.timeSlot}</span>` : ""}
                </div>
                <div style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: 500; color: white; background-color: ${statusColour(delivery.status)};">
                    ${formatStatus(delivery.status)}
                  </span>
                  ${
                    delivery.driverName
                      ? `<span style="color: #6b7280;">Driver: ${delivery.driverName}</span>`
                      : ""
                  }
                </div>
              </div>
            `;

            marker.addListener("click", () => {
              infoWindowRef.current?.setContent(content);
              infoWindowRef.current?.open(map, marker);
            });

            markersRef.current.push(marker);
            return pos;
          })
        );

        if (cancelled) return;

        // Fit map to marker bounds
        if (hasValidMarker) {
          map.fitBounds(bounds);
          // Don't zoom in too far for a single marker
          const listener = google.maps.event.addListener(
            map,
            "idle",
            () => {
              if ((map.getZoom() ?? 0) > 14) {
                map.setZoom(14);
              }
              google.maps.event.removeListener(listener);
            }
          );
        }

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load map"
          );
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveries, apiKey]);

  if (!apiKey) {
    return null;
  }

  if (deliveries.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        {/* Map container */}
        <div ref={mapRef} style={{ height: 400, width: "100%" }} />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="text-center">
              <Loader2
                size={24}
                className="animate-spin text-[#1B4332] mx-auto mb-2"
              />
              <p className="text-sm text-gray-500">
                Loading delivery locations...
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 bg-white flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MapPin size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Legend */}
        {!loading && !error && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: "#d97706" }}
                />
                <span className="text-gray-600">Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: "#2563eb" }}
                />
                <span className="text-gray-600">Ready</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: "#1B4332" }}
                />
                <span className="text-gray-600">Dispatched</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: "#16a34a" }}
                />
                <span className="text-gray-600">Delivered</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
