import { describe, expect, it } from 'vitest';

import {
  CAPABILITY_LEVELS,
  type CapabilityLevel,
  type LevelVerification,
  averageScore,
  buildLevelLadder,
  computeProgress,
} from './passport';
import { normalizeScore } from './score';
import type { VerificationStatus } from './verification';

function ladderOf(...statuses: VerificationStatus[]) {
  return {
    levels: statuses.map((status, index) => ({
      level: (index + 1) as CapabilityLevel,
      status,
      score: null,
    })),
  };
}

describe('buildLevelLadder', () => {
  it('fills absent levels as not attempted', () => {
    const present = new Map<CapabilityLevel, LevelVerification>([
      [1, { level: 1, status: 'verified', score: null }],
      [2, { level: 2, status: 'verified', score: null }],
    ]);

    // Matches the SEO example in the brief: levels 1 and 2 verified, level 3
    // never attempted and therefore absent from Supabase.
    expect(buildLevelLadder(present)).toEqual([
      { level: 1, status: 'verified', score: null },
      { level: 2, status: 'verified', score: null },
      { level: 3, status: 'not_attempted', score: null },
    ]);
  });

  it('always returns one entry per level, ascending', () => {
    const ladder = buildLevelLadder(new Map());
    expect(ladder.map((entry) => entry.level)).toEqual([
      ...CAPABILITY_LEVELS,
    ]);
  });
});

describe('computeProgress', () => {
  it('counts verified levels across capabilities', () => {
    const progress = computeProgress([
      ladderOf('verified', 'verified', 'not_attempted'),
      ladderOf('verified', 'failed', 'not_attempted'),
    ]);

    expect(progress).toEqual({
      verifiedLevels: 3,
      totalLevels: 6,
      fraction: 0.5,
    });
  });

  it('reports zero rather than dividing by zero for a talent with no data', () => {
    expect(computeProgress([])).toEqual({
      verifiedLevels: 0,
      totalLevels: 0,
      fraction: 0,
    });
  });

  it('excludes expired verifications from progress', () => {
    const progress = computeProgress([ladderOf('expired', 'expired', 'expired')]);
    expect(progress.verifiedLevels).toBe(0);
  });
});

describe('averageScore', () => {
  it('averages only the capabilities that carry a score', () => {
    const average = averageScore([
      { score: normalizeScore(80) },
      { score: normalizeScore(60) },
      { score: null },
    ]);
    expect(average).toBe(0.7);
  });

  it('returns null when nothing is scored', () => {
    // Averaging to 0 would render a partially-assessed passport as a failing
    // one, which is worse than showing an empty state.
    expect(averageScore([{ score: null }, { score: null }])).toBeNull();
    expect(averageScore([])).toBeNull();
  });
});
