import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle2, AlertTriangle, Plus, Send, Package, Truck, FileText, Download, Camera, Clock } from 'lucide-react';
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

  // Transporter fields
  const [conNoteNumber, setConNoteNumber] = useState('');
  const [conNotePhotos, setConNotePhotos] = useState<string[]>([]);
  const [pickupTimeInput, setPickupTimeInput] = useState('');
  const [tempReading, setTempReading] = useState('');
  const [transporterNotes, setTransporterNotes] = useState('');
  const [savingTransporter, setSavingTransporter] = useState(false);

  const isSupplier = role === 'supplier';
  const isTransporter = role === 'transporter';
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
      setConNoteNumber(d.transporter_con_note_number || '');
      if (d.transporter_con_note_photo_url) setConNotePhotos([d.transporter_con_note_photo_url]);
    }
    if (itemsRes.data) setItems(itemsRes.data as ItemRow[]);
    if (issuesRes.data) setIssues(issuesRes.data as IssueRow[]);
    setLoading(false);
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

  const handleReceive = async () => {
    if (!id || !user) return;
    const newStatus = issues.length > 0 ? 'issue' : 'received';
    await supabase.from('dispatches').update({ status: newStatus }).eq('id', id);
    await supabase.from('dispatch_events').insert({
      dispatch_id: id,
      event_type: 'received',
      triggered_by_user_id: user.id,
      triggered_by_role: 'staff',
      metadata: {},
    });
    toast({
      title: issues.length > 0 ? 'Stock Received with Issues' : 'Stock Received',
      description: issues.length > 0
        ? `${dispatch?.display_id} received. ${issues.length} issue(s) flagged.`
        : `${dispatch?.display_id} received successfully.`,
    });
    setDispatch(prev => prev ? { ...prev, status: newStatus } : prev);
  };

  const handleMarkArrived = async () => {
    if (!id || !user) return;
    await supabase.from('dispatches').update({ status: 'arrived' }).eq('id', id);
    await supabase.from('dispatch_events').insert({
      dispatch_id: id,
      event_type: 'arrived',
      triggered_by_user_id: user.id,
      triggered_by_role: role || 'staff',
      metadata: {},
    });
    toast({ title: 'Marked as Arrived' });
    setDispatch(prev => prev ? { ...prev, status: 'arrived' } : prev);
  };

  const handleGenerateDA = async () => {
    if (!id || !user) return;
    setGeneratingDA(true);
    try {
      await generateDeliveryAdvicePDF(id);
      // Refresh dispatch to get DA number
      const { data } = await supabase.from('dispatches').select('delivery_advice_number, delivery_advice_generated_at').eq('id', id).single();
      if (data) {
        setDispatch(prev => prev ? { ...prev, ...data } : prev);
      }
      await supabase.from('dispatch_events').insert({
        dispatch_id: id,
        event_type: 'delivery_advice_generated',
        triggered_by_user_id: user.id,
        triggered_by_role: 'supplier',
        metadata: { da_number: data?.delivery_advice_number },
      });
      toast({ title: 'Delivery Advice Generated', description: `${data?.delivery_advice_number} downloaded.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate DA', variant: 'destructive' });
    }
    setGeneratingDA(false);
  };

  // Transporter: save con note
  const handleSaveTransporter = async () => {
    if (!id || !user) return;
    setSavingTransporter(true);
    const updates: any = {};
    if (conNoteNumber) updates.transporter_con_note_number = conNoteNumber;
    if (conNotePhotos.length > 0) updates.transporter_con_note_photo_url = conNotePhotos[0];
    if (pickupTimeInput) updates.pickup_time = new Date().toISOString().split('T')[0] + 'T' + pickupTimeInput + ':00';
    if (tempReading) updates.temperature_reading = parseFloat(tempReading);
    if (transporterNotes) updates.transporter_notes = transporterNotes;

    await supabase.from('dispatches').update(updates).eq('id', id);

    if (conNoteNumber) {
      await supabase.from('dispatch_events').insert({
        dispatch_id: id,
        event_type: 'con_note_attached',
        triggered_by_user_id: user.id,
        triggered_by_role: 'transporter',
        metadata: { con_note_number: conNoteNumber },
      });
    }

    toast({ title: 'Details Saved' });
    setSavingTransporter(false);
    fetchAll();
  };

  const handleMarkPickedUp = async () => {
    if (!id || !user) return;
    if (!conNoteNumber.trim()) {
      toast({ title: 'Con Note Required', description: 'Please enter your con note number before marking as picked up.', variant: 'destructive' });
      return;
    }
    await handleSaveTransporter();
    await supabase.from('dispatches').update({ status: 'in-transit' }).eq('id', id);
    await supabase.from('dispatch_events').insert({
      dispatch_id: id,
      event_type: 'in_transit',
      triggered_by_user_id: user.id,
      triggered_by_role: 'transporter',
      metadata: { con_note_number: conNoteNumber },
    });
    toast({ title: 'Marked as Picked Up' });
    setDispatch(prev => prev ? { ...prev, status: 'in-transit' } : prev);
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
  const totalWeight = items.reduce((s, i) => s + (i.unit_weight ? i.quantity * i.unit_weight : (i.weight || 0)), 0);

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
            { icon: Package, label: 'Total Qty', value: totalQty.toString() },
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

        {/* Transport Section — visible to all roles */}
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
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pink Sheet Photo</p>
                <a href={dispatch.transporter_con_note_photo_url} target="_blank" rel="noopener noreferrer">
                  <img src={dispatch.transporter_con_note_photo_url} alt="Carrier con note" className="rounded-lg max-h-32 object-cover border border-border" />
                  <span className="text-xs text-primary mt-1 inline-block">View full image</span>
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Transporter Input Section */}
        {isTransporter && (
          <section className="space-y-3">
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Carrier Con Note</h2>
            <div className="p-4 rounded-lg border-2 border-warning/30 bg-warning/5 space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Your Con Note Number</Label>
                <Input
                  value={conNoteNumber}
                  onChange={e => setConNoteNumber(e.target.value)}
                  placeholder="Enter your freight con note number"
                  className="text-lg h-12"
                />
                <p className="text-xs text-muted-foreground">This is the number on your pink sheet / freight consignment note</p>
              </div>
              <div className="space-y-2">
                <Label>Photo of Con Note (Pink Sheet)</Label>
                <PhotoUpload photos={conNotePhotos} onPhotosChange={setConNotePhotos} folder="con-notes" max={1} compact />
                <p className="text-xs text-muted-foreground">Optional but recommended — photo of your signed pink sheet for proof of pickup</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pickup Time</Label>
                  <Input type="time" value={pickupTimeInput} onChange={e => setPickupTimeInput(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Temperature at Pickup (°C)</Label>
                  <Input type="number" step="0.1" value={tempReading} onChange={e => setTempReading(e.target.value)} placeholder="e.g. 4.5" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Transporter Notes</Label>
                <Textarea value={transporterNotes} onChange={e => setTransporterNotes(e.target.value)} placeholder="Any notes about pickup or load..." rows={2} />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSaveTransporter} disabled={savingTransporter} variant="outline" className="font-display">
                  Save Details
                </Button>
                {dispatch.status === 'pending' && (
                  <Button onClick={handleMarkPickedUp} className="font-display bg-primary">
                    <Truck className="h-4 w-4 mr-2" /> Mark as Picked Up
                  </Button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Supplier: Generate Delivery Advice */}
        {isSupplier && (
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

        {/* Product Lines */}
        <section className="space-y-3">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Product Lines</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Product</th>
                  <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Variety</th>
                  <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Size</th>
                  <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Pack</th>
                  <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Qty</th>
                  <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Kg/Unit</th>
                  <th className="text-right p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Total Kg</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const itemTotal = item.unit_weight ? item.quantity * item.unit_weight : (item.weight || 0);
                  return (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-3 font-medium">{item.product}</td>
                      <td className="p-3 text-muted-foreground">{item.variety || '-'}</td>
                      <td className="p-3">{item.size || '-'}</td>
                      <td className="p-3">{item.tray_type || '-'}</td>
                      <td className="p-3 text-right font-display">{item.quantity}</td>
                      <td className="p-3 text-right text-muted-foreground">{item.unit_weight ? `${item.unit_weight}` : '-'}</td>
                      <td className="p-3 text-right text-muted-foreground">{itemTotal ? `${itemTotal.toLocaleString()}kg` : '-'}</td>
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
                    <td className="p-3" />
                    <td className="p-3 text-right font-display text-muted-foreground">{totalWeight ? `${totalWeight.toLocaleString()}kg` : '-'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

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

        {/* Actions — receiver only */}
        {isReceiver && dispatch.status !== 'received' && (
          <div className="flex gap-3 pt-4 border-t border-border">
            {dispatch.status === 'in-transit' && (
              <Button onClick={handleMarkArrived} size="lg" variant="outline" className="flex-1 font-display tracking-wide">
                <Package className="h-4 w-4 mr-2" /> Mark as Arrived
              </Button>
            )}
            {(dispatch.status === 'arrived' || dispatch.status === 'in-transit') && (
              <Button onClick={handleReceive} size="lg" className="flex-1 font-display tracking-wide">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Received
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
