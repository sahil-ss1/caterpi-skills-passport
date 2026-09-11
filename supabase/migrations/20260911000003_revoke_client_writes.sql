-- Make the read-only tables read-only in privileges, not just in policy.
--
-- RLS already prevented a client writing these: with no insert or update
-- policy, an insert is rejected and an update silently matches zero rows.
-- That second case is the problem. "Succeeded, changed nothing" is
-- indistinguishable from "worked" at the call site, so a bug that removed a
-- policy would fail quietly.
--
-- Revoking the privilege turns both into an explicit 42501. It also states
-- the intent: scores are written by `submit_assessment` and by assessors,
-- never by a client. The function is security definer, so it is unaffected.

revoke insert, update, delete on public.capabilities                from authenticated;
revoke insert, update, delete on public.assessments                 from authenticated;
revoke insert, update, delete on public.talent_capabilities         from authenticated;
revoke insert, update, delete on public.assessment_results          from authenticated;
revoke insert, update, delete on public.evidence                    from authenticated;
revoke insert, update, delete on public.assessment_questions        from authenticated;
revoke insert, update, delete on public.assessment_question_options from authenticated;

-- `profiles` keeps UPDATE: the visibility toggle and the profile form both
-- write it, scoped to the owner's own row by `profiles_update_own`. Rows are
-- created by the `on_auth_user_created` trigger and removed by the cascade
-- from `auth.users`, so a client needs neither INSERT nor DELETE.
revoke insert, delete on public.profiles from authenticated;
