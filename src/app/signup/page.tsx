import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/data/auth';

import { SignUpForm } from './SignUpForm';

export const metadata: Metadata = { title: 'Create your account' };

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect('/dashboard');

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
          Create your passport
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          Start with the foundation assessments and build up from there.
        </p>
      </div>

      <div className="rounded-[--radius-card] border border-ink-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <SignUpForm />
      </div>

      <p className="mt-5 text-center text-sm text-ink-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
