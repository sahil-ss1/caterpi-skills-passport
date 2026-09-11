'use client';

import { useEffect } from 'react';

/**
 * Catches anything the data layer throws, including `DataError`.
 *
 * Only a generic message is shown: the Postgres code and policy details were
 * already logged server-side by `toDataError`, and echoing them here would
 * describe the schema to anyone who triggers a failure.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard] render failed', error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <div
        role="alert"
        className="rounded-[--radius-card] border border-rose-200 bg-rose-50 p-6 text-center"
      >
        <h1 className="text-base font-semibold text-rose-900">
          We could not load your passport
        </h1>
        <p className="mt-2 text-sm text-rose-800">
          This is usually temporary. Try again, and if it keeps happening your
          session may have expired.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-rose-700">
            Reference: {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-900/90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
