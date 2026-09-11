# Caterpi Skills Passport

A vertical slice of the Caterpi talent skills passport: an authenticated
dashboard, a capability detail view with assessment evidence, a shareable
public passport, and a visibility control — all reading from Supabase.

Built with Next.js 16 (App Router), React 19, TypeScript in strict mode,
Tailwind CSS v4 and Supabase.

### Beyond the brief

The four required screens are Screens A–D below. The following were added on
top and are not part of the original requirement: a marketing home page,
self-service signup, a self-serve assessment flow, profile management and a
public talent directory.

The assessment flow is the one worth calling out, because the obvious
implementation would have broken the product's trust model. A talent must
never be able to award themselves a verification, so:

- The answer key lives in `assessment_question_options.is_correct`, on a
  table that **no client role holds any privilege on**. Candidates read
  choices through a view that does not contain the column.
- The client never sends a score. `submit_assessment` takes answers, grades
  them inside Postgres, and writes the result as `submitted` — awaiting an
  assessor — never `verified`.
- No client role can insert or update `assessment_results` or
  `talent_capabilities` at all, so that function is the only path by which a
  score can be written.

`npm run verify:access` asserts each of those against the live project.

---

## Setup

```bash
npm install
cp .env.example .env.local   # fill in from Supabase -> Project Settings -> API
```

`.env.local` needs two values, both of which are safe in browser code:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Apply the schema and fixtures to your Supabase project:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db reset --linked     # runs migrations, then supabase/seed.sql
npm run seed:evidence          # uploads evidence files to Storage
```

One dashboard setting is required for self-service signup to be usable:
**Authentication → Sign In / Providers → Email → turn off "Confirm email"**.
Without it Supabase sends a confirmation mail on every signup, which on the
shared built-in mailer is rate limited to a couple per hour, so a new account
cannot sign in. The signup action handles both cases — with confirmation on
it shows a "check your inbox" notice rather than pretending to succeed.

`seed:evidence` is a separate step because Storage objects cannot be created
from SQL. It signs in as each seeded talent and uploads under that talent's
own path, so it needs no privileged key — and the fact that it succeeds is
itself a check that the storage policy permits an owner to write
`<talent_id>/…`. One file is skipped deliberately so the missing-evidence
state stays reachable in the UI.

Then:

```bash
npm run dev            # http://localhost:3000
npm test               # vitest — 52 unit tests
npm run verify:access  # asserts the access boundaries against the live project
npm run verify:flow    # walks signup -> assessment -> graded result
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # next build
```

`verify:access` covers what unit tests cannot: that anonymous callers are
denied the base tables, that a private passport returns nothing, that the
public view exposes no private columns, that neither anonymous nor
authenticated callers can read the answer key, and that a talent can neither
read another's records nor write a score for themselves.

`verify:flow` creates one throwaway account per run and walks it through
signup, the catalogue and a graded submission, then asserts the result landed
as `submitted` rather than `verified`. It cannot delete the account
afterwards — that needs an admin key, and nothing here holds one.

### Test accounts

Every seeded account uses the password `Caterpi!2345`. They are also listed on
the sign-in screen so you can switch between them quickly.

| Account | What it exercises |
| --- | --- |
| `priya@caterpi.test` | Complete passport, public, all six capabilities |
| `marcus@caterpi.test` | Partial data, **private**, null scores, an expired verification |
| `amara@caterpi.test` | No capability data at all |
| `sam@caterpi.test` | An evidence record whose storage object is absent |

Public passports live at `/p/<username>`, for example `/p/priya-sharma`.
`/p/marcus-chen` is private and must return a not-found page.

### Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Product overview, live count of public passports |
| `/discover` | Public | Directory of passports whose owners opted in |
| `/p/[username]` | Public | A single public passport |
| `/signup`, `/login` | Public | Account creation and sign-in |
| `/dashboard` | Owner | Screen A — radar, progress, capability cards |
| `/dashboard/capabilities/[slug]` | Owner | Screen B — history and evidence |
| `/dashboard/assessments` | Owner | Catalogue of assessments and their state |
| `/dashboard/assessments/[id]` | Owner | Sit an assessment |
| `/dashboard/settings` | Owner | Screen D — visibility, plus profile editing |

---

## Architecture

```
src/
  domain/     Framework-free types and rules. No Supabase, no React.
  data/       Server-only data access. Auth checks, queries, row -> domain mapping.
  lib/supabase/  Client construction and hand-maintained row types.
  components/ Presentation. Receives domain objects, never database rows.
  app/        Routes, Server Actions, error and loading boundaries.
  proxy.ts    Session refresh (Next.js 16's replacement for middleware).
```

The dependency direction is one-way: `app` → `components` → `domain`, and
`app` → `data` → `domain`. Components never import from `data` or
`lib/supabase`, so no component can issue a query.

### Data flow, Supabase to radar chart

1. `src/data/passport.ts` runs three concurrent queries against
   `profiles`, `my_capabilities` and `my_capability_levels`.
2. `src/data/mappers.ts` converts rows to `Capability` objects. This is the
   only place raw scores and status strings are interpreted.
3. `src/app/dashboard/page.tsx` passes `{ name, score }` pairs to
   `CapabilityRadar`, which asks `domain/score.ts` for geometry.

The chart never sees a database row or a raw score.

### Where domain data is transformed

`src/domain/score.ts` is the single score boundary. Supabase reports
`raw_score` on whatever scale the assessment engine uses; `normalizeScore`
projects it onto a branded `NormalizedScore` of 0..1, and `toPercent` and
`formatScore` are the only ways back out.

The brand is load-bearing: a plain `number` cannot be passed to chart or
label code, so the compiler enforces the boundary rather than a convention.
Changing the source scale is a change to two constants in that file.

`src/domain/verification.ts` is the equivalent boundary for status.
`VERIFICATION_STATUS_META` is a `Record` keyed by the status union, and badge
styling, progress arithmetic and the filter options all derive from it.
Adding a status is an entry in the array plus an entry in the record;
TypeScript fails the build until the metadata exists.

`parseVerificationStatus` runs at the data boundary and degrades an unknown
value to `not_attempted`, so a backend enum added ahead of frontend support
cannot take the dashboard down.

---

## Security and privacy

The public route is enforced in the database, not in the UI.

**Base tables.** Every table has RLS enabled with owner-only policies
(`auth.uid() = talent_id`). There is deliberately no policy for the `anon`
role, and `anon` privileges are explicitly revoked. An anonymous request
cannot read `profiles` at all.

**Public views.** `public_passports`, `public_passport_capabilities` and
`public_passport_levels` are security-definer views that whitelist columns
and filter `is_public`. They are the only relations granted to `anon`. A
private passport returns zero rows — nothing is fetched and then hidden, and
turning the toggle off takes effect on the next request.

What the public payload cannot contain, because the views do not select it:
email addresses, internal IDs, per-level scores, submission or verification
dates, assessor names, assessor notes and internal notes.

**Types.** `PublicPassport` is declared independently rather than as
`Omit<TalentPassport, …>`. With `Omit`, a private field added later would
silently widen the public type; here, exposing something new publicly has to
be a deliberate edit.

**Owner views.** `my_capabilities` and `my_capability_levels` are
`security_invoker = true`, so RLS still applies and each caller sees only
their own rows. The `.eq('talent_id', …)` filters in `src/data` are redundant
with that by design — the database is the enforcement, the filter is the
statement of intent.

**Server Actions.** `updateVisibilityAction` is reachable by direct POST
independently of the page that rendered it, so `setPassportVisibility`
re-checks the caller rather than trusting the page, and the
`profiles_update_own` policy rejects a mismatched write at the database.

**Credentials.** No `service_role` key, database password or other
privileged secret appears anywhere in this repository. The seed uses
`pgcrypto` in SQL specifically so that no admin key is needed. `.env*` is
gitignored.

**Evidence.** The `evidence` bucket is private. Files are served through
60-second signed URLs generated server-side, and the storage policy
authorises on the leading path segment (`<talent_id>/…`).

**Grading.** `submit_assessment` is `security definer` and derives the talent
from `auth.uid()` rather than taking it as an argument, so it cannot be
pointed at another person's record. It refuses to overwrite a `verified` or
`submitted` result, so a retake cannot quietly discard an assessor's
decision.

**Privileges, not just policies.** Migration `…_revoke_client_writes`
revokes `insert`, `update` and `delete` on the score tables from
`authenticated`. RLS already blocked those writes, but an update with no
matching policy returns *no error and changes nothing* — success and silent
denial look identical at the call site. Revoking the privilege turns both
into an explicit `42501`. `profiles` keeps `update`, because the visibility
toggle and profile form need it, scoped by `profiles_update_own`.

**Account creation.** The `profiles` row is created by a trigger on
`auth.users`, not by application code. A profile therefore cannot go missing
because a client request failed between two writes, and no privileged key is
needed to insert on a new user's behalf.

---

## Notable decisions and trade-offs

**Sparse levels.** An unattempted level has no row in Supabase; absence is
the signal. This keeps the backend honest but means the frontend must build
the ladder, which `buildLevelLadder` does in one place.

**Hand-written radar chart.** No charting dependency. The geometry is a dozen
lines, and owning it means the accessible fallback (a visually hidden list of
values) and the partial-data behaviour are real rather than whatever a
library permits. Below three capabilities it renders bars instead, because a
polygon with two vertices encloses no area.

**Unscored is not zero.** `normalizeScore` returns `null` rather than `0` for
missing data, and `averageScore` returns `null` when nothing is scored.
Rendering an unassessed capability as 0 would make it look failed.

**Hand-maintained database types.** `supabase gen types` needs Docker, which
this environment does not have. In a real project this file would be
generated in CI so a column rename fails the build. As written, the types are
still checked against every query at compile time.

**Request behaviour.** The dashboard is three concurrent queries and the
count does not grow with the number of capabilities. Capability detail adds
one query for evidence and one batched `createSignedUrls` call rather than
one per attachment. `getCurrentUser`, `getMyPassport` and
`getPublicPassport` are wrapped in React `cache`, so a page and its
`generateMetadata` share one round-trip.

**Sign-in is a Server Action.** Cookies are written on the same response that
redirects, so the dashboard's first render is already authenticated and there
is no signed-out flash.

---

## Testing

52 tests covering the logic most likely to break silently: score
normalization and its null handling, the status registry and its unknown-value
fallback, progress arithmetic with empty and sparse data, level-ladder
construction, the public mapper's payload shape, assessment availability
rules, and profile validation against the same constraints Postgres enforces.

The availability tests matter most: they assert that a `verified` or
`submitted` assessment is never offered as startable, which is the rule that
stops a retake overwriting an assessor's decision.

Async Server Components are not unit tested — Vitest does not support them
yet, which is why the privacy boundary is asserted at the mapper level and
enforced in SQL rather than mocked.

---

## What I would do next with more production time

- Generate `database.types.ts` in CI instead of maintaining it by hand.
- A Playwright test that signs in as one talent and asserts another's private
  passport 404s, which is the regression most worth catching automatically.
- `pgTAP` tests asserting the RLS policies directly, so a future policy edit
  cannot quietly widen access.
- Pagination or virtualisation on the capability grid once a talent can hold
  more than a screenful.
- Move the evidence signed-URL TTL and the score display config into a small
  runtime settings module rather than module constants.
