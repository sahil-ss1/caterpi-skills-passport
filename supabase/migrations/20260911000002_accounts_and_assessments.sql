-- Self-service accounts and assessment taking.
--
-- Two rules shape everything below, and both exist because a talent must never
-- be able to award themselves a verification:
--
--   1. The answer key is not on the client's read surface. The `is_correct`
--      column lives on a table that `authenticated` has no privileges on at
--      all. Candidates read questions and options through a view that does
--      not contain the column, so there is nothing to inspect in devtools.
--
--   2. The client never sends a score. `submit_assessment` accepts answers,
--      grades them inside Postgres, and writes the result as `submitted`
--      (awaiting review). There is still no insert or update policy on
--      `assessment_results` or `talent_capabilities` for any client role, so
--      the only path that can write a score is this function.

-- ---------------------------------------------------------------------------
-- Account creation
-- ---------------------------------------------------------------------------

-- Derives a URL-safe, unique handle. The result has to satisfy the username
-- check constraint on `profiles`: 3..40 chars, alphanumeric at both ends.
create function public.generate_username(seed text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  base      text;
  candidate text;
  suffix    integer := 1;
begin
  base := lower(coalesce(seed, ''));
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := regexp_replace(base, '-{2,}', '-', 'g');
  base := trim(both '-' from base);

  -- Short or empty seeds (initials, symbol-only local parts) get a prefix
  -- rather than failing the constraint.
  if length(base) < 3 then
    base := trim(both '-' from 'talent-' || base);
  end if;

  base      := trim(both '-' from left(base, 32));
  candidate := base;

  while exists (select 1 from public.profiles p where p.username = candidate) loop
    suffix    := suffix + 1;
    candidate := base || '-' || suffix::text;
  end loop;

  return candidate;
end;
$$;

-- Every auth user gets a profile row. Doing this in the database rather than
-- in the signup action means a profile cannot be missing because a client
-- request failed halfway, and it needs no privileged key in application code.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, full_name, contact_email)
  values (
    new.id,
    public.generate_username(
      coalesce(
        nullif(new.raw_user_meta_data ->> 'username', ''),
        nullif(new.raw_user_meta_data ->> 'full_name', ''),
        split_part(new.email, '@', 1)
      )
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Question bank
-- ---------------------------------------------------------------------------

create table public.assessment_questions (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  prompt        text not null,
  sort_order    integer not null default 0,
  unique (assessment_id, sort_order)
);

create table public.assessment_question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions (id) on delete cascade,
  label       text not null,
  -- The answer key. No client role is granted select on this table.
  is_correct  boolean not null default false,
  sort_order  integer not null default 0,
  unique (question_id, sort_order)
);

create index assessment_questions_assessment_idx
  on public.assessment_questions (assessment_id);
create index assessment_question_options_question_idx
  on public.assessment_question_options (question_id);

alter table public.assessment_questions        enable row level security;
alter table public.assessment_question_options enable row level security;

-- Prompts are harmless to read once signed in.
create policy assessment_questions_select_authenticated
  on public.assessment_questions
  for select to authenticated
  using (true);

-- Deliberately no policy on the options table. Combined with the revoke below
-- it is unreachable from the API by any client role, in either direction.
revoke all on public.assessment_questions        from anon;
revoke all on public.assessment_question_options from anon, authenticated;

-- What a candidate is allowed to see: the choices, without which is right.
create view public.assessment_form_options
  with (security_invoker = false) as
select
  o.id,
  o.question_id,
  o.label,
  o.sort_order
from public.assessment_question_options o;

grant select on public.assessment_form_options to authenticated;

-- ---------------------------------------------------------------------------
-- Assessment catalogue
-- ---------------------------------------------------------------------------

-- security_invoker so RLS still scopes `assessment_results` to the caller;
-- the left join then yields the caller's own progress against every
-- assessment in one query.
create view public.my_assessment_catalogue
  with (security_invoker = true) as
select
  a.id            as assessment_id,
  a.title         as assessment_title,
  a.level,
  c.slug          as capability_slug,
  c.name          as capability_name,
  c.sort_order,
  (
    select count(*)
    from public.assessment_questions q
    where q.assessment_id = a.id
  )               as question_count,
  ar.status,
  ar.raw_score,
  ar.submitted_at
from public.assessments a
  join public.capabilities c on c.id = a.capability_id
  left join public.assessment_results ar
    on ar.assessment_id = a.id
   and ar.talent_id = (select auth.uid());

grant select on public.my_assessment_catalogue to authenticated;

-- ---------------------------------------------------------------------------
-- Grading
-- ---------------------------------------------------------------------------

-- Accepts `{"<question_id>": "<option_id>"}` and returns a summary.
--
-- security definer because it writes tables no client role can write, and
-- reads the answer key no client role can read. It derives the talent from
-- auth.uid() rather than taking it as an argument, so it cannot be pointed at
-- someone else's record.
create function public.submit_assessment(
  p_assessment_id uuid,
  p_answers       jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_talent     uuid := (select auth.uid());
  v_capability uuid;
  v_existing   public.verification_status;
  v_total      integer;
  v_correct    integer;
  v_score      numeric(6, 2);
  v_result_id  uuid;
begin
  if v_talent is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select a.capability_id into v_capability
  from public.assessments a
  where a.id = p_assessment_id;

  if v_capability is null then
    raise exception 'assessment not found' using errcode = 'P0002';
  end if;

  -- A verified result is an assessor's decision; a submitted one is already
  -- queued. Neither may be overwritten by resubmitting.
  select ar.status into v_existing
  from public.assessment_results ar
  where ar.talent_id = v_talent
    and ar.assessment_id = p_assessment_id;

  if v_existing in ('verified', 'submitted') then
    raise exception 'assessment already submitted' using errcode = 'P0001';
  end if;

  select count(*) into v_total
  from public.assessment_questions q
  where q.assessment_id = p_assessment_id;

  if v_total = 0 then
    raise exception 'assessment has no questions' using errcode = 'P0002';
  end if;

  select count(*) into v_correct
  from public.assessment_questions q
    join public.assessment_question_options o
      on o.question_id = q.id
     and o.is_correct
  where q.assessment_id = p_assessment_id
    and (p_answers ->> q.id::text) = o.id::text;

  v_score := round((v_correct::numeric / v_total::numeric) * 100, 2);

  insert into public.assessment_results (
    talent_id, assessment_id, raw_score, status, submitted_at,
    verified_at, assessor_name, assessor_note
  )
  values (
    v_talent, p_assessment_id, v_score, 'submitted', now(),
    null, null, null
  )
  on conflict (talent_id, assessment_id) do update
    set raw_score      = excluded.raw_score,
        status         = 'submitted',
        submitted_at   = now(),
        -- A retake invalidates any previous assessor decision.
        verified_at    = null,
        assessor_name  = null,
        assessor_note  = null
  returning id into v_result_id;

  -- Roll the capability up from its levels. The capability carries the most
  -- advanced state any of its levels has reached.
  insert into public.talent_capabilities (
    talent_id, capability_id, raw_score, status, updated_at
  )
  select
    v_talent,
    v_capability,
    round(avg(ar.raw_score), 2),
    case
      when bool_or(ar.status = 'verified')    then 'verified'::public.verification_status
      when bool_or(ar.status = 'submitted')   then 'submitted'::public.verification_status
      when bool_or(ar.status = 'in_progress') then 'in_progress'::public.verification_status
      when bool_or(ar.status = 'failed')      then 'failed'::public.verification_status
      when bool_or(ar.status = 'expired')     then 'expired'::public.verification_status
      else 'not_attempted'::public.verification_status
    end,
    now()
  from public.assessment_results ar
    join public.assessments a on a.id = ar.assessment_id
  where ar.talent_id = v_talent
    and a.capability_id = v_capability
  on conflict (talent_id, capability_id) do update
    set raw_score  = excluded.raw_score,
        status     = excluded.status,
        updated_at = now();

  return jsonb_build_object(
    'result_id', v_result_id,
    'correct',   v_correct,
    'total',     v_total,
    'raw_score', v_score
  );
end;
$$;

revoke all     on function public.submit_assessment(uuid, jsonb) from public, anon;
grant  execute on function public.submit_assessment(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Public directory
-- ---------------------------------------------------------------------------

-- Backs the browse page. Same rule as every other anonymous surface: it reads
-- the public view, so a passport appears here only while its owner has
-- visibility switched on, and only whitelisted columns travel.
create view public.public_passport_directory
  with (security_invoker = false) as
select
  p.username,
  p.full_name,
  p.current_role_title,
  p.target_role_title,
  p.headline,
  p.location,
  p.avatar_url,
  count(tc.*) filter (where tc.status = 'verified') as verified_capability_count,
  count(tc.*)                                       as capability_count
from public.profiles p
  left join public.talent_capabilities tc on tc.talent_id = p.id
where p.is_public
group by
  p.username, p.full_name, p.current_role_title, p.target_role_title,
  p.headline, p.location, p.avatar_url;

grant select on public.public_passport_directory to anon, authenticated;
