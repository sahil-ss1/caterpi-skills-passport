import 'server-only';

import { cache } from 'react';

import {
  type AssessmentRecord,
  type CapabilityDetail,
  type TalentPassport,
  computeProgress,
  isCapabilityLevel,
} from '@/domain/passport';
import { normalizeScore } from '@/domain/score';
import { parseVerificationStatus } from '@/domain/verification';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { requireUser } from './auth';
import { toDataError, unwrap } from './errors';
import { signEvidence } from './evidence';
import { mapCapabilities } from './mappers';

/**
 * Columns the dashboard actually renders.
 *
 * `id` and `contact_email` are omitted even though the caller owns the row:
 * the page has no use for them, and a Server Component that never holds a
 * value cannot leak it into a Client Component's props.
 */
const PROFILE_COLUMNS =
  'username, full_name, current_role_title, target_role_title, headline, location, avatar_url, is_public';

/**
 * The signed-in talent's passport.
 *
 * Three queries, issued concurrently, and the count does not grow with the
 * number of capabilities — the joins happen in `my_capabilities` and
 * `my_capability_levels` rather than in a loop here.
 *
 * `.eq('talent_id', ...)` on the views is redundant with RLS by design: the
 * database is the enforcement, this is the statement of intent.
 */
export const getMyPassport = cache(async (): Promise<TalentPassport> => {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const [profileResult, capabilityResult, levelResult] = await Promise.all([
    supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', user.id).single(),
    supabase.from('my_capabilities').select('*').eq('talent_id', user.id),
    supabase.from('my_capability_levels').select('*').eq('talent_id', user.id),
  ]);

  const profile = unwrap(profileResult, 'getMyPassport.profile');
  const capabilityRows = unwrap(capabilityResult, 'getMyPassport.capabilities');
  const levelRows = unwrap(levelResult, 'getMyPassport.levels');

  const capabilities = mapCapabilities(capabilityRows, levelRows);

  return {
    username: profile.username,
    fullName: profile.full_name,
    currentRole: profile.current_role_title,
    targetRole: profile.target_role_title,
    headline: profile.headline,
    location: profile.location,
    avatarUrl: profile.avatar_url,
    isPublic: profile.is_public,
    capabilities,
    progress: computeProgress(capabilities),
  };
});

/**
 * One capability with its full assessment history and evidence.
 *
 * Returns `null` for a slug the talent has no record of, so the route can
 * render a 404 rather than an empty shell.
 */
export const getMyCapabilityDetail = cache(
  async (slug: string): Promise<CapabilityDetail | null> => {
    const user = await requireUser();
    const supabase = await createSupabaseServerClient();

    const [capabilityResult, levelResult] = await Promise.all([
      supabase
        .from('my_capabilities')
        .select('*')
        .eq('talent_id', user.id)
        .eq('capability_slug', slug)
        .maybeSingle(),
      supabase
        .from('my_capability_levels')
        .select('*')
        .eq('talent_id', user.id)
        .eq('capability_slug', slug)
        .order('level', { ascending: false }),
    ]);

    if (capabilityResult.error) {
      throw toDataError(capabilityResult.error, 'getMyCapabilityDetail.capability');
    }
    if (!capabilityResult.data) return null;

    const levelRows = unwrap(levelResult, 'getMyCapabilityDetail.levels');

    // One query for every attachment on this capability, then one batch
    // signing call — not one of each per assessment result.
    const resultIds = levelRows.map((row) => row.result_id);
    const evidenceRows =
      resultIds.length === 0
        ? []
        : unwrap(
            await supabase
              .from('evidence')
              .select('*')
              .in('assessment_result_id', resultIds),
            'getMyCapabilityDetail.evidence',
          );

    const signed = await signEvidence(supabase, evidenceRows);
    const signedById = new Map(signed.map((item) => [item.id, item]));

    const evidenceByResult = new Map<string, typeof signed>();
    for (const row of evidenceRows) {
      const item = signedById.get(row.id);
      if (!item) continue;
      const bucket = evidenceByResult.get(row.assessment_result_id) ?? [];
      bucket.push(item);
      evidenceByResult.set(row.assessment_result_id, bucket);
    }

    const [capability] = mapCapabilities([capabilityResult.data], levelRows);

    const history: AssessmentRecord[] = levelRows
      .filter((row) => isCapabilityLevel(row.level))
      .map((row) => ({
        resultId: row.result_id,
        level: row.level as AssessmentRecord['level'],
        title: row.assessment_title,
        status: parseVerificationStatus(row.status),
        score: normalizeScore(row.raw_score),
        submittedAt: row.submitted_at,
        verifiedAt: row.verified_at,
        assessorName: row.assessor_name,
        assessorNote: row.assessor_note,
        evidence: evidenceByResult.get(row.result_id) ?? [],
      }));

    return {
      capability,
      description: capabilityResult.data.capability_description,
      history,
    };
  },
);