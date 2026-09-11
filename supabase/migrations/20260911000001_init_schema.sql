-- Caterpi Skills Passport
--
-- Privacy model, in one place:
--   * Every base table has RLS enabled and only ever grants access to the
--     authenticated owner (auth.uid() = talent_id). There is deliberately no
--     policy for the `anon` role, so the base tables are unreachable
--     anonymously no matter what a client asks for.
--   * Anonymous reads go through the `public_passport*` views below. They are
--     security-definer views (security_invoker = false), so they bypass base
--     table RLS using the view owner's privileges. That makes the views the
--     single public door: they whitelist columns and filter `is_public = true`.
--   * Consequence: a private passport returns zero rows to the public route,
--     and columns such as contact_email or internal notes are not merely
--     hidden by the UI, they are absent from the anonymous surface entirely.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Extended over time by the backend. The frontend derives its union type and
-- badge presentation from a single registry so new members stay cheap to add.
create type public.verification_status as enum (
  'not_attempted',
  'in_progress',
  'submitted',
  'verified',
  'failed',
  'expired'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- `current_role` and `target_role` would collide with reserved SQL keywords,
-- hence the _title suffix.
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  username           text not null unique
                     check (username ~ '^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$'),
  full_name          text not null,
  current_role_title text,
  target_role_title  text,
  headline           text,
  location           text,
  avatar_url         text,
  contact_email      text,
  is_public          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Shared taxonomy, not talent-specific.
create table public.capabilities (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  category    text,
  description text,
  sort_order  integer not null default 0
);

create table public.talent_capabilities (
  id            uuid primary key default gen_random_uuid(),
  talent_id     uuid not null references public.profiles (id) on delete cascade,
  capability_id uuid not null references public.capabilities (id) on delete cascade,
  -- Raw value straight from the assessment engine. The scale is a backend
  -- concern; the frontend normalises it in exactly one place.
  raw_score     numeric(6, 2),
  status        public.verification_status not null default 'not_attempted',
  updated_at    timestamptz not null default now(),
  unique (talent_id, capability_id)
);

create table public.assessments (
  id            uuid primary key default gen_random_uuid(),
  capability_id uuid not null references public.capabilities (id) on delete cascade,
  title         text not null,
  level         smallint not null check (level between 1 and 3),
  unique (capability_id, level)
);

create table public.assessment_results (
  id             uuid primary key default gen_random_uuid(),
  talent_id      uuid not null references public.profiles (id) on delete cascade,
  assessment_id  uuid not null references public.assessments (id) on delete cascade,
  raw_score      numeric(6, 2),
  status         public.verification_status not null default 'not_attempted',
  submitted_at   timestamptz,
  verified_at    timestamptz,
  assessor_name  text,
  -- Internal verification metadata. Owner-visible only, never public.
  assessor_note  text,
  internal_notes text,
  unique (talent_id, assessment_id)
);

create table public.evidence (
  id                   uuid primary key default gen_random_uuid(),
  assessment_result_id uuid not null references public.assessment_results (id) on delete cascade,
  -- Object key inside the private `evidence` bucket, always `<talent_id>/...`
  -- so the storage policy can authorise on the leading path segment.
  storage_path         text not null,
  file_name            text not null,
  mime_type            text,
  size_bytes           bigint,
  uploaded_at          timestamptz not null default now()
);

create index talent_capabilities_talent_idx on public.talent_capabilities (talent_id);
create index assessment_results_talent_idx on public.assessment_results (talent_id);
create index evidence_result_idx on public.evidence (assessment_result_id);
create index profiles_public_idx on public.profiles (username) where is_public;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger talent_capabilities_touch_updated_at
  before update on public.talent_capabilities
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security: owner-only on every base table
-- ---------------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.capabilities        enable row level security;
alter table public.talent_capabilities enable row level security;
alter table public.assessments         enable row level security;
alter table public.assessment_results  enable row level security;
alter table public.evidence            enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = id);

-- Drives the passport visibility toggle. Scoped to the owner's own row.
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy capabilities_select_authenticated on public.capabilities
  for select to authenticated
  using (true);

create policy assessments_select_authenticated on public.assessments
  for select to authenticated
  using (true);

create policy talent_capabilities_select_own on public.talent_capabilities
  for select to authenticated
  using (auth.uid() = talent_id);

create policy assessment_results_select_own on public.assessment_results
  for select to authenticated
  using (auth.uid() = talent_id);

create policy evidence_select_own on public.evidence
  for select to authenticated
  using (
    exists (
      select 1
      from public.assessment_results ar
      where ar.id = evidence.assessment_result_id
        and ar.talent_id = auth.uid()
    )
  );

-- Supabase grants the API roles broad table privileges by default. RLS already
-- blocks anonymous reads; revoking makes the intent explicit and removes the
-- base tables from the anonymous surface even if a policy is added by mistake.
revoke all on public.profiles            from anon;
revoke all on public.capabilities        from anon;
revoke all on public.talent_capabilities from anon;
revoke all on public.assessments         from anon;
revoke all on public.assessment_results  from anon;
revoke all on public.evidence            from anon;

-- ---------------------------------------------------------------------------
-- Public projections: the only anonymous read surface
-- ---------------------------------------------------------------------------

-- Note the omissions: no id, no contact_email, no is_public, no timestamps.
create view public.public_passports
  with (security_invoker = false) as
select
  p.username,
  p.full_name,
  p.current_role_title,
  p.target_role_title,
  p.headline,
  p.location,
  p.avatar_url
from public.profiles p
where p.is_public;

create view public.public_passport_capabilities
  with (security_invoker = false) as
select
  p.username,
  c.slug     as capability_slug,
  c.name     as capability_name,
  c.category as capability_category,
  c.sort_order,
  tc.raw_score,
  tc.status
from public.talent_capabilities tc
  join public.profiles p     on p.id = tc.talent_id
  join public.capabilities c on c.id = tc.capability_id
where p.is_public;

-- Level verification only. No scores, assessor names, notes or dates: those
-- are internal assessment metadata and stay out of the public payload.
create view public.public_passport_levels
  with (security_invoker = false) as
select
  p.username,
  c.slug as capability_slug,
  a.level,
  ar.status
from public.assessment_results ar
  join public.assessments a  on a.id = ar.assessment_id
  join public.capabilities c on c.id = a.capability_id
  join public.profiles p     on p.id = ar.talent_id
where p.is_public;

grant select on public.public_passports              to anon, authenticated;
grant select on public.public_passport_capabilities  to anon, authenticated;
grant select on public.public_passport_levels        to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Owner projections
-- ---------------------------------------------------------------------------

-- Unlike the public views above these are security_invoker, so RLS on the base
-- tables still applies and each caller sees only their own rows. They exist to
-- pre-join the taxonomy, which keeps the dashboard at a fixed three queries
-- instead of fetching reference tables separately and joining in the client.

create view public.my_capabilities
  with (security_invoker = true) as
select
  tc.talent_id,
  c.slug     as capability_slug,
  c.name     as capability_name,
  c.category as capability_category,
  c.description as capability_description,
  c.sort_order,
  tc.raw_score,
  tc.status
from public.talent_capabilities tc
  join public.capabilities c on c.id = tc.capability_id;

create view public.my_capability_levels
  with (security_invoker = true) as
select
  ar.talent_id,
  c.slug as capability_slug,
  a.level,
  a.title as assessment_title,
  ar.id   as result_id,
  ar.raw_score,
  ar.status,
  ar.submitted_at,
  ar.verified_at,
  ar.assessor_name,
  ar.assessor_note
from public.assessment_results ar
  join public.assessments a  on a.id = ar.assessment_id
  join public.capabilities c on c.id = a.capability_id;

grant select on public.my_capabilities       to authenticated;
grant select on public.my_capability_levels  to authenticated;

-- ---------------------------------------------------------------------------
-- Evidence storage: private bucket, owner-only reads via signed URLs
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

create policy evidence_objects_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy evidence_objects_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
