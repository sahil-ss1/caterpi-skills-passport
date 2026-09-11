'use server';

import { redirect } from 'next/navigation';

import { safeRedirectPath } from '@/lib/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface SignInState {
  readonly error: string | null;
}

/**
 * Signs in and lets Supabase write the session cookies.
 *
 * A Server Action rather than a browser call so the cookies are set by the
 * server on the same response that redirects: the dashboard's first render
 * already sees an authenticated request, which avoids the flash of
 * "signed out" that a client-side sign-in produces.
 */
export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Enter both an email address and a password.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately not distinguishing "no such user" from "wrong password",
    // which would let anyone enumerate registered addresses.
    return { error: 'Those credentials were not recognised.' };
  }

  // Re-checked here rather than trusting the hidden field the page rendered:
  // the action is its own entry point and reachable by direct POST.
  // `redirect` throws to unwind, so it must sit outside any try/catch.
  redirect(safeRedirectPath(formData.get('next')));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
