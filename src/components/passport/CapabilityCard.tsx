import Link from 'next/link';

import type { NormalizedScore } from '@/domain/score';
import { formatScore, toPercent } from '@/domain/score';
import type { VerificationStatus } from '@/domain/verification';

import { LevelLadder } from './LevelLadder';
import { VerificationBadge } from './VerificationBadge';

/**
 * Structural props rather than the `Capability` type, so the same card serves
 * the owner's dashboard and the public passport. The public variant simply
 * has no per-level scores to pass.
 */
export interface CapabilityCardModel {
  readonly slug: string;
  readonly name: string;
  readonly category: string | null;
  readonly score: NormalizedScore | null;
  readonly status: VerificationStatus;
  readonly levels: readonly { level: number; status: VerificationStatus }[];
}

export function CapabilityCard({
  capability,
  href,
}: {
  capability: CapabilityCardModel;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink-900">
            {capability.name}
          </h3>
          {capability.category ? (
            <p className="mt-0.5 text-xs text-ink-400">{capability.category}</p>
          ) : null}
        </div>
        <VerificationBadge status={capability.status} />
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs font-medium text-ink-600">
            Capability score
          </span>
          <span className="text-sm font-semibold text-ink-900">
            {formatScore(capability.score)}
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-ink-100"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-brand-600"
            style={{
              width: `${capability.score === null ? 0 : toPercent(capability.score)}%`,
            }}
          />
        </div>
      </div>

      <LevelLadder levels={capability.levels} className="mt-4" />
    </>
  );

  const shell =
    'block h-full rounded-[--radius-card] border border-ink-200 bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)]';

  if (!href) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <Link
      href={href}
      className={`${shell} transition hover:border-brand-200 hover:shadow-[0_4px_12px_rgba(16,24,40,0.07)]`}
    >
      {body}
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-700">
        View assessment history
        <span aria-hidden>&rarr;</span>
      </span>
    </Link>
  );
}
