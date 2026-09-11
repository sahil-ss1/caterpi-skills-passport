import type { EvidenceItem } from '@/domain/passport';

const UNAVAILABLE_COPY: Record<
  NonNullable<EvidenceItem['unavailableReason']>,
  string
> = {
  missing: 'This file is no longer stored against the assessment.',
  unauthorised: 'You do not currently have access to this file.',
  expired: 'This link has expired. Reload the page to request a new one.',
};

function formatSize(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Supporting evidence for one assessment.
 *
 * Unavailable evidence renders as a labelled, non-interactive row rather than
 * a dead link or a hidden item: the record exists and the talent should see
 * that it does, along with why it cannot be opened.
 */
export function EvidenceList({
  evidence,
}: {
  evidence: readonly EvidenceItem[];
}) {
  if (evidence.length === 0) {
    return (
      <p className="text-xs text-ink-400">
        No supporting evidence was attached to this assessment.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {evidence.map((item) => {
        const size = formatSize(item.sizeBytes);

        if (item.url === null) {
          return (
            <li
              key={item.id}
              className="rounded-lg border border-dashed border-ink-200 bg-ink-50 px-3 py-2"
            >
              <p className="truncate text-xs font-medium text-ink-600">
                {item.fileName}
              </p>
              <p className="mt-0.5 text-xs text-ink-400">
                {UNAVAILABLE_COPY[item.unavailableReason ?? 'missing']}
              </p>
            </li>
          );
        }

        return (
          <li key={item.id}>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 bg-white px-3 py-2 transition hover:border-brand-200 hover:bg-brand-50"
            >
              <span className="truncate text-xs font-medium text-brand-700 underline underline-offset-2">
                {item.fileName}
              </span>
              {size ? (
                <span className="shrink-0 text-xs text-ink-400">{size}</span>
              ) : null}
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
