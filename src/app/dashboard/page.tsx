import type { Metadata } from 'next';

import { CapabilityList } from '@/components/passport/CapabilityList';
import { CapabilityRadar } from '@/components/passport/CapabilityRadar';
import { PassportHeader } from '@/components/passport/PassportHeader';
import { ProgressRing } from '@/components/passport/ProgressRing';
import { VisibilityToggle } from '@/components/passport/VisibilityToggle';
import { Card, EmptyState, SectionHeading } from '@/components/ui';
import { getMyPassport } from '@/data/passport';

export const metadata: Metadata = { title: 'My skills passport' };

export default async function DashboardPage() {
  const passport = await getMyPassport();
  const hasCapabilities = passport.capabilities.length > 0;

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
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
              title="Nothing to chart yet"
              description="Complete an assessment and your capability profile will appear here."
            />
          )}
        </Card>
      </div>

      <section className="mt-8">
        <SectionHeading
          title="Capabilities"
          description="Open a capability to review its assessment history and evidence."
        />
        <CapabilityList
          capabilities={passport.capabilities}
          hrefBase="/dashboard/capabilities"
        />
      </section>

      <section className="mt-8 max-w-xl">
        <SectionHeading title="Sharing" />
        <VisibilityToggle
          isPublic={passport.isPublic}
          username={passport.username}
        />
      </section>
    </main>
  );
}
