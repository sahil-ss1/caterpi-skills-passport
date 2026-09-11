'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Card, buttonClassName } from '@/components/ui';
import {
  type AssessmentForm,
  answeredCount,
  isComplete,
} from '@/domain/assessment';

import {
  type SubmitAssessmentState,
  submitAssessmentAction,
} from '../actions';

/**
 * The paper.
 *
 * Answers are held as `{ questionId: optionId }` and that is the entire
 * payload sent for grading — there is no score in client state to tamper
 * with, because the client never computes one.
 */
export function AssessmentRunner({ form }: { form: AssessmentForm }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [state, setState] = useState<SubmitAssessmentState>({ status: 'idle' });
  const [isPending, startTransition] = useTransition();

  const answered = answeredCount(form.questions, answers);
  const complete = isComplete(form.questions, answers);

  function choose(questionId: string, optionId: string) {
    setAnswers((current) => ({ ...current, [questionId]: optionId }));
  }

  function submit() {
    startTransition(async () => {
      const result = await submitAssessmentAction(form.assessmentId, answers);
      setState(result);

      if (result.status === 'graded') {
        // The dashboard and catalogue were revalidated server-side; refresh so
        // the new "awaiting review" state is there when the user navigates.
        router.refresh();
      }
    });
  }

  if (state.status === 'graded') {
    return <Result state={state} form={form} />;
  }

  return (
    <div className="space-y-5">
      <div
        className="sticky top-0 z-10 -mx-4 border-b border-ink-200 bg-ink-50/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-[--radius-card] sm:border sm:bg-white"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-ink-900">
          {answered} of {form.questions.length} answered
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-[width]"
            style={{ width: `${(answered / form.questions.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="space-y-4">
        {form.questions.map((question, index) => (
          <Card as="li" key={question.id} className="p-5">
            <fieldset>
              <legend className="text-sm font-medium text-ink-900">
                <span className="text-ink-400">{index + 1}. </span>
                {question.prompt}
              </legend>

              <div className="mt-3 space-y-2">
                {question.options.map((option) => {
                  const selected = answers[question.id] === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                        selected
                          ? 'border-brand-500 bg-brand-50 text-ink-900'
                          : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.id}
                        checked={selected}
                        onChange={() => choose(question.id, option.id)}
                        className="mt-0.5 accent-brand-600"
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </Card>
        ))}
      </ol>

      {state.status === 'error' ? (
        <p role="alert" className="text-sm font-medium text-rose-700">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={isPending || answered === 0}
          className={buttonClassName('primary', 'disabled:cursor-not-allowed')}
        >
          {isPending ? 'Submitting…' : 'Submit for review'}
        </button>

        {!complete && answered > 0 ? (
          <p className="text-xs text-ink-600">
            {form.questions.length - answered} unanswered — these count as
            incorrect.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Result({
  state,
  form,
}: {
  state: Extract<SubmitAssessmentState, { status: 'graded' }>;
  form: AssessmentForm;
}) {
  return (
    <Card className="p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
        Submitted
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-ink-900">
        {state.correct} of {state.total} correct
      </h2>
      <p className="mt-1 text-sm text-ink-600">
        That is a score of {state.percent}% for {form.title}.
      </p>

      <p className="mx-auto mt-4 max-w-md rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
        Your result is <strong>awaiting review</strong>. A Caterpi assessor
        confirms every verification, so this does not count as verified yet.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/dashboard" className={buttonClassName('primary')}>
          View my passport
        </Link>
        <Link href="/dashboard/assessments" className={buttonClassName('secondary')}>
          Take another
        </Link>
      </div>
    </Card>
  );
}
