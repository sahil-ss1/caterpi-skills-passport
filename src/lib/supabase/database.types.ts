/**
 * Row types for the Supabase schema in `supabase/migrations`.
 *
 * Hand-maintained rather than generated, because the assessment environment
 * has no Docker for `supabase gen types --local`. In a real project this file
 * would be `supabase gen types typescript --linked > database.types.ts` run in
 * CI, so a column rename fails the build instead of failing at runtime.
 *
 * Nothing outside `src/data` should import these: they are database shapes,
 * not domain shapes.
 */

export type VerificationStatusRow =
  | 'not_attempted'
  | 'in_progress'
  | 'submitted'
  | 'verified'
  | 'failed'
  | 'expired';

export type ProfileRow = {
  id: string;
  username: string;
  full_name: string;
  current_role_title: string | null;
  target_role_title: string | null;
  headline: string | null;
  location: string | null;
  avatar_url: string | null;
  contact_email: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export type CapabilityRow = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  sort_order: number;
}

export type TalentCapabilityRow = {
  id: string;
  talent_id: string;
  capability_id: string;
  raw_score: number | string | null;
  status: VerificationStatusRow;
  updated_at: string;
}

export type AssessmentRow = {
  id: string;
  capability_id: string;
  title: string;
  level: number;
}

export type AssessmentResultRow = {
  id: string;
  talent_id: string;
  assessment_id: string;
  raw_score: number | string | null;
  status: VerificationStatusRow;
  submitted_at: string | null;
  verified_at: string | null;
  assessor_name: string | null;
  assessor_note: string | null;
  internal_notes: string | null;
}

export type EvidenceRow = {
  id: string;
  assessment_result_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
}

export type MyCapabilityRow = {
  talent_id: string;
  capability_slug: string;
  capability_name: string;
  capability_category: string | null;
  capability_description: string | null;
  sort_order: number;
  raw_score: number | string | null;
  status: VerificationStatusRow;
}

export type MyCapabilityLevelRow = {
  talent_id: string;
  capability_slug: string;
  level: number;
  assessment_title: string;
  result_id: string;
  raw_score: number | string | null;
  status: VerificationStatusRow;
  submitted_at: string | null;
  verified_at: string | null;
  assessor_name: string | null;
  assessor_note: string | null;
}

/** Anonymous read surface. Note what is absent: id, contact_email, is_public. */
export type PublicPassportRow = {
  username: string;
  full_name: string;
  current_role_title: string | null;
  target_role_title: string | null;
  headline: string | null;
  location: string | null;
  avatar_url: string | null;
}

export type PublicPassportCapabilityRow = {
  username: string;
  capability_slug: string;
  capability_name: string;
  capability_category: string | null;
  sort_order: number;
  raw_score: number | string | null;
  status: VerificationStatusRow;
}

export type PublicPassportLevelRow = {
  username: string;
  capability_slug: string;
  level: number;
  status: VerificationStatusRow;
}

/**
 * PostgREST's type helpers require `Insert` and `Update` to be object types,
 * so read-only relations declare them rather than `never`. Writes are blocked
 * by RLS regardless; nothing in `src/data` writes to these.
 */
type ReadOnlyTable<Row> = {
  Row: Row;
  Insert: Row;
  Update: Partial<Row>;
  Relationships: [];
};

type ReadOnlyView<Row> = {
  Row: Row;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, 'id' | 'username' | 'full_name'>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      capabilities: ReadOnlyTable<CapabilityRow>;
      talent_capabilities: ReadOnlyTable<TalentCapabilityRow>;
      assessments: ReadOnlyTable<AssessmentRow>;
      assessment_results: ReadOnlyTable<AssessmentResultRow>;
      evidence: ReadOnlyTable<EvidenceRow>;
    };
    Views: {
      my_capabilities: ReadOnlyView<MyCapabilityRow>;
      my_capability_levels: ReadOnlyView<MyCapabilityLevelRow>;
      public_passports: ReadOnlyView<PublicPassportRow>;
      public_passport_capabilities: ReadOnlyView<PublicPassportCapabilityRow>;
      public_passport_levels: ReadOnlyView<PublicPassportLevelRow>;
    };
    Functions: { [_ in never]: never };
    Enums: { verification_status: VerificationStatusRow };
    CompositeTypes: { [_ in never]: never };
  };
}
