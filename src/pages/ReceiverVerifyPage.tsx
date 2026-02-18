import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Package, Truck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { DispatchTimeline } from '@/components/DispatchTimeline';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface VerifyDispatch {
  id: string;
  display_id: string;
  grower_name: string;
  grower_code: string | null;
  delivery_advice_number: string | null;
  transporter_con_note_number: string;
  transporter_con_note_photo_url: string | null;
  carrier: string | null;
  truck_number: string | null;
  dispatch_date: string;
  expected_arrival: string | null;
  estimated_arrival_window_start: string | null;
  estimated_arrival_window_end: string | null;
  total_pallets: number;
  status: string;
  temperature_zone: string | null;
  commodity_class: string | null;
}

interface VerifyItem {
  id: string;
  product: string;
  variety: string | null;
  size: string | null;
  tray_type: string | null;
  quantity: number;
  unit_weight: number | null;
  weight: number | null;
}

export default function ReceiverVerifyPage() {
  const { user, business, role } = useAuth();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [dispatch, setDispatch] = useState<VerifyDispatch | null>(null);
  const [items, setItems] = useState<VerifyItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchInput.trim() || !business) return;
    setSearching(true);
    setSearched(true);
    setDispatch(null);
    setItems([]);

    const query = searchInput.trim();

    // Try DA number first
    let { data } = await supabase
      .from('dispatches')
      .select('*')
      .eq('receiver_business_id', business.id)
      .eq('delivery_advice_number', query)
      .single();

    // Try con note number
    if (!data) {
      const res = await supabase
        .from('dispatches')
        .select('*')
        .eq('receiver_business_id', business.id)
        .eq('transporter_con_note_number', query)
        .single();
      data = res.data;
    }

    if (data) {
      setDispatch(data as unknown as VerifyDispatch);
      const { data: itemData } = await supabase
        .from('dispatch_items')
        .select('*')
        .eq('dispatch_id', data.id);
      if (itemData) setItems(itemData as VerifyItem[]);
    }

    setSearching(false);
  };

  const handleMarkArrived = async () => {
    if (!dispatch || !user) return;
    await supabase.from('dispatches').update({ status: 'arrived' }).eq('id', dispatch.id);
    await supabase.from('dispatch_events').insert({
      dispatch_id: dispatch.id,
      event_type: 'arrived',
      triggered_by_user_id: user.id,
      triggered_by_role: role || 'staff',
      metadata: {},
    });
    toast({ title: 'Marked as Arrived' });
    setDispatch(prev => prev ? { ...prev, status: 'arrived' } : prev);
  };

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const totalWeight = items.reduce((s, i) => s + (i.unit_weight ? i.quantity * i.unit_weight : (i.weight || 0)), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container py-4 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-lg font-display tracking-tight">Verify Inbound Delivery</h1>
            <p className="text-xs text-muted-foreground">Search by DA number, carrier con note, or scan QR</p>
          </div>
        </div>
      </header>

      <div className="container max-w-2xl py-8 space-y-6">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="DA-2025-GV001-00134 or carrier con note #"
              className="pl-12 h-14 text-lg"
              autoFocus
            />
          </div>
          <Button onClick={handleSearch} disabled={searching} size="lg" className="h-14 px-8 font-display">
            {searching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Results */}
        {searched && !dispatch && !searching && (
          <div className="p-8 rounded-xl border border-border bg-card text-center space-y-3">
            <Package className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="font-display text-lg">No delivery found for '{searchInput}'</h3>
            <p className="text-sm text-muted-foreground">Check the DA number on the delivery advice, or the number on the carrier's pink sheet.</p>
            <Link to="/" className="text-primary text-sm font-display inline-block mt-2">View all inbound dispatches →</Link>
          </div>
        )}

        {dispatch && (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between">
              <StatusBadge status={dispatch.status as any} />
              <span className="text-xs text-muted-foreground font-display">{dispatch.display_id}</span>
            </div>

            {/* Summary */}
            <div className="p-6 rounded-xl border border-border bg-card space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">DA Number</p>
                  <p className="font-display font-bold text-lg">{dispatch.delivery_advice_number || 'Not generated'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Carrier Con Note</p>
                  <p className="font-display font-bold text-lg">{dispatch.transporter_con_note_number || 'Awaiting'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">From (Grower)</p>
                  <p className="font-medium">{dispatch.grower_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Carrier</p>
                  <p className="font-medium">{dispatch.carrier || '-'} {dispatch.truck_number && `· ${dispatch.truck_number}`}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Dispatch Date</p>
                  <p className="font-medium">{format(new Date(dispatch.dispatch_date), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Expected Arrival</p>
                  <p className="font-medium">
                    {dispatch.expected_arrival ? format(new Date(dispatch.expected_arrival), 'dd MMM yyyy') : '-'}
                    {dispatch.estimated_arrival_window_start && ` · ${dispatch.estimated_arrival_window_start}`}
                    {dispatch.estimated_arrival_window_end && ` – ${dispatch.estimated_arrival_window_end}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Pallets</p>
                  <p className="font-display font-bold">{dispatch.total_pallets}</p>
                </div>
                {dispatch.temperature_zone && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Temp Zone</p>
                    <p className="font-medium capitalize">{dispatch.temperature_zone}</p>
                  </div>
                )}
              </div>

              {/* Con note photo */}
              {dispatch.transporter_con_note_photo_url && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pink Sheet Photo</p>
                  <a href={dispatch.transporter_con_note_photo_url} target="_blank" rel="noopener noreferrer">
                    <img src={dispatch.transporter_con_note_photo_url} alt="Pink sheet" className="rounded-lg max-h-32 border border-border" />
                  </a>
                </div>
              )}
            </div>

            {/* Line items */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Product</th>
                    <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Variety</th>
                    <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Qty</th>
                    <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Total Kg</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const wt = item.unit_weight ? item.quantity * item.unit_weight : (item.weight || 0);
                    return (
                      <tr key={item.id} className="border-t border-border">
                        <td className="p-3 font-medium">{item.product}</td>
                        <td className="p-3 text-muted-foreground">{item.variety || '-'}</td>
                        <td className="p-3 text-right font-display">{item.quantity}</td>
                        <td className="p-3 text-right text-muted-foreground">{wt ? `${wt.toLocaleString()}kg` : '-'}</td>
                      </tr>
                    );
                  })}
                  {items.length > 0 && (
                    <tr className="border-t border-border bg-muted/30">
                      <td colSpan={2} className="p-3 font-display text-xs uppercase text-muted-foreground">Total</td>
                      <td className="p-3 text-right font-display font-bold">{totalQty}</td>
                      <td className="p-3 text-right font-display text-muted-foreground">{totalWeight ? `${totalWeight.toLocaleString()}kg` : '-'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Timeline */}
            <DispatchTimeline dispatchId={dispatch.id} />

            {/* Actions */}
            <div className="flex gap-3">
              {dispatch.status === 'in-transit' && (
                <Button onClick={handleMarkArrived} size="lg" className="flex-1 font-display tracking-wide text-base py-6 bg-success hover:bg-success/90">
                  <Package className="h-5 w-5 mr-2" /> Mark as Arrived
                </Button>
              )}
              {dispatch.status === 'arrived' && (
                <Button onClick={() => navigate(`/receive/${dispatch.id}`)} size="lg" className="flex-1 font-display tracking-wide text-base py-6">
                  <CheckCircle2 className="h-5 w-5 mr-2" /> Begin Receiving
                </Button>
              )}
              <Button onClick={() => navigate(`/receive/${dispatch.id}`)} variant="outline" size="lg" className="font-display">
                <AlertTriangle className="h-4 w-4 mr-2" /> Flag an Issue
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
