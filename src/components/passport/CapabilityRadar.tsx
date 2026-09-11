import { type NormalizedScore, formatScore, toPercent } from '@/domain/score';

export interface RadarDatum {
  readonly name: string;
  readonly score: NormalizedScore | null;
}

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 104;
const LABEL_RADIUS = RADIUS + 26;
const RINGS = [0.25, 0.5, 0.75, 1];

/** Start at twelve o'clock and go clockwise. */
function angleFor(index: number, count: number): number {
  return -Math.PI / 2 + (index * 2 * Math.PI) / count;
}

function pointAt(index: number, count: number, radius: number) {
  const angle = angleFor(index, count);
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

/**
 * Capability visualisation.
 *
 * Hand-built rather than pulled from a chart library: the shape is a dozen
 * lines of trigonometry, and owning it means the accessible fallback and the
 * partial-data behaviour are real rather than whatever the library allows.
 *
 * Note it consumes `toPercent`, never a raw score. A change of source scale
 * in `domain/score.ts` reaches the chart automatically.
 */
export function CapabilityRadar({ data }: { data: readonly RadarDatum[] }) {
  const scored = data.filter((datum) => datum.score !== null);

  // A polygon needs three vertices to enclose an area. With fewer, a radar is
  // misleading, so fall back to bars rather than drawing a line or a dot.
  if (data.length < 3) {
    return <CapabilityBars data={data} />;
  }

  const vertices = data.map((datum, index) =>
    pointAt(index, data.length, (datum.score ?? 0) * RADIUS),
  );
  const polygon = vertices.map(({ x, y }) => `${x},${y}`).join(' ');

  const summary = scored
    .map((datum) => `${datum.name} ${formatScore(datum.score)}`)
    .join(', ');

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full max-w-[360px]"
        role="img"
        aria-label={
          summary
            ? `Capability radar chart. ${summary}.`
            : 'Capability radar chart. No capabilities have been scored yet.'
        }
      >
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={data
              .map((_, index) => {
                const { x, y } = pointAt(index, data.length, ring * RADIUS);
                return `${x},${y}`;
              })
              .join(' ')}
            className="fill-none stroke-ink-200"
            strokeWidth={1}
          />
        ))}

        {data.map((datum, index) => {
          const { x, y } = pointAt(index, data.length, RADIUS);
          return (
            <line
              key={datum.name}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              className="stroke-ink-200"
              strokeWidth={1}
            />
          );
        })}

        <polygon
          points={polygon}
          className="fill-brand-500/25 stroke-brand-600"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {data.map((datum, index) => {
          const { x, y } = vertices[index];
          const isScored = datum.score !== null;
          return (
            <circle
              key={datum.name}
              cx={x}
              cy={y}
              r={isScored ? 3.5 : 3}
              // Hollow marker distinguishes "no score yet" from a score of
              // zero, which both sit at the centre.
              className={
                isScored
                  ? 'fill-brand-600 stroke-white'
                  : 'fill-white stroke-ink-400'
              }
              strokeWidth={1.5}
            />
          );
        })}

        {data.map((datum, index) => {
          const { x, y } = pointAt(index, data.length, LABEL_RADIUS);
          const anchor =
            Math.abs(x - CENTER) < 12 ? 'middle' : x > CENTER ? 'start' : 'end';
          return (
            <text
              key={datum.name}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className={`text-[10px] font-medium ${
                datum.score === null ? 'fill-ink-400' : 'fill-ink-600'
              }`}
            >
              {datum.name}
            </text>
          );
        })}
      </svg>

      {/*
        The chart is decorative for anyone who cannot see it; this list is the
        actual data. Visually hidden rather than omitted so the values stay
        available to screen readers and to find-in-page.
      */}
      <figcaption className="sr-only">
        <ul>
          {data.map((datum) => (
            <li key={datum.name}>
              {datum.name}: {formatScore(datum.score)}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

/** Fallback for one or two capabilities, where a polygon has no area. */
function CapabilityBars({ data }: { data: readonly RadarDatum[] }) {
  return (
    <ul className="space-y-3">
      {data.map((datum) => (
        <li key={datum.name}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-ink-900">
              {datum.name}
            </span>
            <span className="text-xs text-ink-600">
              {formatScore(datum.score)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${datum.score === null ? 0 : toPercent(datum.score)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
