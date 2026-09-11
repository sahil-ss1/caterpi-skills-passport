import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';

import { requireUser } from './auth';
import { toDataError } from './errors';

/**
 * Flips the public passport on or off for the signed-in talent.
 *
 * Authorisation is re-checked here rather than relying on the page that
 * rendered the toggle: a Server Action is its own entry point and is
 * reachable by direct POST. `requireUser` establishes who is calling,
 * `.eq('id', ...)` scopes the write, and the `profiles_update_own` policy
 * rejects it at the database if either is wrong.
 *
 * Returns the username so the caller can revalidate the matching public
 * route.
 */
export async function setPassportVisibility(
  isPublic: boolean,
): Promise<{ username: string; isPublic: boolean }> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({ is_public: isPublic })
    .eq('id', user.id)
    .select('username, is_public')
    .single();

  if (error) throw toDataError(error, 'setPassportVisibility');

  return { username: data.username, isPublic: data.is_public };
}
