import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return (
    <Tag
      className={`rounded-[--radius-card] border border-ink-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}
    >
      {children}
    </Tag>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-ink-600">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[--radius-card] border border-dashed border-ink-200 bg-white px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-600">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/**
 * `role="status"` rather than `role="alert"`: these are recoverable and
 * shouldn't interrupt a screen reader mid-sentence.
 */
export function InlineError({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="rounded-[--radius-card] border border-rose-200 bg-rose-50 px-4 py-4 text-sm"
    >
      <p className="font-semibold text-rose-900">{title}</p>
      <p className="mt-1 text-rose-800">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-ink-100 ${className}`}
    />
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-ink-200 disabled:text-ink-400',
  secondary:
    'border border-ink-200 bg-white text-ink-900 hover:bg-ink-50 disabled:text-ink-400',
  ghost: 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
};

/** Shared button styling, so links and buttons can look identical without
 * duplicating the class list at every call site. */
export function buttonClassName(
  variant: ButtonVariant = 'primary',
  className = '',
): string {
  return `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`;
}

/**
 * A labelled text input.
 *
 * The error is wired with `aria-describedby` and `aria-invalid` rather than
 * only coloured, so it is announced rather than merely visible.
 */
export function Field({
  label,
  name,
  defaultValue,
  error,
  hint,
  type = 'text',
  required = false,
  autoComplete,
  placeholder,
  multiline = false,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  type?: 'text' | 'email' | 'password';
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  const id = `field-${name}`;
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(' ');

  const shared = `w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 ${
    error ? 'border-rose-300' : 'border-ink-200'
  }`;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink-900">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>

      {multiline ? (
        <textarea
          id={id}
          name={name}
          rows={3}
          defaultValue={defaultValue}
          required={required}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`mt-1.5 ${shared}`}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          defaultValue={defaultValue}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`mt-1.5 ${shared}`}
        />
      )}

      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-600">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
