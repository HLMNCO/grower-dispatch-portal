import { Link, useNavigate } from 'react-router-dom';
import { format, addDays, isSameDay } from 'date-fns';
import { Truck, Package, LogOut, ArrowRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { BrandedLoading } from '@/components/BrandedLoading';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function TransporterDashboard() {
  const { business, signOut } = useAuth();
  const navigate = useNavigate();
  const today = new Date();

  const { data: dispatches = [], isLoading } = useQuery({
    queryKey: ['transporter-dispatches', business?.id],
    queryFn: async () => {
      if (!business) return [];
      const { data } = await supabase
        .from('dispatches')
        .select('*')
        .eq('transporter_business_id', business.id)
        .order('expected_arrival', { ascending: true });
      return data || [];
    },
    enabled: !!business,
  });

  const todayDispatches = dispatches.filter((d: any) =>
    (d.expected_arrival && isSameDay(new Date(d.expected_arrival), today)) ||
    d.status === 'in-transit'
  );

  const upcoming = dispatches.filter((d: any) => {
    if (d.status === 'received' || d.status === 'issue') return false;
    if (!d.expected_arrival) return false;
    const ea = new Date(d.expected_arrival);
    return ea > today && ea <= addDays(today, 7) && !isSameDay(ea, today);
  });

  if (isLoading) return <BrandedLoading />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary">
                <Truck className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-display tracking-tight leading-tight">FRESHDOCK</h1>
                <p className="text-xs text-muted-foreground">{business?.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h2 className="text-2xl font-display tracking-tight">Run Sheet — {format(today, 'EEE d MMM')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{business?.name}</p>
        </div>

        {/* Today's pickups */}
        <section className="space-y-3">
          <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Today</h3>
          {todayDispatches.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-border rounded-lg">
              <Truck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No pickups or deliveries today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayDispatches.map((d: any) => (
                <button
                  key={d.id}
                  onClick={() => navigate(`/transporter/dispatch/${d.id}`)}
                  className="w-full text-left p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={d.status} />
                        {d.transporter_con_note_number && (
                          <span className="text-xs font-display text-muted-foreground">CN: {d.transporter_con_note_number}</span>
                        )}
                      </div>
                      <p className="font-medium text-sm">{d.grower_name} → {d.receiver_business_id ? 'Receiver' : '-'}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {d.estimated_arrival_window_start && (
                          <span>{d.estimated_arrival_window_start}–{d.estimated_arrival_window_end}</span>
                        )}
                        <span>{d.total_pallets} plt</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Upcoming (Next 7 Days)</h3>
            <div className="space-y-2">
              {upcoming.map((d: any) => (
                <button
                  key={d.id}
                  onClick={() => navigate(`/transporter/dispatch/${d.id}`)}
                  className="w-full text-left p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{d.expected_arrival ? format(new Date(d.expected_arrival), 'EEE d MMM') : '-'}</p>
                      <p className="font-medium text-sm">{d.grower_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={d.status} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {dispatches.length === 0 && (
          <div className="py-12 text-center space-y-3 border border-dashed border-border rounded-lg">
            <Truck className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-display">No dispatches assigned</p>
            <p className="text-sm text-muted-foreground">Your runs will appear here once a grower assigns you to a delivery.</p>
          </div>
        )}
      </div>
    </div>
  );
}
