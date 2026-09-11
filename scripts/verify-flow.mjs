/**
 * Walks the self-service flow against the live project: sign up, read the
 * catalogue, sit an assessment, and confirm what the database recorded.
 *
 *   node --env-file=.env.local scripts/verify-flow.mjs
 *
 * Creates one throwaway account per run. It cannot delete it afterwards —
 * that needs an admin key, and nothing in this project holds one. The account
 * is private by default, so it does not appear in the public directory.
 */

import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let failures = 0;

function check(name, passed, detail = '') {
  console.log(`${passed ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

const stamp = Date.now();
// Supabase rejects reserved, undeliverable domains such as `.test` and
// `example.com`. The seeded fixtures use `caterpi.test` only because they are
// inserted straight into `auth.users` and never go through that validation.
const domain = process.env.FLOW_TEST_EMAIL_DOMAIN ?? 'caterpi.dev';
const email = `flow-${stamp}@${domain}`;
const password = 'Caterpi!2345';
const supabase = createClient(URL, KEY);

// --- signup ----------------------------------------------------------------

const signUp = await supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name: 'Flow Test' } },
});

check('sign up succeeds', !signUp.error, signUp.error?.message ?? email);

if (signUp.error) {
  if (/invalid/i.test(signUp.error.message)) {
    console.log(
      `\n! Supabase rejected the address domain "${domain}".\n` +
        '  Set FLOW_TEST_EMAIL_DOMAIN to a domain it accepts and re-run.',
    );
  }
  process.exit(1);
}

if (!signUp.data.session) {
  console.log(
    '\n! Email confirmation is switched on, so signup returns no session and\n' +
      '  the new account cannot sign in until a link is clicked.\n' +
      '  Supabase dashboard → Authentication → Sign In / Providers → Email →\n' +
      '  turn off "Confirm email", then re-run this script.',
  );
  process.exit(1);
}

// --- the trigger -----------------------------------------------------------

const profile = await supabase
  .from('profiles')
  .select('username, full_name, is_public')
  .single();

check(
  'a profile row was created by the database trigger',
  !profile.error && Boolean(profile.data?.username),
  profile.data ? `username "${profile.data.username}"` : profile.error?.message,
);
check(
  'the new passport starts private',
  profile.data?.is_public === false,
  `is_public = ${profile.data?.is_public}`,
);
check(
  'the display name came from signup metadata',
  profile.data?.full_name === 'Flow Test',
  profile.data?.full_name,
);

// --- catalogue -------------------------------------------------------------

const catalogue = await supabase
  .from('my_assessment_catalogue')
  .select('*')
  .order('sort_order')
  .order('level');

check('the catalogue lists every assessment', !catalogue.error && catalogue.data.length === 18, `${catalogue.data?.length ?? 0} rows`);

const foundation = (catalogue.data ?? []).filter((row) => row.question_count > 0);
check(
  'six foundation assessments have a question bank',
  foundation.length === 6,
  `${foundation.length} takeable`,
);
check(
  'a brand new talent has no status anywhere',
  (catalogue.data ?? []).every((row) => row.status === null),
);

// --- sitting the paper -----------------------------------------------------

const target = foundation.find((row) => row.capability_slug === 'seo');

const questions = await supabase
  .from('assessment_questions')
  .select('id, prompt')
  .eq('assessment_id', target.assessment_id)
  .order('sort_order');

const options = await supabase
  .from('assessment_form_options')
  .select('*')
  .in('question_id', questions.data.map((q) => q.id))
  .order('sort_order');

check(
  'the paper loads with its options',
  questions.data.length === 4 && options.data.length === 12,
  `${questions.data.length} questions, ${options.data.length} options`,
);

// Answer every question with its first option. Some are right, some are not,
// which is the point: the score has to come from the database.
const answers = {};
for (const question of questions.data) {
  const first = options.data.find((option) => option.question_id === question.id);
  answers[question.id] = first.id;
}

const graded = await supabase.rpc('submit_assessment', {
  p_assessment_id: target.assessment_id,
  p_answers: answers,
});

check('grading returns a result', !graded.error, graded.error?.message);
check(
  'the score was computed server-side',
  graded.data && typeof graded.data.raw_score !== 'undefined',
  graded.data ? `${graded.data.correct}/${graded.data.total} → ${graded.data.raw_score}` : '',
);

// --- what was actually recorded -------------------------------------------

const result = await supabase
  .from('assessment_results')
  .select('status, raw_score, verified_at, assessor_name')
  .eq('assessment_id', target.assessment_id)
  .single();

check(
  'the result is awaiting review, not verified',
  result.data?.status === 'submitted',
  `status = ${result.data?.status}`,
);
check(
  'no assessor was recorded',
  result.data?.verified_at === null && result.data?.assessor_name === null,
);

const rolled = await supabase
  .from('my_capabilities')
  .select('capability_slug, status, raw_score')
  .eq('capability_slug', 'seo')
  .single();

check(
  'the capability was created by the rollup',
  !rolled.error && rolled.data?.status === 'submitted',
  `seo is ${rolled.data?.status} at ${rolled.data?.raw_score}`,
);

// A second submission must not overwrite a queued result.
const again = await supabase.rpc('submit_assessment', {
  p_assessment_id: target.assessment_id,
  p_answers: answers,
});
check(
  'resubmitting a queued assessment is rejected',
  Boolean(again.error),
  again.error?.message ?? 'NO ERROR',
);

await supabase.auth.signOut();

console.log(
  failures === 0
    ? `\nAll flow checks passed. Test account: ${email}`
    : `\n${failures} flow check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
