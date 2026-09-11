import { redirect } from 'next/navigation';

/**
 * There is no marketing surface in this slice. Signed-in talent goes to the
 * dashboard; everyone else is bounced to sign-in by `src/proxy.ts`.
 */
export default function HomePage() {
  redirect('/dashboard');
}
