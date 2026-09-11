'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Field, buttonClassName } from '@/components/ui';

import { type SignUpState, signUpAction } from './actions';

const initialState: SignUpState = { error: null, notice: null };

export function SignUpForm() {
  const [state, formAction] = useActionState(signUpAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Full name"
        name="fullName"
        required
        autoComplete="name"
        placeholder="Priya Sharma"
        maxLength={120}
        hint="Shown on your passport. Your starting username is derived from it."
      />

      <Field
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
      />

      <Field
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        hint="At least 8 characters."
      />

      <Field
        label="Confirm password"
        name="confirmPassword"
        type="password"
        required
        autoComplete="new-password"
      />

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-rose-700">
          {state.error}
        </p>
      ) : null}

      {state.notice ? (
        <p
          role="status"
          className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700"
        >
          {state.notice}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-xs leading-relaxed text-ink-600">
        Your passport starts private. Nothing is published until you switch
        visibility on from your dashboard.
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClassName('primary', 'w-full py-2.5 disabled:cursor-progress')}
    >
      {pending ? 'Creating your account…' : 'Create account'}
    </button>
  );
}
