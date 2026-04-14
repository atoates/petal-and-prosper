"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

export interface PlaceSelection {
  /** The full formatted address returned by Google. */
  formattedAddress: string;
  lat: number;
  lng: number;
  /** The place's own name (e.g. "Hedsor House"), if different from the address. */
  name?: string;
  /** Extracted postal town / city from address_components. */
  town?: string;
  /** Formatted phone number, if available. */
  phone?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * Fired when the user picks an actual place from the dropdown (as
   * opposed to free-typing). Gives you the formatted address + lat/lng
   * plus optional name, town and phone so you can auto-fill related
   * fields (e.g. venue town, venue phone).
   */
  onPlaceSelected?: (place: PlaceSelection) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /**
   * ISO 3166-1 alpha-2 country code(s) to restrict results to. Defaults
   * to UK-only since Petal & Prosper is a UK florist business.
   */
  countries?: string[];
  /**
   * What type of place to search for:
   * - "address" (default) — street addresses only
   * - "establishment" — businesses, venues, landmarks
   */
  searchType?: "address" | "establishment";
}

/**
 * Input with Google Places Autocomplete bound to it. Falls back to a
 * plain input if the Maps script fails to load (missing key, offline,
 * rejected domain) so the user can still type an address manually.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder = "Start typing an address...",
  className = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent",
  id,
  name,
  required,
  disabled,
  countries = ["gb"],
  searchType = "address",
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !inputRef.current) return;
        if (!google.maps.places) return; // Places library failed to load
        const fields = [
          "formatted_address",
          "geometry",
          "name",
          "address_components",
          "formatted_phone_number",
        ];
        const ac = new google.maps.places.Autocomplete(inputRef.current, {
          fields,
          componentRestrictions: { country: countries },
          types: [searchType],
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();

          // For establishments, prefer the place name (e.g. "Hedsor House")
          // as the input value; for addresses, use the formatted address.
          const displayValue =
            searchType === "establishment" && place.name
              ? place.name
              : place.formatted_address;

          if (displayValue) {
            onChange(displayValue);
          }

          if (onPlaceSelected) {
            // Extract the postal town from address_components.
            // Google returns it under "postal_town"; falling back to
            // "locality" which is used in some regions.
            const townComponent = place.address_components?.find((c) =>
              c.types.includes("postal_town")
            ) ?? place.address_components?.find((c) =>
              c.types.includes("locality")
            );

            onPlaceSelected({
              formattedAddress: place.formatted_address ?? displayValue ?? "",
              lat: place.geometry?.location?.lat() ?? 0,
              lng: place.geometry?.location?.lng() ?? 0,
              name: place.name,
              town: townComponent?.long_name,
              phone: place.formatted_phone_number,
            });
          }
        });
        autocompleteRef.current = ac;
        setReady(true);
      })
      .catch(() => {
        // Silently degrade to a plain text input if the Maps script
        // can't load. The user can still type the address by hand.
      });

    return () => {
      cancelled = true;
      if (autocompleteRef.current) {
        google.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
    // Countries change is rare; avoid re-binding autocomplete on every
    // keystroke of the parent's controlled value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <input
      ref={inputRef}
      id={id}
      name={name}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      required={required}
      disabled={disabled}
      autoComplete={ready ? "off" : undefined}
    />
  );
}
