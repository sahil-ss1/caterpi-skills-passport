'use client';

import { createBrowserClient } from '@supabase/ssr';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './env';
import type { Database } from './database.types';

/**
 * Browser client, used only for authentication (sign in and sign out).
 *
 * Passport reads and the visibility mutation deliberately do not go through
 * here: they run server-side in `src/data`, so authorisation is decided in one
 * auditable place rather than in whatever component happens to need the data.
 *
 * `createBrowserClient` is already a singleton, so calling this repeatedly
 * does not create extra clients.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
