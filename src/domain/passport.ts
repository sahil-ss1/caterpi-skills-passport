/**
 * Domain shapes for the skills passport.
 *
 * These are the types the UI renders. They are not database row types: the
 * data-access layer maps Supabase rows into these, which is what keeps column
 * renames and scale changes out of the component tree.
 */

import type { NormalizedScore } from './score';
import { asNormalizedScore } from './score';
import { type VerificationStatus, isVerified } from './verification';

export const CAPABILITY_LEVELS = [1, 2, 3] as const;

export type CapabilityLevel = (typeof CAPABILITY_LEVELS)[number];

/** One verification level of one capability. */
export interface LevelVerification {
  readonly level: CapabilityLevel;
  readonly status: VerificationStatus;
  readonly score: NormalizedScore | null;
}

export interface Capability {
  readonly slug: string;
  readonly name: string;
  readonly category: string | null;
  readonly score: NormalizedScore | null;
  readonly status: VerificationStatus;
  /** Always one entry per level in `CAPABILITY_LEVELS`, ascending. */
  readonly levels: readonly LevelVerification[];
}

export interface PassportProgress {
  readonly verifiedLevels: number;
  readonly totalLevels: number;
  /** 0..1. `0` when there are no levels to verify. */
  readonly fraction: number;
}

export interface TalentPassport {
  readonly username: string;
  readonly fullName: string;
  readonly currentRole: string | null;
  readonly targetRole: string | null;
  readonly headline: string | null;
  readonly location: string | null;
  readonly avatarUrl: string | null;
  readonly isPublic: boolean;
  readonly capabilities: readonly Capability[];
  readonly progress: PassportProgress;
}

/**
 * What an anonymous visitor may see.
 *
 * Declared independently rather than as `Omit<TalentPassport, ...>` on
 * purpose: with `Omit`, any private field added to `TalentPassport` later
 * would silently widen the public type too. Here, exposing something new
 * publicly has to be a deliberate edit to this interface.
 */
export interface PublicPassport {
  readonly username: string;
  readonly fullName: string;
  readonly currentRole: string | null;
  readonly targetRole: string | null;
  readonly headline: string | null;
  readonly location: string | null;
  readonly avatarUrl: string | null;
  readonly capabilities: readonly PublicCapability[];
  readonly progress: PassportProgress;
}

/** No scores per level, assessor names, notes or dates. */
export interface PublicCapability {
  readonly slug: string;
  readonly name: string;
  readonly category: string | null;
  readonly score: NormalizedScore | null;
  readonly status: VerificationStatus;
  readonly levels: readonly PublicLevelVerification[];
}

export interface PublicLevelVerification {
  readonly level: CapabilityLevel;
  readonly status: VerificationStatus;
}

/** Why a piece of evidence cannot be shown. */
export type EvidenceUnavailableReason = 'missing' | 'unauthorised' | 'expired';

export interface EvidenceItem {
  readonly id: string;
  readonly fileName: string;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
  /** Short-lived signed URL, or `null` when the object cannot be served. */
  readonly url: string | null;
  readonly unavailableReason: EvidenceUnavailableReason | null;
}

/** One assessment attempt at one level, as shown in the capability history. */
export interface AssessmentRecord {
  readonly resultId: string;
  readonly level: CapabilityLevel;
  readonly title: string;
  readonly status: VerificationStatus;
  readonly score: NormalizedScore | null;
  readonly submittedAt: string | null;
  readonly verifiedAt: string | null;
  readonly assessorName: string | null;
  readonly assessorNote: string | null;
  readonly evidence: readonly EvidenceItem[];
}

export interface CapabilityDetail {
  readonly capability: Capability;
  readonly description: string | null;
  /** Most recent attempt first. Levels never attempted are absent. */
  readonly history: readonly AssessmentRecord[];
}

/**
 * Fills in every level so the UI can render a complete ladder from sparse
 * data. A level with no row in Supabase means "not attempted", which is why
 * the backend does not store placeholder rows.
 */
export function fillLevels<T>(
  present: ReadonlyMap<CapabilityLevel, T>,
  makeMissing: (level: CapabilityLevel) => T,
): readonly T[] {
  return CAPABILITY_LEVELS.map(
    (level) => present.get(level) ?? makeMissing(level),
  );
}

export function buildLevelLadder(
  present: ReadonlyMap<CapabilityLevel, LevelVerification>,
): readonly LevelVerification[] {
  return fillLevels(present, (level) => ({
    level,
    status: 'not_attempted',
    score: null,
  }));
}

export function isCapabilityLevel(value: unknown): value is CapabilityLevel {
  return (
    typeof value === 'number' &&
    (CAPABILITY_LEVELS as readonly number[]).includes(value)
  );
}

/**
 * Overall verification progress: verified levels over all levels on offer.
 *
 * Counting levels rather than averaging scores means the indicator answers
 * "how much of the passport is verified", which is what an employer reads it
 * as, and it stays meaningful when scores are missing.
 */
export function computeProgress(
  capabilities: readonly { readonly levels: readonly { readonly status: VerificationStatus }[] }[],
): PassportProgress {
  let verifiedLevels = 0;
  let totalLevels = 0;

  for (const capability of capabilities) {
    for (const level of capability.levels) {
      totalLevels += 1;
      if (isVerified(level.status)) verifiedLevels += 1;
    }
  }

  return {
    verifiedLevels,
    totalLevels,
    fraction: totalLevels === 0 ? 0 : verifiedLevels / totalLevels,
  };
}

/**
 * Mean of the capabilities that actually carry a score. Returns `null` when
 * none do, so the UI shows an empty state instead of a misleading zero.
 */
export function averageScore(
  capabilities: readonly { readonly score: NormalizedScore | null }[],
): NormalizedScore | null {
  const scored = capabilities.filter(
    (capability): capability is { score: NormalizedScore } =>
      capability.score !== null,
  );
  if (scored.length === 0) return null;

  const total = scored.reduce((sum, capability) => sum + capability.score, 0);
  return asNormalizedScore(total / scored.length);
}
