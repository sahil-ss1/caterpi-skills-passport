import { describe, expect, it } from 'vitest';

import {
  NO_SCORE_LABEL,
  SOURCE_SCALE,
  formatPercent,
  formatScore,
  normalizeScore,
  toPercent,
} from './score';

describe('normalizeScore', () => {
  it('projects a source-scale value onto 0..1', () => {
    const midpoint = (SOURCE_SCALE.min + SOURCE_SCALE.max) / 2;
    expect(normalizeScore(midpoint)).toBe(0.5);
    expect(normalizeScore(SOURCE_SCALE.min)).toBe(0);
    expect(normalizeScore(SOURCE_SCALE.max)).toBe(1);
  });

  it('accepts the string form PostgREST can return for numeric columns', () => {
    expect(normalizeScore(String(SOURCE_SCALE.max))).toBe(1);
  });

  it('treats absent and unusable values as unscored rather than zero', () => {
    // Zero is a real score; conflating it with "no score" would make an
    // unassessed capability look like a failed one.
    expect(normalizeScore(null)).toBeNull();
    expect(normalizeScore(undefined)).toBeNull();
    expect(normalizeScore('')).toBeNull();
    expect(normalizeScore('not a number')).toBeNull();
    expect(normalizeScore(Number.NaN)).toBeNull();
    expect(normalizeScore(SOURCE_SCALE.min)).toBe(0);
  });

  it('clamps values outside the source scale', () => {
    expect(normalizeScore(SOURCE_SCALE.max * 2)).toBe(1);
    expect(normalizeScore(SOURCE_SCALE.min - 10)).toBe(0);
  });
});

describe('score presentation', () => {
  it('derives chart geometry from the normalised value', () => {
    const score = normalizeScore((SOURCE_SCALE.min + SOURCE_SCALE.max) / 2);
    expect(score).not.toBeNull();
    expect(toPercent(score!)).toBe(50);
  });

  it('labels the reference SEO score from the brief', () => {
    // 63 on the current source scale should read as 63%.
    expect(formatScore(normalizeScore(63))).toBe('63%');
  });

  it('labels an unscored capability instead of rendering an empty string', () => {
    expect(formatScore(null)).toBe(NO_SCORE_LABEL);
  });

  it('reports progress as a percentage independent of the score scale', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(1)).toBe('100%');
    expect(formatPercent(1.4)).toBe('100%');
  });
});
