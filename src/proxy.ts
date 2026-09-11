import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from '@/lib/supabase/env';

/**
 * Keeps the Supabase session alive across navigations.
 *
 * Next.js 16 renamed `middleware` to `proxy`; the runtime is Node and cannot
 * be configured.
 *
 * This exists to rotate expiring tokens and write them back, nothing more.
 * The unauthenticated redirect below is an optimistic UX shortcut, not a
 * security boundary — the Next.js docs are explicit that Proxy should not be
 * the authorisation layer. Every protected read re-checks the caller in
 * `src/data/auth.ts`, and the database re-checks again through RLS.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Without these, a CDN can cache a response carrying Set-Cookie and
          // hand one visitor's session to the next.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Validates the JWT signature against the project's published keys and
  // refreshes it when it is close to expiry. Cheaper than `getUser()`, which
  // makes a network call to the Auth server on every request.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && request.nextUrl.pathname.startsWith('/dashboard')) {
    const signIn = new URL('/login', request.url);
    signIn.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. The public passport is
     * included so an already-signed-in visitor still gets a refreshed token
     * while browsing it.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
