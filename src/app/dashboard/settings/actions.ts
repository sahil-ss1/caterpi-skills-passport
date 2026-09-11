'use server';

import { revalidatePath } from 'next/cache';

import { DataError } from '@/data/errors';
import {
  type ProfileFieldErrors,
  updateProfile,
} from '@/data/profile';

export type ProfileFormState =
  | { readonly status: 'idle' }
  | { readonly status: 'saved'; readonly username: string }
  | {
      readonly status: 'error';
      readonly message: string;
      readonly errors: ProfileFieldErrors;
    };

/**
 * Saves the profile form.
 *
 * The username can change, so both the old and the new public route are
 * revalidated — otherwise the previous URL would keep serving a cached page
 * for a handle that no longer resolves.
 */
export async function updateProfileAction(
  previousUsername: string,
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const draft = {
    username: String(formData.get('username') ?? '').trim().toLowerCase(),
    fullName: String(formData.get('fullName') ?? ''),
    currentRole: String(formData.get('currentRole') ?? ''),
    targetRole: String(formData.get('targetRole') ?? ''),
    headline: String(formData.get('headline') ?? ''),
    location: String(formData.get('location') ?? ''),
  };

  try {
    const outcome = await updateProfile(draft);

    if (!outcome.ok) {
      return { status: 'error', message: outcome.message, errors: outcome.errors };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/settings');
    revalidatePath(`/p/${previousUsername}`);
    if (outcome.username !== previousUsername) {
      revalidatePath(`/p/${outcome.username}`);
    }

    return { status: 'saved', username: outcome.username };
  } catch (error) {
    if (error instanceof DataError) {
      return {
        status: 'error',
        message:
          error.kind === 'forbidden'
            ? 'Your session has expired. Sign in again to save changes.'
            : 'We could not save your profile. Please try again.',
        errors: {},
      };
    }

    console.error('[action] updateProfileAction failed', error);
    return {
      status: 'error',
      message: 'Something went wrong. Please try again.',
      errors: {},
    };
  }
}
