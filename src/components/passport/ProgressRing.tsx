import type { PassportProgress } from '@/domain/passport';
import { formatPercent } from '@/domain/score';

const SIZE = 132;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Overall verification progress.
 *
 * Reports verified levels out of total, not an average score: an employer
 * reads this as "how much of this passport is verified", and it stays
 * meaningful when scores are missing.
 */
export function ProgressRing({ progress }: { progress: PassportProgress }) {
  const offset = CIRCUMFERENCE * (1 - progress.fraction);
  const label =
    progress.totalLevels === 0
      ? 'No assessments taken yet'
      : `${progress.verifiedLevels} of ${progress.totalLevels} levels verified`;

  return (
    <div className="flex items-center gap-4">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-24 w-24 shrink-0 -rotate-90"
        role="img"
        aria-label={`Verification progress: ${formatPercent(progress.fraction)}. ${label}.`}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          className="fill-none stroke-ink-100"
          strokeWidth={STROKE}
        />
        {progress.fraction > 0 ? (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            className="fill-none stroke-brand-600"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        ) : null}
      </svg>

      <div>
        <p className="text-2xl font-semibold text-ink-900">
          {formatPercent(progress.fraction)}
        </p>
        <p className="text-sm text-ink-600">{label}</p>
      </div>
    </div>
  );
}
