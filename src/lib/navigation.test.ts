import { describe, expect, it } from 'vitest';

import { DEFAULT_REDIRECT, safeRedirectPath } from './navigation';

describe('safeRedirectPath', () => {
  it('keeps a same-origin path', () => {
    expect(safeRedirectPath('/dashboard/settings')).toBe('/dashboard/settings');
    expect(safeRedirectPath('/p/priya-sharma')).toBe('/p/priya-sharma');
    expect(safeRedirectPath('/dashboard?welcome=1')).toBe('/dashboard?welcome=1');
  });

  // The reason this helper exists. A protocol-relative URL starts with a
  // slash but sends the browser to another origin.
  it.each([
    '//evil.example',
    '///evil.example',
    '/\\evil.example',
    'https://evil.example',
    'http://evil.example',
    'javascript:alert(1)',
    'dashboard',
    '',
  ])('refuses %j', (value) => {
    expect(safeRedirectPath(value)).toBe(DEFAULT_REDIRECT);
  });

  it('refuses anything that is not a string', () => {
    expect(safeRedirectPath(undefined)).toBe(DEFAULT_REDIRECT);
    expect(safeRedirectPath(null)).toBe(DEFAULT_REDIRECT);
    expect(safeRedirectPath(['/dashboard'])).toBe(DEFAULT_REDIRECT);
  });

  it('honours a custom fallback', () => {
    expect(safeRedirectPath('//evil.example', '/')).toBe('/');
  });
});
