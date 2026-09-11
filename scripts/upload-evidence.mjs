/**
 * Uploads placeholder evidence files for the seeded talents.
 *
 * Storage objects cannot be created from SQL, so this runs after
 * `supabase db reset`. It signs in as each talent with the seeded password
 * and uploads under their own path — no service_role key involved, which
 * also proves the storage policy allows an owner to write `<talent_id>/…`
 * and nothing else.
 *
 *   node --env-file=.env.local scripts/upload-evidence.mjs
 *
 * One record is skipped on purpose so the "evidence is missing" state stays
 * reachable in the UI.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const PASSWORD = 'Caterpi!2345';

const ACCOUNTS = [
  'priya@caterpi.test',
  'marcus@caterpi.test',
  'amara@caterpi.test',
  'sam@caterpi.test',
];

/** Left dangling so the UI's unavailable-evidence branch stays exercised. */
const SKIP_FILES = new Set(['campaign-teardown.pdf']);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.\n' +
      'Run with: node --env-file=.env.local scripts/upload-evidence.mjs',
  );
  process.exit(1);
}

/** A minimal but structurally valid single-page PDF. */
function makePdf(title) {
  const text = `BT /F1 11 Tf 24 96 Td (${title.replace(/[()\\]/g, '')}) Tj ET`;
  const bodies = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 320 160]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>',
    `<</Length ${text.length}>>\nstream\n${text}\nendstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  bodies.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xref = pdf.length;
  pdf += `xref\n0 ${bodies.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<</Size ${bodies.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

let uploaded = 0;
let skipped = 0;

for (const email of ACCOUNTS) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });

  if (signInError) {
    console.error(`✗ ${email}: sign-in failed — ${signInError.message}`);
    process.exitCode = 1;
    continue;
  }

  // RLS scopes this to the signed-in talent's own evidence.
  const { data: rows, error } = await supabase
    .from('evidence')
    .select('id, storage_path, file_name');

  if (error) {
    console.error(`✗ ${email}: could not read evidence — ${error.message}`);
    process.exitCode = 1;
    continue;
  }

  for (const row of rows ?? []) {
    if (SKIP_FILES.has(row.file_name)) {
      console.log(`· ${row.file_name} — skipped on purpose (missing-evidence state)`);
      skipped += 1;
      continue;
    }

    const { error: uploadError } = await supabase.storage
      .from('evidence')
      .upload(row.storage_path, makePdf(row.file_name), {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error(`✗ ${row.file_name} — ${uploadError.message}`);
      process.exitCode = 1;
      continue;
    }

    console.log(`✓ ${row.file_name}`);
    uploaded += 1;
  }

  await supabase.auth.signOut();
}

console.log(`\nUploaded ${uploaded} file(s), skipped ${skipped}.`);
