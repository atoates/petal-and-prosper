/**
 * Pagination helpers for list API routes.
 *
 * Design:
 *   - `parsePagination()` reads `page` / `limit` from the query string.
 *     If NEITHER is present we return `null`, signalling "no explicit
 *     pagination -- fall back to the legacy bare-array shape". Callers
 *     still apply `LEGACY_SAFETY_LIMIT` so a tenant with 100k rows
 *     can't tip the server over by calling an un-paginated endpoint.
 *   - When pagination is explicit, we clamp `limit` to a sane ceiling.
 *     Per-endpoint ceilings can be supplied via the `maxLimit` option.
 *   - `paginatedResponse()` packages `{ data, pagination }` in the
 *     shape already used by `/api/products`, so clients can share
 *     decoding logic across endpoints.
 */

export interface PaginationInput {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const DEFAULT_LIMIT = 50;
const DEFAULT_MAX_LIMIT = 200;

/**
 * Hard cap applied to un-paginated (legacy array) responses. Even
 * callers that don't ask for pagination won't be allowed to pull more
 * than this many rows in a single request -- it's a last-resort
 * memory guard, not a product feature.
 */
export const LEGACY_SAFETY_LIMIT = 500;

export function parsePagination(
  searchParams: URLSearchParams,
  opts: { defaultLimit?: number; maxLimit?: number } = {}
): PaginationInput | null {
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  if (pageParam === null && limitParam === null) return null;

  const defaultLimit = opts.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = opts.maxLimit ?? DEFAULT_MAX_LIMIT;

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(limitParam ?? String(defaultLimit), 10) || defaultLimit)
  );

  return { page, limit, offset: (page - 1) * limit };
}

export function buildPaginationMeta(
  input: PaginationInput,
  total: number
): PaginationMeta {
  return {
    page: input.page,
    limit: input.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / input.limit)),
  };
}
