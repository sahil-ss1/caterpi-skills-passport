import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CapabilityList } from '@/components/passport/CapabilityList';
import { CapabilityRadar } from '@/components/passport/CapabilityRadar';
import { PassportHeader } from '@/components/passport/PassportHeader';
import { ProgressRing } from '@/components/passport/ProgressRing';
import { Card, EmptyState, SectionHeading } from '@/components/ui';
import { getPublicPassport } from '@/data/public-passport';

type Props = PageProps<'/p/[username]'>;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { username } = await props.params;
  const passport = await getPublicPassport(username);

  if (!passport) {
    // Private and non-existent passports get the same metadata, so the page
    // title cannot confirm that a username exists.
    return { title: 'Passport not found', robots: { index: false } };
  }

  return {
    title: `${passport.fullName} · Verified capabilities`,
    description:
      passport.headline ??
      `${passport.fullName}'s verified marketing capabilities on Caterpi.`,
  };
}

export default async function PublicPassportPage(props: Props) {
  const { username } = await props.params;

  const passport = await getPublicPassport(username);

  // `getPublicPassport` reads a view that filters `is_public`, so a private
  // passport is indistinguishable from a missing one at this point — which is
  // the intent. Nothing was fetched and then hidden.
  if (!passport) notFound();

  const hasCapabilities = passport.capabilities.length > 0;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6">
          <p className="text-sm font-semibold tracking-tight text-ink-900">
            <span className="text-brand-700">Caterpi</span> Skills Passport
          </p>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <PassportHeader
          fullName={passport.fullName}
          currentRole={passport.currentRole}
          targetRole={passport.targetRole}
          headline={passport.headline}
          location={passport.location}
        />

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5" as="section">
            <h2 className="mb-4 text-sm font-semibold text-ink-900">
              Verification progress
            </h2>
            <ProgressRing progress={passport.progress} />
          </Card>

          <Card className="p-5 lg:col-span-2" as="section">
            <h2 className="mb-4 text-sm font-semibold text-ink-900">
              Capability profile
            </h2>
            {hasCapabilities ? (
              <div className="flex justify-center">
                <CapabilityRadar
                  data={passport.capabilities.map((capability) => ({
                    name: capability.name,
                    score: capability.score,
                  }))}
                />
              </div>
            ) : (
              <EmptyState
                title="No verified capabilities yet"
                description="This talent has not completed any assessments so far."
              />
            )}
          </Card>
        </div>

        <section className="mt-8">
          <SectionHeading title="Capabilities" />
          {/* No `hrefBase`: assessment history and evidence are private. */}
          <CapabilityList capabilities={passport.capabilities} />
        </section>
      </main>
    </div>
  );
}
