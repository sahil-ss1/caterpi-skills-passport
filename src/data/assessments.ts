import 'server-only';

import { cache } from 'react';

import {
  type AssessmentForm,
  type AssessmentOutcome,
  type AssessmentSummary,
  resolveAvailability,
} from '@/domain/assessment';
import { type CapabilityLevel, isCapabilityLevel } from '@/domain/passport';
import { asNormalizedScore, normalizeScore } from '@/domain/score';
import { parseVerificationStatus } from '@/domain/verification';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { requireUser } from './auth';
import { DataError, toDataError, unwrap } from './errors';

/**
 * Every assessment on offer, with this talent's progress against each.
 *
 * One query. The left join lives in `my_assessment_catalogue`, so the cost
 * does not grow with the number of capabilities.
 */
export const getAssessmentCatalogue = cache(
  async (): Promise<readonly AssessmentSummary[]> => {
    await requireUser();
    const supabase = await createSupabaseServerClient();

    const rows = unwrap(
      await supabase
        .from('my_assessment_catalogue')
        .select('*')
        .order('sort_order')
        .order('level'),
      'getAssessmentCatalogue',
    );

    return rows.filter((row) => isCapabilityLevel(row.level)).map((row) => {
      const status = row.status === null ? null : parseVerificationStatus(row.status);

      return {
        assessmentId: row.assessment_id,
        title: row.assessment_title,
        level: row.level as CapabilityLevel,
        capabilitySlug: row.capability_slug,
        capabilityName: row.capability_name,
        questionCount: row.question_count,
        status,
        score: normalizeScore(row.raw_score),
        submittedAt: row.submitted_at,
        availability: resolveAvailability(status, row.question_count),
      };
    });
  },
);

/**
 * The paper itself: prompts and choices, never the answer key.
 *
 * Two queries rather than one per question. `assessment_form_options` is the
 * view that exists precisely because the underlying table — which carries
 * `is_correct` — grants nothing to any client role.
 *
 * Returns `null` when the assessment does not exist or has no questions, so
 * the route can 404 instead of rendering an empty paper.
 */
export const getAssessmentForm = cache(
  async (assessmentId: string): Promise<AssessmentForm | null> => {
    await requireUser();
    const supabase = await createSupabaseServerClient();

    const catalogueResult = await supabase
      .from('my_assessment_catalogue')
      .select('*')
      .eq('assessment_id', assessmentId)
      .maybeSingle();

    if (catalogueResult.error) {
      throw toDataError(catalogueResult.error, 'getAssessmentForm.catalogue');
    }

    const meta = catalogueResult.data;
    if (!meta || !isCapabilityLevel(meta.level)) return null;

    const questionRows = unwrap(
      await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('sort_order'),
      'getAssessmentForm.questions',
    );

    if (questionRows.length === 0) return null;

    const optionRows = unwrap(
      await supabase
        .from('assessment_form_options')
        .select('*')
        .in(
          'question_id',
          questionRows.map((question) => question.id),
        )
        .order('sort_order'),
      'getAssessmentForm.options',
    );

    const optionsByQuestion = new Map<string, { id: string; label: string }[]>();
    for (const option of optionRows) {
      const bucket = optionsByQuestion.get(option.question_id) ?? [];
      bucket.push({ id: option.id, label: option.label });
      optionsByQuestion.set(option.question_id, bucket);
    }

    return {
      assessmentId,
      title: meta.assessment_title,
      level: meta.level as CapabilityLevel,
      capabilityName: meta.capability_name,
      capabilitySlug: meta.capability_slug,
      questions: questionRows.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        options: optionsByQuestion.get(question.id) ?? [],
      })),
    };
  },
);

/**
 * Submits answers for grading.
 *
 * Note what is not in the payload: a score. The client sends choices, the
 * database grades them against a table the client cannot read, and the result
 * is written as `submitted` rather than `verified`. There is no insert or
 * update policy on `assessment_results` for any client role, so this function
 * is the only way a score can be written at all.
 */
export async function submitAssessment(
  assessmentId: string,
  answers: Readonly<Record<string, string>>,
): Promise<AssessmentOutcome> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc('submit_assessment', {
    p_assessment_id: assessmentId,
    p_answers: answers,
  });

  if (error) throw toDataError(error, 'submitAssessment');
  if (!data) {
    throw new DataError('unavailable', 'submitAssessment', 'No grading result returned');
  }

  const total = data.total || 1;
  return {
    correct: data.correct,
    total: data.total,
    score: asNormalizedScore(data.correct / total),
  };
}
