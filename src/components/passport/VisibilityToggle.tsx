'use client';

import Link from 'next/link';
import { useOptimistic, useState, useTransition } from 'react';

import { updateVisibilityAction } from '@/app/actions';

/**
 * Public passport on/off.
 *
 * `useOptimistic` gives the rollback for free: the optimistic value is layered
 * over the server-rendered prop, so if the action fails the prop never
 * changes and React discards the optimistic value when the transition ends.
 * There is no local copy of the truth to get out of sync — which is also why
 * the saved state survives a refresh without any client-side persistence.
 */
export function VisibilityToggle({
  isPublic,
  username,
}: {
  isPublic: boolean;
  username: string;
}) {
  const [optimisticIsPublic, setOptimisticIsPublic] = useOptimistic(isPublic);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !optimisticIsPublic;
    setError(null);

    startTransition(async () => {
      setOptimisticIsPublic(next);
      const result = await updateVisibilityAction(next);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className="rounded-[--radius-card] border border-ink-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900">Public passport</p>
          <p className="mt-1 text-sm text-ink-600">
            {optimisticIsPublic
              ? 'Anyone with the link can view your verified capabilities.'
              : 'Your passport is private. Only you can see it.'}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={optimisticIsPublic}
          aria-label="Make passport public"
          onClick={toggle}
          disabled={isPending}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition disabled:cursor-progress disabled:opacity-70 ${
            optimisticIsPublic ? 'bg-brand-600' : 'bg-ink-200'
          }`}
        >
          <span
            aria-hidden
            className={`pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
              optimisticIsPublic ? 'left-[1.375rem]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* Announced politely so a screen reader hears the outcome, not every
          intermediate state. */}
      <p role="status" className="sr-only">
        {isPending
          ? 'Saving visibility change'
          : `Passport is ${optimisticIsPublic ? 'public' : 'private'}`}
      </p>

      {optimisticIsPublic ? (
        <p className="mt-3 truncate text-xs text-ink-600">
          <Link
            href={`/p/${username}`}
            className="font-medium text-brand-700 underline underline-offset-2"
          >
            /p/{username}
          </Link>
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-xs font-medium text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}
