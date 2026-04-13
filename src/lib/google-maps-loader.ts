"use client";

/**
 * Shared client-side Google Maps JS loader.
 *
 * Having multiple components each append their own
 * `maps.googleapis.com/maps/api/js` script caused the old version of
 * this app to sometimes load Maps twice with different library sets,
 * which silently broke Places / Geocoder. This loader makes sure we
 * load the script exactly once, with the `places` library (needed for
 * address autocomplete) and no invalid library names.
 *
 * It also wires up `window.gm_authFailure`, which Google calls when
 * the API key is missing, billing is disabled, the domain isn't on
 * the referrer allow-list, or the Maps JavaScript API isn't enabled
 * for the project. Previously we got Google's opaque "Sorry!
 * Something went wrong" overlay with no actionable information.
 */

declare global {
  interface Window {
    gm_authFailure?: () => void;
    __gmapsLoadPromise?: Promise<void>;
    __gmapsAuthError?: string;
  }
}

export const GMAPS_LIBRARIES = "places" as const;

export function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
}

/** Subscribe to auth-failure events. Returns an unsubscribe fn. */
const authListeners = new Set<(msg: string) => void>();

export function onGoogleMapsAuthFailure(cb: (msg: string) => void): () => void {
  authListeners.add(cb);
  // Fire immediately if we already saw a failure in this session.
  if (typeof window !== "undefined" && window.__gmapsAuthError) {
    cb(window.__gmapsAuthError);
  }
  return () => authListeners.delete(cb);
}

function installAuthFailureHandler() {
  if (typeof window === "undefined") return;
  if (window.gm_authFailure) return;
  window.gm_authFailure = () => {
    const msg =
      "Google Maps rejected the API key. Check the Google Cloud console: (1) Maps JavaScript API + Places API are enabled, (2) the Railway domain is on the HTTP referrer allow-list, (3) billing is active.";
    window.__gmapsAuthError = msg;
    authListeners.forEach((cb) => cb(msg));
    console.error("[google-maps]", msg);
  };
}

/**
 * Load the Maps JS script exactly once per page. Subsequent calls
 * return the same promise. Rejects if the key is missing or the
 * script tag errors.
 */
export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadGoogleMaps called on server"));
  }

  const key = getGoogleMapsApiKey();
  if (!key) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set")
    );
  }

  installAuthFailureHandler();

  // Already fully loaded (constructors populated)
  const g = (typeof google !== "undefined" ? google : undefined) as
    | (typeof google & { maps?: { Map?: unknown; importLibrary?: (name: string) => Promise<unknown> } })
    | undefined;
  if (g?.maps && typeof g.maps.Map === "function") {
    return Promise.resolve();
  }

  if (window.__gmapsLoadPromise) return window.__gmapsLoadPromise;

  window.__gmapsLoadPromise = new Promise<void>((resolve, reject) => {
    const finish = async () => {
      try {
        // With loading=async, constructors live on libraries that
        // must be explicitly imported. `importLibrary` returns an
        // object whose members are also attached to `google.maps.*`
        // for legacy access, so after these two awaits
        // `google.maps.Map`, `google.maps.Marker`, `google.maps.Geocoder`,
        // and `google.maps.places.Autocomplete` are all usable.
        const gm = (google.maps as unknown as {
          importLibrary: (name: string) => Promise<unknown>;
        });
        await gm.importLibrary("maps");
        await gm.importLibrary("places");
        resolve();
      } catch (err) {
        reject(
          err instanceof Error
            ? err
            : new Error("Failed to import Google Maps libraries")
        );
      }
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-gmaps-loader="1"]'
    );
    if (existing) {
      // If the script tag is already there, either it's still loading
      // or it has finished. Either way, wait for the global to appear
      // and then importLibrary.
      if (typeof google !== "undefined" && google.maps) {
        finish();
      } else {
        existing.addEventListener("load", finish);
        existing.addEventListener("error", () =>
          reject(new Error("Failed to load Google Maps script"))
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&libraries=${GMAPS_LIBRARIES}&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset.gmapsLoader = "1";
    script.addEventListener("load", finish);
    script.addEventListener("error", () =>
      reject(new Error("Failed to load Google Maps script"))
    );
    document.head.appendChild(script);
  });

  return window.__gmapsLoadPromise;
}
