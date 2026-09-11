import Link from 'next/link';

import { getCurrentUser } from '@/data/auth';
import { buttonClassName } from '@/components/ui';

/**
 * Header for the public pages.
 *
 * It reads the session so a signed-in visitor browsing the public site gets
 * a link back to their dashboard rather than a sign-in prompt. `getCurrentUser`
 * is request-cached, so rendering this alongside a page that also needs the
 * user costs one resolution, not two.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-ink-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight text-ink-900">
          <span className="text-brand-700">Caterpi</span> Skills Passport
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/discover" className={buttonClassName('ghost', 'px-2 sm:px-3')}>
            Browse talent
          </Link>

          {user ? (
            <Link href="/dashboard" className={buttonClassName('primary')}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonClassName('ghost', 'px-2 sm:px-3')}>
                Sign in
              </Link>
              <Link href="/signup" className={buttonClassName('primary')}>
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
