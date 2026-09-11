'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Field, buttonClassName } from '@/components/ui';

import { type SignInState, signInAction } from './actions';

/**
 * Seeded accounts, surfaced so a reviewer can reach each data shape without
 * digging through `supabase/seed.sql`.
 */
const DEMO_ACCOUNTS = [
  { email: 'priya@caterpi.test', label: 'Complete passport, public' },
  { email: 'marcus@caterpi.test', label: 'Partial data, private' },
  { email: 'amara@caterpi.test', label: 'No capabilities yet' },
  { email: 'sam@caterpi.test', label: 'Evidence edge cases' },
] as const;

const DEMO_PASSWORD = 'Caterpi!2345';

const initialState: SignInState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signInAction, initialState);

  // The inputs stay uncontrolled — picking a demo account changes this key,
  // which remounts them with the new defaults. That keeps `Field` a plain
  // uncontrolled input rather than growing a controlled mode for one caller.
  // Annotated because `as const` would otherwise narrow this to the first
  // account's literal type and reject the others.
  const [prefill, setPrefill] = useState<string>(DEMO_ACCOUNTS[0].email);

  return (
    <div>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <Field
          key={`email-${prefill}`}
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={prefill}
        />

        <Field
          key={`password-${prefill}`}
          label="Password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          defaultValue={DEMO_PASSWORD}
        />

        {state.error ? (
          <p role="alert" className="text-sm font-medium text-rose-700">
            {state.error}
          </p>
        ) : null}

        <SubmitButton />
      </form>

      <div className="mt-6 border-t border-ink-200 pt-4">
        <p className="text-xs font-medium text-ink-600">Test accounts</p>
        <p className="mt-0.5 text-xs text-ink-400">
          Each one exercises a different data shape.
        </p>

        <ul className="mt-2.5 space-y-1">
          {DEMO_ACCOUNTS.map((account) => {
            const active = prefill === account.email;

            return (
              <li key={account.email}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPrefill(account.email)}
                  className={`w-full rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                    active
                      ? 'border-brand-200 bg-brand-50'
                      : 'border-transparent hover:bg-ink-50'
                  }`}
                >
                  <span className="font-medium text-ink-900">{account.email}</span>
                  <span className="mt-0.5 block text-ink-600">{account.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
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
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}
