'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

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
  const [email, setEmail] = useState<string>(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState<string>(DEMO_PASSWORD);

  return (
    <div>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-ink-900"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-600"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-ink-900"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-600"
          />
        </div>

        {state.error ? (
          <p role="alert" className="text-sm font-medium text-rose-700">
            {state.error}
          </p>
        ) : null}

        <SubmitButton />
      </form>

      <div className="mt-6 border-t border-ink-200 pt-4">
        <p className="text-xs font-medium text-ink-600">Test accounts</p>
        <ul className="mt-2 space-y-1.5">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(DEMO_PASSWORD);
                }}
                className="w-full rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-ink-50"
              >
                <span className="font-medium text-ink-900">
                  {account.email}
                </span>
                <span className="block text-ink-400">{account.label}</span>
              </button>
            </li>
          ))}
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
      className="w-full rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-900/90 disabled:cursor-progress disabled:opacity-70"
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}
