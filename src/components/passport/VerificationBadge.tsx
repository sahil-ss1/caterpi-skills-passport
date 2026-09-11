import { type VerificationStatus, statusMeta } from '@/domain/verification';

/**
 * Every visual property comes from the status registry, so this component has
 * no per-status branching and never needs editing when a state is added.
 */
export function VerificationBadge({
  status,
  className = '',
}: {
  status: VerificationStatus;
  className?: string;
}) {
  const meta = statusMeta(status);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${meta.badgeClassName} ${className}`}
    >
      {meta.label}
    </span>
  );
}
