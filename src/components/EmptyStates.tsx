import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Truck, Package, CalendarDays, Users, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: { label: string; to?: string; onClick?: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        {icon}
      </div>
      <div className="space-y-1 max-w-xs">
        <h3 className="font-display text-base tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {action && (
        action.to ? (
          <Link to={action.to}>
            <Button className="font-display min-h-[44px]">{action.label}</Button>
          </Link>
        ) : (
          <Button onClick={action.onClick} className="font-display min-h-[44px]">{action.label}</Button>
        )
      )}
    </div>
  );
}

export function NoDispatchesEmpty({ isSupplier }: { isSupplier: boolean }) {
  if (isSupplier) {
    return (
      <EmptyState
        icon={<Truck className="h-8 w-8 text-muted-foreground" />}
        title="No deliveries yet"
        description="Create your first delivery advice to start sending produce to Ten Farms."
        action={{ label: '+ New Delivery Advice', to: '/dispatch/new' }}
      />
    );
  }
  return (
    <EmptyState
      icon={<Inbox className="h-8 w-8 text-muted-foreground" />}
      title="No inbound dispatches"
      description="Once your connected suppliers submit delivery advice, they'll appear here."
    />
  );
}

export function NoSearchResultsEmpty() {
  return (
    <EmptyState
      icon={<Package className="h-8 w-8 text-muted-foreground" />}
      title="No results found"
      description="Try adjusting your search or clearing the filter."
    />
  );
}

export function NoArrivalsEmpty({ date }: { date: string }) {
  return (
    <EmptyState
      icon={<CalendarDays className="h-8 w-8 text-muted-foreground" />}
      title={`Nothing expected ${date}`}
      description="No dispatches are scheduled to arrive on this day."
    />
  );
}

export function NoGrowersEmpty() {
  return (
    <EmptyState
      icon={<Users className="h-8 w-8 text-muted-foreground" />}
      title="No growers yet"
      description="Add your first grower to generate submission links and track their performance."
    />
  );
}

export function NoIssuesEmpty() {
  return (
    <div className="p-6 rounded-lg border border-dashed border-border text-center space-y-2">
      <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mx-auto">
        <span className="text-lg">✓</span>
      </div>
      <p className="text-sm text-muted-foreground">No issues flagged for this dispatch</p>
    </div>
  );
}

export function NoQueueEmpty() {
  return (
    <EmptyState
      icon={<Package className="h-8 w-8 text-muted-foreground" />}
      title="Queue is clear"
      description="No inbound deliveries are pending right now. Check back when suppliers have submitted new dispatches."
    />
  );
}
