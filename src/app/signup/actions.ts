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
    // Logged in full server-side. Without this the generic message below is
    // all anyone sees, including whoever is debugging it.
    console.error(
      '[action] signUpAction failed',
      JSON.stringify({ code: error.code, status: error.status, message: error.message }),
    );

    return { error: signUpMessage(error), notice: null };
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

/**
 * Turns a Supabase auth error into something the person can act on.
 *
 * The one case that stays deliberately vague is an address that is already
 * registered: saying so would let anyone test which emails have accounts.
 * Everything else is a problem the user or the operator can actually fix, and
 * hiding it just makes the form feel broken.
 */
function signUpMessage(error: { code?: string; status?: number; message: string }): string {
  // Matched on status as well as code: the rate limit is the one an operator
  // is most likely to hit, and it arrives as a plain 429 if the client did
  // not populate `code`.
  if (error.status === 429 || error.code?.startsWith('over_')) {
    return 'Too many sign-up attempts against this project right now. Confirmation emails are rate limited — wait a few minutes, or turn off "Confirm email" in Supabase.';
  }

  switch (error.code) {
    case 'email_address_invalid':
      return 'That email address was rejected. Use a real, deliverable domain — reserved ones such as example.com and .test are not accepted.';
    case 'weak_password':
      return 'Choose a stronger password.';
    case 'signup_disabled':
      return 'Sign-ups are currently disabled for this project.';
    default:
      return 'We could not create that account. Check the details and try again.';
  }
}
