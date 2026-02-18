import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle2, AlertTriangle, Plus, Package, Truck, FileText, Download, Hash, SplitSquareVertical, Thermometer, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { ISSUE_TYPES } from '@/types/dispatch';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PhotoUpload } from '@/components/PhotoUpload';
import { DispatchTimeline } from '@/components/DispatchTimeline';
import { generateDeliveryAdvicePDF } from '@/services/deliveryAdviceGenerator';
import { Switch } from '@/components/ui/switch';

interface DispatchDetail {
  id: string;
  display_id: string;
  grower_name: string;
  grower_code: string | null;
  transporter_con_note_number: string;
  delivery_advice_number: string | null;
  delivery_advice_generated_at: string | null;
  qr_code_token: string | null;
  carrier: string | null;
  dispatch_date: string;
  expected_arrival: string | null;
  estimated_arrival_window_start: string | null;
  estimated_arrival_window_end: string | null;
  temperature_zone: string | null;
  commodity_class: string | null;
  total_pallets: number;
  status: string;
  notes: string | null;
  photos: string[] | null;
  truck_number: string | null;
  transporter_con_note_photo_url: string | null;
  pickup_time: string | null;
  supplier_id: string;
  receiver_business_id: string | null;
  transporter_business_id: string | null;
  internal_lot_number: string | null;
  is_split_load: boolean;
  receiving_temperature: number | null;
  receiving_photos: string[] | null;
}

interface ItemRow {
  id: string;
  product: string;
  variety: string | null;
  size: string | null;
  tray_type: string | null;
  quantity: number;
  unit_weight: number | null;
  weight: number | null;
  received_quantity: number | null;
}

interface IssueRow {
  id: string;
  issue_type: string;
  description: string;
  severity: string;
  photo_url: string | null;
}

export default function ReceiveDispatch() {
  const { id } = useParams<{ id: string }>();
  const { role, user, business } = useAuth();
  const [dispatch, setDispatch] = useState<DispatchDetail | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddIssue, setShowAddIssue] = useState(false);
  const [newIssueType, setNewIssueType] = useState('');
  const [newIssueSeverity, setNewIssueSeverity] = useState('medium');
  const [newIssueDesc, setNewIssueDesc] = useState('');
  const [newIssuePhotos, setNewIssuePhotos] = useState<string[]>([]);
  const [generatingDA, setGeneratingDA] = useState(false);
  const [lotNumber, setLotNumber] = useState('');
  const [savingLot, setSavingLot] = useState(false);
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number | ''>>({});
  const [savingReceived, setSavingReceived] = useState(false);
  const [receivingTemp, setReceivingTemp] = useState<string>('');
  const [receivingPhotos, setReceivingPhotos] = useState<string[]>([]);

  const isSupplier = role === 'supplier';
  const isReceiver = role === 'staff';

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = async () => {
    const [dispatchRes, itemsRes, issuesRes] = await Promise.all([
      supabase.from('dispatches').select('*').eq('id', id).single(),
      supabase.from('dispatch_items').select('*').eq('dispatch_id', id),
      supabase.from('receiving_issues').select('*').eq('dispatch_id', id),
    ]);

    if (dispatchRes.data) {
      const d = dispatchRes.data as unknown as DispatchDetail;
      setDispatch(d);
      setLotNumber(d.internal_lot_number || '');
      setReceivingTemp(d.receiving_temperature != null ? String(d.receiving_temperature) : '');
      setReceivingPhotos(d.receiving_photos || []);
    }
    if (itemsRes.data) {
      const itemData = itemsRes.data as ItemRow[];
      setItems(itemData);
      // Initialise received qtys from saved data
      const qtyMap: Record<string, number | ''> = {};
      itemData.forEach(item => {
        qtyMap[item.id] = item.received_quantity ?? '';
      });
      setReceivedQtys(qtyMap);
    }
    if (issuesRes.data) setIssues(issuesRes.data as IssueRow[]);
    setLoading(false);
  };

  const handleSaveLotNumber = async () => {
    if (!id) return;
    setSavingLot(true);
    const trimmed = lotNumber.trim() || null;
    await supabase.from('dispatches').update({ internal_lot_number: trimmed } as any).eq('id', id);
    
    // If dispatch is "received-pending-admin" and we now have a lot number, transition to fully received
    if (trimmed && dispatch?.status === 'received-pending-admin') {
      await supabase.from('dispatches').update({ status: 'received' }).eq('id', id);
      if (user) {
        await supabase.from('dispatch_events').insert({
          dispatch_id: id,
          event_type: 'admin_confirmed',
          triggered_by_user_id: user.id,
          triggered_by_role: 'staff',
          metadata: { internal_lot_number: trimmed },
        });
      }
      setDispatch(prev => prev ? { ...prev, internal_lot_number: trimmed, status: 'received' } : prev);
      toast({ title: 'Lot number saved — Consignment complete', description: 'Status updated to Received.' });
    } else {
      setDispatch(prev => prev ? { ...prev, internal_lot_number: trimmed } : prev);
      toast({ title: 'Lot number saved' });
    }
    setSavingLot(false);
  };

  const handleSaveReceivedQtys = async () => {
    if (!id || !user) return;
    setSavingReceived(true);
    
    const updates = Object.entries(receivedQtys)
      .filter(([, val]) => val !== '' && val !== null)
      .map(([itemId, qty]) => 
        supabase.from('dispatch_items').update({ received_quantity: Number(qty) } as any).eq('id', itemId)
      );
    
    await Promise.all(updates);

    await supabase.from('dispatch_events').insert({
      dispatch_id: id,
      event_type: 'stock_validated',
      triggered_by_user_id: user.id,
      triggered_by_role: 'staff',
      metadata: { received_quantities: receivedQtys },
    });

    toast({ title: 'Received quantities saved' });
    setSavingReceived(false);
    fetchAll();
  };

  const addIssue = async () => {
    if (!newIssueType || !newIssueDesc || !id || !user) return;
    const { data, error } = await supabase.from('receiving_issues').insert({
      dispatch_id: id,
      issue_type: newIssueType,
      description: newIssueDesc,
      severity: newIssueSeverity,
      flagged_by: user.id,
      photo_url: newIssuePhotos[0] || null,
    }).select().single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    if (data) setIssues([...issues, data as IssueRow]);
    setNewIssueType('');
    setNewIssueDesc('');
    setNewIssueSeverity('medium');
    setNewIssuePhotos([]);
    setShowAddIssue(false);

    await supabase.from('dispatches').update({ status: 'issue' }).eq('id', id);
    await supabase.from('dispatch_events').insert({
      dispatch_id: id,
      event_type: 'issue_flagged',
      triggered_by_user_id: user.id,
      triggered_by_role: role || 'staff',
      metadata: { issue_type: newIssueType, severity: newIssueSeverity },
    });
  };

  const handleReceive = async (partial = false) => {
    if (!id || !user) return;

    // Save any pending received qtys first
    const unsavedQtys = Object.entries(receivedQtys).filter(([, val]) => val !== '' && val !== null);
    if (unsavedQtys.length > 0) {
      await Promise.all(
        unsavedQtys.map(([itemId, qty]) =>
          supabase.from('dispatch_items').update({ received_quantity: Number(qty) } as any).eq('id', itemId)
        )
      );
    }

    // Save lot number, receiving temp, and photos
    const updateFields: any = {};
    if (lotNumber.trim()) updateFields.internal_lot_number = lotNumber.trim();
    if (receivingTemp) updateFields.receiving_temperature = Number(receivingTemp);
    if (receivingPhotos.length > 0) updateFields.receiving_photos = receivingPhotos;
    if (Object.keys(updateFields).length > 0) {
      await supabase.from('dispatches').update(updateFields).eq('id', id);
    }

    if (partial) {
      // Partial receive — split load, more stock coming
      await supabase.from('dispatches').update({ status: 'partially-received' }).eq('id', id);
      await supabase.from('dispatch_events').insert({
        dispatch_id: id,
        event_type: 'partially_received',
        triggered_by_user_id: user.id,
        triggered_by_role: 'staff',
        metadata: { 
          internal_lot_number: lotNumber.trim() || null,
          received_quantities: receivedQtys,
          note: 'Split load — awaiting remaining stock',
        },
      });
      toast({
        title: 'Partial Receive Recorded',
        description: `${dispatch?.display_id} partially received. Awaiting remaining stock.`,
      });
      setDispatch(prev => prev ? { ...prev, status: 'partially-received' } : prev);
    } else {
      // Full receive — if no lot number, it's "received, pending admin"
      const hasLot = !!(lotNumber.trim() || dispatch?.internal_lot_number);
      const newStatus = issues.length > 0 ? 'issue' : hasLot ? 'received' : 'received-pending-admin';
      await supabase.from('dispatches').update({ status: newStatus }).eq('id', id);
      await supabase.from('dispatch_events').insert({
        dispatch_id: id,
        event_type: hasLot ? 'received' : 'received_pending_admin',
        triggered_by_user_id: user.id,
        triggered_by_role: 'staff',
        metadata: { internal_lot_number: lotNumber.trim() || null },
      });
      toast({
        title: issues.length > 0 
          ? 'Stock Received with Issues' 
          : hasLot 
            ? 'Stock Received — Consignment Complete' 
            : 'Stock Received — Pending Admin',
        description: issues.length > 0
          ? `${dispatch?.display_id} received. ${issues.length} issue(s) flagged.`
          : hasLot
            ? `${dispatch?.display_id} received in full.`
            : `${dispatch?.display_id} received by warehouse. Awaiting lot number from admin.`,
      });
      setDispatch(prev => prev ? { ...prev, status: newStatus } : prev);
    }
  };

  const handleMarkArrived = async () => {
    if (!id || !user) return;

    // Save lot number if entered at arrival
    if (lotNumber.trim()) {
      await supabase.from('dispatches').update({ internal_lot_number: lotNumber.trim() } as any).eq('id', id);
    }

    await supabase.from('dispatches').update({ status: 'arrived' }).eq('id', id);
    await supabase.from('dispatch_events').insert({
      dispatch_id: id,
      event_type: 'arrived',
      triggered_by_user_id: user.id,
      triggered_by_role: role || 'staff',
      metadata: { internal_lot_number: lotNumber.trim() || null },
    });
    toast({ title: 'Marked as Arrived', description: lotNumber.trim() ? `Lot # ${lotNumber.trim()} saved.` : undefined });
    setDispatch(prev => prev ? { ...prev, status: 'arrived', internal_lot_number: lotNumber.trim() || prev.internal_lot_number } : prev);
  };

  const handleGenerateDA = async () => {
    if (!id || !user) return;
    setGeneratingDA(true);
    try {
      await generateDeliveryAdvicePDF(id);
      const { data } = await supabase.from('dispatches').select('delivery_advice_number, delivery_advice_generated_at').eq('id', id).single();
      if (data) {
        setDispatch(prev => prev ? { ...prev, ...data } : prev);
      }
      await supabase.from('dispatch_events').insert({
        dispatch_id: id,
        event_type: 'delivery_advice_generated',
        triggered_by_user_id: user.id,
        triggered_by_role: role || 'staff',
        metadata: { da_number: data?.delivery_advice_number },
      });
      toast({ title: 'Delivery Advice Generated', description: `${data?.delivery_advice_number} downloaded.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate DA', variant: 'destructive' });
    }
    setGeneratingDA(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!dispatch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Dispatch not found.</p>
          <Link to="/"><Button variant="outline">Back to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const totalReceivedQty = items.reduce((s, i) => s + (typeof receivedQtys[i.id] === 'number' ? (receivedQtys[i.id] as number) : 0), 0);
  const totalWeight = items.reduce((s, i) => s + (i.unit_weight ? i.quantity * i.unit_weight : (i.weight || 0)), 0);
  const hasAnyReceivedQty = Object.values(receivedQtys).some(v => v !== '' && v !== null);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-lg font-display tracking-tight">{dispatch.delivery_advice_number || dispatch.display_id}</h1>
              <p className="text-xs text-muted-foreground">{dispatch.grower_name}</p>
            </div>
          </div>
          <StatusBadge status={dispatch.status as any} />
        </div>
      </header>

      <div className="container py-6 max-w-4xl space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { icon: FileText, label: 'DA Number', value: dispatch.delivery_advice_number || 'Not generated' },
            { icon: Truck, label: 'Carrier', value: dispatch.carrier || '-' },
            { icon: Truck, label: 'Truck/Rego', value: dispatch.truck_number || '-' },
            { icon: Package, label: 'Pallets', value: dispatch.total_pallets.toString() },
            { icon: Hash, label: 'Lot #', value: dispatch.internal_lot_number || 'Not assigned' },
          ].map(card => (
            <div key={card.label} className="p-4 rounded-lg border border-border bg-card">
              <card.icon className="h-4 w-4 text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
              <p className="font-display text-sm mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Dates */}
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span>Dispatched: <strong className="text-foreground">{format(new Date(dispatch.dispatch_date), 'dd MMM yyyy')}</strong></span>
          {dispatch.expected_arrival && <span>ETA: <strong className="text-foreground">{format(new Date(dispatch.expected_arrival), 'dd MMM yyyy')}</strong></span>}
          {dispatch.estimated_arrival_window_start && dispatch.estimated_arrival_window_end && (
            <span>Window: <strong className="text-foreground">{dispatch.estimated_arrival_window_start} – {dispatch.estimated_arrival_window_end}</strong></span>
          )}
          {dispatch.temperature_zone && <span>Temp: <strong className="text-foreground capitalize">{dispatch.temperature_zone}</strong></span>}
          {dispatch.commodity_class && <span>Class: <strong className="text-foreground capitalize">{dispatch.commodity_class.replace('_', ' ')}</strong></span>}
        </div>

        {/* Pending Admin Banner */}
        {dispatch.status === 'received-pending-admin' && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm font-medium text-amber-800">Stock received by warehouse — awaiting lot number from admin</p>
            <p className="text-xs text-amber-700 mt-1">Enter the Internal Lot Number below to complete this consignment.</p>
          </div>
        )}

        {/* Internal Lot Number — receiver only */}
        {isReceiver && dispatch.status !== 'received' && (
          <section className="space-y-3">
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Hash className="h-4 w-4" /> Internal Lot Number
            </h2>
            <div className="p-4 rounded-lg border border-border bg-card flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <Input
                  value={lotNumber}
                  onChange={e => setLotNumber(e.target.value)}
                  placeholder="e.g. LOT-20250218-001"
                  className="h-12 text-lg font-display"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your warehouse lot/batch number when the truck arrives — admin can see at a glance if stock has been booked in
                </p>
              </div>
              <Button onClick={handleSaveLotNumber} disabled={savingLot} variant="outline" className="font-display h-12 sm:self-start">
                {savingLot ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </section>
        )}

        {/* Show lot number if already set and dispatch is received */}
        {dispatch.internal_lot_number && dispatch.status === 'received' && (
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Internal Lot Number</p>
            <p className="font-display text-lg mt-1">{dispatch.internal_lot_number}</p>
          </div>
        )}

        {/* Transport Section */}
        <section className="space-y-3">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Transport Details</h2>
          <div className="p-4 rounded-lg border border-border bg-card space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Carrier</p>
                <p className="font-medium">{dispatch.carrier || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Truck Rego</p>
                <p className="font-medium">{dispatch.truck_number || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Carrier Con Note</p>
                {dispatch.transporter_con_note_number ? (
                  <p className="font-medium font-display">{dispatch.transporter_con_note_number}</p>
                ) : (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-warning/15 text-warning-foreground">Awaiting carrier con note</span>
                )}
              </div>
              {dispatch.pickup_time && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Pickup Time</p>
                  <p className="font-medium">{format(new Date(dispatch.pickup_time), 'h:mm a')}</p>
                </div>
              )}
            </div>
            {dispatch.transporter_con_note_photo_url && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Transporter's Sheet Photo</p>
                <a href={dispatch.transporter_con_note_photo_url} target="_blank" rel="noopener noreferrer">
                  <img src={dispatch.transporter_con_note_photo_url} alt="Carrier con note" className="rounded-lg max-h-32 object-cover border border-border" />
                  <span className="text-xs text-primary mt-1 inline-block">View full image</span>
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Generate / Download Delivery Advice */}
        {(isSupplier || isReceiver) && (
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              {!dispatch.delivery_advice_number ? (
                <Button onClick={handleGenerateDA} disabled={generatingDA} size="lg" className="font-display tracking-wide">
                  <Download className="h-4 w-4 mr-2" /> {generatingDA ? 'Generating...' : 'Generate Delivery Advice'}
                </Button>
              ) : (
                <Button onClick={handleGenerateDA} disabled={generatingDA} variant="outline" size="lg" className="font-display tracking-wide">
                  <Download className="h-4 w-4 mr-2" /> {generatingDA ? 'Generating...' : 'Download Delivery Advice PDF'}
                </Button>
              )}
            </div>
          </section>
        )}

        {/* Product Lines with Stock Validation */}
        <section className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Product Lines — Stock Validation</h2>
            <div className="flex gap-2">
              {isReceiver && dispatch.status !== 'received' && !hasAnyReceivedQty && items.length > 0 && (
                <Button 
                  onClick={() => {
                    const allCorrect: Record<string, number | ''> = {};
                    items.forEach(item => { allCorrect[item.id] = item.quantity; });
                    setReceivedQtys(allCorrect);
                    toast({ title: 'All quantities marked as correct' });
                  }} 
                  size="sm" variant="outline" className="font-display text-primary border-primary/30"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> All Correct
                </Button>
              )}
              {isReceiver && dispatch.status !== 'received' && hasAnyReceivedQty && (
                <Button onClick={handleSaveReceivedQtys} disabled={savingReceived} size="sm" variant="outline" className="font-display">
                  {savingReceived ? 'Saving...' : 'Save Received Qtys'}
                </Button>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Product</th>
                    <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Variety</th>
                    <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Size</th>
                    <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Pack</th>
                    <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">DA Qty</th>
                    <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground min-w-[100px]">Received</th>
                    <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const recQty = receivedQtys[item.id];
                    const recNum = typeof recQty === 'number' ? recQty : null;
                    const variance = recNum !== null ? recNum - item.quantity : null;
                    const varianceClass = variance === null ? '' : variance < 0 ? 'text-destructive font-bold' : variance > 0 ? 'text-amber-600 font-bold' : 'text-primary';
                    
                    return (
                      <tr key={item.id} className="border-t border-border">
                        <td className="p-3 font-medium">{item.product}</td>
                        <td className="p-3 text-muted-foreground">{item.variety || '-'}</td>
                        <td className="p-3 text-muted-foreground">{item.size || '-'}</td>
                        <td className="p-3 text-muted-foreground">{item.tray_type || '-'}</td>
                        <td className="p-3 text-right font-display">{item.quantity}</td>
                        <td className="p-3 text-right">
                          {isReceiver && dispatch.status !== 'received' ? (
                            <Input
                              type="number"
                              min={0}
                              value={recQty === '' || recQty === null ? '' : recQty}
                              onChange={e => setReceivedQtys(prev => ({
                                ...prev,
                                [item.id]: e.target.value === '' ? '' : Number(e.target.value),
                              }))}
                              placeholder={String(item.quantity)}
                              className="w-20 h-9 text-right font-display ml-auto"
                            />
                          ) : (
                            <span className="font-display">{item.received_quantity ?? '-'}</span>
                          )}
                        </td>
                        <td className={`p-3 text-right font-display ${varianceClass}`}>
                          {variance !== null ? (variance > 0 ? `+${variance}` : variance === 0 ? '✓' : variance) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No items recorded.</td></tr>
                  )}
                  {items.length > 0 && (
                    <tr className="border-t border-border bg-muted/30">
                      <td colSpan={4} className="p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Total</td>
                      <td className="p-3 text-right font-display font-bold">{totalQty}</td>
                      <td className="p-3 text-right font-display font-bold">{hasAnyReceivedQty ? totalReceivedQty : '-'}</td>
                      <td className={`p-3 text-right font-display font-bold ${
                        hasAnyReceivedQty 
                          ? (totalReceivedQty - totalQty < 0 ? 'text-destructive' : totalReceivedQty - totalQty > 0 ? 'text-amber-600' : 'text-primary')
                          : ''
                      }`}>
                        {hasAnyReceivedQty 
                          ? (totalReceivedQty - totalQty > 0 ? `+${totalReceivedQty - totalQty}` : totalReceivedQty - totalQty === 0 ? '✓' : totalReceivedQty - totalQty)
                          : '-'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {isReceiver && dispatch.status !== 'received' && (
            <p className="text-xs text-muted-foreground">Enter the actual quantity received for each product. Variances will be highlighted — red for short, amber for over.</p>
          )}
        </section>

        {/* Inbound Receiving — Temperature & Photos (receiver only) */}
        {isReceiver && dispatch.status !== 'received' && (
          <section className="space-y-3">
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Thermometer className="h-4 w-4" /> Inbound Receiving Check
            </h2>
            <div className="p-4 rounded-lg border border-border bg-card space-y-4">
              <div className="space-y-2">
                <Label className="font-display text-xs uppercase tracking-wider">Temperature at Receival (°C)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={receivingTemp}
                    onChange={e => setReceivingTemp(e.target.value)}
                    placeholder="e.g. 4.5"
                    className="w-32 h-10 font-display"
                  />
                  <span className="text-sm text-muted-foreground">°C</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-display text-xs uppercase tracking-wider flex items-center gap-2">
                  <Camera className="h-3.5 w-3.5" /> Inbound Photos
                </Label>
                <PhotoUpload photos={receivingPhotos} onPhotosChange={setReceivingPhotos} folder="receiving" max={5} compact />
                <p className="text-xs text-muted-foreground">Optional — snap a photo of the stock as it comes off the truck</p>
              </div>
            </div>
          </section>
        )}

        {/* Show saved receiving data if already received */}
        {(dispatch.status === 'received' || dispatch.status === 'received-pending-admin') && (dispatch.receiving_temperature != null || (dispatch.receiving_photos && dispatch.receiving_photos.length > 0)) && (
          <section className="space-y-3">
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Thermometer className="h-4 w-4" /> Inbound Receiving Check
            </h2>
            <div className="p-4 rounded-lg border border-border bg-card space-y-3">
              {dispatch.receiving_temperature != null && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Temperature at Receival</p>
                  <p className="font-display text-lg mt-1">{dispatch.receiving_temperature}°C</p>
                </div>
              )}
              {dispatch.receiving_photos && dispatch.receiving_photos.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Inbound Photos</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {dispatch.receiving_photos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-border">
                        <img src={url} alt={`Receiving photo ${i + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Dispatch Photos */}
        {dispatch.photos && dispatch.photos.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Dispatch Photos</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {dispatch.photos.map((url, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border">
                  <img src={url} alt={`Dispatch photo ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        {dispatch.notes && (
          <section className="space-y-2">
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Grower Notes</h2>
            <p className="p-4 rounded-lg bg-card border border-border text-sm">{dispatch.notes}</p>
          </section>
        )}

        {/* Issues */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Issues & Claims
            </h2>
            {isReceiver && (
              <Button variant="outline" size="sm" onClick={() => setShowAddIssue(!showAddIssue)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Flag Issue
              </Button>
            )}
          </div>

          {showAddIssue && (
            <div className="p-4 rounded-lg border border-border bg-card space-y-3 animate-slide-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Issue Type</Label>
                  <Select value={newIssueType} onValueChange={setNewIssueType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{ISSUE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select value={newIssueSeverity} onValueChange={setNewIssueSeverity}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={newIssueDesc} onChange={e => setNewIssueDesc(e.target.value)} placeholder="Describe the issue in detail..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Photo Evidence</Label>
                <PhotoUpload photos={newIssuePhotos} onPhotosChange={setNewIssuePhotos} folder="issues" max={3} compact />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowAddIssue(false)}>Cancel</Button>
                <Button size="sm" variant="destructive" onClick={addIssue}>Add Issue</Button>
              </div>
            </div>
          )}

          {issues.length > 0 ? (
            <div className="space-y-2">
              {issues.map((issue) => (
                <div key={issue.id} className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{ISSUE_TYPES.find(t => t.value === issue.issue_type)?.label || issue.issue_type}</span>
                    <span className={`text-xs font-display uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      issue.severity === 'high' ? 'bg-destructive/20 text-destructive' :
                      issue.severity === 'medium' ? 'bg-warning/20 text-warning-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>{issue.severity}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{issue.description}</p>
                  {issue.photo_url && (
                    <img src={issue.photo_url} alt="Issue evidence" className="mt-2 rounded-lg max-h-40 object-cover border border-border" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-4 border border-dashed border-border rounded-lg text-center">No issues flagged.</p>
          )}
        </section>

        {/* Dispatch Timeline */}
        <DispatchTimeline dispatchId={id!} />

        {/* Split Load Toggle — receiver only */}
        {isReceiver && dispatch.status !== 'received' && (
          <section className="space-y-3">
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <SplitSquareVertical className="h-4 w-4" /> Split Load
            </h2>
            <div className="p-4 rounded-lg border border-border bg-card flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">This is a split load (multiple deliveries)</p>
                <p className="text-xs text-muted-foreground">
                  Enable if this consignment will arrive across multiple trucks. You can partially receive stock as it comes in.
                </p>
              </div>
              <Switch
                checked={dispatch.is_split_load}
                onCheckedChange={async (checked) => {
                  await supabase.from('dispatches').update({ is_split_load: checked } as any).eq('id', id);
                  setDispatch(prev => prev ? { ...prev, is_split_load: checked } : prev);
                  toast({ title: checked ? 'Marked as split load' : 'Split load removed' });
                }}
              />
            </div>
            {dispatch.is_split_load && dispatch.status === 'partially-received' && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700">
                <strong>Partially received</strong> — some stock from this consignment has been checked in. Awaiting remaining delivery/deliveries before closing.
              </div>
            )}
          </section>
        )}

        {/* Actions — receiver only */}
        {isReceiver && dispatch.status !== 'received' && (
          <div className="flex gap-3 pt-4 border-t border-border">
            {dispatch.status === 'in-transit' && (
              <Button onClick={handleMarkArrived} size="lg" variant="outline" className="flex-1 font-display tracking-wide">
                <Package className="h-4 w-4 mr-2" /> Mark as Arrived
              </Button>
            )}
            {dispatch.is_split_load && (dispatch.status === 'arrived' || dispatch.status === 'partially-received' || dispatch.status === 'in-transit' || dispatch.status === 'pending') && (
              <Button onClick={() => handleReceive(true)} size="lg" variant="outline" className="flex-1 font-display tracking-wide border-amber-500/30 text-amber-700 hover:bg-amber-500/10">
                <Package className="h-4 w-4 mr-2" /> Receive Partial Load
              </Button>
            )}
            {(dispatch.status === 'arrived' || dispatch.status === 'in-transit' || dispatch.status === 'pending' || dispatch.status === 'partially-received') && (
              <Button onClick={() => handleReceive(false)} size="lg" className="flex-1 font-display tracking-wide">
                <CheckCircle2 className="h-4 w-4 mr-2" /> {dispatch.is_split_load ? 'Confirm Full Consignment Received' : 'Confirm Received'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
