import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/data/auth';
import { safeRedirectPath } from '@/lib/navigation';

import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage(props: PageProps<'/login'>) {
  // `searchParams` is a promise in Next.js 16.
  const { next } = await props.searchParams;

  if (await getCurrentUser()) redirect('/dashboard');

  // Only unambiguous same-origin paths, so `?next=` cannot become an open
  // redirect. The action re-checks; this stops the value reaching the form.
  const target = safeRedirectPath(next);

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12"
    >
      <div className="mb-6">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-widest text-brand-700"
        >
          Caterpi
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          View and share your verified capabilities.
        </p>
      </div>

      <div className="rounded-[--radius-card] border border-ink-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <LoginForm next={target} />
      </div>

      <p className="mt-5 text-center text-sm text-ink-600">
        New to Caterpi?{' '}
        <Link href="/signup" className="font-medium text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
