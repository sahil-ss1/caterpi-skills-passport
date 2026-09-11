import Link from 'next/link';

/**
 * Shown both for an unknown username and for a passport whose owner has
 * turned sharing off. Keeping the two indistinguishable means the URL cannot
 * be used to discover which talents exist on the platform.
 */
export default function PublicPassportNotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12 text-center"
    >
      <h1 className="text-xl font-semibold text-ink-900">
        This passport is not available
      </h1>
      <p className="mt-2 text-sm text-ink-600">
        The link may be incorrect, or the talent may have made their passport
        private.
      </p>
      <p className="mt-6">
        <Link
          href="/login"
          className="text-sm font-medium text-brand-700 underline underline-offset-2"
        >
          Sign in to Caterpi
        </Link>
      </p>
    </main>
  );
}
