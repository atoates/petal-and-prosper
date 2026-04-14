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

  // Already fully loaded — Map constructor is available
  if (typeof google !== "undefined" && google.maps && google.maps.Map) {
    return Promise.resolve();
  }

  if (window.__gmapsLoadPromise) return window.__gmapsLoadPromise;

  window.__gmapsLoadPromise = new Promise<void>((resolve, reject) => {
    // If some other component beat us to appending the script, just
    // wait for it rather than appending a second one.
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-gmaps-loader="1"]'
    );
    if (existing) {
      if (typeof google !== "undefined" && google.maps && google.maps.Map) {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () =>
          reject(new Error("Failed to load Google Maps script"))
        );
      }
      return;
    }

    // Classic script-tag load. We do NOT use `loading=async` because
    // that requires the newer inline bootstrap loader and
    // `google.maps.importLibrary()` which isn't available when loading
    // via a plain <script> tag.  With `libraries=places` in the URL,
    // the Places library (Autocomplete, etc.) is loaded eagerly
    // alongside the core Maps library, so `google.maps.Map`,
    // `google.maps.places.Autocomplete`, etc. are all available
    // immediately after the script's `load` event fires.
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&libraries=${GMAPS_LIBRARIES}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.gmapsLoader = "1";
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () =>
      reject(new Error("Failed to load Google Maps script"))
    );
    document.head.appendChild(script);
  });

  return window.__gmapsLoadPromise;
}
