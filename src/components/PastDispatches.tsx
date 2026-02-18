import { useState, useEffect } from 'react';
import { Package, ChevronDown, ChevronUp, Truck, CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';

interface DispatchItem {
  product: string;
  variety: string | null;
  quantity: number;
}

interface PastDispatch {
  display_id: string;
  dispatch_date: string;
  status: string;
  total_pallets: number;
  carrier: string | null;
  transporter_con_note_number: string;
  created_at: string;
  dispatch_items: DispatchItem[];
}

interface Props {
  intakeToken: string;
  growerName: string;
  refreshTrigger?: number;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: 'Pending', icon: Clock, className: 'text-amber-600 bg-amber-50 border-amber-200' },
  in_transit: { label: 'In Transit', icon: Truck, className: 'text-blue-600 bg-blue-50 border-blue-200' },
  arrived: { label: 'Arrived', icon: Package, className: 'text-purple-600 bg-purple-50 border-purple-200' },
  received: { label: 'Received', icon: CheckCircle2, className: 'text-primary bg-primary/10 border-primary/20' },
  issue: { label: 'Issue', icon: AlertTriangle, className: 'text-destructive bg-destructive/10 border-destructive/20' },
};

export default function PastDispatches({ intakeToken, growerName, refreshTrigger }: Props) {
  const [dispatches, setDispatches] = useState<PastDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (intakeToken && growerName) fetchDispatches();
  }, [intakeToken, growerName, refreshTrigger]);

  const fetchDispatches = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-dispatches?intake_token=${encodeURIComponent(intakeToken)}&grower_name=${encodeURIComponent(growerName)}`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setDispatches(json.dispatches || []);
    } catch (err) {
      console.error('Failed to load past dispatches:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="space-y-3 pt-2">
        <h2 className="text-sm font-display uppercase tracking-widest text-muted-foreground">Past Dispatches</h2>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (dispatches.length === 0) return null;

  const displayedDispatches = expanded ? dispatches : dispatches.slice(0, 3);

  return (
    <section className="space-y-3 pt-2">
      <h2 className="text-sm font-display uppercase tracking-widest text-muted-foreground">
        Past Dispatches
        <span className="ml-2 text-xs font-normal normal-case text-muted-foreground/70">({dispatches.length})</span>
      </h2>

      <div className="space-y-2">
        {displayedDispatches.map((d) => {
          const config = statusConfig[d.status] || statusConfig.pending;
          const StatusIcon = config.icon;
          const isExpanded = expandedId === d.display_id;
          const totalCartons = d.dispatch_items?.reduce((s, i) => s + i.quantity, 0) || 0;
          const productSummary = d.dispatch_items?.map(i => i.product).filter(Boolean).join(', ') || 'No items';

          return (
            <div
              key={d.display_id}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              <button
                type="button"
                className="w-full p-3 flex items-center gap-3 text-left"
                onClick={() => setExpandedId(isExpanded ? null : d.display_id)}
              >
                <div className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${config.className}`}>
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{d.display_id}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(d.dispatch_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm truncate text-foreground/80 mt-0.5">{productSummary}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{totalCartons} ctns</span>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-border pt-2 space-y-2">
                  {d.carrier && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Carrier</span>
                      <span className="text-foreground">{d.carrier}</span>
                    </div>
                  )}
                  {d.transporter_con_note_number && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Con Note</span>
                      <span className="text-foreground font-mono">{d.transporter_con_note_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Pallets</span>
                    <span className="text-foreground">{d.total_pallets}</span>
                  </div>
                  {d.dispatch_items && d.dispatch_items.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Items:</p>
                      <div className="space-y-1">
                        {d.dispatch_items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs bg-muted/30 rounded px-2 py-1">
                            <span className="text-foreground/80">
                              {item.product}{item.variety ? ` · ${item.variety}` : ''}
                            </span>
                            <span className="text-muted-foreground">{item.quantity} ctns</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {dispatches.length > 3 && (
        <button
          type="button"
          className="w-full text-xs text-primary font-medium py-2 hover:underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : `Show all ${dispatches.length} dispatches`}
        </button>
      )}
    </section>
  );
}
