/**
 * Asserts the access boundaries against the live project.
 *
 * Complements the unit tests: those cover shaping logic, this covers the part
 * that only the database can answer — who can read what.
 *
 *   node --env-file=.env.local scripts/verify-access.mjs
 */

import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const PASSWORD = 'Caterpi!2345';

let failures = 0;

function check(name, passed, detail = '') {
  console.log(`${passed ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

// --- anonymous -------------------------------------------------------------

const anon = createClient(URL, KEY);

const publicList = await anon.from('public_passports').select('username');
check(
  'anon reads public passports',
  !publicList.error && publicList.data.length === 3,
  `${publicList.data?.length ?? 0} rows`,
);

const privateProbe = await anon
  .from('public_passports')
  .select('username')
  .eq('username', 'marcus-chen');
check(
  'anon cannot see a private passport',
  !privateProbe.error && privateProbe.data.length === 0,
);

const baseTable = await anon.from('profiles').select('contact_email');
check(
  'anon is denied the profiles base table',
  Boolean(baseTable.error),
  baseTable.error?.code ?? 'NO ERROR — LEAK',
);

const publicCols = await anon.from('public_passports').select('*').limit(1);
const exposed = Object.keys(publicCols.data?.[0] ?? {});
const forbidden = ['id', 'contact_email', 'is_public', 'created_at'];
check(
  'public view exposes no private columns',
  forbidden.every((column) => !exposed.includes(column)),
  exposed.join(', '),
);

// --- authenticated owner ---------------------------------------------------

const priya = createClient(URL, KEY);
await priya.auth.signInWithPassword({
  email: 'priya@caterpi.test',
  password: PASSWORD,
});

const mine = await priya.from('my_capabilities').select('capability_slug');
check(
  'owner reads their own capabilities',
  !mine.error && mine.data.length === 6,
  `${mine.data?.length ?? 0} rows`,
);

const others = await priya
  .from('profiles')
  .select('username')
  .neq('id', '11111111-1111-1111-1111-111111111111');
check(
  "owner cannot read another talent's profile row",
  !others.error && others.data.length === 0,
  `${others.data?.length ?? 0} rows`,
);

const otherLevels = await priya
  .from('my_capability_levels')
  .select('talent_id')
  .neq('talent_id', '11111111-1111-1111-1111-111111111111');
check(
  "owner cannot read another talent's assessment results",
  !otherLevels.error && otherLevels.data.length === 0,
);

const evidence = await priya.from('evidence').select('storage_path');
check(
  'owner reads their own evidence records',
  !evidence.error && evidence.data.length === 3,
  `${evidence.data?.length ?? 0} rows`,
);

const signed = await priya.storage
  .from('evidence')
  .createSignedUrls(
    (evidence.data ?? []).map((row) => row.storage_path),
    60,
  );
check(
  'owner can sign their own evidence files',
  !signed.error && signed.data.every((entry) => entry.signedUrl),
);

// A path belonging to Sam. The storage policy keys on the first path
// segment, so this must fail even though the bucket is the same.
const crossTenant = await priya.storage
  .from('evidence')
  .download('44444444-4444-4444-4444-444444444444/nope/file.pdf');
check(
  "owner cannot download another talent's evidence",
  Boolean(crossTenant.error),
);

await priya.auth.signOut();

console.log(
  failures === 0
    ? '\nAll access checks passed.'
    : `\n${failures} access check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
