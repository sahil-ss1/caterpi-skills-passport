/**
 * The single boundary where assessment scores change scale.
 *
 * Supabase reports `raw_score` on whatever scale the assessment engine
 * currently uses. Nothing above this module is allowed to know what that scale
 * is: callers normalise once, then work in fractions and ask this module for
 * geometry (`toPercent`) or labels (`formatScore`).
 *
 * So when the backend changes scale, `SOURCE_SCALE` and `DISPLAY` below are the
 * only things that move. The radar chart, progress ring and every score label
 * follow automatically.
 */

declare const normalizedScore: unique symbol;

/**
 * A score projected onto 0..1.
 *
 * Branded so a bare `number` cannot be passed to chart or label code without
 * going through `normalizeScore` first — the compiler enforces the boundary
 * rather than a convention nobody remembers.
 */
export type NormalizedScore = number & { readonly [normalizedScore]: true };

export interface ScoreScale {
  readonly min: number;
  readonly max: number;
}

/** The scale Supabase reports `raw_score` on today. */
export const SOURCE_SCALE: ScoreScale = { min: 0, max: 100 };

/**
 * How a score is written for people. Separate from `SOURCE_SCALE` because the
 * stored scale and the presented scale change for different reasons.
 */
const DISPLAY = {
  max: 100,
  precision: 0,
  suffix: '%',
} as const;

/** Shown wherever a capability or level exists but carries no score yet. */
export const NO_SCORE_LABEL = 'Not scored';

/**
 * Accepts what PostgREST can actually produce for a `numeric` column, rather
 * than assuming a clean number. Anything unusable becomes `null`, which the UI
 * already has to render for genuinely unscored capabilities.
 */
export function normalizeScore(
  raw: number | string | null | undefined,
): NormalizedScore | null {
  if (raw === null || raw === undefined || raw === '') return null;

  const value = typeof raw === 'string' ? Number(raw) : raw;
  if (!Number.isFinite(value)) return null;

  const { min, max } = SOURCE_SCALE;
  if (max === min) return null;

  const fraction = (value - min) / (max - min);
  return Math.min(1, Math.max(0, fraction)) as NormalizedScore;
}

/** Only for building a `NormalizedScore` from a value already on 0..1. */
export function asNormalizedScore(fraction: number): NormalizedScore {
  return Math.min(1, Math.max(0, fraction)) as NormalizedScore;
}

/** 0..1 to 0..100, for chart geometry and progress rings. */
export function toPercent(score: NormalizedScore): number {
  return score * 100;
}

/** Human-facing label, e.g. `63%`. */
export function formatScore(score: NormalizedScore | null): string {
  if (score === null) return NO_SCORE_LABEL;
  return `${(score * DISPLAY.max).toFixed(DISPLAY.precision)}${DISPLAY.suffix}`;
}

/**
 * Percentage label for progress indicators. Always a percentage regardless of
 * the score scale, because it describes completion rather than a score.
 */
export function formatPercent(fraction: number): string {
  return `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
}
