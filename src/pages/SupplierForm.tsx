import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash2, Send, Truck, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DispatchItem, PRODUCE_CATEGORIES, TRAY_TYPES, SIZES } from '@/types/dispatch';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PhotoUpload } from '@/components/PhotoUpload';

const emptyItem: DispatchItem = { product: '', variety: '', size: '', trayType: '', quantity: 0, weight: 0 };

export default function SupplierDispatchForm() {
  const { user, business } = useAuth();
  const navigate = useNavigate();
  const [growerName, setGrowerName] = useState('');
  const [growerCode, setGrowerCode] = useState('');
  const [conNote, setConNote] = useState('');
  const [carrier, setCarrier] = useState('');
  const [truckNumber, setTruckNumber] = useState('');
  const [dispatchDate, setDispatchDate] = useState<Date>();
  const [expectedArrival, setExpectedArrival] = useState<Date>();
  const [totalPallets, setTotalPallets] = useState('');
  const [items, setItems] = useState<DispatchItem[]>([{ ...emptyItem }]);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedReceiver, setSelectedReceiver] = useState('');
  const [receivers, setReceivers] = useState<{ id: string; name: string }[]>([]);

  // Pre-fill grower info from business profile
  useEffect(() => {
    if (business) {
      setGrowerName(business.name);
    }
    fetchReceivers();
  }, [business]);

  const fetchReceivers = async () => {
    if (!business) return;
    // Get approved connections
    const { data: conns } = await supabase
      .from('connections')
      .select('receiver_business_id')
      .eq('supplier_business_id', business.id)
      .eq('status', 'approved');
    
    if (conns && conns.length > 0) {
      const ids = conns.map(c => c.receiver_business_id);
      const { data: bizData } = await supabase
        .from('businesses')
        .select('id, name')
        .in('id', ids);
      if (bizData) setReceivers(bizData);
    }
  };

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof DispatchItem, value: string | number) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  };

  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalWeight = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.weight || 0)), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dispatchDate) return;

    setSubmitting(true);

    // Insert dispatch
    const { data: dispatch, error: dispatchError } = await supabase
      .from('dispatches')
      .insert({
        supplier_id: user.id,
        supplier_business_id: business?.id || null,
        receiver_business_id: selectedReceiver || null,
        grower_name: growerName,
        grower_code: growerCode || null,
        dispatch_date: format(dispatchDate, 'yyyy-MM-dd'),
        expected_arrival: expectedArrival ? format(expectedArrival, 'yyyy-MM-dd') : null,
        con_note_number: conNote,
        carrier: carrier || null,
        truck_number: truckNumber || null,
        total_pallets: parseInt(totalPallets) || 0,
        notes,
        photos,
      })
      .select('id')
      .single();

    if (dispatchError || !dispatch) {
      toast({ title: 'Error', description: dispatchError?.message || 'Failed to create dispatch', variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // Insert items
    const itemRows = items
      .filter(i => i.product)
      .map(i => ({
        dispatch_id: dispatch.id,
        product: i.product,
        variety: i.variety,
        size: i.size,
        tray_type: i.trayType,
        quantity: i.quantity,
        unit_weight: i.weight || null,
        weight: i.weight && i.quantity ? i.quantity * i.weight : null,
      }));

    if (itemRows.length > 0) {
      const { error: itemsError } = await supabase.from('dispatch_items').insert(itemRows);
      if (itemsError) {
        toast({ title: 'Warning', description: 'Dispatch created but some items failed to save.' });
      }
    }

    setSubmitting(false);
    toast({
      title: 'Dispatch Submitted',
      description: `Con Note ${conNote} has been submitted. Your agent will be notified.`,
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container max-w-3xl py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display tracking-tight">Dispatch Advice</h1>
            <span className="ml-auto text-xs font-display text-muted-foreground tracking-wider">FRESHDOCK</span>
          </div>
          <p className="text-muted-foreground">Submit your dispatch details so we can plan receiving and get your produce to market faster.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="container max-w-3xl py-8 space-y-8">
        {/* Sending To */}
        <section className="space-y-4">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Sending To</h2>
          {receivers.length === 0 ? (
            <div className="p-4 border border-dashed border-border rounded-lg text-center">
              <p className="text-sm text-muted-foreground">No connected receivers yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Go to Connections to find and connect with a receiver first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {receivers.map(r => (
                <button key={r.id} type="button" onClick={() => setSelectedReceiver(r.id)}
                  className={`p-3 rounded-lg border text-left text-sm transition-all ${
                    selectedReceiver === r.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/30'
                  }`}>
                  <div className="font-medium">{r.name}</div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Grower Details */}
        <section className="space-y-4">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Grower Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="growerName">Business / Farm Name *</Label>
              <Input id="growerName" value={growerName} onChange={e => setGrowerName(e.target.value)} placeholder="e.g. Valley Fresh Farms" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="growerCode">Grower Code</Label>
              <Input id="growerCode" value={growerCode} onChange={e => setGrowerCode(e.target.value)} placeholder="e.g. VFF-042" />
            </div>
          </div>
        </section>

        {/* Consignment Details */}
        <section className="space-y-4">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Consignment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="conNote">Con Note Number *</Label>
              <Input id="conNote" value={conNote} onChange={e => setConNote(e.target.value)} placeholder="e.g. CN-88421" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier / Transport</Label>
              <Input id="carrier" value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="e.g. Cool Chain Logistics" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="truckNumber">Truck / Rego Number</Label>
              <Input id="truckNumber" value={truckNumber} onChange={e => setTruckNumber(e.target.value)} placeholder="e.g. ABC-123" />
            </div>
            <div className="space-y-2">
              <Label>Dispatch Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dispatchDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dispatchDate ? format(dispatchDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dispatchDate} onSelect={setDispatchDate} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Expected Arrival</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !expectedArrival && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expectedArrival ? format(expectedArrival, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={expectedArrival} onSelect={setExpectedArrival} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pallets">Total Pallets</Label>
              <Input id="pallets" type="number" min={0} value={totalPallets} onChange={e => setTotalPallets(e.target.value)} placeholder="0" />
            </div>
          </div>
        </section>

        {/* Line Items */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Product Breakdown</h2>
            <span className="text-sm text-muted-foreground font-medium">
              {totalQuantity} units{totalWeight > 0 ? ` · ${totalWeight.toLocaleString()}kg` : ''}
            </span>
          </div>
          
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="p-4 rounded-lg bg-card border border-border space-y-3 animate-slide-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display uppercase tracking-widest text-muted-foreground">Item {i + 1}</span>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Select value={item.product} onValueChange={v => updateItem(i, 'product', v)}>
                    <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                    <SelectContent>{PRODUCE_CATEGORIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Variety" value={item.variety} onChange={e => updateItem(i, 'variety', e.target.value)} />
                  <Select value={item.size} onValueChange={v => updateItem(i, 'size', v)}>
                    <SelectTrigger><SelectValue placeholder="Size" /></SelectTrigger>
                    <SelectContent>{SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={item.trayType} onValueChange={v => updateItem(i, 'trayType', v)}>
                    <SelectTrigger><SelectValue placeholder="Tray / Pack" /></SelectTrigger>
                    <SelectContent>{TRAY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Quantity *</Label>
                    <Input type="number" placeholder="e.g. 60" min={0} value={item.quantity || ''} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Kg per Unit</Label>
                    <Input type="number" placeholder="e.g. 15" min={0} step="0.1" value={item.weight || ''} onChange={e => updateItem(i, 'weight', parseFloat(e.target.value) || 0)} />
                  </div>
                  {item.quantity > 0 && item.weight && item.weight > 0 && (
                    <div className="flex items-end pb-2">
                      <span className="text-xs text-muted-foreground">
                        = <strong className="text-foreground font-display">{(item.quantity * item.weight).toLocaleString()}kg</strong> total
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={addItem} className="w-full border-dashed">
            <Plus className="h-4 w-4 mr-2" /> Add Product Line
          </Button>
        </section>

        {/* Photos */}
        <section className="space-y-4">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Photos</h2>
          <p className="text-xs text-muted-foreground">Attach photos of your con note, produce condition, or pallet setup.</p>
          <PhotoUpload photos={photos} onPhotosChange={setPhotos} folder="dispatch" max={8} />
        </section>

        {/* Notes */}
        <section className="space-y-4">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Notes</h2>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special handling instructions, ripeness notes, etc." rows={3} />
        </section>

        <Button type="submit" size="lg" className="w-full font-display tracking-wide" disabled={submitting}>
          <Send className="h-4 w-4 mr-2" /> {submitting ? 'Submitting...' : 'Submit Dispatch Advice'}
        </Button>
      </form>
    </div>
  );
}
