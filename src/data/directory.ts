import 'server-only';

import { cache } from 'react';

import { createSupabaseServerClient } from '@/lib/supabase/server';

import { unwrap } from './errors';

export interface DirectoryEntry {
  readonly username: string;
  readonly fullName: string;
  readonly currentRole: string | null;
  readonly targetRole: string | null;
  readonly headline: string | null;
  readonly location: string | null;
  readonly verifiedCapabilities: number;
  readonly totalCapabilities: number;
}

/**
 * The browse page's data.
 *
 * Reads `public_passport_directory`, which is filtered on `is_public` in SQL
 * for the same reason the passport route is: a talent who has not opted in is
 * not omitted from the list by the UI, they are absent from the result set.
 * Switching visibility off removes them from here on the next request.
 */
export const getPublicDirectory = cache(
  async (): Promise<readonly DirectoryEntry[]> => {
    const supabase = await createSupabaseServerClient();

    const rows = unwrap(
      await supabase
        .from('public_passport_directory')
        .select('*')
        .order('verified_capability_count', { ascending: false })
        .order('username'),
      'getPublicDirectory',
    );

    return rows.map((row) => ({
      username: row.username,
      fullName: row.full_name,
      currentRole: row.current_role_title,
      targetRole: row.target_role_title,
      headline: row.headline,
      location: row.location,
      verifiedCapabilities: row.verified_capability_count,
      totalCapabilities: row.capability_count,
    }));
  },
);
