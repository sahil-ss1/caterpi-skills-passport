'use server';

import { revalidatePath } from 'next/cache';

import { submitAssessment } from '@/data/assessments';
import { DataError } from '@/data/errors';
import { toPercent } from '@/domain/score';

export type SubmitAssessmentState =
  | { readonly status: 'idle' }
  | { readonly status: 'error'; readonly message: string }
  | {
      readonly status: 'graded';
      readonly correct: number;
      readonly total: number;
      readonly percent: number;
    };

/**
 * Grades a submitted paper.
 *
 * The action takes answers and nothing else. It has no parameter for a score,
 * so a crafted POST cannot supply one — grading happens inside Postgres
 * against a table no client role can read.
 */
export async function submitAssessmentAction(
  assessmentId: string,
  answers: Record<string, string>,
): Promise<SubmitAssessmentState> {
  try {
    const outcome = await submitAssessment(assessmentId, answers);

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/assessments');

    return {
      status: 'graded',
      correct: outcome.correct,
      total: outcome.total,
      percent: Math.round(toPercent(outcome.score)),
    };
  } catch (error) {
    if (error instanceof DataError) {
      return { status: 'error', message: messageFor(error) };
    }

    console.error('[action] submitAssessmentAction failed', error);
    return { status: 'error', message: 'Something went wrong. Please try again.' };
  }
}

/**
 * The grading function raises named exceptions for the cases a person can do
 * something about; everything else is deliberately vague.
 */
function messageFor(error: DataError): string {
  if (error.kind === 'forbidden') {
    return 'Your session has expired. Sign in again to submit this.';
  }
  if (error.message.includes('already submitted')) {
    return 'This assessment has already been submitted and is awaiting review.';
  }
  if (error.message.includes('no questions')) {
    return 'This level is assessed by portfolio review rather than a timed assessment.';
  }
  return 'We could not submit your answers. Please try again.';
}
