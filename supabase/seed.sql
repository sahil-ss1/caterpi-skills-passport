-- Caterpi test fixtures.
--
-- Four talents, chosen to exercise the states the UI has to survive:
--   priya-sharma   complete, public      all six capabilities, mixed levels
--   marcus-chen    partial,  private     three capabilities, some scores null
--   amara-okafor   empty,    public      no capability data at all
--   sam-whitfield  evidence edge cases   records pointing at absent objects
--
-- Every talent signs in with the password below.
--
-- A level with no assessment_results row means "not attempted". Absence is the
-- signal, so the frontend has to cope with sparse data rather than relying on
-- the backend to emit placeholder rows.

-- Supabase ships pgcrypto in the `extensions` schema, which is not on the
-- default search_path for this session. Without this, crypt() and gen_salt()
-- below fail to resolve.
set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Auth users
-- ---------------------------------------------------------------------------

-- The empty-string token columns are deliberate. GoTrue reads them into Go
-- strings and errors with "converting NULL to string is unsupported" at sign
-- in if they are left null, which is the usual reason a hand-seeded user
-- cannot log in.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current
)
select
  '00000000-0000-0000-0000-000000000000',
  v.id,
  'authenticated',
  'authenticated',
  v.email,
  crypt('Caterpi!2345', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  '', '', '', '', ''
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'priya@caterpi.test'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'marcus@caterpi.test'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'amara@caterpi.test'),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'sam@caterpi.test')
) as v(id, email);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(), now(), now()
from auth.users u;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

-- The `on_auth_user_created` trigger has already created a row for each user
-- above with a generated username, so these are upserts that overwrite the
-- generated values with the fixture ones.
insert into public.profiles (
  id, username, full_name, current_role_title, target_role_title,
  headline, location, contact_email, is_public
)
values
  ('11111111-1111-1111-1111-111111111111', 'priya-sharma', 'Priya Sharma',
   'Senior Performance Marketer', 'Head of Growth',
   'Performance marketer specialising in paid acquisition and marketing analytics.',
   'Bengaluru, India', 'priya@caterpi.test', true),

  ('22222222-2222-2222-2222-222222222222', 'marcus-chen', 'Marcus Chen',
   'Marketing Executive', 'Digital Marketing Manager',
   'Building depth across SEO and analytics.',
   'Manchester, United Kingdom', 'marcus@caterpi.test', false),

  ('33333333-3333-3333-3333-333333333333', 'amara-okafor', 'Amara Okafor',
   null, 'Content Strategist',
   null,
   'Lagos, Nigeria', 'amara@caterpi.test', true),

  ('44444444-4444-4444-4444-444444444444', 'sam-whitfield', 'Sam Whitfield',
   'Social Media Lead', 'Brand Director',
   'Social-first brand builder.',
   'Toronto, Canada', 'sam@caterpi.test', true)
on conflict (id) do update set
  username           = excluded.username,
  full_name          = excluded.full_name,
  current_role_title = excluded.current_role_title,
  target_role_title  = excluded.target_role_title,
  headline           = excluded.headline,
  location           = excluded.location,
  contact_email      = excluded.contact_email,
  is_public          = excluded.is_public;

-- ---------------------------------------------------------------------------
-- Capability taxonomy
-- ---------------------------------------------------------------------------

insert into public.capabilities (slug, name, category, description, sort_order)
values
  ('paid-media', 'Paid Media', 'Acquisition',
   'Planning, buying and optimising paid advertising across channels.', 1),
  ('seo', 'SEO', 'Acquisition',
   'Technical, on-page and off-page search optimisation.', 2),
  ('content-marketing', 'Content Marketing', 'Brand',
   'Content strategy, production and distribution.', 3),
  ('analytics', 'Analytics', 'Measurement',
   'Measurement planning, attribution and reporting.', 4),
  ('social-media', 'Social Media', 'Brand',
   'Organic social strategy, community and creative.', 5),
  ('marketing-strategy', 'Marketing Strategy', 'Strategy',
   'Positioning, segmentation and go-to-market planning.', 6);

-- Three verification levels per capability.
insert into public.assessments (capability_id, title, level)
select
  c.id,
  l.label || ' — ' || c.name,
  l.level
from public.capabilities c
cross join (values
  ('Foundation'::text, 1::smallint),
  ('Practitioner', 2::smallint),
  ('Expert', 3::smallint)
) as l(label, level);

-- ---------------------------------------------------------------------------
-- Capability scores
-- ---------------------------------------------------------------------------

-- Priya: the reference dataset from the assessment brief.
insert into public.talent_capabilities (talent_id, capability_id, raw_score, status)
select '11111111-1111-1111-1111-111111111111'::uuid, c.id, v.raw_score, v.status
from (values
  ('paid-media'::text,         78.00::numeric, 'verified'::public.verification_status),
  ('seo',                      63.00,          'verified'),
  ('content-marketing',        84.00,          'verified'),
  ('analytics',                58.00,          'failed'),
  ('social-media',             91.00,          'verified'),
  ('marketing-strategy',       69.00,          'in_progress')
) as v(slug, raw_score, status)
join public.capabilities c on c.slug = v.slug;

-- Marcus: partial coverage, and two capabilities with no score yet.
insert into public.talent_capabilities (talent_id, capability_id, raw_score, status)
select '22222222-2222-2222-2222-222222222222'::uuid, c.id, v.raw_score, v.status
from (values
  ('seo'::text,          null::numeric, 'submitted'::public.verification_status),
  ('analytics',          null,          'in_progress'),
  ('social-media',       45.00,         'failed')
) as v(slug, raw_score, status)
join public.capabilities c on c.slug = v.slug;

-- Amara: intentionally none. Exercises the empty state on both the dashboard
-- and the public passport.

-- Sam: one capability, used to hang evidence edge cases off.
insert into public.talent_capabilities (talent_id, capability_id, raw_score, status)
select '44444444-4444-4444-4444-444444444444'::uuid, c.id, 88.00, 'verified'
from public.capabilities c
where c.slug = 'social-media';

-- ---------------------------------------------------------------------------
-- Assessment results
-- ---------------------------------------------------------------------------

insert into public.assessment_results (
  talent_id, assessment_id, raw_score, status,
  submitted_at, verified_at, assessor_name, assessor_note, internal_notes
)
select
  '11111111-1111-1111-1111-111111111111'::uuid,
  a.id, v.raw_score, v.status,
  now() - (v.submitted_days_ago || ' days')::interval,
  case when v.verified_days_ago is null
       then null
       else now() - (v.verified_days_ago || ' days')::interval end,
  v.assessor_name, v.assessor_note, v.internal_notes
from (values
  -- Paid Media: fully verified through level 3.
  ('paid-media'::text, 1::smallint, 74.00::numeric, 'verified'::public.verification_status, 120, 118, 'R. Iyer'::text,   'Strong channel fundamentals.'::text,      'Calibrated against Q2 rubric v3.'::text),
  ('paid-media',       2,           79.00,          'verified',                             90,  88,  'R. Iyer',         'Good incrementality reasoning.',          'Second reviewer agreed.'),
  ('paid-media',       3,           81.00,          'verified',                             40,  36,  'D. Almeida',      'Portfolio-level budget allocation.',      'Escalated for expert sign-off.'),
  -- SEO: levels 1 and 2 verified, level 3 never attempted (no row).
  ('seo',              1,           61.00,          'verified',                             110, 108, 'L. Novak',        'Solid technical audit.',                  null),
  ('seo',              2,           65.00,          'verified',                             75,  70,  'L. Novak',        'Link strategy needs depth.',              'Borderline pass, 65 vs 63 threshold.'),
  -- Content Marketing: two verified, level 3 awaiting assessment.
  ('content-marketing', 1,          82.00,          'verified',                             100, 96,  'M. Farrow',       null,                                      null),
  ('content-marketing', 2,          86.00,          'verified',                             60,  55,  'M. Farrow',       'Excellent distribution planning.',        null),
  ('content-marketing', 3,          null,           'submitted',                            5,   null, null,             null,                                      'Queued for expert panel.'),
  -- Analytics: level 1 verified, level 2 failed.
  ('analytics',        1,           64.00,          'verified',                             95,  92,  'T. Bergström',    null,                                      null),
  ('analytics',        2,           41.00,          'failed',                               30,  28,  'T. Bergström',    'Attribution modelling below bar.',        'Retake permitted after 60 days.'),
  -- Social Media: fully verified.
  ('social-media',     1,           88.00,          'verified',                             130, 128, 'K. Adeyemi',      null,                                      null),
  ('social-media',     2,           90.00,          'verified',                             85,  80,  'K. Adeyemi',      'Outstanding creative testing.',           null),
  ('social-media',     3,           93.00,          'verified',                             20,  14,  'D. Almeida',      'Top decile.',                             'Flagged as reference submission.'),
  -- Marketing Strategy: level 1 verified, level 2 mid-assessment.
  ('marketing-strategy', 1,         70.00,          'verified',                             88,  84,  'S. Rahman',       null,                                      null),
  ('marketing-strategy', 2,         null,           'in_progress',                          3,   null, null,             null,                                      null)
) as v(slug, level, raw_score, status, submitted_days_ago, verified_days_ago, assessor_name, assessor_note, internal_notes)
join public.capabilities c on c.slug = v.slug
join public.assessments a on a.capability_id = c.id and a.level = v.level;

-- Marcus: sparse, and an expired verification to exercise that badge.
insert into public.assessment_results (
  talent_id, assessment_id, raw_score, status, submitted_at, verified_at, assessor_name
)
select
  '22222222-2222-2222-2222-222222222222'::uuid,
  a.id, v.raw_score, v.status,
  now() - (v.submitted_days_ago || ' days')::interval,
  case when v.verified_days_ago is null
       then null
       else now() - (v.verified_days_ago || ' days')::interval end,
  v.assessor_name
from (values
  ('seo'::text,        1::smallint, null::numeric, 'submitted'::public.verification_status, 4,   null, null::text),
  ('analytics',        1,           null,          'in_progress',                           2,   null, null),
  ('social-media',     1,           45.00,         'failed',                                200, 198,  'K. Adeyemi'),
  ('social-media',     2,           52.00,         'expired',                               400, 395,  'K. Adeyemi')
) as v(slug, level, raw_score, status, submitted_days_ago, verified_days_ago, assessor_name)
join public.capabilities c on c.slug = v.slug
join public.assessments a on a.capability_id = c.id and a.level = v.level;

-- Sam: verified results that own the evidence edge cases.
insert into public.assessment_results (
  talent_id, assessment_id, raw_score, status, submitted_at, verified_at, assessor_name
)
select
  '44444444-4444-4444-4444-444444444444'::uuid,
  a.id, 88.00, 'verified',
  now() - interval '30 days', now() - interval '28 days', 'K. Adeyemi'
from public.capabilities c
join public.assessments a on a.capability_id = c.id and a.level = 1
where c.slug = 'social-media';

-- ---------------------------------------------------------------------------
-- Evidence
-- ---------------------------------------------------------------------------

-- Paths are `<talent_id>/<result_id>/<file>` so the storage policy can
-- authorise on the first path segment.
--
-- `upload-evidence.mjs` uploads real objects for the rows it can. Anything it
-- skips stays a dangling record on purpose: an evidence row whose object is
-- absent is exactly the "missing or inaccessible" state the UI must handle.
insert into public.evidence (
  assessment_result_id, storage_path, file_name, mime_type, size_bytes
)
select
  ar.id,
  ar.talent_id || '/' || ar.id || '/' || v.file_name,
  v.file_name,
  v.mime_type,
  v.size_bytes
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'paid-media'::text,       3::smallint, 'budget-allocation-model.pdf'::text, 'application/pdf'::text, 184320::bigint),
  ('11111111-1111-1111-1111-111111111111',       'seo',                    2,           'technical-audit-summary.pdf',       'application/pdf',       98304),
  ('11111111-1111-1111-1111-111111111111',       'social-media',           3,           'creative-testing-report.pdf',       'application/pdf',       141312),
  -- Dangling on purpose: no object is ever uploaded for this row.
  ('44444444-4444-4444-4444-444444444444',       'social-media',           1,           'campaign-teardown.pdf',             'application/pdf',       76800)
) as v(talent_id, slug, level, file_name, mime_type, size_bytes)
join public.capabilities c on c.slug = v.slug
join public.assessments a on a.capability_id = c.id and a.level = v.level
join public.assessment_results ar
  on ar.assessment_id = a.id and ar.talent_id = v.talent_id;

-- ---------------------------------------------------------------------------
-- Question bank
-- ---------------------------------------------------------------------------

-- Foundation (level 1) only. Practitioner and Expert are deliberately left
-- without questions: those levels are assessor-led in the product model, and
-- the catalogue renders them as such. That also keeps a "not self-serve"
-- state in the UI rather than pretending every level is a quiz.

insert into public.assessment_questions (assessment_id, prompt, sort_order)
select a.id, v.prompt, v.q
from (values
  ('paid-media'::text, 1::integer, 'What does CPA stand for in paid media reporting?'::text),
  ('paid-media', 2, 'A campaign records 50,000 impressions and 1,000 clicks. What is the click-through rate?'),
  ('paid-media', 3, 'Which metric best indicates whether a paid campaign is profitable?'),
  ('paid-media', 4, 'What is the main purpose of a negative keyword?'),

  ('seo', 1, 'What is the purpose of a robots.txt file?'),
  ('seo', 2, 'Which tag tells search engines the preferred version of a duplicated page?'),
  ('seo', 3, 'What does "crawl budget" describe?'),
  ('seo', 4, 'A page returns an HTTP 301 status. What does that mean?'),

  ('content-marketing', 1, 'What is a content pillar?'),
  ('content-marketing', 2, 'Which metric best measures whether an article held attention?'),
  ('content-marketing', 3, 'What is the main purpose of a content audit?'),
  ('content-marketing', 4, 'What does repurposing content mean?'),

  ('analytics', 1, 'How is a conversion rate calculated?'),
  ('analytics', 2, 'What problem does attribution modelling address?'),
  ('analytics', 3, 'What is a UTM parameter used for?'),
  ('analytics', 4, 'Sessions rose 40% but conversions stayed flat. What is the most reasonable first check?'),

  ('social-media', 1, 'What does reach measure?'),
  ('social-media', 2, 'Why does frequency matter in a social campaign?'),
  ('social-media', 3, 'What is social listening?'),
  ('social-media', 4, 'Which is the strongest signal that a piece of creative is working organically?'),

  ('marketing-strategy', 1, 'What does market segmentation do?'),
  ('marketing-strategy', 2, 'What is a value proposition?'),
  ('marketing-strategy', 3, 'What is the purpose of a positioning statement?'),
  ('marketing-strategy', 4, 'In a go-to-market plan, what should primarily determine channel choice?')
) as v(slug, q, prompt)
join public.capabilities c on c.slug = v.slug
join public.assessments a on a.capability_id = c.id and a.level = 1;

-- Correct answers sit in varying positions on purpose; the option order is
-- stable so results stay reproducible.
insert into public.assessment_question_options (question_id, label, is_correct, sort_order)
select q.id, v.label, v.is_correct, v.o
from (values
  ('paid-media'::text, 1::integer, 1::integer, 'Clicks per advert'::text, false),
  ('paid-media', 1, 2, 'Cost per acquisition', true),
  ('paid-media', 1, 3, 'Conversions per audience', false),
  ('paid-media', 2, 1, '2%', true),
  ('paid-media', 2, 2, '5%', false),
  ('paid-media', 2, 3, '0.5%', false),
  ('paid-media', 3, 1, 'Impression share', false),
  ('paid-media', 3, 2, 'Average frequency', false),
  ('paid-media', 3, 3, 'Return on ad spend', true),
  ('paid-media', 4, 1, 'It stops ads showing against irrelevant searches', true),
  ('paid-media', 4, 2, 'It automatically lowers the bid', false),
  ('paid-media', 4, 3, 'It pauses the ad group overnight', false),

  ('seo', 1, 1, 'It stores the page meta descriptions', false),
  ('seo', 1, 2, 'It tells crawlers which paths they may request', true),
  ('seo', 1, 3, 'It redirects users to the mobile site', false),
  ('seo', 2, 1, 'rel="nofollow"', false),
  ('seo', 2, 2, 'meta refresh', false),
  ('seo', 2, 3, 'rel="canonical"', true),
  ('seo', 3, 1, 'How many pages a search engine will fetch in a given period', true),
  ('seo', 3, 2, 'The monthly cost of SEO tooling', false),
  ('seo', 3, 3, 'The maximum number of backlinks a page may have', false),
  ('seo', 4, 1, 'The page is temporarily unavailable', false),
  ('seo', 4, 2, 'The page has moved permanently', true),
  ('seo', 4, 3, 'The page is blocked by robots.txt', false),

  ('content-marketing', 1, 1, 'A paid promotion budget line', false),
  ('content-marketing', 1, 2, 'A core topic that a cluster of related content supports', true),
  ('content-marketing', 1, 3, 'A standard display banner size', false),
  ('content-marketing', 2, 1, 'Average engaged time', true),
  ('content-marketing', 2, 2, 'Total word count', false),
  ('content-marketing', 2, 3, 'Publishing frequency', false),
  ('content-marketing', 3, 1, 'To increase posting volume', false),
  ('content-marketing', 3, 2, 'To set the advertising budget', false),
  ('content-marketing', 3, 3, 'To decide what to keep, update or retire', true),
  ('content-marketing', 4, 1, 'Adapting one piece of content for another format or channel', true),
  ('content-marketing', 4, 2, 'Deleting content that underperformed', false),
  ('content-marketing', 4, 3, 'Buying syndication on a partner site', false),

  ('analytics', 1, 1, 'Revenue divided by cost', false),
  ('analytics', 1, 2, 'Conversions divided by sessions or users', true),
  ('analytics', 1, 3, 'Clicks divided by impressions', false),
  ('analytics', 2, 1, 'Removing bot traffic from reports', false),
  ('analytics', 2, 2, 'Assigning credit for a conversion across touchpoints', true),
  ('analytics', 2, 3, 'Reducing report loading time', false),
  ('analytics', 3, 1, 'Encrypting user identifiers', false),
  ('analytics', 3, 2, 'Blocking referral spam', false),
  ('analytics', 3, 3, 'Labelling traffic sources so they can be reported on', true),
  ('analytics', 4, 1, 'Whether the extra traffic came from a lower-intent source', true),
  ('analytics', 4, 2, 'Whether to increase the budget immediately', false),
  ('analytics', 4, 3, 'Whether the homepage needs redesigning', false),

  ('social-media', 1, 1, 'The total number of times content was displayed', false),
  ('social-media', 1, 2, 'The number of unique accounts that saw the content', true),
  ('social-media', 1, 3, 'The number of followers gained', false),
  ('social-media', 2, 1, 'It determines the required image resolution', false),
  ('social-media', 2, 2, 'Repetition beyond a point causes fatigue and falling response', true),
  ('social-media', 2, 3, 'It sets the posting schedule automatically', false),
  ('social-media', 3, 1, 'Scheduling posts ahead of time', false),
  ('social-media', 3, 2, 'Automatically replying to comments', false),
  ('social-media', 3, 3, 'Monitoring conversations about a brand or topic', true),
  ('social-media', 4, 1, 'A high share or save rate', true),
  ('social-media', 4, 2, 'A large follower count', false),
  ('social-media', 4, 3, 'A long, detailed caption', false),

  ('marketing-strategy', 1, 1, 'It groups a market by shared needs or behaviour', true),
  ('marketing-strategy', 1, 2, 'It sets the media budget for the quarter', false),
  ('marketing-strategy', 1, 3, 'It measures the return on a campaign', false),
  ('marketing-strategy', 2, 1, 'The price the product is sold at', false),
  ('marketing-strategy', 2, 2, 'The specific benefit a customer gets and why it differs', true),
  ('marketing-strategy', 2, 3, 'The advertising slogan', false),
  ('marketing-strategy', 3, 1, 'To list the channels the campaign will use', false),
  ('marketing-strategy', 3, 2, 'To forecast quarterly revenue', false),
  ('marketing-strategy', 3, 3, 'To define who the product is for and how it differs', true),
  ('marketing-strategy', 4, 1, 'Whichever channel costs the least', false),
  ('marketing-strategy', 4, 2, 'Where the target audience already spends attention', true),
  ('marketing-strategy', 4, 3, 'Whichever channel the team knows best', false)
) as v(slug, q, o, label, is_correct)
join public.capabilities c on c.slug = v.slug
join public.assessments a on a.capability_id = c.id and a.level = 1
join public.assessment_questions q
  on q.assessment_id = a.id and q.sort_order = v.q;
