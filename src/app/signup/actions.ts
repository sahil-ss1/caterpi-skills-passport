'use server';

import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface SignUpState {
  readonly error: string | null;
  readonly notice: string | null;
}

const MIN_PASSWORD_LENGTH = 8;

/**
 * Creates an account and signs the new user straight in.
 *
 * The `profiles` row is not created here. A trigger on `auth.users` creates
 * it, which means a profile cannot go missing because this action failed
 * between the two writes, and no privileged key is needed in application
 * code to insert on another user's behalf.
 *
 * `full_name` travels in the signup metadata so the trigger can seed both the
 * display name and a starting username from it.
 */
export async function signUpAction(
  _previous: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirmPassword') ?? '');

  if (!fullName || !email || !password) {
    return { error: 'Fill in your name, email address and a password.', notice: null };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`,
      notice: null,
    };
  }

  if (password !== confirm) {
    return { error: 'Those passwords do not match.', notice: null };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    // Supabase distinguishes "already registered" from other failures. We
    // deliberately do not, because a different message here would confirm
    // which addresses have accounts.
    return {
      error: 'We could not create that account. Check the details and try again.',
      notice: null,
    };
  }

  // With email confirmation switched on there is no session yet, and the user
  // has to click a link before signing in.
  if (!data.session) {
    return {
      error: null,
      notice: 'Check your inbox to confirm your email address, then sign in.',
    };
  }

  redirect('/dashboard?welcome=1');
}
