/**
 * Database rows in, domain objects out.
 *
 * This is the seam the rest of the app is written against. Column renames,
 * score-scale changes and new enum members are absorbed here; components only
 * ever see `Capability` and `PublicCapability`.
 *
 * Deliberately free of `server-only` so the shaping logic can be unit tested
 * without a database.
 */

import {
  type Capability,
  type CapabilityLevel,
  type LevelVerification,
  type PublicCapability,
  type PublicLevelVerification,
  buildLevelLadder,
  fillLevels,
  isCapabilityLevel,
} from '@/domain/passport';
import { normalizeScore } from '@/domain/score';
import { parseVerificationStatus } from '@/domain/verification';
import type {
  MyCapabilityLevelRow,
  MyCapabilityRow,
  PublicPassportCapabilityRow,
  PublicPassportLevelRow,
} from '@/lib/supabase/database.types';

function groupLevels<Row extends { capability_slug: string; level: number }, Value>(
  rows: readonly Row[],
  toValue: (row: Row, level: CapabilityLevel) => Value,
): Map<string, Map<CapabilityLevel, Value>> {
  const bySlug = new Map<string, Map<CapabilityLevel, Value>>();

  for (const row of rows) {
    // A level outside the known range means the backend added one this build
    // does not render yet. Skipping keeps the ladder correct rather than
    // producing a fourth, unlabelled column.
    if (!isCapabilityLevel(row.level)) continue;

    let bucket = bySlug.get(row.capability_slug);
    if (!bucket) {
      bucket = new Map();
      bySlug.set(row.capability_slug, bucket);
    }
    bucket.set(row.level, toValue(row, row.level));
  }

  return bySlug;
}

export function mapCapabilities(
  capabilityRows: readonly MyCapabilityRow[],
  levelRows: readonly MyCapabilityLevelRow[],
): Capability[] {
  const levelsBySlug = groupLevels<MyCapabilityLevelRow, LevelVerification>(
    levelRows,
    (row, level) => ({
      level,
      status: parseVerificationStatus(row.status),
      score: normalizeScore(row.raw_score),
    }),
  );

  return [...capabilityRows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      slug: row.capability_slug,
      name: row.capability_name,
      category: row.capability_category,
      score: normalizeScore(row.raw_score),
      status: parseVerificationStatus(row.status),
      levels: buildLevelLadder(levelsBySlug.get(row.capability_slug) ?? new Map()),
    }));
}

export function mapPublicCapabilities(
  capabilityRows: readonly PublicPassportCapabilityRow[],
  levelRows: readonly PublicPassportLevelRow[],
): PublicCapability[] {
  const levelsBySlug = groupLevels<PublicPassportLevelRow, PublicLevelVerification>(
    levelRows,
    (row, level) => ({ level, status: parseVerificationStatus(row.status) }),
  );

  return [...capabilityRows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => {
      const present = levelsBySlug.get(row.capability_slug) ?? new Map();
      return {
        slug: row.capability_slug,
        name: row.capability_name,
        category: row.capability_category,
        score: normalizeScore(row.raw_score),
        status: parseVerificationStatus(row.status),
        levels: fillLevels<PublicLevelVerification>(present, (level) => ({
          level,
          status: 'not_attempted',
        })),
      };
    });
}
