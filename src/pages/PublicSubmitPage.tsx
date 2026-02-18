import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Package, Plus, Trash2, CheckCircle2, Loader2, Camera, X,
  ArrowLeft, ArrowRight, Thermometer, Snowflake, IceCreamCone, CalendarIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { PRODUCE_CATEGORIES, TRAY_TYPES, SIZES } from '@/types/dispatch';
import { toast } from '@/hooks/use-toast';
import PastDispatches from '@/components/PastDispatches';

interface LineItem {
  product: string;
  variety: string;
  size: string;
  tray_type: string;
  quantity: number;
  unit_weight: number | null;
}

const emptyItem = (): LineItem => ({
  product: '', variety: '', size: '', tray_type: '', quantity: 1, unit_weight: null,
});

export default function PublicSubmitPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [receiverName, setReceiverName] = useState<string | null>(null);
  const [receiverBizId, setReceiverBizId] = useState<string | null>(null);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const prefilled = {
    name: searchParams.get('name') || '',
    code: searchParams.get('code') || '',
    email: searchParams.get('email') || '',
    phone: searchParams.get('phone') || '',
  };

  // Form state
  const [growerName, setGrowerName] = useState(prefilled.name);
  const [growerCode, setGrowerCode] = useState(prefilled.code);
  const [growerEmail, setGrowerEmail] = useState(prefilled.email);
  const [growerPhone, setGrowerPhone] = useState(prefilled.phone);
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [carrier, setCarrier] = useState('');
  const [truckRego, setTruckRego] = useState('');
  const [conNoteNumber, setConNoteNumber] = useState('');
  const [dispatchDate, setDispatchDate] = useState<Date>(new Date());
  const [expectedArrival, setExpectedArrival] = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d;
  });
  const [arrivalWindowStart, setArrivalWindowStart] = useState('');
  const [arrivalWindowEnd, setArrivalWindowEnd] = useState('');
  const [temperatureZone, setTemperatureZone] = useState('ambient');
  const [conNotePhoto, setConNotePhoto] = useState<File | null>(null);
  const [conNotePreview, setConNotePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState('');

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [daNumber, setDaNumber] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (token) lookupReceiver();
  }, [token]);

  const lookupReceiver = async () => {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('public_intake_token', token!)
      .eq('business_type', 'receiver')
      .single();
    if (error || !data) {
      setNotFound(true);
    } else {
      setReceiverName(data.name);
      setReceiverBizId(data.id);
    }
    setLoadingBiz(false);
  };

  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: any) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Photo must be under 10MB', variant: 'destructive' });
      return;
    }
    setConNotePhoto(file);
    setConNotePreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setConNotePhoto(null);
    if (conNotePreview) URL.revokeObjectURL(conNotePreview);
    setConNotePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadConNotePhoto = async (): Promise<string | null> => {
    if (!conNotePhoto) return null;
    try {
      const ext = conNotePhoto.name.split('.').pop() || 'jpg';
      const path = `public-intake/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('con-note-photos').upload(path, conNotePhoto);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('con-note-photos').getPublicUrl(path);
      return urlData.publicUrl;
    } catch {
      return null;
    }
  };

  const totalCartons = items.reduce((s, i) => s + i.quantity, 0);
  const totalWeight = items.reduce((s, i) => s + (i.unit_weight ? i.quantity * i.unit_weight : 0), 0);

  const handleSubmit = async () => {
    if (!growerName.trim()) {
      toast({ title: 'Missing field', description: 'Please enter your business name', variant: 'destructive' });
      return;
    }
    if (!items.some(i => i.product && i.quantity > 0)) {
      toast({ title: 'Missing items', description: 'Add at least one product line', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const photoUrl = await uploadConNotePhoto();

      const res = await supabase.functions.invoke('public-dispatch', {
        body: {
          intake_token: token,
          grower_name: growerName.trim(),
          grower_code: growerCode.trim() || null,
          dispatch_date: format(dispatchDate, 'yyyy-MM-dd'),
          expected_arrival: format(expectedArrival, 'yyyy-MM-dd'),
          estimated_arrival_window_start: arrivalWindowStart || null,
          estimated_arrival_window_end: arrivalWindowEnd || null,
          carrier: carrier.trim() || null,
          truck_number: truckRego.trim() || null,
          con_note_number: conNoteNumber.trim() || null,
          con_note_photo_url: photoUrl,
          temperature_zone: temperatureZone || null,
          total_pallets: 0,
          notes: notes.trim() || null,
          grower_email: growerEmail.trim() || null,
          grower_phone: growerPhone.trim() || null,
          items: items.filter(i => i.product).map(i => ({
            product: i.product, variety: i.variety, size: i.size,
            tray_type: i.tray_type, quantity: i.quantity, unit_weight: i.unit_weight,
          })),
        },
      });

      if (res.error) throw new Error(res.error.message || 'Submission failed');
      const data = res.data as any;
      if (data?.error) throw new Error(data.error);

      setDaNumber(data?.da_number || data?.display_id || '');
      setRefreshTrigger(prev => prev + 1);
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: 'Something went wrong. Try again or contact Ten Farms.', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const tempZones = [
    { value: 'ambient', icon: Thermometer, label: 'Ambient', desc: '12°C – 14°C (conventional)' },
    { value: 'chilled', icon: Snowflake, label: 'Chilled', desc: '2°C – 8°C' },
    { value: 'frozen', icon: IceCreamCone, label: 'Frozen', desc: 'Below 0°C' },
  ];

  // --- RENDERS ---

  if (loadingBiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-primary text-primary-foreground py-4">
          <div className="container flex items-center gap-3">
            <Package className="h-6 w-6" />
            <span className="font-display text-lg tracking-tight">FRESHDOCK</span>
          </div>
        </header>
        <div className="container py-16 text-center max-w-md mx-auto">
          <h1 className="text-2xl font-display mb-3">This link isn't valid</h1>
          <p className="text-muted-foreground mb-6">Contact Ten Farms to get a new submission link.</p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Ten Farms Receiving</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-primary text-primary-foreground py-4">
          <div className="container flex items-center gap-3">
            <Package className="h-6 w-6" />
            <span className="font-display text-lg tracking-tight">FRESHDOCK</span>
          </div>
        </header>
        <div className="container py-16 text-center max-w-md mx-auto">
          <div className="bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-display mb-2">Delivery advice sent to Ten Farms</h1>
          {daNumber && (
            <p className="font-display text-lg text-primary mb-4">{daNumber}</p>
          )}
          <p className="text-muted-foreground mb-8">Ten Farms will be in touch if there are any questions.</p>
          <button
            onClick={() => {
              setSubmitted(false);
              setItems([emptyItem()]);
              setCarrier('');
              setTruckRego('');
              setConNoteNumber('');
              setNotes('');
              setTemperatureZone('ambient');
              removePhoto();
              setStep(1);
            }}
            className="text-sm text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Submit another delivery
          </button>
        </div>
      </div>
    );
  }

  // Progress dots
  const ProgressDots = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map(s => (
        <div key={s} className={cn(
          "h-2.5 rounded-full transition-all",
          s === step ? "w-8 bg-primary" : s < step ? "w-2.5 bg-primary/40" : "w-2.5 bg-border"
        )} />
      ))}
      <span className="ml-2 text-xs text-muted-foreground">Step {step} of 3</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4">
        <div className="container flex items-center gap-3">
          <Package className="h-6 w-6" />
          <span className="font-display text-lg tracking-tight">FRESHDOCK</span>
        </div>
      </header>

      <div className="container py-6 max-w-2xl mx-auto px-4">
        <ProgressDots />

        {/* STEP 1 — What are you sending? */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-display tracking-tight mb-1">What are you sending to Ten Farms?</h1>
              <p className="text-sm text-muted-foreground">Sending to <span className="font-semibold text-foreground">{receiverName}</span></p>
            </div>

            {/* Grower info (if not prefilled) */}
            {!prefilled.name && (
              <section className="space-y-3">
                <h2 className="text-sm font-display uppercase tracking-widest text-muted-foreground">Your Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Business Name *</label>
                    <Input value={growerName} onChange={e => setGrowerName(e.target.value)} placeholder="e.g. Sats Bananas" required className="h-12 text-base" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Grower Code</label>
                    <Input value={growerCode} onChange={e => setGrowerCode(e.target.value)} placeholder="e.g. SAT-001" className="h-12 text-base" />
                  </div>
                </div>
              </section>
            )}

            {prefilled.name && (
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="font-medium text-foreground">{growerName}</p>
                {growerCode && <p className="text-sm text-muted-foreground">Code: {growerCode}</p>}
              </div>
            )}

            {/* Line items */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-display uppercase tracking-widest text-muted-foreground">Products *</h2>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3 sm:p-4 rounded-lg border border-border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-display text-muted-foreground">LINE {idx + 1}</span>
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Product *</label>
                        <Select value={item.product} onValueChange={v => updateItem(idx, 'product', v)}>
                          <SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {PRODUCE_CATEGORIES.map(p => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Variety</label>
                        <Input value={item.variety} onChange={e => updateItem(idx, 'variety', e.target.value)} placeholder="e.g. Cavendish" className="h-11" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Grade/Size</label>
                        <Select value={item.size} onValueChange={v => updateItem(idx, 'size', v)}>
                          <SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Pack Type</label>
                        <Select value={item.tray_type} onValueChange={v => updateItem(idx, 'tray_type', v)}>
                          <SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{TRAY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Qty (Cartons) *</label>
                        <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="h-11 text-base font-display" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Kg per Unit</label>
                        <Input type="number" step="0.1" min={0} value={item.unit_weight || ''} onChange={e => updateItem(idx, 'unit_weight', e.target.value ? Number(e.target.value) : null)} placeholder="Optional" className="h-11" />
                      </div>
                    </div>
                    {item.quantity > 0 && item.unit_weight && item.unit_weight > 0 && (
                      <p className="text-xs text-muted-foreground">
                        = <strong className="text-foreground font-display">{(item.quantity * item.unit_weight).toLocaleString()} kg</strong> total
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <button type="button" onClick={addItem} className="text-sm text-primary font-medium hover:underline flex items-center gap-1 min-h-[44px]">
                <Plus className="h-4 w-4" /> Add another product
              </button>

              <div className="flex gap-4 text-sm text-muted-foreground pt-1">
                <span>Total Cartons: <strong className="text-foreground">{totalCartons}</strong></span>
                {totalWeight > 0 && <span>Total Weight: <strong className="text-foreground">{totalWeight.toLocaleString()} kg</strong></span>}
              </div>
            </section>

            <Button
              onClick={() => {
                if (!items.some(i => i.product && i.quantity > 0)) {
                  toast({ title: 'Add at least one product', variant: 'destructive' });
                  return;
                }
                if (!growerName.trim()) {
                  toast({ title: 'Enter your business name', variant: 'destructive' });
                  return;
                }
                setStep(2);
              }}
              size="lg"
              className="w-full min-h-[56px] font-display tracking-wide text-base"
            >
              Next <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        )}

        {/* STEP 2 — Carrier & Timing */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-display tracking-tight mb-1">Carrier & timing</h1>
              <p className="text-sm text-muted-foreground">Tell us who's bringing the produce and when to expect it.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium block">Carrier / Transport Company <span className="text-muted-foreground text-xs">(optional)</span></label>
                <Input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="e.g. Toll, Linfox" className="h-12 text-base" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium block">Truck Rego <span className="text-muted-foreground text-xs">(optional)</span></label>
                  <Input value={truckRego} onChange={e => setTruckRego(e.target.value)} placeholder="e.g. ABC123" className="h-12 text-base" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium block">Carrier Con Note # <span className="text-muted-foreground text-xs">(optional)</span></label>
                  <Input value={conNoteNumber} onChange={e => setConNoteNumber(e.target.value)} placeholder="Pink sheet number" className="h-12 text-base" />
                </div>
              </div>

              {/* Con note photo */}
              <div className="space-y-2">
                <label className="text-sm font-medium block">Photo of Con Note <span className="text-muted-foreground text-xs">(optional)</span></label>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
                {conNotePreview ? (
                  <div className="relative inline-block">
                    <img src={conNotePreview} alt="Con note" className="w-full max-w-xs rounded-lg border border-border" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full" onClick={removePhoto}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full h-20 border-dashed border-2 flex flex-col gap-1" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Take photo or choose file</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium block">Leaving on *</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-12 text-base">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dispatchDate, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dispatchDate} onSelect={(d) => d && setDispatchDate(d)} className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium block">Expected arrival</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-12 text-base">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(expectedArrival, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={expectedArrival} onSelect={(d) => d && setExpectedArrival(d)} className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">Arrival window <span className="text-muted-foreground text-xs">(optional)</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">From</label>
                    <Input type="time" value={arrivalWindowStart} onChange={e => setArrivalWindowStart(e.target.value)} className="h-11" placeholder="4:00 AM" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">To</label>
                    <Input type="time" value={arrivalWindowEnd} onChange={e => setArrivalWindowEnd(e.target.value)} className="h-11" placeholder="8:00 AM" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Approximate window helps us plan dock space</p>
              </div>

              {/* Temperature Zone */}
              <div className="space-y-2">
                <label className="text-sm font-medium block">Temperature Zone</label>
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
                        <Icon className={cn("h-5 w-5 mx-auto mb-1", selected ? 'text-primary' : 'text-muted-foreground')} />
                        <p className="font-display text-xs font-bold">{tz.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{tz.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">Notes <span className="text-muted-foreground text-xs">(optional)</span></label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special handling instructions..." rows={2} />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="lg" onClick={() => setStep(1)} className="min-h-[56px] font-display">
                <ArrowLeft className="h-5 w-5 mr-2" /> Back
              </Button>
              <Button size="lg" onClick={() => setStep(3)} className="flex-1 min-h-[56px] font-display tracking-wide text-base">
                Next <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 — Confirm & Send */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-display tracking-tight mb-1">Ready to send?</h1>
              <p className="text-sm text-muted-foreground">Review your delivery details before sending.</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 space-y-4 text-sm">
              {/* Grower */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-display mb-1">From</p>
                <p className="font-medium">{growerName}</p>
                {growerCode && <p className="text-muted-foreground text-xs">Code: {growerCode}</p>}
              </div>

              {/* Products */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-display mb-2">Products</p>
                <div className="space-y-1.5">
                  {items.filter(i => i.product).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span>{item.product}{item.variety ? ` – ${item.variety}` : ''}</span>
                      <span className="font-display">{item.quantity} ctns{item.unit_weight ? ` · ${(item.quantity * item.unit_weight).toLocaleString()} kg` : ''}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border mt-2 pt-2 flex justify-between font-display font-bold">
                  <span>Total</span>
                  <span>{totalCartons} ctns{totalWeight > 0 ? ` · ${totalWeight.toLocaleString()} kg` : ''}</span>
                </div>
              </div>

              {/* Carrier */}
              {(carrier || truckRego || conNoteNumber) && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-display mb-1">Carrier</p>
                  {carrier && <p>{carrier}</p>}
                  {truckRego && <p className="text-muted-foreground">Rego: {truckRego}</p>}
                  {conNoteNumber && <p className="text-muted-foreground">Con Note: {conNoteNumber}</p>}
                </div>
              )}

              {/* Timing */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-display mb-1">Timing</p>
                <p>Leaving: {format(dispatchDate, 'EEE d MMM yyyy')}</p>
                <p>Arriving: {format(expectedArrival, 'EEE d MMM yyyy')}
                  {arrivalWindowStart && ` ${arrivalWindowStart}`}
                  {arrivalWindowEnd && `–${arrivalWindowEnd}`}
                </p>
              </div>

              {/* Temp */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-display mb-1">Temperature</p>
                <p className="capitalize">{temperatureZone}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="lg" onClick={() => setStep(2)} className="min-h-[56px] font-display">
                <ArrowLeft className="h-5 w-5 mr-2" /> Edit
              </Button>
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 min-h-[56px] font-display tracking-wide text-base"
              >
                {submitting ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Sending...</>
                ) : (
                  <><CheckCircle2 className="h-5 w-5 mr-2" /> Send to Ten Farms</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Past Dispatches */}
        {growerName && token && step === 1 && (
          <div className="mt-8 mb-6">
            <PastDispatches intakeToken={token} growerName={growerName} refreshTrigger={refreshTrigger} />
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground pb-6 mt-6">
          Powered by FreshDock · Sending to {receiverName}
        </p>
      </div>
    </div>
  );
}
