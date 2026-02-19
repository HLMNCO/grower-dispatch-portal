import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Package, Truck, AlertTriangle, CheckCircle2, Clock, QrCode, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { DispatchTimeline } from '@/components/DispatchTimeline';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface ScanDispatch {
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
  updated_at: string;
  supplier_id: string;
  receiver_business_id: string | null;
  transporter_business_id: string | null;
  pickup_time: string | null;
}

interface ScanItem {
  product: string;
  variety: string | null;
  quantity: number;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  'in-transit': 'bg-warning/20 text-warning-foreground animate-pulse',
  arrived: 'bg-success/20 text-success',
  received: 'bg-primary/20 text-primary',
  issue: 'bg-destructive/20 text-destructive',
};

const statusLabels: Record<string, string> = {
  pending: 'SUBMITTED',
  'in-transit': 'IN TRANSIT',
  arrived: 'ARRIVED',
  received: 'RECEIVED',
  issue: 'ISSUE FLAGGED',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  return format(new Date(dateStr), 'dd MMM, h:mma');
}

export default function QRScanPage() {
  const { token } = useParams<{ token: string }>();
  const { user, role, business } = useAuth();
  const navigate = useNavigate();
  const [dispatch, setDispatch] = useState<ScanDispatch | null>(null);
  const [items, setItems] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (token) fetchDispatch();
  }, [token]);

  const fetchDispatch = async () => {
    const { data, error } = await supabase
      .from('dispatches')
      .select('*')
      .eq('qr_code_token', token)
      .single();

    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setDispatch(data as unknown as ScanDispatch);

    // Fetch items for product summary
    const { data: itemData } = await supabase
      .from('dispatch_items')
      .select('product, variety, quantity')
      .eq('dispatch_id', data.id);
    if (itemData) setItems(itemData as ScanItem[]);

    // Log QR scan event (fire and forget)
    supabase.from('dispatch_events').insert({
      dispatch_id: data.id,
      event_type: 'qr_scanned',
      triggered_by_user_id: user?.id || null,
      triggered_by_role: role || 'anonymous',
      metadata: {
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        authenticated: !!user,
      },
    }).then();

    setLoading(false);
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

  const handleMarkPickedUp = async () => {
    if (!dispatch || !user) return;
    if (!dispatch.transporter_con_note_number) {
      toast({ title: 'Con Note Required', description: 'Enter your con note number first.', variant: 'destructive' });
      return;
    }
    await supabase.from('dispatches').update({ status: 'in-transit' }).eq('id', dispatch.id);
    await supabase.from('dispatch_events').insert({
      dispatch_id: dispatch.id,
      event_type: 'in_transit',
      triggered_by_user_id: user.id,
      triggered_by_role: 'transporter',
      metadata: { con_note_number: dispatch.transporter_con_note_number },
    });
    toast({ title: 'Marked as Picked Up' });
    setDispatch(prev => prev ? { ...prev, status: 'in-transit' } : prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading delivery advice...</p>
        </div>
      </div>
    );
  }

  if (notFound || !dispatch) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-primary py-4 px-6">
          <h1 className="text-primary-foreground font-display font-bold text-lg tracking-tight">Pack to Produce</h1>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-display mb-2">Delivery Advice Not Found</h2>
          <p className="text-muted-foreground">This QR code doesn't match any delivery advice.</p>
          <Link to="/auth" className="mt-6 inline-block">
            <Button>Log In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const productSummary = [...new Set(items.map(i => i.product))].join(' · ');

  return (
    <div className="min-h-screen bg-background">
      {/* Green header bar */}
      <div className="bg-primary py-4 px-6">
        <h1 className="text-primary-foreground font-display font-bold text-lg tracking-tight">Pack to Produce</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Status badge — large, full width */}
        <div className={`w-full py-4 px-6 rounded-xl text-center text-lg font-display font-bold uppercase tracking-widest ${statusStyles[dispatch.status] || 'bg-muted text-muted-foreground'}`}>
          {statusLabels[dispatch.status] || dispatch.status.toUpperCase()}
        </div>

        {/* Summary card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Delivery Advice</p>
              <p className="text-xs text-muted-foreground">Last updated: {timeAgo(dispatch.updated_at)}</p>
            </div>
            <p className="text-xl font-display font-bold">{dispatch.delivery_advice_number || dispatch.display_id}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">From</p>
              <p className="font-medium">{dispatch.grower_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Products</p>
              <p className="font-medium">{productSummary || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expected</p>
              <p className="font-medium">
                {dispatch.expected_arrival ? format(new Date(dispatch.expected_arrival), 'EEE d MMM') : '-'}
                {dispatch.estimated_arrival_window_start && ` · ${dispatch.estimated_arrival_window_start}`}
                {dispatch.estimated_arrival_window_end && ` – ${dispatch.estimated_arrival_window_end}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Carrier Con Note</p>
              <p className="font-medium">{dispatch.transporter_con_note_number || 'Not yet entered'}</p>
            </div>
          </div>
        </div>

        {/* Not logged in CTA */}
        {!user && (
          <Link to="/auth" className="block">
            <Button size="lg" className="w-full font-display tracking-wide text-base py-6">
              Log in to take action
            </Button>
          </Link>
        )}

        {/* Logged in — Receiver actions */}
        {user && role === 'staff' && (
          <div className="space-y-3">
            {dispatch.status === 'in-transit' && (
              <Button onClick={handleMarkArrived} size="lg" className="w-full font-display tracking-wide text-base py-6 bg-success hover:bg-success/90">
                <Package className="h-5 w-5 mr-2" /> Mark as Arrived
              </Button>
            )}
            {dispatch.status === 'arrived' && (
              <Button onClick={() => navigate(`/receive/${dispatch.id}`)} size="lg" className="w-full font-display tracking-wide text-base py-6">
                <CheckCircle2 className="h-5 w-5 mr-2" /> Begin Receiving
              </Button>
            )}
            <Button onClick={() => navigate(`/receive/${dispatch.id}`)} variant="outline" size="lg" className="w-full font-display">
              <AlertTriangle className="h-4 w-4 mr-2" /> Flag an Issue
            </Button>
          </div>
        )}

        {/* Logged in — Transporter actions */}
        {user && role === 'transporter' && (
          <div className="space-y-3">
            {!dispatch.transporter_con_note_number && (
              <div className="p-4 rounded-xl border-2 border-warning/30 bg-warning/5 space-y-3">
                <Label className="text-base font-semibold">Enter Your Con Note Number</Label>
                <p className="text-xs text-muted-foreground">Number from your pink freight sheet</p>
              </div>
            )}
            {dispatch.status === 'pending' && (
              <Button onClick={handleMarkPickedUp} size="lg" className="w-full font-display tracking-wide text-base py-6">
                <Truck className="h-5 w-5 mr-2" /> Mark as Picked Up
              </Button>
            )}
            {dispatch.status === 'in-transit' && (
              <Button onClick={() => navigate(`/receive/${dispatch.id}`)} size="lg" variant="outline" className="w-full font-display">
                Mark as Delivered
              </Button>
            )}
          </div>
        )}

        {/* Timeline — logged in users */}
        {user && <DispatchTimeline dispatchId={dispatch.id} />}
      </div>
    </div>
  );
}
