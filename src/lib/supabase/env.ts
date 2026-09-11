/**
 * Both values are public by design: the publishable key only ever gets the
 * access Row Level Security grants it. There is no privileged key anywhere in
 * this project, which is why there is nothing here to keep off the client.
 *
 * Read eagerly so a misconfigured deployment fails at startup with a clear
 * message rather than as an opaque `fetch` error on first query.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill it in from ` +
        `your Supabase project's Project Settings -> API.`,
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  'NEXT_PUBLIC_SUPABASE_URL',
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_PUBLISHABLE_KEY = required(
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
