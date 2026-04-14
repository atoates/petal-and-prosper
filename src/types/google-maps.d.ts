/**
 * Minimal Google Maps type declarations for the delivery map component.
 * Avoids a full @types/google.maps dependency.
 */

declare namespace google.maps {
  class Map {
    constructor(element: HTMLElement, options?: MapOptions);
    fitBounds(bounds: LatLngBounds): void;
    getZoom(): number | undefined;
    setZoom(zoom: number): void;
  }

  interface MapOptions {
    zoom?: number;
    center?: LatLngLiteral;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    zoomControl?: boolean;
    styles?: MapTypeStyle[];
  }

  interface MapTypeStyle {
    featureType?: string;
    elementType?: string;
    stylers?: Record<string, any>[];
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  class LatLngBounds {
    constructor();
    extend(point: LatLngLiteral): void;
  }

  class Marker {
    constructor(options?: MarkerOptions);
    setMap(map: Map | null): void;
    addListener(event: string, handler: () => void): void;
  }

  interface MarkerOptions {
    position?: LatLngLiteral;
    map?: Map;
    title?: string;
    icon?: string | Symbol;
  }

  interface Symbol {
    path: SymbolPath;
    scale?: number;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWeight?: number;
  }

  enum SymbolPath {
    CIRCLE = 0,
    FORWARD_CLOSED_ARROW = 1,
    FORWARD_OPEN_ARROW = 2,
    BACKWARD_CLOSED_ARROW = 3,
    BACKWARD_OPEN_ARROW = 4,
  }

  class InfoWindow {
    constructor(options?: InfoWindowOptions);
    setContent(content: string | HTMLElement): void;
    open(map?: Map, anchor?: Marker): void;
    close(): void;
  }

  interface InfoWindowOptions {
    content?: string | HTMLElement;
    position?: LatLngLiteral;
  }

  class Geocoder {
    geocode(
      request: GeocoderRequest
    ): Promise<{ results: GeocoderResult[] }>;
  }

  interface GeocoderRequest {
    address?: string;
    location?: LatLngLiteral;
  }

  interface GeocoderResult {
    geometry: {
      location: {
        lat(): number;
        lng(): number;
      };
    };
    formatted_address: string;
  }

  namespace event {
    function addListener(
      instance: object,
      eventName: string,
      handler: () => void
    ): MapsEventListener;
    function removeListener(listener: MapsEventListener): void;
    function clearInstanceListeners(instance: object): void;
  }

  namespace places {
    class Autocomplete {
      constructor(
        inputField: HTMLInputElement,
        opts?: AutocompleteOptions
      );
      addListener(event: string, handler: () => void): MapsEventListener;
      getPlace(): PlaceResult;
    }

    interface AutocompleteOptions {
      fields?: string[];
      componentRestrictions?: { country: string | string[] };
      types?: string[];
      bounds?: LatLngBounds;
      strictBounds?: boolean;
    }

    interface PlaceResult {
      formatted_address?: string;
      geometry?: {
        location?: {
          lat(): number;
          lng(): number;
        };
      };
      name?: string;
      place_id?: string;
      address_components?: AddressComponent[];
      formatted_phone_number?: string;
    }

    interface AddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }
  }

  interface MapsEventListener {
    remove(): void;
  }
}
