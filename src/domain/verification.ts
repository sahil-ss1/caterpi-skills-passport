/**
 * The single registry for capability verification states.
 *
 * Presentation, progress arithmetic and the capability filter are all derived
 * from `VERIFICATION_STATUS_META` rather than restated per component. Adding a
 * state means adding it to `VERIFICATION_STATUSES` and giving it an entry
 * here; because the metadata map is a `Record` keyed by the union, TypeScript
 * fails the build until the entry exists, and the filter list and badges pick
 * it up with no further changes.
 */

/**
 * Mirrors the `public.verification_status` enum in Postgres.
 *
 * Ordered from least to most progressed, which is also the order filters and
 * legends are presented in.
 */
export const VERIFICATION_STATUSES = [
  'not_attempted',
  'in_progress',
  'submitted',
  'verified',
  'failed',
  'expired',
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export interface VerificationStatusMeta {
  /** Badge text and the accessible name for the status. */
  readonly label: string;
  /** Sentence used in tooltips and the capability detail panel. */
  readonly description: string;
  /** Badge styling. Tokens live in `globals.css`. */
  readonly badgeClassName: string;
  /** Counts towards the overall verification progress indicator. */
  readonly countsAsVerified: boolean;
  /** Offered as an option in the capability list filter. */
  readonly filterable: boolean;
}

export const VERIFICATION_STATUS_META: Record<
  VerificationStatus,
  VerificationStatusMeta
> = {
  not_attempted: {
    label: 'Not attempted',
    description: 'This level has not been started.',
    badgeClassName: 'bg-slate-100 text-slate-600 ring-slate-200',
    countsAsVerified: false,
    filterable: false,
  },
  in_progress: {
    label: 'In progress',
    description: 'The assessment has been started but not submitted.',
    badgeClassName: 'bg-sky-50 text-sky-700 ring-sky-200',
    countsAsVerified: false,
    filterable: true,
  },
  submitted: {
    label: 'Awaiting review',
    description: 'Submitted and waiting for an assessor.',
    badgeClassName: 'bg-amber-50 text-amber-800 ring-amber-200',
    countsAsVerified: false,
    filterable: true,
  },
  verified: {
    label: 'Verified',
    description: 'Independently verified by a Caterpi assessor.',
    badgeClassName: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    countsAsVerified: true,
    filterable: true,
  },
  failed: {
    label: 'Not passed',
    description: 'Assessed below the verification threshold.',
    badgeClassName: 'bg-rose-50 text-rose-700 ring-rose-200',
    countsAsVerified: false,
    filterable: true,
  },
  expired: {
    label: 'Expired',
    description: 'This verification has lapsed and needs reassessing.',
    badgeClassName: 'bg-orange-50 text-orange-800 ring-orange-200',
    countsAsVerified: false,
    filterable: true,
  },
};

/** Status used when the backend sends something this build does not know. */
export const FALLBACK_VERIFICATION_STATUS: VerificationStatus = 'not_attempted';

export function isVerificationStatus(
  value: unknown,
): value is VerificationStatus {
  return (
    typeof value === 'string' &&
    (VERIFICATION_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Called at the data boundary for every status column.
 *
 * A new enum member added in Supabase before the frontend ships support for it
 * degrades to `not_attempted` instead of throwing, so an unrelated backend
 * migration cannot take the dashboard down.
 */
export function parseVerificationStatus(value: unknown): VerificationStatus {
  return isVerificationStatus(value) ? value : FALLBACK_VERIFICATION_STATUS;
}

export function statusMeta(status: VerificationStatus): VerificationStatusMeta {
  return VERIFICATION_STATUS_META[status];
}

export function isVerified(status: VerificationStatus): boolean {
  return VERIFICATION_STATUS_META[status].countsAsVerified;
}

export interface VerificationFilterOption {
  readonly value: VerificationStatus;
  readonly label: string;
}

/**
 * Derived, not hand-maintained: a new filterable status appears in the UI
 * without touching the filter component.
 */
export const VERIFICATION_FILTER_OPTIONS: readonly VerificationFilterOption[] =
  VERIFICATION_STATUSES.filter(
    (status) => VERIFICATION_STATUS_META[status].filterable,
  ).map((status) => ({
    value: status,
    label: VERIFICATION_STATUS_META[status].label,
  }));
