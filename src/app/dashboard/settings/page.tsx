import type { Metadata } from 'next';
import Link from 'next/link';

import { VisibilityToggle } from '@/components/passport/VisibilityToggle';
import { Card, SectionHeading, buttonClassName } from '@/components/ui';
import { getMyPassport } from '@/data/passport';
import { getEditableProfile } from '@/data/profile';

import { ProfileForm } from './ProfileForm';

export const metadata: Metadata = { title: 'Profile settings' };

export default async function SettingsPage() {
  // Both are request-cached and independent, so they resolve together rather
  // than one after the other.
  const [profile, passport] = await Promise.all([
    getEditableProfile(),
    getMyPassport(),
  ]);

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Profile settings
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            What appears on your passport, and who can see it.
          </p>
        </div>
        <Link href="/dashboard" className={buttonClassName('secondary')}>
          Back to passport
        </Link>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <SectionHeading
            title="Public visibility"
            description="Controls whether your passport resolves for anyone other than you."
          />
          <VisibilityToggle
            isPublic={passport.isPublic}
            username={passport.username}
          />
        </Card>

        <Card className="p-6">
          <SectionHeading
            title="Passport details"
            description="Shown on your public passport when visibility is on."
          />
          <ProfileForm profile={profile} />
        </Card>

        <Card className="p-6">
          <SectionHeading
            title="Account"
            description="Not shown publicly."
          />
          <dl className="text-sm">
            <dt className="text-ink-600">Email address</dt>
            <dd className="mt-0.5 font-medium text-ink-900">
              {profile.contactEmail ?? 'Not set'}
            </dd>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-ink-600">
            Your email is never part of the public passport payload. It is not
            included in the views a visitor can read.
          </p>
        </Card>
      </div>
    </main>
  );
}
