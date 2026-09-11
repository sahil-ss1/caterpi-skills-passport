import { describe, expect, it } from 'vitest';

import {
  type AssessmentQuestion,
  answeredCount,
  availabilityPresentation,
  isComplete,
  resolveAvailability,
} from './assessment';

const questions: AssessmentQuestion[] = [
  { id: 'q1', prompt: 'One', options: [{ id: 'a', label: 'A' }] },
  { id: 'q2', prompt: 'Two', options: [{ id: 'b', label: 'B' }] },
];

describe('resolveAvailability', () => {
  it('offers an untouched assessment that has questions', () => {
    expect(resolveAvailability(null, 4)).toEqual({ kind: 'available' });
    expect(resolveAvailability('not_attempted', 4)).toEqual({ kind: 'available' });
  });

  it('treats a level with no question bank as assessor led', () => {
    expect(resolveAvailability(null, 0)).toEqual({ kind: 'assessor_led' });
  });

  // The important one: a talent must never be offered a route that could
  // overwrite an assessor's decision.
  it('locks a verified or submitted assessment', () => {
    expect(resolveAvailability('verified', 4)).toEqual({ kind: 'verified' });
    expect(resolveAvailability('submitted', 4)).toEqual({ kind: 'awaiting_review' });
  });

  it('allows a retake after a failed or expired result', () => {
    expect(resolveAvailability('failed', 4)).toEqual({
      kind: 'retake',
      previousStatus: 'failed',
    });
    expect(resolveAvailability('expired', 4)).toEqual({
      kind: 'retake',
      previousStatus: 'expired',
    });
  });

  it('prefers the locked state over the missing question bank', () => {
    // A verified expert level has no questions, but it is verified, not
    // "assessor led and available".
    expect(resolveAvailability('verified', 0)).toEqual({ kind: 'verified' });
  });
});

describe('availabilityPresentation', () => {
  it('only lets startable states start', () => {
    expect(availabilityPresentation({ kind: 'available' }).canStart).toBe(true);
    expect(
      availabilityPresentation({ kind: 'retake', previousStatus: 'failed' }).canStart,
    ).toBe(true);

    expect(availabilityPresentation({ kind: 'verified' }).canStart).toBe(false);
    expect(availabilityPresentation({ kind: 'awaiting_review' }).canStart).toBe(false);
    expect(availabilityPresentation({ kind: 'assessor_led' }).canStart).toBe(false);
  });

  it('names the previous outcome when offering a retake', () => {
    const presentation = availabilityPresentation({
      kind: 'retake',
      previousStatus: 'expired',
    });
    expect(presentation.hint).toContain('expired');
  });
});

describe('answer tracking', () => {
  it('counts answered questions', () => {
    expect(answeredCount(questions, {})).toBe(0);
    expect(answeredCount(questions, { q1: 'a' })).toBe(1);
    expect(answeredCount(questions, { q1: 'a', q2: 'b' })).toBe(2);
  });

  it('is complete only when every question has an answer', () => {
    expect(isComplete(questions, { q1: 'a' })).toBe(false);
    expect(isComplete(questions, { q1: 'a', q2: 'b' })).toBe(true);
  });

  it('ignores answers to questions that are not on the paper', () => {
    expect(answeredCount(questions, { q9: 'z' })).toBe(0);
    expect(isComplete(questions, { q1: 'a', q2: 'b', q9: 'z' })).toBe(true);
  });
});
