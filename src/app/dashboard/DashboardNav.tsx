'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Passport', exact: true },
  { href: '/dashboard/assessments', label: 'Assessments', exact: false },
  { href: '/dashboard/settings', label: 'Settings', exact: false },
] as const;

/**
 * A Client Component only because the active link depends on the current
 * path. Everything else in the dashboard shell stays server-rendered.
 */
export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex items-center gap-0.5">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:px-3 ${
              active
                ? 'bg-ink-50 text-ink-900'
                : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
