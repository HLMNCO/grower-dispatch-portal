import { Dispatch } from '@/types/dispatch';
import { cn } from '@/lib/utils';

const statusConfig: Record<Dispatch['status'], { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-muted text-muted-foreground' },
  'in-transit': { label: 'In Transit', className: 'bg-primary/10 text-primary' },
  arrived: { label: 'Arrived', className: 'bg-warning/15 text-warning-foreground font-semibold' },
  received: { label: 'Received', className: 'bg-success/15 text-success' },
  issue: { label: 'Issue Flagged', className: 'bg-destructive/15 text-destructive font-semibold' },
};

export function StatusBadge({ status }: { status: Dispatch['status'] }) {
  const config = statusConfig[status];
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase',
      config.className
    )}>
      {config.label}
    </span>
  );
}
