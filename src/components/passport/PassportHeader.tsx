export function PassportHeader({
  fullName,
  currentRole,
  targetRole,
  headline,
  location,
}: {
  fullName: string;
  currentRole: string | null;
  targetRole: string | null;
  headline: string | null;
  location: string | null;
}) {
  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
        {fullName}
      </h1>

      <dl className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {currentRole ? (
          <div className="flex gap-1.5">
            <dt className="text-ink-400">Current</dt>
            <dd className="font-medium text-ink-900">{currentRole}</dd>
          </div>
        ) : null}

        {currentRole && targetRole ? (
          <span aria-hidden className="text-ink-200">
            |
          </span>
        ) : null}

        {targetRole ? (
          <div className="flex gap-1.5">
            <dt className="text-ink-400">Target</dt>
            <dd className="font-medium text-ink-900">{targetRole}</dd>
          </div>
        ) : null}
      </dl>

      {headline ? (
        <p className="mt-3 max-w-2xl text-sm text-ink-600">{headline}</p>
      ) : null}

      {location ? (
        <p className="mt-2 text-xs text-ink-400">{location}</p>
      ) : null}
    </header>
  );
}
