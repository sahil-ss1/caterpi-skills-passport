/**
 * Where a `?next=` parameter is allowed to send someone.
 *
 * A bare `startsWith('/')` check is not enough: `//evil.com` starts with a
 * slash and is a protocol-relative URL, so a browser treats it as absolute
 * and leaves the site. `/\evil.com` is treated the same way by some browsers.
 * Anything that is not an unambiguous same-origin path falls back.
 */
export const DEFAULT_REDIRECT = '/dashboard';

export function safeRedirectPath(
  value: unknown,
  fallback: string = DEFAULT_REDIRECT,
): string {
  if (typeof value !== 'string' || value === '') return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;

  return value;
}
