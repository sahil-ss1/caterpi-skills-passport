import 'server-only';

import type { EvidenceItem } from '@/domain/passport';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, EvidenceRow } from '@/lib/supabase/database.types';

export const EVIDENCE_BUCKET = 'evidence';

/** Long enough to open the file, short enough that a shared link goes stale. */
const SIGNED_URL_TTL_SECONDS = 60;

/**
 * Turns evidence rows into signed, openable links.
 *
 * Signed in one batch rather than per row: a capability with six attachments
 * would otherwise mean six round-trips to Storage, which is the request
 * pattern this screen is most likely to regress into.
 *
 * A row whose object is absent is expected, not exceptional — evidence can be
 * pending upload or have been removed — so it degrades to an unavailable item
 * the UI can explain, rather than failing the page.
 */
export async function signEvidence(
  supabase: SupabaseClient<Database>,
  rows: readonly EvidenceRow[],
): Promise<EvidenceItem[]> {
  if (rows.length === 0) return [];

  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrls(
      rows.map((row) => row.storage_path),
      SIGNED_URL_TTL_SECONDS,
    );

  if (error) {
    // Storage itself is unreachable or the bucket policy rejects the caller.
    // The assessment history is still worth rendering without the downloads.
    console.error(
      `[data] signEvidence failed`,
      JSON.stringify({ message: error.message, count: rows.length }),
    );
    return rows.map((row) => toUnavailable(row, 'unauthorised'));
  }

  const signedByPath = new Map(
    data.map((entry) => [entry.path ?? '', entry] as const),
  );

  return rows.map((row) => {
    const signed = signedByPath.get(row.storage_path);

    if (!signed || signed.error || !signed.signedUrl) {
      return toUnavailable(row, 'missing');
    }

    return {
      id: row.id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      url: signed.signedUrl,
      unavailableReason: null,
    };
  });
}

function toUnavailable(
  row: EvidenceRow,
  reason: NonNullable<EvidenceItem['unavailableReason']>,
): EvidenceItem {
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    url: null,
    unavailableReason: reason,
  };
}
