import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteHeader } from '@/components/SiteHeader';
import { Card, buttonClassName } from '@/components/ui';
import { getPublicDirectory } from '@/data/directory';
import { CAPABILITY_LEVELS } from '@/domain/passport';
import { VERIFICATION_STATUS_META } from '@/domain/verification';

export const metadata: Metadata = {
  title: 'Verified skills for marketing talent',
  description:
    'Caterpi turns completed assessments into a verified skills passport you control and can share with employers.',
};

const STEPS = [
  {
    title: 'Take an assessment',
    body: 'Work through the capability assessments that matter for the role you want. Answers are graded server-side the moment you submit.',
  },
  {
    title: 'Get independently verified',
    body: 'A Caterpi assessor reviews your submission. Verification is awarded by the assessor, never self-declared — which is what makes it worth something to an employer.',
  },
  {
    title: 'Share on your terms',
    body: 'Your passport stays private until you switch it on. Turn it off and the public page stops resolving immediately.',
  },
] as const;

const LEVEL_DESCRIPTIONS: Record<number, { name: string; body: string }> = {
  1: {
    name: 'Foundation',
    body: 'Core concepts and vocabulary. Assessed by a timed question set.',
  },
  2: {
    name: 'Practitioner',
    body: 'Applied judgement on realistic scenarios, reviewed by an assessor.',
  },
  3: {
    name: 'Expert',
    body: 'Portfolio review of work you led, signed off by a senior assessor.',
  },
};

export default async function HomePage() {
  // Live from Supabase, and only profiles whose owners opted in. If everyone
  // switched visibility off this section would correctly render nothing.
  const directory = await getPublicDirectory();
  const featured = directory.slice(0, 3);

  const publicStatuses = ['verified', 'submitted', 'in_progress', 'failed', 'expired'] as const;

  return (
    <>
      <SiteHeader />

      <main id="main">
        <section className="border-b border-ink-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              Skills verification for marketers
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              A skills passport an employer can actually trust.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-600 sm:text-lg">
              Anyone can list skills on a CV. Caterpi turns assessed, independently
              verified capability into a profile you own — six marketing capabilities,
              three verification levels each, and nothing published until you say so.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={buttonClassName('primary', 'px-5 py-2.5')}>
                Create your passport
              </Link>
              <Link href="/discover" className={buttonClassName('secondary', 'px-5 py-2.5')}>
                Browse verified talent
              </Link>
            </div>

            <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-ink-600">Capabilities</dt>
                <dd className="text-2xl font-semibold text-ink-900">6</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-600">Verification levels</dt>
                <dd className="text-2xl font-semibold text-ink-900">
                  {CAPABILITY_LEVELS.length}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-ink-600">Public passports</dt>
                <dd className="text-2xl font-semibold text-ink-900">
                  {directory.length}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">
            How it works
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <Card as="li" key={step.title} className="p-5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{step.body}</p>
              </Card>
            ))}
          </ol>
        </section>

        <section className="border-y border-ink-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 className="text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">
              Three levels per capability
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-600">
              A capability is not a single badge. Each one ladders from foundation
              knowledge to expert portfolio review, so a passport shows depth rather
              than a checkbox.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {CAPABILITY_LEVELS.map((level) => (
                <Card key={level} className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    Level {level}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-ink-900">
                    {LEVEL_DESCRIPTIONS[level].name}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                    {LEVEL_DESCRIPTIONS[level].body}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">
                What a status actually means
              </h2>
              <p className="mt-2 text-sm text-ink-600">
                Every level carries one of these. They are the same states an
                assessor works with, so nothing is rounded up for presentation.
              </p>
              <dl className="mt-5 space-y-3">
                {publicStatuses.map((status) => {
                  const meta = VERIFICATION_STATUS_META[status];
                  return (
                    <div key={status} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <dt>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.badgeClassName}`}
                        >
                          {meta.label}
                        </span>
                      </dt>
                      <dd className="flex-1 text-sm text-ink-600">{meta.description}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>

            <div>
              <h2 className="text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">
                Private by default
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                A new passport is not public. When you switch it on, only a fixed
                set of fields is published: your name, roles, headline, location,
                capability scores and level statuses.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                Your email address, internal identifiers, assessor names and review
                notes are never part of the public profile. That boundary is
                enforced in the database rather than by hiding fields in the page,
                so a private passport returns nothing at all to a visitor — changing
                the URL does not reveal it.
              </p>
              <Link
                href="/signup"
                className={buttonClassName('secondary', 'mt-5')}
              >
                Create your passport
              </Link>
            </div>
          </div>
        </section>

        {featured.length > 0 ? (
          <section className="border-t border-ink-200 bg-white">
            <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">
                  Public passports
                </h2>
                <Link href="/discover" className="text-sm font-medium text-brand-700 hover:underline">
                  Browse all {directory.length}
                </Link>
              </div>

              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((entry) => (
                  <Card as="li" key={entry.username} className="p-5">
                    <Link href={`/p/${entry.username}`} className="block">
                      <p className="text-sm font-semibold text-ink-900">
                        {entry.fullName}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-600">
                        {entry.currentRole ?? 'Building their passport'}
                      </p>
                      <p className="mt-3 text-xs text-ink-600">
                        {entry.verifiedCapabilities} of {entry.totalCapabilities}{' '}
                        capabilities verified
                      </p>
                    </Link>
                  </Card>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-ink-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 text-xs text-ink-600 sm:px-6">
          Caterpi Skills Passport — built for the frontend technical assessment.
        </div>
      </footer>
    </>
  );
}
