import 'server-only';

import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Supabase failures, classified once so screens can react to a cause rather
 * than to a string, and so a failed request says *why* it failed.
 *
 * The distinction that matters in practice: RLS denying a row and the row not
 * existing look identical from the client (both yield zero rows), whereas a
 * renamed column, an expired JWT and a dropped connection are all different
 * problems with different fixes.
 */
export type DataErrorKind =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'schema_mismatch'
  | 'unavailable';

export class DataError extends Error {
  readonly kind: DataErrorKind;
  /** PostgREST or Postgres code, e.g. `42703` for an unknown column. */
  readonly code: string | null;
  readonly operation: string;

  constructor(
    kind: DataErrorKind,
    operation: string,
    message: string,
    code: string | null = null,
  ) {
    super(message);
    this.name = 'DataError';
    this.kind = kind;
    this.operation = operation;
    this.code = code;
  }
}

/**
 * Codes worth telling apart. Anything unmapped falls through to `unavailable`,
 * which the UI renders as a retryable error.
 */
function classify(code: string | undefined): DataErrorKind {
  switch (code) {
    // JWT missing, malformed or expired.
    case 'PGRST301':
    case '42501':
      return 'forbidden';
    // Single-row query matched nothing. Also what RLS looks like from here.
    case 'PGRST116':
      return 'not_found';
    // Undefined column / undefined table: the frontend and the schema have
    // drifted apart. Surfaced distinctly because the fix is a code change,
    // not a retry.
    case '42703':
    case '42P01':
    case 'PGRST204':
      return 'schema_mismatch';
    default:
      return 'unavailable';
  }
}

/**
 * Wraps a PostgrestError, preserving the code and the operation name.
 *
 * Logged server-side in full; only the classification and a safe message
 * cross to the client, so a policy or column name never leaks into the
 * browser.
 */
export function toDataError(
  error: PostgrestError,
  operation: string,
): DataError {
  const kind = classify(error.code);

  console.error(
    `[data] ${operation} failed`,
    JSON.stringify({
      kind,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    }),
  );

  return new DataError(kind, operation, error.message, error.code ?? null);
}

/**
 * Throws on failure so callers can destructure `data` without null checks.
 * Server Components let the nearest `error.tsx` catch it.
 */
export function unwrap<T>(
  result: { data: T | null; error: PostgrestError | null },
  operation: string,
): T {
  if (result.error) throw toDataError(result.error, operation);
  if (result.data === null) {
    throw new DataError('not_found', operation, `${operation} returned no data`);
  }
  return result.data;
}
