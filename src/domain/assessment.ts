/**
 * Domain shapes for taking an assessment.
 *
 * The deliberate omission here is the answer key. There is no `isCorrect`
 * anywhere in this file, because grading happens in Postgres and the correct
 * option is never sent to the browser. A type that could hold it would
 * eventually be filled.
 */

import type { CapabilityLevel } from './passport';
import type { NormalizedScore } from './score';
import { VERIFICATION_STATUS_META, type VerificationStatus } from './verification';

/**
 * Why an assessment cannot be started right now.
 *
 * Modelled as a union rather than a set of booleans so the UI renders one
 * reason and the compiler can check every case is handled.
 */
export type AssessmentAvailability =
  | { readonly kind: 'available' }
  | { readonly kind: 'awaiting_review' }
  | { readonly kind: 'verified' }
  | { readonly kind: 'assessor_led' }
  | { readonly kind: 'retake'; readonly previousStatus: VerificationStatus };

export interface AssessmentSummary {
  readonly assessmentId: string;
  readonly title: string;
  readonly level: CapabilityLevel;
  readonly capabilitySlug: string;
  readonly capabilityName: string;
  readonly questionCount: number;
  /** `null` when this talent has never attempted it. */
  readonly status: VerificationStatus | null;
  readonly score: NormalizedScore | null;
  readonly submittedAt: string | null;
  readonly availability: AssessmentAvailability;
}

export interface AssessmentOption {
  readonly id: string;
  readonly label: string;
}

export interface AssessmentQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly AssessmentOption[];
}

export interface AssessmentForm {
  readonly assessmentId: string;
  readonly title: string;
  readonly level: CapabilityLevel;
  readonly capabilityName: string;
  readonly capabilitySlug: string;
  readonly questions: readonly AssessmentQuestion[];
}

/** Outcome of a graded submission, as returned by the database. */
export interface AssessmentOutcome {
  readonly correct: number;
  readonly total: number;
  readonly score: NormalizedScore;
}

/**
 * Levels without a question bank are assessor-led by design: expert
 * verification is a portfolio review, not a quiz. The catalogue reports a
 * question count of zero for those.
 */
export function resolveAvailability(
  status: VerificationStatus | null,
  questionCount: number,
): AssessmentAvailability {
  if (status === 'verified') return { kind: 'verified' };
  if (status === 'submitted') return { kind: 'awaiting_review' };
  if (questionCount === 0) return { kind: 'assessor_led' };
  if (status === null || status === 'not_attempted') return { kind: 'available' };
  return { kind: 'retake', previousStatus: status };
}

export interface AvailabilityPresentation {
  readonly label: string;
  readonly canStart: boolean;
  readonly hint: string;
}

/**
 * Registry rather than a switch in the component, for the same reason as
 * `VERIFICATION_STATUS_META`: adding a state should not mean editing JSX.
 */
export function availabilityPresentation(
  availability: AssessmentAvailability,
): AvailabilityPresentation {
  switch (availability.kind) {
    case 'available':
      return {
        label: 'Start assessment',
        canStart: true,
        hint: 'Not yet attempted.',
      };
    case 'retake':
      return {
        label: 'Retake assessment',
        canStart: true,
        hint: `Previously ${VERIFICATION_STATUS_META[
          availability.previousStatus
        ].label.toLowerCase()}. Retaking replaces the earlier result.`,
      };
    case 'awaiting_review':
      return {
        label: 'Awaiting review',
        canStart: false,
        hint: 'Submitted. An assessor will review this before it counts as verified.',
      };
    case 'verified':
      return {
        label: 'Verified',
        canStart: false,
        hint: 'Already verified by an assessor.',
      };
    case 'assessor_led':
      return {
        label: 'Assessor led',
        canStart: false,
        hint: 'This level is verified through portfolio review rather than a timed assessment.',
      };
  }
}

/**
 * True once every question has an answer. Submitting a partial paper is
 * allowed by the database, but the UI asks for confirmation first.
 */
export function isComplete(
  questions: readonly AssessmentQuestion[],
  answers: Readonly<Record<string, string>>,
): boolean {
  return questions.every((question) => Boolean(answers[question.id]));
}

export function answeredCount(
  questions: readonly AssessmentQuestion[],
  answers: Readonly<Record<string, string>>,
): number {
  return questions.filter((question) => Boolean(answers[question.id])).length;
}
