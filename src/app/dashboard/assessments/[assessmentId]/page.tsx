import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { buttonClassName } from '@/components/ui';
import { getAssessmentForm } from '@/data/assessments';

import { AssessmentRunner } from './AssessmentRunner';

export async function generateMetadata(
  props: PageProps<'/dashboard/assessments/[assessmentId]'>,
): Promise<Metadata> {
  const { assessmentId } = await props.params;
  const form = await getAssessmentForm(assessmentId);

  return { title: form ? form.title : 'Assessment' };
}

export default async function TakeAssessmentPage(
  props: PageProps<'/dashboard/assessments/[assessmentId]'>,
) {
  const { assessmentId } = await props.params;
  const form = await getAssessmentForm(assessmentId);

  // Covers an unknown id and a level with no question bank alike. Both mean
  // "there is no paper to sit here".
  if (!form) notFound();

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/dashboard/assessments"
        className={buttonClassName('ghost', 'mb-4 -ml-2 px-2')}
      >
        ← All assessments
      </Link>

      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
          {form.capabilityName} · Level {form.level}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
          {form.title}
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          {form.questions.length} questions, one answer each. Your answers are
          graded when you submit and the result goes to an assessor for
          verification.
        </p>
      </header>

      <AssessmentRunner form={form} />
    </main>
  );
}
