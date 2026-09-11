import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './env';
import type { Database } from './database.types';

/**
 * A request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers.
 *
 * A new client per request is deliberate and cheap: on the server the client
 * is essentially a configured `fetch`, and it has to carry *this* request's
 * cookies to act as the signed-in user.
 */
export async function createSupabaseServerClient() {
  // `cookies()` is async as of Next.js 16; the synchronous form is gone.
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. Ignoring is safe because
          // `src/proxy.ts` refreshes the session on every matched request and
          // writes the rotated tokens there.
        }
      },
    },
  });
}
