'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Field, buttonClassName } from '@/components/ui';
import type { EditableProfile } from '@/data/profile';

import { type ProfileFormState, updateProfileAction } from './actions';

const initialState: ProfileFormState = { status: 'idle' };

export function ProfileForm({ profile }: { profile: EditableProfile }) {
  // The username at render time is bound into the action so the server can
  // revalidate the old public route even after the handle changes.
  const action = updateProfileAction.bind(null, profile.username);
  const [state, formAction] = useActionState(action, initialState);

  const errors = state.status === 'error' ? state.errors : {};

  return (
    <form action={formAction} className="space-y-5">
      <Field
        label="Full name"
        name="fullName"
        required
        defaultValue={profile.fullName}
        error={errors.fullName}
        maxLength={120}
      />

      <Field
        label="Username"
        name="username"
        required
        defaultValue={profile.username}
        error={errors.username}
        hint={`Your public passport lives at /p/${profile.username}`}
        maxLength={40}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Current role"
          name="currentRole"
          defaultValue={profile.currentRole ?? ''}
          placeholder="Senior Performance Marketer"
        />
        <Field
          label="Target role"
          name="targetRole"
          defaultValue={profile.targetRole ?? ''}
          placeholder="Head of Growth"
        />
      </div>

      <Field
        label="Headline"
        name="headline"
        multiline
        maxLength={280}
        defaultValue={profile.headline ?? ''}
        error={errors.headline}
        hint="A sentence or two shown at the top of your passport."
      />

      <Field
        label="Location"
        name="location"
        defaultValue={profile.location ?? ''}
        placeholder="Bengaluru, India"
      />

      {state.status === 'error' ? (
        <p role="alert" className="text-sm font-medium text-rose-700">
          {state.message}
        </p>
      ) : null}

      {state.status === 'saved' ? (
        <p
          role="status"
          className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700"
        >
          Saved. Your passport is at /p/{state.username}
        </p>
      ) : null}

      <SaveButton />
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClassName('primary', 'disabled:cursor-progress')}
    >
      {pending ? 'Saving…' : 'Save changes'}
    </button>
  );
}
