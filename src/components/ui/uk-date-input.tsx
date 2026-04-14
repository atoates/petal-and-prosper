"use client";

import { useRef, useState, useCallback } from "react";
import { Calendar } from "lucide-react";

/**
 * A date input that always displays DD/MM/YYYY regardless of the
 * browser or OS locale. The underlying value is ISO YYYY-MM-DD so it
 * integrates cleanly with form state and the API.
 *
 * How it works:
 *  - A visible text input shows the human-friendly UK date.
 *  - A hidden native `<input type="date">` is activated when the
 *    calendar icon is clicked, providing the browser's native date
 *    picker without its locale-dependent text display.
 *  - Typing directly into the text field is supported in DD/MM/YYYY
 *    format and auto-converted on blur.
 */

interface UkDateInputProps {
  /** ISO date string YYYY-MM-DD (the value stored in state). */
  value: string;
  /** Called with ISO YYYY-MM-DD when the date changes. */
  onChange: (isoDate: string) => void;
  label?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  min?: string;
  max?: string;
}

function isoToUk(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function ukToIso(uk: string): string {
  const m = uk.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m) return "";
  const day = m[1].padStart(2, "0");
  const month = m[2].padStart(2, "0");
  const year = m[3];
  // Basic validation
  const d = new Date(`${year}-${month}-${day}`);
  if (Number.isNaN(d.getTime())) return "";
  return `${year}-${month}-${day}`;
}

export function UkDateInput({
  value,
  onChange,
  label,
  name,
  required,
  disabled,
  className = "",
  min,
  max,
}: UkDateInputProps) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(isoToUk(value));
  const [focused, setFocused] = useState(false);

  // Keep display in sync when the value prop changes externally
  // (e.g. form reset). We only sync when the input is NOT focused
  // to avoid fighting with the user's typing.
  const lastPropValue = useRef(value);
  if (value !== lastPropValue.current && !focused) {
    lastPropValue.current = value;
    setDisplayValue(isoToUk(value));
  }

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplayValue(raw);
      // Try to parse as the user types so the native picker stays in sync
      const iso = ukToIso(raw);
      if (iso) {
        lastPropValue.current = iso;
        onChange(iso);
      }
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    setFocused(false);
    // Re-format whatever the user typed into clean DD/MM/YYYY
    const iso = ukToIso(displayValue);
    if (iso) {
      setDisplayValue(isoToUk(iso));
      lastPropValue.current = iso;
      onChange(iso);
    } else if (displayValue === "") {
      lastPropValue.current = "";
      onChange("");
    } else {
      // Invalid input -- revert to last known good value
      setDisplayValue(isoToUk(value));
    }
  }, [displayValue, value, onChange]);

  const handlePickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const iso = e.target.value; // YYYY-MM-DD from native picker
      lastPropValue.current = iso;
      setDisplayValue(isoToUk(iso));
      onChange(iso);
    },
    [onChange]
  );

  const openPicker = useCallback(() => {
    hiddenRef.current?.showPicker?.();
  }, []);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          name={name}
          value={displayValue}
          onChange={handleTextChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder="DD/MM/YYYY"
          required={required}
          disabled={disabled}
          className={`w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent transition-colors ${className}`}
        />
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
          aria-label="Open date picker"
        >
          <Calendar size={16} />
        </button>
        {/* Hidden native picker for the calendar popup */}
        <input
          ref={hiddenRef}
          type="date"
          value={value}
          onChange={handlePickerChange}
          min={min}
          max={max}
          tabIndex={-1}
          aria-hidden
          className="absolute inset-0 opacity-0 pointer-events-none"
        />
      </div>
    </div>
  );
}
