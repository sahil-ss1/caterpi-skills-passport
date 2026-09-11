import Link from 'next/link';

import { signOutAction } from '@/app/login/actions';

import { DashboardNav } from './DashboardNav';

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            className="text-sm font-semibold tracking-tight text-ink-900"
          >
            <span className="text-brand-700">Caterpi</span> Skills Passport
          </Link>

          <div className="flex items-center gap-1">
            <DashboardNav />

            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
