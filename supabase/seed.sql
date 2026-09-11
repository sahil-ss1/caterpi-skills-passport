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

-- ---------------------------------------------------------------------------
-- Auth users
-- ---------------------------------------------------------------------------

-- GoTrue needs a matching auth.identities row for email sign-in to work.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
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
  '{}'::jsonb
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
   'Toronto, Canada', 'sam@caterpi.test', true);

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
