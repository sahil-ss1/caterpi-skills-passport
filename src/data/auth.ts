import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface SessionUser {
  readonly id: string;
  readonly email: string | null;
}

/**
 * The signed-in user, or `null`.
 *
 * `cache()` scopes the result to one request, so a layout, a page and an
 * action can each ask independently without re-verifying the token three
 * times. That is also why callers read it back from here rather than passing
 * a user object down the tree: fewer chances to hand it to a Client Component
 * by accident.
 *
 * Uses `getClaims()` rather than `getUser()`: it verifies the JWT signature
 * against the project's published keys instead of making a network round-trip
 * to the Auth server for a record we do not need.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) return null;

  const email = data.claims.email;
  return {
    id: data.claims.sub,
    email: typeof email === 'string' ? email : null,
  };
});

/**
 * Guards an authenticated read. The proxy already redirects unauthenticated
 * traffic away from `/dashboard`, but that is a UX shortcut: this is the check
 * that actually gates data, and RLS gates it again in the database.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
