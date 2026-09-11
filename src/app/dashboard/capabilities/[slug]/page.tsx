import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EvidenceList } from '@/components/passport/EvidenceList';
import { LevelLadder } from '@/components/passport/LevelLadder';
import { VerificationBadge } from '@/components/passport/VerificationBadge';
import { Card, EmptyState } from '@/components/ui';
import { getMyCapabilityDetail } from '@/data/passport';
import { formatScore } from '@/domain/score';
import { statusMeta } from '@/domain/verification';

type Props = PageProps<'/dashboard/capabilities/[slug]'>;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const detail = await getMyCapabilityDetail(slug);
  return { title: detail ? detail.capability.name : 'Capability' };
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default async function CapabilityDetailPage(props: Props) {
  const { slug } = await props.params;

  // `getMyCapabilityDetail` is wrapped in React `cache`, so the call above in
  // `generateMetadata` and this one share a single round-trip.
  const detail = await getMyCapabilityDetail(slug);
  if (!detail) notFound();

  const { capability, history } = detail;

  return (
    <main id="main" className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="text-xs font-medium text-ink-600 transition hover:text-ink-900"
      >
        <span aria-hidden>&larr;</span> Back to passport
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            {capability.name}
          </h1>
          <VerificationBadge status={capability.status} />
        </div>

        {detail.description ? (
          <p className="mt-2 max-w-2xl text-sm text-ink-600">
            {detail.description}
          </p>
        ) : null}

        <p className="mt-4 text-sm text-ink-600">
          Capability score{' '}
          <span className="font-semibold text-ink-900">
            {formatScore(capability.score)}
          </span>
        </p>

        <LevelLadder levels={capability.levels} className="mt-3" />
      </header>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-ink-900">
          Assessment history
        </h2>

        {history.length === 0 ? (
          <EmptyState
            title="No assessments yet"
            description="When an assessment is submitted for this capability, its result and evidence appear here."
          />
        ) : (
          <ol className="space-y-4">
            {history.map((record) => {
              const submitted = formatDate(record.submittedAt);
              const verified = formatDate(record.verifiedAt);

              return (
                <Card as="li" key={record.resultId} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-ink-400">
                        Level {record.level}
                      </p>
                      <h3 className="mt-0.5 text-base font-semibold text-ink-900">
                        {record.title}
                      </h3>
                    </div>
                    <div className="text-right">
                      <VerificationBadge status={record.status} />
                      <p className="mt-1.5 text-sm font-semibold text-ink-900">
                        {formatScore(record.score)}
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-ink-600">
                    {statusMeta(record.status).description}
                  </p>

                  <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="text-ink-400">Submitted</dt>
                      <dd className="mt-0.5 font-medium text-ink-900">
                        {submitted ?? 'Not submitted'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-400">Verified</dt>
                      <dd className="mt-0.5 font-medium text-ink-900">
                        {verified ?? 'Awaiting verification'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-400">Assessor</dt>
                      <dd className="mt-0.5 font-medium text-ink-900">
                        {record.assessorName ?? 'Not yet assigned'}
                      </dd>
                    </div>
                  </dl>

                  {record.assessorNote ? (
                    <blockquote className="mt-4 border-l-2 border-ink-200 pl-3 text-xs italic text-ink-600">
                      {record.assessorNote}
                    </blockquote>
                  ) : null}

                  <div className="mt-4">
                    <h4 className="mb-2 text-xs font-semibold text-ink-900">
                      Supporting evidence
                    </h4>
                    <EvidenceList evidence={record.evidence} />
                  </div>
                </Card>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
