import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash2, Send, Package, Save, Thermometer, Snowflake, IceCreamCone, FileText, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { DispatchItem, PRODUCE_CATEGORIES, TRAY_TYPES, SIZES } from '@/types/dispatch';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PhotoUpload } from '@/components/PhotoUpload';
import { generateDeliveryAdvicePDF } from '@/services/deliveryAdviceGenerator';

const COMMODITY_CLASSES = [
  { value: 'stone_fruit', label: 'Stone Fruit' },
  { value: 'citrus', label: 'Citrus' },
  { value: 'tropicals', label: 'Tropicals' },
  { value: 'leafy', label: 'Leafy Greens' },
  { value: 'brassica', label: 'Brassica' },
  { value: 'herbs', label: 'Herbs' },
  { value: 'root_veg', label: 'Root Vegetables' },
  { value: 'capsicum_chilli', label: 'Capsicum & Chilli' },
  { value: 'other', label: 'Other' },
];

const emptyItem: DispatchItem = { product: '', variety: '', size: '', trayType: '', quantity: 0, weight: 0 };

interface TemplateRow {
  id: string;
  template_name: string;
  receiver_business_id: string | null;
  template_data: any;
  last_used_at: string | null;
}

export default function SupplierDispatchForm() {
  const { user, business } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [growerName, setGrowerName] = useState('');
  const [growerCode, setGrowerCode] = useState('');
  const [carrier, setCarrier] = useState('');
  const [truckNumber, setTruckNumber] = useState('');
  const [conNoteNumber, setConNoteNumber] = useState('');
  const [dispatchDate, setDispatchDate] = useState<Date>(new Date());
  const [expectedArrival, setExpectedArrival] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [arrivalWindowStart, setArrivalWindowStart] = useState('');
  const [arrivalWindowEnd, setArrivalWindowEnd] = useState('');
  const [totalPallets, setTotalPallets] = useState('');
  const [temperatureZone, setTemperatureZone] = useState('ambient');
  const [commodityClass, setCommodityClass] = useState('');
  const [items, setItems] = useState<DispatchItem[]>([{ ...emptyItem }]);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedReceiver, setSelectedReceiver] = useState('');
  const [receivers, setReceivers] = useState<{ id: string; name: string }[]>([]);
  const [palletType, setPalletType] = useState('');

  // Post-submission state
  const [submitted, setSubmitted] = useState(false);
  const [submittedDispatchId, setSubmittedDispatchId] = useState('');
  const [submittedDaNumber, setSubmittedDaNumber] = useState('');

  // Templates
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  useEffect(() => {
    if (business) {
      setGrowerName(business.name);
      fetchReceivers();
      fetchTemplates();
    }
  }, [business]);

  useEffect(() => {
    const templateId = searchParams.get('template');
    const repeatId = searchParams.get('repeat');
    if (templateId && templates.length > 0) {
      const tmpl = templates.find(t => t.id === templateId);
      if (tmpl) applyTemplate(tmpl);
    } else if (repeatId && !templateId) {
      // Pre-fill from a repeated dispatch
      (async () => {
        const { data: src } = await supabase
          .from('dispatches')
          .select('*, dispatch_items(*)')
          .eq('id', repeatId)
          .single();
        if (!src) return;
        if (src.carrier) setCarrier(src.carrier);
        if (src.temperature_zone) setTemperatureZone(src.temperature_zone);
        if (src.commodity_class) setCommodityClass(src.commodity_class);
        if (src.total_pallets) setTotalPallets(String(src.total_pallets));
        if (src.receiver_business_id) setSelectedReceiver(src.receiver_business_id);
        if (src.pallet_type) setPalletType(src.pallet_type);
        if (src.notes) setNotes(src.notes);
        if (src.dispatch_items && src.dispatch_items.length > 0) {
          setItems(src.dispatch_items.map((i: any) => ({
            product: i.product || '',
            variety: i.variety || '',
            size: i.size || '',
            trayType: i.tray_type || '',
            quantity: i.quantity || 0,
            weight: i.unit_weight || 0,
          })));
        }
        toast({ title: 'Dispatch repeated', description: 'Update dates and quantities as needed.' });
      })();
    }
  }, [templates, searchParams]);

  const fetchReceivers = async () => {
    if (!business) return;
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

  const fetchTemplates = async () => {
    if (!business) return;
    const { data } = await supabase
      .from('dispatch_templates')
      .select('id, template_name, receiver_business_id, template_data, last_used_at')
      .eq('business_id', business.id)
      .order('last_used_at', { ascending: false, nullsFirst: false });
    if (data) setTemplates(data as TemplateRow[]);
  };

  const applyTemplate = (tmpl: TemplateRow) => {
    const d = tmpl.template_data as any;
    if (d.selectedReceiver) setSelectedReceiver(d.selectedReceiver);
    if (d.carrier) setCarrier(d.carrier);
    if (d.temperatureZone) setTemperatureZone(d.temperatureZone);
    if (d.commodityClass) setCommodityClass(d.commodityClass);
    if (d.totalPallets) setTotalPallets(d.totalPallets);
    if (d.arrivalWindowStart) setArrivalWindowStart(d.arrivalWindowStart);
    if (d.arrivalWindowEnd) setArrivalWindowEnd(d.arrivalWindowEnd);
    if (d.items && d.items.length > 0) setItems(d.items);
    if (d.notes) setNotes(d.notes);
    supabase.from('dispatch_templates').update({ last_used_at: new Date().toISOString() }).eq('id', tmpl.id).then();
    toast({ title: 'Template loaded', description: `"${tmpl.template_name}" applied. Update dates and quantities as needed.` });
  };

  const saveTemplate = async () => {
    if (!business || !templateName.trim()) return;
    setSavingTemplate(true);
    const templateData = {
      selectedReceiver, carrier, temperatureZone, commodityClass,
      totalPallets, arrivalWindowStart, arrivalWindowEnd, items, notes,
    };
    const { error } = await supabase.from('dispatch_templates').insert([{
      business_id: business.id,
      template_name: templateName.trim(),
      receiver_business_id: selectedReceiver || null,
      template_data: JSON.parse(JSON.stringify(templateData)),
    }]);
    setSavingTemplate(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Template saved', description: `"${templateName}" saved for future use.` });
      setShowSaveTemplate(false);
      setTemplateName('');
      fetchTemplates();
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

  const checkForDuplicate = async (): Promise<boolean> => {
    if (!business || !dispatchDate) return false;
    setCheckingDuplicate(true);
    const dateStr = format(dispatchDate, 'yyyy-MM-dd');
    const { data } = await supabase
      .from('dispatches')
      .select('id, display_id, grower_name, dispatch_date, total_pallets')
      .eq('supplier_business_id', business.id)
      .eq('dispatch_date', dateStr)
      .eq('grower_name', growerName);
    setCheckingDuplicate(false);
    if (data && data.length > 0) {
      const match = data[0];
      setDuplicateWarning(
        `A dispatch from ${match.grower_name} on ${format(new Date(match.dispatch_date), 'dd MMM')} already exists (${match.display_id}). Submit anyway?`
      );
      return true;
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dispatchDate) return;

    // Check for duplicate (skip if user already confirmed)
    if (!duplicateWarning) {
      const isDuplicate = await checkForDuplicate();
      if (isDuplicate) return; // Show warning, user must confirm
    }
    setDuplicateWarning(null);
    setSubmitting(true);

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
        estimated_arrival_window_start: arrivalWindowStart || null,
        estimated_arrival_window_end: arrivalWindowEnd || null,
        transporter_con_note_number: conNoteNumber || '',
        carrier: carrier || null,
        truck_number: truckNumber || null,
        total_pallets: parseInt(totalPallets) || 0,
        pallet_type: palletType || null,
        temperature_zone: temperatureZone || null,
        commodity_class: commodityClass || null,
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

    await supabase.from('dispatch_events').insert({
      dispatch_id: dispatch.id,
      event_type: 'created',
      triggered_by_user_id: user.id,
      triggered_by_role: 'supplier',
      metadata: { grower_name: growerName },
    });

    await supabase.from('dispatch_events').insert({
      dispatch_id: dispatch.id,
      event_type: 'submitted',
      triggered_by_user_id: user.id,
      triggered_by_role: 'supplier',
      metadata: { receiver_business_id: selectedReceiver },
    });

    // Generate DA number
    const { data: daNumber } = await supabase.rpc('generate_delivery_advice_number', { p_dispatch_id: dispatch.id });

    setSubmitting(false);
    setSubmittedDispatchId(dispatch.id);
    setSubmittedDaNumber(daNumber || dispatch.id);
    setSubmitted(true);
  };

  const tempZones = [
    { value: 'ambient', icon: Thermometer, label: 'Ambient', desc: '12°C – 14°C (conventional)' },
    { value: 'chilled', icon: Snowflake, label: 'Chilled', desc: '2°C – 8°C' },
    { value: 'frozen', icon: IceCreamCone, label: 'Frozen', desc: 'Below 0°C' },
  ];

  const handleDownloadPDF = async () => {
    try {
      await generateDeliveryAdvicePDF(submittedDispatchId);
      toast({ title: 'PDF Downloaded', description: 'Delivery advice PDF has been downloaded.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate PDF', variant: 'destructive' });
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <div className="bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display tracking-tight">Delivery Advice Submitted</h1>
          <p className="text-muted-foreground mt-2">
            <span className="font-display font-bold text-foreground">{submittedDaNumber}</span> has been submitted. Your receiver will be notified.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleDownloadPDF} variant="outline" size="lg" className="font-display min-h-[48px]">
            <FileText className="h-4 w-4 mr-2" /> Download DA PDF
          </Button>
          <Button onClick={() => navigate(`/dispatch/${submittedDispatchId}`)} size="lg" className="font-display min-h-[48px]">
            View Dispatch <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        <Button onClick={() => navigate('/dispatch')} variant="ghost" className="font-display text-muted-foreground min-h-[44px]">
          ← Back to All Dispatches
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-display tracking-tight">New Delivery Advice</h1>
        <p className="text-muted-foreground text-sm mt-1">Submit your dispatch details so we can plan receiving and get your produce to market faster.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Template selector */}
        {templates.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Use a Template</h2>
            <Select onValueChange={(v) => {
              const tmpl = templates.find(t => t.id === v);
              if (tmpl) applyTemplate(tmpl);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a saved template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.template_name}
                    {t.last_used_at && <span className="text-muted-foreground ml-2 text-xs">· Last used {format(new Date(t.last_used_at), 'dd MMM')}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
        )}

        {/* Sending To */}
        <section className="space-y-4">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Sending To</h2>
          {receivers.length === 0 ? (
            <div className="p-4 border border-dashed border-border rounded-lg text-center">
              <p className="text-sm text-muted-foreground">No connected receivers yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {receivers.map(r => (
                <button key={r.id} type="button" onClick={() => setSelectedReceiver(r.id)}
                  className={`p-3 rounded-lg border text-left text-sm transition-all min-h-[44px] ${
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

        {/* Product Breakdown */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Product Breakdown</h2>
            <span className="text-sm text-muted-foreground font-medium">
              {totalQuantity} units{totalWeight > 0 ? ` · ${totalWeight.toLocaleString()}kg` : ''}
            </span>
          </div>
          
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="p-4 rounded-lg bg-card border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display uppercase tracking-widest text-muted-foreground">Item {i + 1}</span>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                    <Input type="number" placeholder="e.g. 60" min={0} inputMode="numeric" value={item.quantity === 0 ? '' : item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Kg per Unit</Label>
                    <Input type="number" placeholder="e.g. 15" min={0} step="0.1" inputMode="decimal" value={item.weight === 0 ? '' : item.weight} onChange={e => updateItem(i, 'weight', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                {item.quantity > 0 && item.weight && item.weight > 0 && (
                  <p className="text-xs text-muted-foreground">
                    = <strong className="text-foreground font-display">{(item.quantity * item.weight).toLocaleString()}kg</strong> total
                  </p>
                )}
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={addItem} className="w-full border-dashed min-h-[44px]">
            <Plus className="h-4 w-4 mr-2" /> Add Product Line
          </Button>
        </section>

        {/* Carrier & Delivery Details */}
        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div>
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Carrier & Delivery Details</h2>
            <p className="text-xs text-muted-foreground mt-1">Tell us who's bringing the produce and when to expect it. You'll find this on your freight booking or pink sheet.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier / Transport Company <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="carrier" value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="e.g. Toll, Linfox, local carrier name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="truckNumber">Truck Registration <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="truckNumber" value={truckNumber} onChange={e => setTruckNumber(e.target.value)} placeholder="e.g. ABC123" />
              <p className="text-xs text-muted-foreground">If you know it at time of dispatch</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="conNote">Carrier's Con Note Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="conNote" value={conNoteNumber} onChange={e => setConNoteNumber(e.target.value)} placeholder="Number from the pink sheet / freight con note" />
              <p className="text-xs text-muted-foreground">The carrier's freight document number — not the same as your Delivery Advice number</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Leaving your farm on *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal min-h-[44px]", !dispatchDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dispatchDate ? format(dispatchDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dispatchDate} onSelect={(d) => d && setDispatchDate(d)} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Expected to arrive at Ten Farms *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal min-h-[44px]", !expectedArrival && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expectedArrival ? format(expectedArrival, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={expectedArrival} onSelect={(d) => d && setExpectedArrival(d)} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expected arrival window <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <div className="grid grid-cols-2 gap-3">
              <Input type="time" value={arrivalWindowStart} onChange={e => setArrivalWindowStart(e.target.value)} placeholder="4:00 AM" />
              <Input type="time" value={arrivalWindowEnd} onChange={e => setArrivalWindowEnd(e.target.value)} placeholder="8:00 AM" />
            </div>
            <p className="text-xs text-muted-foreground">Approximate window helps us plan dock space</p>
          </div>

          {/* Temperature Zone radio cards */}
          <div className="space-y-2">
            <Label>Temperature Zone *</Label>
            <div className="grid grid-cols-3 gap-3">
              {tempZones.map(tz => {
                const Icon = tz.icon;
                const selected = temperatureZone === tz.value;
                return (
                  <button
                    key={tz.value}
                    type="button"
                    onClick={() => setTemperatureZone(tz.value)}
                    className={cn(
                      "p-3 sm:p-4 rounded-lg border text-center transition-all min-h-[44px]",
                      selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/30'
                    )}
                  >
                    <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-1.5", selected ? 'text-primary' : 'text-muted-foreground')} />
                    <p className="font-display text-xs sm:text-sm font-bold leading-tight">{tz.label}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight mt-0.5 hidden sm:block">{tz.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pallets">Total Pallets</Label>
              <Input id="pallets" type="number" min={0} value={totalPallets} onChange={e => setTotalPallets(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Pallet Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'chep', label: 'CHEP' },
                  { value: 'loscam', label: 'Loscam' },
                  { value: 'both', label: 'Both' },
                ].map(pt => (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => setPalletType(pt.value)}
                    className={cn(
                      "p-2.5 rounded-lg border text-center transition-all text-sm font-display min-h-[44px]",
                      palletType === pt.value ? 'border-primary bg-primary/5 ring-1 ring-primary font-bold' : 'border-border hover:border-primary/30'
                    )}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Commodity Class</Label>
              <Select value={commodityClass} onValueChange={setCommodityClass}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{COMMODITY_CLASSES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Photos */}
        <section className="space-y-4">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Photos</h2>
          <p className="text-xs text-muted-foreground">Attach photos of produce condition, pallet setup, or delivery advice.</p>
          <PhotoUpload photos={photos} onPhotosChange={setPhotos} folder="dispatch" max={8} />
        </section>

        {/* Notes */}
        <section className="space-y-4">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Notes</h2>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special handling instructions, ripeness notes, etc." rows={3} />
        </section>

        {duplicateWarning && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-300">{duplicateWarning}</p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" variant="outline" className="font-display border-amber-500/50 text-amber-700">
                Submit Anyway
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setDuplicateWarning(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        <Button type="submit" size="lg" className="w-full font-display tracking-wide min-h-[56px]" disabled={submitting || checkingDuplicate}>
          <Send className="h-4 w-4 mr-2" /> {submitting ? 'Submitting...' : checkingDuplicate ? 'Checking...' : 'Submit Delivery Advice'}
        </Button>

        <Button type="button" variant="secondary" size="lg" className="w-full font-display tracking-wide min-h-[44px]" onClick={() => setShowSaveTemplate(true)}>
          <Save className="h-4 w-4 mr-2" /> Save as Template
        </Button>
      </form>

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label>Template Name</Label>
            <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Weekly Banana Order" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSaveTemplate(false)}>Cancel</Button>
            <Button onClick={saveTemplate} disabled={savingTemplate || !templateName.trim()}>
              {savingTemplate ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
