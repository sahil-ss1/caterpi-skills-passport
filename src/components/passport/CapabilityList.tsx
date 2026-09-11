'use client';

import { useMemo, useState } from 'react';

import {
  VERIFICATION_FILTER_OPTIONS,
  type VerificationStatus,
} from '@/domain/verification';
import { EmptyState } from '@/components/ui';

import { CapabilityCard, type CapabilityCardModel } from './CapabilityCard';

type Filter = VerificationStatus | 'all';

/**
 * The capability grid plus its status filter.
 *
 * This is the only Client Component on the dashboard that touches passport
 * data, and it receives that data already mapped and already reduced to what
 * the card renders — no database rows cross the boundary.
 *
 * Filter options come from the verification registry, so a new filterable
 * status appears here without this file changing.
 */
export function CapabilityList({
  capabilities,
  hrefBase,
}: {
  capabilities: readonly CapabilityCardModel[];
  hrefBase?: string;
}) {
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    if (filter === 'all') return capabilities;
    // Matches on the capability's own status or any of its levels, so
    // filtering by a level-granted state such as a verification still finds
    // the capability that holds it.
    return capabilities.filter(
      (capability) =>
        capability.status === filter ||
        capability.levels.some((level) => level.status === filter),
    );
  }, [capabilities, filter]);

  if (capabilities.length === 0) {
    return (
      <EmptyState
        title="No capabilities yet"
        description="Once an assessment is completed, the capability and its verification levels appear here."
      />
    );
  }

  return (
    <div>
      <fieldset className="mb-4">
        <legend className="sr-only">Filter capabilities by status</legend>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="All"
            value="all"
            checked={filter === 'all'}
            onSelect={setFilter}
          />
          {VERIFICATION_FILTER_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              value={option.value}
              checked={filter === option.value}
              onSelect={setFilter}
            />
          ))}
        </div>
      </fieldset>

      <p className="sr-only" role="status">
        {visible.length} of {capabilities.length} capabilities shown.
      </p>

      {visible.length === 0 ? (
        <EmptyState
          title="No capabilities match this filter"
          description="Try a different status, or clear the filter to see everything."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((capability) => (
            <li key={capability.slug}>
              <CapabilityCard
                capability={capability}
                href={hrefBase ? `${hrefBase}/${capability.slug}` : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A real radio input under the chip: arrow-key navigation, grouping and the
 * checked state all come from the browser rather than from ARIA.
 */
function FilterChip({
  label,
  value,
  checked,
  onSelect,
}: {
  label: string;
  value: Filter;
  checked: boolean;
  onSelect: (value: Filter) => void;
}) {
  return (
    <label
      className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600 ${
        checked
          ? 'bg-ink-900 text-white ring-ink-900'
          : 'bg-white text-ink-600 ring-ink-200 hover:bg-ink-50'
      }`}
    >
      <input
        type="radio"
        name="capability-status-filter"
        className="sr-only"
        checked={checked}
        onChange={() => onSelect(value)}
      />
      {label}
    </label>
  );
}
