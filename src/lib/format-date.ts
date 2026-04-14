/**
 * UK calendar formatting (day-before-month ordering via en-GB).
 * Centralises locale so dates stay consistent regardless of server or
 * browser default locale.
 */
export const UK_LOCALE = "en-GB" as const;

/** e.g. 14 Apr 2026 */
export const UK_DATE_SHORT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

/** e.g. Tuesday, 14 April 2026 */
export const UK_DATE_LONG: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
};

/** e.g. 14 April 2026 (full month name, no weekday) */
export const UK_DATE_DAY_MONTH_LONG: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "long",
  year: "numeric",
};

/** e.g. Tue 14 Apr */
export const UK_DATE_WEEKDAY_SHORT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "2-digit",
  month: "short",
};

/** e.g. 14 Apr 2026, 15:30 */
export const UK_DATE_TIME: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export function formatUkDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = UK_DATE_SHORT,
  whenEmpty = "-"
): string {
  if (value === null || value === undefined || value === "") return whenEmpty;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return whenEmpty;
  return d.toLocaleDateString(UK_LOCALE, options);
}

export function formatUkDateTime(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = UK_DATE_TIME,
  whenEmpty = "-"
): string {
  if (value === null || value === undefined || value === "") return whenEmpty;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return whenEmpty;
  return d.toLocaleString(UK_LOCALE, options);
}
