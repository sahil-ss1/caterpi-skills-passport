import 'server-only';

import { cache } from 'react';

import {
  type ProfileDraft,
  type ProfileFieldErrors,
  validateProfile,
} from '@/domain/profile';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { requireUser } from './auth';
import { toDataError, unwrap } from './errors';

export type { ProfileDraft, ProfileFieldErrors };

/** The editable surface of a profile. Note that `is_public` is not here: the
 * visibility toggle is its own action with its own revalidation, and folding
 * it into a form that saves on submit would make the optimistic toggle lie. */
export interface EditableProfile {
  readonly username: string;
  readonly fullName: string;
  readonly currentRole: string | null;
  readonly targetRole: string | null;
  readonly headline: string | null;
  readonly location: string | null;
  readonly contactEmail: string | null;
}

const EDITABLE_COLUMNS =
  'username, full_name, current_role_title, target_role_title, headline, location, contact_email';

export const getEditableProfile = cache(async (): Promise<EditableProfile> => {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const result = await supabase
    .from('profiles')
    .select(EDITABLE_COLUMNS)
    .eq('id', user.id)
    .single();

  const row = unwrap(result, 'getEditableProfile');

  return {
    username: row.username,
    fullName: row.full_name,
    currentRole: row.current_role_title,
    targetRole: row.target_role_title,
    headline: row.headline,
    location: row.location,
    contactEmail: row.contact_email,
  };
});

export type UpdateProfileOutcome =
  | { readonly ok: true; readonly username: string }
  | { readonly ok: false; readonly message: string; readonly errors: ProfileFieldErrors };

/**
 * Writes the profile for the signed-in talent.
 *
 * `.eq('id', user.id)` plus the `profiles_update_own` policy means this
 * cannot be pointed at another row even though the action is a public POST
 * endpoint.
 *
 * Empty strings are stored as `null` so "not set" is one value rather than
 * two, which keeps the public passport from rendering blank fields.
 */
export async function updateProfile(
  draft: ProfileDraft,
): Promise<UpdateProfileOutcome> {
  const errors = validateProfile(draft);
  if (Object.keys(errors).length > 0) {
    return { ok: false, message: 'Check the highlighted fields.', errors };
  }

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const blankToNull = (value: string) => (value.trim() === '' ? null : value.trim());

  const { data, error } = await supabase
    .from('profiles')
    .update({
      username: draft.username.trim(),
      full_name: draft.fullName.trim(),
      current_role_title: blankToNull(draft.currentRole),
      target_role_title: blankToNull(draft.targetRole),
      headline: blankToNull(draft.headline),
      location: blankToNull(draft.location),
    })
    .eq('id', user.id)
    .select('username')
    .single();

  if (error) {
    // 23505 is the unique violation on `username`. It is the one database
    // error a person can actually fix, so it gets its own message.
    if (error.code === '23505') {
      return {
        ok: false,
        message: 'That username is already taken.',
        errors: { username: 'Choose a different username.' },
      };
    }
    throw toDataError(error, 'updateProfile');
  }

  return { ok: true, username: data.username };
}
