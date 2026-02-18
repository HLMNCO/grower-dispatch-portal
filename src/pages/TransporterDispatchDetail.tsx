import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Truck, Camera, Clock, AlertTriangle, Package, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/StatusBadge';
import { DispatchTimeline } from '@/components/DispatchTimeline';
import { BrandedLoading } from '@/components/BrandedLoading';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function TransporterDispatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [conNote, setConNote] = useState('');
  const [truckNum, setTruckNum] = useState('');
  const [pickupTemp, setPickupTemp] = useState('');
  const [transporterNotes, setTransporterNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: dispatch, isLoading } = useQuery({
    queryKey: ['transporter-dispatch', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('dispatches').select('*').eq('id', id!).single();
      if (error) throw error;
      // Initialize local state from fetched data
      if (data) {
        setConNote(data.transporter_con_note_number || '');
        setTruckNum(data.truck_number || '');
        setPickupTemp(data.temperature_reading?.toString() || '');
        setTransporterNotes(data.transporter_notes || '');
      }
      return data;
    },
    enabled: !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['transporter-dispatch-items', id],
    queryFn: async () => {
      const { data } = await supabase.from('dispatch_items').select('*').eq('dispatch_id', id!).order('created_at');
      return data || [];
    },
    enabled: !!id,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['transporter-dispatch', id] });

  const saveConNote = async () => {
    if (!id || !conNote.trim()) return;
    await supabase.from('dispatches').update({
      transporter_con_note_number: conNote.trim(),
      truck_number: truckNum || null,
      temperature_reading: pickupTemp ? parseFloat(pickupTemp) : null,
      transporter_notes: transporterNotes || null,
    }).eq('id', id);
    await supabase.from('dispatch_events').insert({
      dispatch_id: id,
      event_type: 'con_note_attached',
      triggered_by_user_id: user?.id || null,
      triggered_by_role: 'transporter',
      metadata: { con_note_number: conNote.trim() },
    });
    toast.success('Carrier con note saved');
    invalidate();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    const path = `${id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('con-note-photos').upload(path, file);
    if (error) { toast.error('Upload failed'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('con-note-photos').getPublicUrl(path);
    await supabase.from('dispatches').update({ transporter_con_note_photo_url: urlData.publicUrl }).eq('id', id);
    toast.success('Photo uploaded');
    setUploading(false);
    invalidate();
  };

  const markPickedUp = async () => {
    if (!id || !conNote.trim()) {
      toast.error('Enter your con note number above before marking as picked up');
      return;
    }
    await saveConNote();
    await supabase.from('dispatches').update({ status: 'in-transit', pickup_time: new Date().toISOString() }).eq('id', id);
    await supabase.from('dispatch_events').insert({
      dispatch_id: id,
      event_type: 'in_transit',
      triggered_by_user_id: user?.id || null,
      triggered_by_role: 'transporter',
      metadata: { con_note_number: conNote.trim() },
    });
    toast.success('Marked as picked up');
    invalidate();
  };

  const markDelivered = async () => {
    if (!id) return;
    await supabase.from('dispatches').update({ status: 'arrived' }).eq('id', id);
    await supabase.from('dispatch_events').insert({
      dispatch_id: id,
      event_type: 'arrived',
      triggered_by_user_id: user?.id || null,
      triggered_by_role: 'transporter',
      metadata: {},
    });
    toast.success('Marked as delivered');
    invalidate();
  };

  const updateETA = async (time: string) => {
    if (!id) return;
    await supabase.from('dispatches').update({ current_eta: time }).eq('id', id);
    await supabase.from('dispatch_events').insert({
      dispatch_id: id,
      event_type: 'eta_updated',
      triggered_by_user_id: user?.id || null,
      triggered_by_role: 'transporter',
      metadata: { new_time: time },
    });
    toast.success('ETA updated — receiver has been notified');
    invalidate();
  };

  if (isLoading) return <BrandedLoading />;
  if (!dispatch) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <Truck className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="font-display">Dispatch not found</p>
        <Link to="/transporter"><Button variant="outline">← Back</Button></Link>
      </div>
    </div>
  );

  const totalCtns = items.reduce((s: number, i: any) => s + i.quantity, 0);
  const totalKg = items.reduce((s: number, i: any) => s + (i.unit_weight ? i.quantity * i.unit_weight : (i.weight || 0)), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container py-4 flex items-center gap-3">
          <Link to="/transporter">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Run Sheet</Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg tracking-tight truncate">
              {dispatch.delivery_advice_number || dispatch.display_id}
            </h1>
          </div>
        </div>
      </header>

      <div className="container max-w-xl py-6 space-y-6">
        {/* Status bar */}
        <div className="w-full py-4 px-6 rounded-xl text-center">
          <StatusBadge status={dispatch.status} />
        </div>

        {/* Supplier → Receiver */}
        <div className="flex items-center justify-center gap-3 text-lg font-display">
          <span>{dispatch.grower_name}</span>
          <span className="text-muted-foreground">→</span>
          <span>Receiver</span>
        </div>

        {/* Carrier Con Note section */}
        <section className={`rounded-lg border-2 p-5 space-y-4 ${!dispatch.transporter_con_note_number ? 'border-warning/50 bg-warning/5' : 'border-border bg-card'}`}>
          <h2 className="font-display text-base font-bold">Your Freight Con Note (Pink Sheet)</h2>

          <div className="space-y-2">
            <Label htmlFor="conNote" className="text-sm font-semibold">Your Con Note Number</Label>
            <Input
              id="conNote"
              value={conNote}
              onChange={e => setConNote(e.target.value)}
              placeholder="Enter number from your pink sheet"
              className="h-12 text-base"
            />
            <p className="text-xs text-muted-foreground">This is your freight con note — your document, your number.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Photo of Pink Sheet (optional)</Label>
            {dispatch.transporter_con_note_photo_url ? (
              <a href={dispatch.transporter_con_note_photo_url} target="_blank" rel="noopener noreferrer">
                <img src={dispatch.transporter_con_note_photo_url} alt="Pink sheet" className="rounded-lg max-h-24 border border-border" />
              </a>
            ) : null}
            <label className="block">
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
              <div className="flex items-center justify-center gap-2 w-full min-h-[44px] px-4 py-3 rounded-lg border border-border bg-card cursor-pointer hover:border-primary/30 transition-colors text-sm font-display">
                <Camera className="h-4 w-4" /> {uploading ? 'Uploading...' : '📷 Take Photo of Pink Sheet'}
              </div>
            </label>
          </div>

          <Button onClick={saveConNote} className="w-full font-display min-h-[44px]">
            Save Con Note Details
          </Button>
        </section>

        {/* Line items (read-only) */}
        <section className="space-y-3">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Delivery Details</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Product</th>
                  <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Qty</th>
                  <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Kg</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="p-3 font-medium">{item.product}</td>
                    <td className="p-3 text-right font-display">{item.quantity}</td>
                    <td className="p-3 text-right">{item.unit_weight ? (item.quantity * item.unit_weight).toLocaleString() : '-'}</td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-muted/30">
                  <td className="p-3 font-display text-xs uppercase text-muted-foreground">Total</td>
                  <td className="p-3 text-right font-display font-bold">{totalCtns}</td>
                  <td className="p-3 text-right font-display font-bold">{totalKg ? `${totalKg.toLocaleString()} kg` : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {dispatch.temperature_zone && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Temp Zone:</span>
              <span className="font-medium capitalize">{dispatch.temperature_zone === 'frozen' ? '🧊' : dispatch.temperature_zone === 'chilled' ? '❄️' : '🌡️'} {dispatch.temperature_zone}</span>
            </div>
          )}
        </section>

        {/* Truck details */}
        <section className="space-y-3">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Truck Details</h2>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Truck Rego</Label>
              <Input value={truckNum} onChange={e => setTruckNum(e.target.value)} placeholder="e.g. ABC-123" className="h-12" />
            </div>
            <div className="space-y-1">
              <Label>Pickup Temperature °C</Label>
              <Input type="number" value={pickupTemp} onChange={e => setPickupTemp(e.target.value)} placeholder="e.g. 4.5" className="h-12" />
            </div>
            <div className="space-y-1">
              <Label>Transporter Notes</Label>
              <Textarea value={transporterNotes} onChange={e => setTransporterNotes(e.target.value)} placeholder="Any notes..." className="min-h-[80px]" />
            </div>
          </div>
        </section>

        {/* Action buttons */}
        <section className="space-y-3">
          {dispatch.status === 'pending' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="lg" className="w-full font-display tracking-wide text-base min-h-[56px] bg-success hover:bg-success/90">
                  <CheckCircle2 className="h-5 w-5 mr-2" /> Mark as Picked Up
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Pickup</AlertDialogTitle>
                  <AlertDialogDescription>
                    {!conNote.trim()
                      ? 'Enter your con note number above before marking as picked up.'
                      : 'Mark this dispatch as picked up? This will notify the receiver.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  {conNote.trim() && <AlertDialogAction onClick={markPickedUp}>Confirm</AlertDialogAction>}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {dispatch.status === 'in-transit' && (
            <>
              <div className="flex gap-2">
                <Input type="time" className="h-12 flex-1" onChange={e => e.target.value && updateETA(e.target.value)} />
                <Button variant="outline" size="lg" className="font-display min-h-[44px] shrink-0">
                  <Clock className="h-4 w-4 mr-1" /> Update ETA
                </Button>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="lg" className="w-full font-display tracking-wide text-base min-h-[56px] bg-success hover:bg-success/90">
                    <CheckCircle2 className="h-5 w-5 mr-2" /> Mark as Delivered
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Delivery</AlertDialogTitle>
                    <AlertDialogDescription>Mark this dispatch as delivered at the receiver? This will notify both parties.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={markDelivered}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          <Button variant="outline" size="lg" className="w-full font-display tracking-wide text-base min-h-[56px] text-destructive border-destructive/30 hover:bg-destructive/5">
            <AlertTriangle className="h-5 w-5 mr-2" /> Report a Problem
          </Button>
        </section>

        {/* Timeline */}
        <DispatchTimeline dispatchId={dispatch.id} />
      </div>
    </div>
  );
}
