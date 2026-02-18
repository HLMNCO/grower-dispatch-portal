import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, isPast, addDays } from 'date-fns';
import { Package, Truck, Search, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface QueueDispatch {
  id: string;
  display_id: string;
  grower_name: string;
  carrier: string | null;
  truck_number: string | null;
  dispatch_date: string;
  expected_arrival: string | null;
  total_pallets: number;
  status: string;
  internal_lot_number: string | null;
  temperature_zone: string | null;
}

function getDisplayStatus(d: QueueDispatch) {
  if (d.status === 'arrived' && !d.internal_lot_number) return 'received-pending-admin';
  return d.status;
}

function arrivalLabel(d: QueueDispatch) {
  if (!d.expected_arrival) return null;
  const date = new Date(d.expected_arrival);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, d MMM');
}

export default function ReceiverVerifyPage() {
  const { business } = useAuth();
  const navigate = useNavigate();
  const [dispatches, setDispatches] = useState<QueueDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (business) fetchQueue();
  }, [business]);

  const fetchQueue = async () => {
    if (!business) return;
    const { data } = await supabase
      .from('dispatches')
      .select('id, display_id, grower_name, carrier, truck_number, dispatch_date, expected_arrival, total_pallets, status, internal_lot_number, temperature_zone')
      .eq('receiver_business_id', business.id)
      .in('status', ['pending', 'in-transit', 'arrived', 'received-pending-admin'])
      .order('expected_arrival', { ascending: true, nullsFirst: false });

    if (data) setDispatches(data as QueueDispatch[]);
    setLoading(false);
  };

  const filtered = dispatches.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.grower_name.toLowerCase().includes(q) ||
      d.display_id.toLowerCase().includes(q) ||
      (d.carrier || '').toLowerCase().includes(q)
    );
  });

  // Group by arrival timing
  const groups: { label: string; items: QueueDispatch[] }[] = [];
  const todayItems = filtered.filter(d => d.expected_arrival && isToday(new Date(d.expected_arrival)));
  const tomorrowItems = filtered.filter(d => d.expected_arrival && isTomorrow(new Date(d.expected_arrival)));
  const laterItems = filtered.filter(d => {
    if (!d.expected_arrival) return true;
    const date = new Date(d.expected_arrival);
    return !isToday(date) && !isTomorrow(date);
  });

  if (todayItems.length) groups.push({ label: 'Today', items: todayItems });
  if (tomorrowItems.length) groups.push({ label: 'Tomorrow', items: tomorrowItems });
  if (laterItems.length) groups.push({ label: 'Upcoming', items: laterItems });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-display tracking-tight">Receive Produce</h1>
          <p className="text-xs text-muted-foreground">Tap a delivery to start receiving</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by grower or ID..."
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading queue...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Package className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-display text-sm text-muted-foreground">
              {dispatches.length === 0 ? 'No inbound deliveries right now' : 'No deliveries match your search'}
            </p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.label} className="space-y-2">
              <h2 className="text-xs font-display uppercase tracking-widest text-muted-foreground px-1">
                {group.label} · {group.items.length} deliver{group.items.length !== 1 ? 'ies' : 'y'}
              </h2>
              {group.items.map(d => (
                <button
                  key={d.id}
                  onClick={() => navigate(`/receive/${d.id}`)}
                  className="w-full text-left p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors active:bg-muted/50"
                  style={{ minHeight: 56 }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={getDisplayStatus(d)} />
                        <span className="text-xs font-mono text-muted-foreground">{d.display_id}</span>
                      </div>
                      <p className="font-medium text-sm truncate">{d.grower_name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="tabular-nums">{d.total_pallets} plt</span>
                        {d.carrier && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3 shrink-0" />{d.carrier}
                          </span>
                        )}
                        {d.temperature_zone && (
                          <span className="capitalize">{d.temperature_zone}</span>
                        )}
                        {arrivalLabel(d) && (
                          <span className="font-medium text-foreground">ETA {arrivalLabel(d)}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
