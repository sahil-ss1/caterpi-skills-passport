import 'server-only';

import { cache } from 'react';

import { type PublicPassport, computeProgress } from '@/domain/passport';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { toDataError, unwrap } from './errors';
import { mapPublicCapabilities } from './mappers';

/**
 * The passport as an anonymous visitor sees it.
 *
 * Three things enforce the boundary, in order of authority:
 *
 *  1. Postgres. `profiles` and every other base table have no policy for the
 *     `anon` role and are explicitly revoked from it, so this query cannot
 *     read them. It reads `public_passports`, a security-definer view whose
 *     body filters `is_public` and selects a fixed column list. A private
 *     passport therefore returns zero rows — hiding it in the UI is not
 *     involved, and flipping the toggle off takes effect immediately.
 *  2. This function. It returns `PublicPassport`, which has no field for an
 *     email, an id, an assessor note or a submission date, so there is
 *     nowhere for one to travel even if a view gained a column.
 *  3. The route. `/p/[username]` renders only what this returns.
 *
 * Note this deliberately does not consult the signed-in user. The public
 * route shows every visitor the same thing, which means "what does the public
 * see" is answerable by reading one function.
 */
export const getPublicPassport = cache(
  async (username: string): Promise<PublicPassport | null> => {
    const supabase = await createSupabaseServerClient();

    const profileResult = await supabase
      .from('public_passports')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (profileResult.error) {
      throw toDataError(profileResult.error, 'getPublicPassport.profile');
    }

    // Either no such username, or the passport is private. The route renders
    // the same not-found response for both, so the URL cannot be used to
    // probe which usernames exist.
    if (!profileResult.data) return null;

    const [capabilityResult, levelResult] = await Promise.all([
      supabase
        .from('public_passport_capabilities')
        .select('*')
        .eq('username', username),
      supabase
        .from('public_passport_levels')
        .select('*')
        .eq('username', username),
    ]);

    const capabilityRows = unwrap(
      capabilityResult,
      'getPublicPassport.capabilities',
    );
    const levelRows = unwrap(levelResult, 'getPublicPassport.levels');

    const profile = profileResult.data;
    const capabilities = mapPublicCapabilities(capabilityRows, levelRows);

    return {
      username: profile.username,
      fullName: profile.full_name,
      currentRole: profile.current_role_title,
      targetRole: profile.target_role_title,
      headline: profile.headline,
      location: profile.location,
      avatarUrl: profile.avatar_url,
      capabilities,
      progress: computeProgress(capabilities),
    };
  },
);
