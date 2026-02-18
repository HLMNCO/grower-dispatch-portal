import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, FileText, Pencil, Package, Thermometer, Snowflake, IceCreamCone, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { DispatchTimeline } from '@/components/DispatchTimeline';
import { BrandedLoading } from '@/components/BrandedLoading';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { generateDeliveryAdvicePDF } from '@/services/deliveryAdviceGenerator';
import { toast } from 'sonner';

function TempBadge({ zone }: { zone: string | null }) {
  if (!zone) return null;
  const config: Record<string, { icon: any; label: string; cls: string }> = {
    ambient: { icon: Thermometer, label: 'Ambient', cls: 'bg-muted text-muted-foreground' },
    chilled: { icon: Snowflake, label: 'Chilled · 2–8°C', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
    frozen: { icon: IceCreamCone, label: 'Frozen · Below 0°C', cls: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300' },
  };
  const c = config[zone] || config.ambient;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {c.label}
    </span>
  );
}

export default function SupplierDispatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: dispatch, isLoading } = useQuery({
    queryKey: ['dispatch', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispatches')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['dispatch-items', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('dispatch_items')
        .select('*')
        .eq('dispatch_id', id!)
        .order('created_at');
      return data || [];
    },
    enabled: !!id,
  });

  const { data: receiverBiz } = useQuery({
    queryKey: ['receiver-biz', dispatch?.receiver_business_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('name, city')
        .eq('id', dispatch!.receiver_business_id!)
        .single();
      return data;
    },
    enabled: !!dispatch?.receiver_business_id,
  });

  const { data: issues = [] } = useQuery({
    queryKey: ['dispatch-issues', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('receiving_issues')
        .select('*')
        .eq('dispatch_id', id!)
        .order('created_at');
      return data || [];
    },
    enabled: !!id,
  });

  const handleGeneratePDF = async () => {
    if (!id) return;
    try {
      await generateDeliveryAdvicePDF(id);
      await supabase.from('dispatch_events').insert({
        dispatch_id: id,
        event_type: 'delivery_advice_generated',
        triggered_by_user_id: user?.id || null,
        triggered_by_role: 'supplier',
        metadata: { da_number: dispatch?.delivery_advice_number },
      });
      toast.success('Delivery advice PDF downloaded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate PDF');
    }
  };

  if (isLoading) return <BrandedLoading />;
  if (!dispatch) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center space-y-3">
        <Package className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="font-display">Dispatch not found</p>
        <Link to="/dispatch"><Button variant="outline">← Back</Button></Link>
      </div>
    </div>
  );

  const totalCtns = items.reduce((s: number, i: any) => s + i.quantity, 0);
  const totalKg = items.reduce((s: number, i: any) => s + (i.unit_weight ? i.quantity * i.unit_weight : (i.weight || 0)), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link to="/dispatch">
            <Button variant="ghost" size="sm" className="min-h-[44px]"><ArrowLeft className="h-4 w-4 mr-1" /> My Deliveries</Button>
          </Link>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl tracking-tight truncate">
              {dispatch.delivery_advice_number || dispatch.display_id}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={dispatch.status} />
          <Button onClick={handleGeneratePDF} size="sm" className="font-display min-h-[44px]">
            <FileText className="h-4 w-4 mr-2" /> Generate DA PDF
          </Button>
        </div>
      </div>

      {/* Carrier Details */}
      <section className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Carrier Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Carrier</p>
            <p className="font-medium">{dispatch.carrier || <span className="text-muted-foreground">Not entered</span>}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Truck Rego</p>
            <p className="font-medium">{dispatch.truck_number || <span className="text-muted-foreground">Not entered</span>}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Carrier Con Note #</p>
            {dispatch.transporter_con_note_number ? (
              <p className="font-display font-bold">{dispatch.transporter_con_note_number}</p>
            ) : (
              <span className="text-muted-foreground text-sm">Not entered</span>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Leaving</p>
            <p className="font-medium">
              {dispatch.dispatch_date ? format(new Date(dispatch.dispatch_date), 'EEE d MMM yyyy') : '-'}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Expected arrival</p>
            <p className="font-medium">
              {dispatch.expected_arrival ? format(new Date(dispatch.expected_arrival), 'EEE d MMM yyyy') : '-'}
              {dispatch.estimated_arrival_window_start && ` between ${dispatch.estimated_arrival_window_start}`}
              {dispatch.estimated_arrival_window_end && ` and ${dispatch.estimated_arrival_window_end}`}
            </p>
          </div>
          {dispatch.temperature_zone && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Temperature Zone</p>
              <TempBadge zone={dispatch.temperature_zone} />
            </div>
          )}
        </div>
      </section>

      {/* Line items — What's on the Truck */}
      <section className="space-y-3">
        <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">What's on the Truck</h2>

        {/* Mobile: stacked cards */}
        <div className="sm:hidden space-y-2">
          {items.map((item: any) => {
            const wt = item.unit_weight ? item.quantity * item.unit_weight : (item.weight || 0);
            return (
              <div key={item.id} className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.product}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[item.variety, item.size, item.tray_type].filter(Boolean).join(' · ') || 'No details'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold">{item.quantity} <span className="text-xs font-normal text-muted-foreground">units</span></p>
                    {wt > 0 && <p className="text-xs text-muted-foreground">{wt.toLocaleString()} kg</p>}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
            <span className="font-display text-xs uppercase tracking-wider text-muted-foreground">Total</span>
            <div className="text-right">
              <span className="font-display font-bold">{totalCtns} units</span>
              {totalKg > 0 && <span className="text-xs text-muted-foreground ml-2">{totalKg.toLocaleString()} kg</span>}
            </div>
          </div>
        </div>

        {/* Desktop: full table */}
        <div className="hidden sm:block rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Product</th>
                <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Variety</th>
                <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Size</th>
                <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Pack</th>
                <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Qty</th>
                <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Wt/Unit</th>
                <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Total Wt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => {
                const wt = item.unit_weight ? item.quantity * item.unit_weight : (item.weight || 0);
                return (
                  <tr key={item.id} className="border-t border-border">
                    <td className="p-3 font-medium">{item.product}</td>
                    <td className="p-3 text-muted-foreground">{item.variety || '-'}</td>
                    <td className="p-3 text-muted-foreground">{item.size || '-'}</td>
                    <td className="p-3 text-muted-foreground">{item.tray_type || '-'}</td>
                    <td className="p-3 text-right font-display">{item.quantity}</td>
                    <td className="p-3 text-right text-muted-foreground">{item.unit_weight || '-'}</td>
                    <td className="p-3 text-right font-display">{wt ? `${wt.toLocaleString()} kg` : '-'}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-border bg-muted/30">
                <td colSpan={4} className="p-3 font-display text-xs uppercase text-muted-foreground">Total</td>
                <td className="p-3 text-right font-display font-bold">{totalCtns}</td>
                <td className="p-3"></td>
                <td className="p-3 text-right font-display font-bold">{totalKg ? `${totalKg.toLocaleString()} kg` : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Delivery address */}
      {receiverBiz && (
        <section className="rounded-lg border border-border bg-card p-5 space-y-1">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Delivering To</h2>
          <p className="font-medium">{receiverBiz.name}</p>
          {receiverBiz.city && <p className="text-sm text-muted-foreground">{receiverBiz.city}</p>}
        </section>
      )}

      {/* Issues flagged */}
      {issues.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-sm uppercase tracking-widest text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Issues Flagged by Ten Farms
          </h2>
          <div className="space-y-2">
            {issues.map((issue: any) => (
              <div key={issue.id} className={`rounded-lg border p-4 space-y-1 ${issue.severity === 'high' ? 'border-destructive/50 bg-destructive/5' : 'border-warning/50 bg-warning/5'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-display uppercase tracking-wider ${issue.severity === 'high' ? 'text-destructive' : 'text-warning-foreground'}`}>
                    {issue.issue_type} · {issue.severity}
                  </span>
                </div>
                <p className="text-sm">{issue.description}</p>
                {issue.photo_url && (
                  <a href={issue.photo_url} target="_blank" rel="noopener noreferrer">
                    <img src={issue.photo_url} alt="Issue photo" className="rounded-lg max-h-32 border border-border mt-2" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      <DispatchTimeline dispatchId={dispatch.id} />
    </div>
  );
}
