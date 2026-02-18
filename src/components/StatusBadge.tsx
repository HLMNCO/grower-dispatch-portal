import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  pending: { label: 'Submitted', className: 'bg-primary/10 text-primary' },
  'in-transit': { label: 'In Transit', className: 'bg-warning/15 text-warning-foreground font-semibold' },
  arrived: { label: 'Arrived', className: 'bg-success/15 text-success' },
  'partially-received': { label: 'Partially Received', className: 'bg-amber-500/15 text-amber-700 font-semibold' },
  'received-pending-admin': { label: 'Pending Admin', className: 'bg-amber-500/15 text-amber-700 font-semibold' },
  received: { label: 'Received', className: 'bg-success/20 text-success font-semibold' },
  issue: { label: 'Issue Flagged', className: 'bg-destructive/15 text-destructive font-semibold' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase',
      config.className
    )}>
      {config.label}
    </span>
  );
}
