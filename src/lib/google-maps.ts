/**
 * Server-side Google Maps utility module
 * Provides geocoding, distance matrix, and route optimisation functions
 */

export interface DistanceResult {
  distanceMiles: number;
  durationMinutes: number;
  distanceText: string;
  durationText: string;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface RouteStop {
  address: string;
  lat?: number;
  lng?: number;
  label?: string; // e.g. client name
}

export interface OptimisedRoute {
  orderedStops: Array<RouteStop & { legDistanceMiles: number; legDurationMinutes: number }>;
  totalDistanceMiles: number;
  totalDurationMinutes: number;
  waypointOrder: number[];
  mapUrl: string; // Google Maps URL showing the route
}

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

// Google Maps endpoints are usually sub-second. A 10s ceiling means
// a hung upstream fails fast rather than tying up a server request
// for the 30s default Next.js route timeout.
const GOOGLE_MAPS_TIMEOUT_MS = 10_000;

/**
 * Fetch wrapper that aborts the request if Google Maps doesn't
 * respond within the configured timeout. The AbortError surfaces to
 * callers as a regular fetch rejection, which their try/catch maps
 * to a null return -- so a slow upstream degrades gracefully
 * instead of stalling the request queue.
 */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GOOGLE_MAPS_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Logs a warning if API key is missing
 */
function ensureApiKey(): boolean {
  if (!API_KEY) {
    console.warn(
      "[Google Maps] GOOGLE_MAPS_API_KEY environment variable is not set. Google Maps functions will return null."
    );
    return false;
  }
  return true;
}

/**
 * Converts Google's duration format (e.g., "2 hours 30 mins") to minutes
 */
function parseDurationToMinutes(durationText: string): number {
  let minutes = 0;
  const hoursMatch = durationText.match(/(\d+)\s*h/);
  const minsMatch = durationText.match(/(\d+)\s*m/);

  if (hoursMatch) minutes += parseInt(hoursMatch[1], 10) * 60;
  if (minsMatch) minutes += parseInt(minsMatch[1], 10);

  return minutes;
}

/**
 * Converts distance text (e.g., "1.5 mi") to miles
 */
function parseDistanceToMiles(distanceText: string): number {
  const match = distanceText.match(/([\d.]+)\s*mi/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Geocodes an address using Google Geocoding API
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!ensureApiKey()) return null;

  try {
    const params = new URLSearchParams({
      address,
      key: API_KEY,
    });

    const response = await fetchWithTimeout(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
    const data = (await response.json()) as {
      results?: Array<{
        geometry: { location: { lat: number; lng: number } };
        formatted_address: string;
      }>;
    };

    if (!data.results || data.results.length === 0) {
      console.warn(`[Google Maps] No results found for address: ${address}`);
      return null;
    }

    const result = data.results[0];
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    };
  } catch (error) {
    console.error("[Google Maps] geocodeAddress error:", error);
    return null;
  }
}

/**
 * Gets distance and duration between two locations using Distance Matrix API
 */
export async function getDistance(
  origin: string,
  destination: string
): Promise<DistanceResult | null> {
  if (!ensureApiKey()) return null;

  try {
    const params = new URLSearchParams({
      origins: origin,
      destinations: destination,
      units: "imperial",
      key: API_KEY,
    });

    const response = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
    );
    const data = (await response.json()) as {
      rows?: Array<{
        elements: Array<{
          distance: { text: string; value: number };
          duration: { text: string; value: number };
        }>;
      }>;
    };

    if (!data.rows || data.rows.length === 0 || data.rows[0].elements.length === 0) {
      console.warn(
        `[Google Maps] No route found between ${origin} and ${destination}`
      );
      return null;
    }

    const element = data.rows[0].elements[0];
    const distanceText = element.distance.text;
    const durationText = element.duration.text;

    return {
      distanceMiles: parseDistanceToMiles(distanceText),
      durationMinutes: parseDurationToMinutes(durationText),
      distanceText,
      durationText,
    };
  } catch (error) {
    console.error("[Google Maps] getDistance error:", error);
    return null;
  }
}

/**
 * Gets distances from one origin to multiple destinations (batch operation)
 */
export async function getDistanceMatrix(
  origin: string,
  destinations: string[]
): Promise<(DistanceResult | null)[]> {
  if (!ensureApiKey()) return destinations.map(() => null);

  try {
    const params = new URLSearchParams({
      origins: origin,
      destinations: destinations.join("|"),
      units: "imperial",
      key: API_KEY,
    });

    const response = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
    );
    const data = (await response.json()) as {
      rows?: Array<{
        elements: Array<{
          distance: { text: string; value: number };
          duration: { text: string; value: number };
        }>;
      }>;
    };

    if (!data.rows || data.rows.length === 0) {
      console.warn("[Google Maps] No results from distance matrix");
      return destinations.map(() => null);
    }

    return data.rows[0].elements.map((element) => {
      const distanceText = element.distance.text;
      const durationText = element.duration.text;

      return {
        distanceMiles: parseDistanceToMiles(distanceText),
        durationMinutes: parseDurationToMinutes(durationText),
        distanceText,
        durationText,
      };
    });
  } catch (error) {
    console.error("[Google Maps] getDistanceMatrix error:", error);
    return destinations.map(() => null);
  }
}

/**
 * Optimises a route using Google Directions API with waypoint optimisation
 * Returns the optimised stop order, leg distances, and a Google Maps URL
 */
export async function optimiseRoute(
  origin: string,
  stops: RouteStop[]
): Promise<OptimisedRoute | null> {
  if (!ensureApiKey()) return null;

  if (stops.length === 0) {
    console.warn("[Google Maps] optimiseRoute called with no stops");
    return null;
  }

  try {
    // For Directions API, we need destination and waypoints
    const destination = stops[stops.length - 1].address;
    const waypoints = stops.slice(0, -1).map((stop) => stop.address);

    const params = new URLSearchParams({
      origin,
      destination,
      key: API_KEY,
      units: "imperial",
    });

    if (waypoints.length > 0) {
      params.append("waypoints", `optimize:true|${waypoints.join("|")}`);
    }

    const response = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/directions/json?${params}`
    );
    const data = (await response.json()) as {
      routes?: Array<{
        waypoint_order: number[];
        legs: Array<{
          distance: { text: string; value: number };
          duration: { text: string; value: number };
          end_location: { lat: number; lng: number };
        }>;
      }>;
    };

    if (!data.routes || data.routes.length === 0) {
      console.warn(
        `[Google Maps] No route found for optimisation from ${origin}`
      );
      return null;
    }

    const route = data.routes[0];
    const waypointOrder = route.waypoint_order || [];

    // Build ordered stops
    const orderedStops: OptimisedRoute["orderedStops"] = [];
    let totalDistanceMiles = 0;
    let totalDurationMinutes = 0;

    route.legs.forEach((leg, index) => {
      const distanceMiles = parseDistanceToMiles(leg.distance.text);
      const durationMinutes = parseDurationToMinutes(leg.duration.text);

      totalDistanceMiles += distanceMiles;
      totalDurationMinutes += durationMinutes;

      // Determine which stop this leg corresponds to
      let stopIndex = index;
      if (waypointOrder.length > 0 && index < waypointOrder.length) {
        stopIndex = waypointOrder[index];
      }

      const stop = stops[stopIndex];
      orderedStops.push({
        ...stop,
        lat: leg.end_location.lat,
        lng: leg.end_location.lng,
        legDistanceMiles: distanceMiles,
        legDurationMinutes: durationMinutes,
      });
    });

    // Build Google Maps URL
    const mapUrl = buildDirectionsUrl(origin, destination, waypoints);

    return {
      orderedStops,
      totalDistanceMiles,
      totalDurationMinutes,
      waypointOrder,
      mapUrl,
    };
  } catch (error) {
    console.error("[Google Maps] optimiseRoute error:", error);
    return null;
  }
}

/**
 * Generates a Google Maps Directions URL for opening in Google Maps app
 */
function buildDirectionsUrl(
  origin: string,
  destination: string,
  waypoints: string[]
): string {
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
  });

  if (waypoints.length > 0) {
    params.append("waypoints", waypoints.join("|"));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Gets a static Google Maps image URL showing origin and all stops as markers
 */
export function getStaticMapUrl(origin: string, stops: RouteStop[]): string {
  if (!ensureApiKey()) return "";

  const markers: string[] = [];

  // Add origin marker
  markers.push(`label:O|${origin}`);

  // Add stop markers
  stops.forEach((stop, index) => {
    const label = String.fromCharCode(65 + index); // A, B, C, etc.
    markers.push(`label:${label}|${stop.address}`);
  });

  const params = new URLSearchParams({
    size: "600x400",
    markers: markers.join("|"),
    key: API_KEY,
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
