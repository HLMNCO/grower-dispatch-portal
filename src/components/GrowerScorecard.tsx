import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Package, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GrowerStats {
  grower_name: string;
  grower_code: string | null;
  total: number;
  received: number;
  issues: number;
  onTime: number;
  totalPallets: number;
  onTimeRate: number;
  issueRate: number;
  avgPallets: number;
}

function StatPill({ value, label, good, warn }: { value: string; label: string; good: boolean; warn: boolean }) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center px-3 py-2 rounded-lg text-center',
      good ? 'bg-green-50 dark:bg-green-950/30' : warn ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-muted/50'
    )}>
      <span className={cn(
        'text-sm font-display font-bold',
        good ? 'text-green-700 dark:text-green-400' : warn ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
      )}>{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

export function GrowerScorecard({ growerId, growerName, growerCode }: {
  growerId: string;
  growerName: string;
  growerCode?: string | null;
}) {
  const { business } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['grower-stats', growerName, business?.id],
    queryFn: async () => {
      const { data: dispatches } = await supabase
        .from('dispatches')
        .select('id, status, total_pallets, expected_arrival, created_at')
        .eq('receiver_business_id', business!.id)
        .ilike('grower_name', growerName)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!dispatches || dispatches.length === 0) return null;

      const total = dispatches.length;
      const received = dispatches.filter(d =>
        ['received', 'received-pending-admin'].includes(d.status)
      ).length;
      const issues = dispatches.filter(d => d.status === 'issue').length;

      // On-time: received dispatches where status isn't issue
      const onTime = dispatches.filter(d =>
        d.status === 'received' && d.expected_arrival
      ).length;

      const totalPallets = dispatches.reduce((s, d) => s + (d.total_pallets || 0), 0);

      return {
        total,
        received,
        issues,
        onTime,
        totalPallets,
        onTimeRate: received > 0 ? Math.round((onTime / received) * 100) : 0,
        issueRate: total > 0 ? Math.round((issues / total) * 100) : 0,
        avgPallets: total > 0 ? Math.round(totalPallets / total) : 0,
      } as Omit<GrowerStats, 'grower_name' | 'grower_code'>;
    },
    enabled: !!business,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <p className="text-xs text-muted-foreground py-1">No dispatch history yet</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">
        Performance · {stats.total} dispatch{stats.total !== 1 ? 'es' : ''}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <StatPill
          value={`${stats.onTimeRate}%`}
          label="On-time"
          good={stats.onTimeRate >= 85}
          warn={stats.onTimeRate < 70}
        />
        <StatPill
          value={`${stats.issueRate}%`}
          label="Issue rate"
          good={stats.issueRate === 0}
          warn={stats.issueRate > 10}
        />
        <StatPill
          value={`${stats.avgPallets}p`}
          label="Avg pallets"
          good={false}
          warn={false}
        />
      </div>
    </div>
  );
}
