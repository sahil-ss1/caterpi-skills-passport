import type { VerificationStatus } from '@/domain/verification';

import { VerificationBadge } from './VerificationBadge';

export interface LadderEntry {
  readonly level: number;
  readonly status: VerificationStatus;
}

/**
 * The three verification levels of one capability.
 *
 * A definition list rather than a row of divs: the relationship between
 * "Level 2" and "Verified" is the content, and `dl` conveys it without
 * needing ARIA.
 */
export function LevelLadder({
  levels,
  className = '',
}: {
  levels: readonly LadderEntry[];
  className?: string;
}) {
  return (
    <dl className={`flex flex-wrap gap-x-4 gap-y-2 ${className}`}>
      {levels.map((entry) => (
        <div key={entry.level} className="flex items-center gap-1.5">
          <dt className="text-xs font-medium text-ink-600">
            Level {entry.level}
          </dt>
          <dd>
            <VerificationBadge status={entry.status} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
