import { useState, useEffect } from 'react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { FileText, Truck, Package, CheckCircle2, AlertTriangle, QrCode, Clock, Send, Pencil, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface DispatchEvent {
  id: string;
  event_type: string;
  triggered_by_user_id: string | null;
  triggered_by_role: string | null;
  metadata: any;
  created_at: string;
}

const eventConfig: Record<string, { icon: any; label: (m: any) => string; color: string }> = {
  created: { icon: Clipboard, label: (m) => `Delivery advice created${m?.grower_name ? ` by ${m.grower_name}` : ''}`, color: 'text-muted-foreground' },
  submitted: { icon: Send, label: () => 'Delivery advice submitted', color: 'text-primary' },
  delivery_advice_generated: { icon: FileText, label: (m) => `Delivery advice PDF generated${m?.da_number ? ` — ${m.da_number}` : ''}`, color: 'text-primary' },
  con_note_attached: { icon: Clipboard, label: (m) => `Carrier con note ${m?.con_note_number || ''} attached`, color: 'text-accent' },
  in_transit: { icon: Truck, label: (m) => `Picked up${m?.con_note_number ? ` · Con note ${m.con_note_number}` : ''}`, color: 'text-warning-foreground' },
  arrived: { icon: Package, label: () => 'Arrived at receiver', color: 'text-success' },
  received: { icon: CheckCircle2, label: () => 'Received and confirmed', color: 'text-success' },
  issue_flagged: { icon: AlertTriangle, label: (m) => `Issue flagged: ${m?.issue_type || 'unknown'} · ${m?.severity || ''}`, color: 'text-destructive' },
  qr_scanned: { icon: QrCode, label: () => 'Delivery advice scanned', color: 'text-muted-foreground' },
  eta_updated: { icon: Clock, label: (m) => `ETA updated${m?.new_time ? ` to ${m.new_time}` : ''}`, color: 'text-accent' },
  edited: { icon: Pencil, label: () => 'Dispatch edited', color: 'text-muted-foreground' },
};

const roleBadge: Record<string, { label: string; className: string }> = {
  supplier: { label: 'GROWER', className: 'bg-success/15 text-success' },
  staff: { label: 'RECEIVER', className: 'bg-primary/15 text-primary' },
  transporter: { label: 'TRANSPORTER', className: 'bg-warning/15 text-warning-foreground' },
  anonymous: { label: 'SYSTEM', className: 'bg-muted text-muted-foreground' },
};

function formatEventTime(dateStr: string) {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  if (diff < 3600000) return formatDistanceToNow(date, { addSuffix: true });
  if (isToday(date)) return `Today, ${format(date, 'h:mma').toLowerCase()}`;
  if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mma').toLowerCase()}`;
  return format(date, 'EEE d MMM, h:mma').toLowerCase();
}

export function DispatchTimeline({ dispatchId }: { dispatchId: string }) {
  const [events, setEvents] = useState<DispatchEvent[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
    // Subscribe to realtime inserts
    const channel = supabase
      .channel(`dispatch-events-${dispatchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dispatch_events',
        filter: `dispatch_id=eq.${dispatchId}`,
      }, (payload) => {
        setEvents(prev => [...prev, payload.new as DispatchEvent]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dispatchId]);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('dispatch_events')
      .select('*')
      .eq('dispatch_id', dispatchId)
      .order('created_at', { ascending: true });
    if (data) setEvents(data as DispatchEvent[]);
    setLoading(false);
  };

  if (loading) return null;
  if (events.length === 0) return null;

  const displayed = expanded ? events : events.slice(-3);

  return (
    <section className="space-y-3">
      <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Timeline</h2>
      <div className="space-y-0">
        {displayed.map((event, i) => {
          const config = eventConfig[event.event_type] || { icon: Clock, label: () => event.event_type, color: 'text-muted-foreground' };
          const Icon = config.icon;
          const badge = roleBadge[event.triggered_by_role || 'anonymous'] || roleBadge.anonymous;

          return (
            <div key={event.id} className="flex gap-3 py-3">
              {/* Timeline line + icon */}
              <div className="flex flex-col items-center">
                <div className={`p-1.5 rounded-full bg-card border border-border ${config.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                {i < displayed.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              {/* Content */}
              <div className="flex-1 pb-1">
                <p className="text-sm">{config.label(event.metadata)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{formatEventTime(event.created_at)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-display uppercase tracking-wider ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {events.length > 3 && !expanded && (
        <Button variant="ghost" size="sm" onClick={() => setExpanded(true)} className="text-xs font-display">
          Show full history ({events.length} events)
        </Button>
      )}
      {expanded && events.length > 3 && (
        <Button variant="ghost" size="sm" onClick={() => setExpanded(false)} className="text-xs font-display">
          Show less
        </Button>
      )}
    </section>
  );
}
