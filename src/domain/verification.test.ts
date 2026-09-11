import { describe, expect, it } from 'vitest';

import {
  FALLBACK_VERIFICATION_STATUS,
  VERIFICATION_FILTER_OPTIONS,
  VERIFICATION_STATUSES,
  VERIFICATION_STATUS_META,
  isVerified,
  parseVerificationStatus,
} from './verification';

describe('the status registry', () => {
  it('describes every status', () => {
    // Guards against a status being added to the union with no presentation,
    // which would otherwise surface as a blank badge at runtime.
    for (const status of VERIFICATION_STATUSES) {
      const meta = VERIFICATION_STATUS_META[status];
      expect(meta.label, status).toBeTruthy();
      expect(meta.description, status).toBeTruthy();
      expect(meta.badgeClassName, status).toBeTruthy();
    }
  });

  it('derives filter options from the registry in registry order', () => {
    const expected = VERIFICATION_STATUSES.filter(
      (status) => VERIFICATION_STATUS_META[status].filterable,
    );
    expect(VERIFICATION_FILTER_OPTIONS.map((option) => option.value)).toEqual(
      expected,
    );
  });

  it('does not offer "not attempted" as a filter', () => {
    // It is the absence of data rather than an outcome a viewer filters for.
    expect(
      VERIFICATION_FILTER_OPTIONS.some(
        (option) => option.value === 'not_attempted',
      ),
    ).toBe(false);
  });

  it('counts only genuinely verified states towards progress', () => {
    expect(isVerified('verified')).toBe(true);
    expect(isVerified('submitted')).toBe(false);
    expect(isVerified('expired')).toBe(false);
    expect(isVerified('failed')).toBe(false);
    expect(isVerified('not_attempted')).toBe(false);
  });
});

describe('parseVerificationStatus', () => {
  it('passes through known statuses', () => {
    for (const status of VERIFICATION_STATUSES) {
      expect(parseVerificationStatus(status)).toBe(status);
    }
  });

  it('degrades an unknown status instead of throwing', () => {
    // If Supabase gains an enum member before the frontend ships support for
    // it, the dashboard must still render.
    expect(parseVerificationStatus('employer_verified')).toBe(
      FALLBACK_VERIFICATION_STATUS,
    );
    expect(parseVerificationStatus(null)).toBe(FALLBACK_VERIFICATION_STATUS);
    expect(parseVerificationStatus(42)).toBe(FALLBACK_VERIFICATION_STATUS);
  });
});
