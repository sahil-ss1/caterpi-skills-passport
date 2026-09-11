'use server';

import { revalidatePath } from 'next/cache';

import { DataError } from '@/data/errors';
import { setPassportVisibility } from '@/data/visibility';

export type ActionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

/**
 * Thin wrapper over the data-access layer, which owns the auth and
 * authorisation checks.
 *
 * Returns a result object instead of throwing so the toggle can roll its
 * optimistic state back and show why. Only a safe message crosses to the
 * client; the underlying Postgres code is logged server-side.
 */
export async function updateVisibilityAction(
  isPublic: boolean,
): Promise<ActionResult> {
  try {
    const { username } = await setPassportVisibility(isPublic);

    revalidatePath('/dashboard');
    revalidatePath(`/p/${username}`);

    return { ok: true };
  } catch (error) {
    if (error instanceof DataError) {
      return {
        ok: false,
        message:
          error.kind === 'forbidden'
            ? 'Your session has expired. Sign in again to change this.'
            : 'We could not save that change. Please try again.',
      };
    }

    console.error('[action] updateVisibilityAction failed', error);
    return { ok: false, message: 'Something went wrong. Please try again.' };
  }
}
