/**
 * Profile editing rules.
 *
 * Pure, and deliberately outside `src/data` so it carries no `server-only`
 * import and can be unit tested. The database has the same constraints; these
 * exist to turn a constraint violation into a message someone can act on.
 */

export interface ProfileDraft {
  readonly username: string;
  readonly fullName: string;
  readonly currentRole: string;
  readonly targetRole: string;
  readonly headline: string;
  readonly location: string;
}

/** Mirrors the check constraint on `profiles.username`. */
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;

export const MAX_FULL_NAME = 120;
export const MAX_HEADLINE = 280;

export type ProfileFieldErrors = Partial<Record<keyof ProfileDraft, string>>;

export function validateProfile(draft: ProfileDraft): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};

  const fullName = draft.fullName.trim();
  if (!fullName) {
    errors.fullName = 'Enter your name.';
  } else if (fullName.length > MAX_FULL_NAME) {
    errors.fullName = `Keep this under ${MAX_FULL_NAME} characters.`;
  }

  if (!USERNAME_PATTERN.test(draft.username)) {
    errors.username =
      'Use 3 to 40 characters: lowercase letters, numbers and hyphens, starting and ending with a letter or number.';
  }

  if (draft.headline.length > MAX_HEADLINE) {
    errors.headline = `Keep your headline under ${MAX_HEADLINE} characters.`;
  }

  return errors;
}

export function isValidProfile(draft: ProfileDraft): boolean {
  return Object.keys(validateProfile(draft)).length === 0;
}
