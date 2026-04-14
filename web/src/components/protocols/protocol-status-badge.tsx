import { cn } from '@/lib/utils';

import type { ProtocolHealthStatus } from '@/types/protocol-health';

interface ProtocolStatusBadgeProps {
  status: ProtocolHealthStatus;
}

const STATUS_STYLES: Record<ProtocolHealthStatus, string> = {
  operational: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  degraded: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  unavailable: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

const STATUS_LABELS: Record<ProtocolHealthStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  unavailable: 'Unavailable',
};

export function ProtocolStatusBadge({ status }: ProtocolStatusBadgeProps): JSX.Element {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium', STATUS_STYLES[status])}>
      <span className={cn('h-1.5 w-1.5 rounded-full', status === 'operational' ? 'bg-emerald-300' : status === 'degraded' ? 'bg-amber-300' : 'bg-rose-300')} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
