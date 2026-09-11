import { describe, expect, it } from 'vitest';

import { normalizeScore } from '@/domain/score';
import type {
  MyCapabilityLevelRow,
  MyCapabilityRow,
  PublicPassportCapabilityRow,
  PublicPassportLevelRow,
} from '@/lib/supabase/database.types';

import { mapCapabilities, mapPublicCapabilities } from './mappers';

function capabilityRow(
  overrides: Partial<MyCapabilityRow> = {},
): MyCapabilityRow {
  return {
    talent_id: 'talent-1',
    capability_slug: 'seo',
    capability_name: 'SEO',
    capability_category: 'Acquisition',
    capability_description: null,
    sort_order: 2,
    raw_score: 63,
    status: 'verified',
    ...overrides,
  };
}

function levelRow(
  overrides: Partial<MyCapabilityLevelRow> = {},
): MyCapabilityLevelRow {
  return {
    talent_id: 'talent-1',
    capability_slug: 'seo',
    level: 1,
    assessment_title: 'Foundation — SEO',
    result_id: 'result-1',
    raw_score: 61,
    status: 'verified',
    submitted_at: null,
    verified_at: null,
    assessor_name: null,
    assessor_note: null,
    ...overrides,
  };
}

describe('mapCapabilities', () => {
  it('reproduces the SEO example from the brief', () => {
    const [capability] = mapCapabilities(
      [capabilityRow()],
      [
        levelRow({ level: 1 }),
        levelRow({ level: 2, result_id: 'result-2' }),
        // Level 3 has no row, which is how "not attempted" is represented.
      ],
    );

    expect(capability.name).toBe('SEO');
    expect(capability.score).toBe(normalizeScore(63));
    expect(capability.levels.map((level) => level.status)).toEqual([
      'verified',
      'verified',
      'not_attempted',
    ]);
  });

  it('orders capabilities by the taxonomy sort order, not query order', () => {
    const capabilities = mapCapabilities(
      [
        capabilityRow({ capability_slug: 'analytics', sort_order: 4 }),
        capabilityRow({ capability_slug: 'paid-media', sort_order: 1 }),
      ],
      [],
    );

    expect(capabilities.map((capability) => capability.slug)).toEqual([
      'paid-media',
      'analytics',
    ]);
  });

  it('keeps a capability with no score renderable', () => {
    const [capability] = mapCapabilities(
      [capabilityRow({ raw_score: null, status: 'submitted' })],
      [],
    );

    expect(capability.score).toBeNull();
    expect(capability.levels).toHaveLength(3);
  });

  it('ignores a level outside the known range', () => {
    // A fourth level added in Supabase should not produce a phantom entry.
    const [capability] = mapCapabilities(
      [capabilityRow()],
      [levelRow({ level: 4, result_id: 'result-4' })],
    );

    expect(capability.levels.map((level) => level.level)).toEqual([1, 2, 3]);
  });
});

describe('mapPublicCapabilities', () => {
  const publicCapability: PublicPassportCapabilityRow = {
    username: 'priya-sharma',
    capability_slug: 'seo',
    capability_name: 'SEO',
    capability_category: 'Acquisition',
    sort_order: 2,
    raw_score: 63,
    status: 'verified',
  };

  const publicLevel: PublicPassportLevelRow = {
    username: 'priya-sharma',
    capability_slug: 'seo',
    level: 1,
    status: 'verified',
  };

  it('exposes level verification without per-level scores', () => {
    const [capability] = mapPublicCapabilities(
      [publicCapability],
      [publicLevel],
    );

    expect(capability.levels[0]).toEqual({ level: 1, status: 'verified' });
    // The public level type has no score field at all; this asserts the
    // mapper does not smuggle one in at runtime either.
    expect(capability.levels[0]).not.toHaveProperty('score');
  });

  it('never emits private fields', () => {
    const [capability] = mapPublicCapabilities(
      [publicCapability],
      [publicLevel],
    );

    const forbidden = [
      'contact_email',
      'email',
      'id',
      'talent_id',
      'assessor_name',
      'assessor_note',
      'internal_notes',
      'submitted_at',
      'verified_at',
    ];

    for (const key of forbidden) {
      expect(Object.keys(capability)).not.toContain(key);
    }
  });
});
