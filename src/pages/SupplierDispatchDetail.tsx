import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, FileText, Pencil, Truck, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { DispatchTimeline } from '@/components/DispatchTimeline';
import { BrandedLoading } from '@/components/BrandedLoading';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { generateDeliveryAdvicePDF } from '@/services/deliveryAdviceGenerator';
import { toast } from 'sonner';

export default function SupplierDispatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const handleGeneratePDF = async () => {
    if (!id) return;
    try {
      await generateDeliveryAdvicePDF(id);
      // Log event
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
    <div className="min-h-screen bg-background flex items-center justify-center">
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container py-4 flex items-center gap-3">
          <Link to="/dispatch">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg tracking-tight truncate">
              {dispatch.delivery_advice_number || dispatch.display_id}
            </h1>
          </div>
          <StatusBadge status={dispatch.status} />
        </div>
      </header>

      <div className="container max-w-3xl py-6 space-y-6">
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleGeneratePDF} className="font-display min-h-[44px]">
            <FileText className="h-4 w-4 mr-2" /> Generate Delivery Advice PDF
          </Button>
          {dispatch.status === 'pending' && (
            <Button variant="outline" onClick={() => navigate(`/dispatch/new?edit=${dispatch.id}`)} className="font-display min-h-[44px]">
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
          )}
        </div>

        {/* Transport card */}
        <section className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Transport</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Carrier</p>
              <p className="font-medium">{dispatch.carrier || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Truck Rego</p>
              <p className="font-medium">{dispatch.truck_number || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Carrier Con Note #</p>
              {dispatch.transporter_con_note_number ? (
                <p className="font-display font-bold">{dispatch.transporter_con_note_number}</p>
              ) : (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-warning/15 text-warning-foreground">
                  Awaiting carrier con note
                </span>
              )}
            </div>
            {dispatch.transporter_con_note_photo_url && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Pink Sheet</p>
                <a href={dispatch.transporter_con_note_photo_url} target="_blank" rel="noopener noreferrer">
                  <img src={dispatch.transporter_con_note_photo_url} alt="Pink sheet" className="rounded-lg max-h-20 border border-border" />
                </a>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Expected Arrival</p>
              <p className="font-medium">
                {dispatch.expected_arrival ? format(new Date(dispatch.expected_arrival), 'EEE d MMM yyyy') : '-'}
                {dispatch.estimated_arrival_window_start && ` · ${dispatch.estimated_arrival_window_start}`}
                {dispatch.estimated_arrival_window_end && `–${dispatch.estimated_arrival_window_end}`}
              </p>
            </div>
            {dispatch.pickup_time && (
              <div>
                <p className="text-xs text-muted-foreground">Pickup Time</p>
                <p className="font-medium">{format(new Date(dispatch.pickup_time), 'dd MMM h:mma')}</p>
              </div>
            )}
          </div>
        </section>

        {/* Line items */}
        <section className="space-y-3">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Line Items</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Product</th>
                  <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Variety</th>
                  <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Size</th>
                  <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Qty</th>
                  <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Wt/Unit</th>
                  <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Total Kg</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => {
                  const wt = item.unit_weight ? item.quantity * item.unit_weight : (item.weight || 0);
                  return (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-3 font-medium">{item.product}</td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">{item.variety || '-'}</td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">{item.size || '-'}</td>
                      <td className="p-3 text-right font-display">{item.quantity}</td>
                      <td className="p-3 text-right text-muted-foreground hidden sm:table-cell">{item.unit_weight || '-'}</td>
                      <td className="p-3 text-right font-display">{wt ? `${wt.toLocaleString()}` : '-'}</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-border bg-muted/30">
                  <td colSpan={3} className="p-3 font-display text-xs uppercase text-muted-foreground">Total</td>
                  <td className="p-3 text-right font-display font-bold">{totalCtns}</td>
                  <td className="p-3 hidden sm:table-cell"></td>
                  <td className="p-3 text-right font-display font-bold">{totalKg ? `${totalKg.toLocaleString()} kg` : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Receiver */}
        {receiverBiz && (
          <section className="rounded-lg border border-border bg-card p-5 space-y-1">
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Delivery Address</h2>
            <p className="font-medium">{receiverBiz.name}</p>
            {receiverBiz.city && <p className="text-sm text-muted-foreground">{receiverBiz.city}</p>}
          </section>
        )}

        {/* Timeline */}
        <DispatchTimeline dispatchId={dispatch.id} />
      </div>
    </div>
  );
}
