import type { Metadata } from 'next';
import Link from 'next/link';

import { Card, EmptyState, SectionHeading, buttonClassName } from '@/components/ui';
import { getAssessmentCatalogue } from '@/data/assessments';
import {
  type AssessmentSummary,
  availabilityPresentation,
} from '@/domain/assessment';
import { formatScore } from '@/domain/score';

export const metadata: Metadata = { title: 'Assessments' };

/** Groups by capability so the three levels read as a ladder rather than a
 * flat list of eighteen rows. */
function groupByCapability(
  summaries: readonly AssessmentSummary[],
): { slug: string; name: string; levels: AssessmentSummary[] }[] {
  const groups = new Map<string, { slug: string; name: string; levels: AssessmentSummary[] }>();

  for (const summary of summaries) {
    const group = groups.get(summary.capabilitySlug) ?? {
      slug: summary.capabilitySlug,
      name: summary.capabilityName,
      levels: [],
    };
    group.levels.push(summary);
    groups.set(summary.capabilitySlug, group);
  }

  return [...groups.values()];
}

export default async function AssessmentsPage() {
  const catalogue = await getAssessmentCatalogue();
  const groups = groupByCapability(catalogue);

  const available = catalogue.filter(
    (item) => availabilityPresentation(item.availability).canStart,
  ).length;

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Assessments
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            {available > 0
              ? `${available} assessment${available === 1 ? '' : 's'} you can take right now.`
              : 'Nothing is open to take at the moment.'}
          </p>
        </div>
        <Link href="/dashboard" className={buttonClassName('secondary')}>
          Back to passport
        </Link>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="No assessments available"
          description="The capability catalogue is empty. Check back shortly."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.slug}>
              <SectionHeading title={group.name} />
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.levels.map((level) => (
                  <AssessmentTile key={level.assessmentId} summary={level} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function AssessmentTile({ summary }: { summary: AssessmentSummary }) {
  const presentation = availabilityPresentation(summary.availability);

  return (
    <Card as="li" className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Level {summary.level}
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-ink-900">
            {summary.title}
          </h3>
        </div>
        {summary.score !== null ? (
          <span className="shrink-0 text-sm font-semibold text-ink-900">
            {formatScore(summary.score)}
          </span>
        ) : null}
      </div>

      <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-600">
        {presentation.hint}
      </p>

      <div className="mt-4">
        {presentation.canStart ? (
          <Link
            href={`/dashboard/assessments/${summary.assessmentId}`}
            className={buttonClassName('primary', 'w-full')}
          >
            {presentation.label}
            <span className="sr-only"> — {summary.title}</span>
          </Link>
        ) : (
          <p className="rounded-lg bg-ink-50 px-3 py-2 text-center text-xs font-medium text-ink-600">
            {presentation.label}
          </p>
        )}
      </div>

      {summary.questionCount > 0 ? (
        <p className="mt-2 text-center text-[11px] text-ink-400">
          {summary.questionCount} question{summary.questionCount === 1 ? '' : 's'}
        </p>
      ) : null}
    </Card>
  );
}
