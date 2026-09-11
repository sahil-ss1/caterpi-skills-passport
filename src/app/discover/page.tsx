import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteHeader } from '@/components/SiteHeader';
import { Card, EmptyState, buttonClassName } from '@/components/ui';
import { getPublicDirectory } from '@/data/directory';

export const metadata: Metadata = {
  title: 'Browse verified talent',
  description:
    'Marketing talent who have chosen to publish their Caterpi skills passport.',
};

export default async function DiscoverPage() {
  const entries = await getPublicDirectory();

  return (
    <>
      <SiteHeader />

      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
          Browse verified talent
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-600">
          Everyone here has switched their passport on. A talent who has not
          opted in is not listed and their profile URL does not resolve.
        </p>

        {entries.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No public passports yet"
              description="Nobody has switched their passport on. Create an account and you could be the first."
              action={
                <Link href="/signup" className={buttonClassName('primary')}>
                  Create your passport
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => (
              <Card as="li" key={entry.username} className="flex flex-col p-5">
                <Link
                  href={`/p/${entry.username}`}
                  className="flex flex-1 flex-col rounded-lg outline-none"
                >
                  <p className="text-base font-semibold text-ink-900">
                    {entry.fullName}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-600">
                    {entry.currentRole ?? 'Building their passport'}
                  </p>

                  {entry.headline ? (
                    <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-600">
                      {entry.headline}
                    </p>
                  ) : (
                    <div className="flex-1" />
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink-200 pt-3 text-xs text-ink-600">
                    <span className="font-medium text-ink-900">
                      {entry.verifiedCapabilities} verified
                    </span>
                    <span>of {entry.totalCapabilities} capabilities</span>
                    {entry.location ? <span>· {entry.location}</span> : null}
                  </div>
                </Link>
              </Card>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
