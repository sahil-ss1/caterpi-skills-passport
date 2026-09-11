'use client';

import { useEffect } from 'react';

/**
 * A failure on the public route must not leak anything about why. Visitors
 * see the same neutral message whether the database is unreachable or a query
 * was rejected; the detail is logged server-side by `toDataError`.
 */
export default function PublicPassportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[public-passport] render failed', error);
  }, [error]);

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12 text-center"
    >
      <h1 className="text-xl font-semibold text-ink-900">
        This passport could not be loaded
      </h1>
      <p className="mt-2 text-sm text-ink-600">
        Something went wrong on our side. Please try again in a moment.
      </p>
      <div className="mt-6">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-900/90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
