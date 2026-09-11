import { describe, expect, it } from 'vitest';

import { type ProfileDraft, validateProfile } from './profile';

const valid: ProfileDraft = {
  username: 'priya-sharma',
  fullName: 'Priya Sharma',
  currentRole: 'Senior Performance Marketer',
  targetRole: 'Head of Growth',
  headline: 'Performance marketer.',
  location: 'Bengaluru, India',
};

describe('validateProfile', () => {
  it('accepts a complete draft', () => {
    expect(validateProfile(valid)).toEqual({});
  });

  it('accepts optional fields left blank', () => {
    expect(
      validateProfile({ ...valid, currentRole: '', targetRole: '', location: '' }),
    ).toEqual({});
  });

  it('requires a name', () => {
    expect(validateProfile({ ...valid, fullName: '   ' }).fullName).toBeDefined();
  });

  // These mirror the check constraint in Postgres. If they drift, the form
  // starts rejecting handles the database would accept, or vice versa.
  it.each([
    ['ab', 'shorter than three characters'],
    ['-priya', 'leading hyphen'],
    ['priya-', 'trailing hyphen'],
    ['Priya', 'uppercase'],
    ['priya sharma', 'a space'],
    ['priya_sharma', 'an underscore'],
    ['a'.repeat(41), 'longer than forty characters'],
  ])('rejects %s (%s)', (username) => {
    expect(validateProfile({ ...valid, username }).username).toBeDefined();
  });

  it.each(['abc', 'a-b', 'priya-sharma-2', 'a'.repeat(40)])(
    'accepts %s',
    (username) => {
      expect(validateProfile({ ...valid, username }).username).toBeUndefined();
    },
  );

  it('rejects an over-long headline', () => {
    expect(
      validateProfile({ ...valid, headline: 'x'.repeat(281) }).headline,
    ).toBeDefined();
  });
});
