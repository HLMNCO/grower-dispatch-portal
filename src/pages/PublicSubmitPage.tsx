import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { PRODUCE_CATEGORIES, TRAY_TYPES, SIZES } from '@/types/dispatch';
import { toast } from '@/hooks/use-toast';

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
  const [receiverName, setReceiverName] = useState<string | null>(null);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [growerName, setGrowerName] = useState('');
  const [growerCode, setGrowerCode] = useState('');
  const [growerEmail, setGrowerEmail] = useState('');
  const [growerPhone, setGrowerPhone] = useState('');
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expectedArrival, setExpectedArrival] = useState('');
  const [carrier, setCarrier] = useState('');
  const [totalPallets, setTotalPallets] = useState(1);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  useEffect(() => {
    if (token) lookupReceiver();
  }, [token]);

  const lookupReceiver = async () => {
    const { data, error } = await supabase
      .from('businesses')
      .select('name')
      .eq('public_intake_token', token!)
      .eq('business_type', 'receiver')
      .single();

    if (error || !data) {
      setNotFound(true);
    } else {
      setReceiverName(data.name);
    }
    setLoadingBiz(false);
  };

  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: any) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const totalCartons = items.reduce((s, i) => s + i.quantity, 0);
  const totalWeight = items.reduce((s, i) => s + (i.unit_weight ? i.quantity * i.unit_weight : 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const res = await supabase.functions.invoke('public-dispatch', {
        body: {
          intake_token: token,
          grower_name: growerName.trim(),
          grower_code: growerCode.trim() || null,
          dispatch_date: dispatchDate,
          expected_arrival: expectedArrival || null,
          carrier: carrier.trim() || null,
          total_pallets: totalPallets,
          notes: notes.trim() || null,
          grower_email: growerEmail.trim() || null,
          grower_phone: growerPhone.trim() || null,
          items: items
            .filter(i => i.product)
            .map(i => ({
              product: i.product,
              variety: i.variety,
              size: i.size,
              tray_type: i.tray_type,
              quantity: i.quantity,
              unit_weight: i.unit_weight,
            })),
        },
      });

      if (res.error) {
        throw new Error(res.error.message || 'Submission failed');
      }

      const data = res.data as any;
      if (data?.error) {
        throw new Error(data.error);
      }

      setResultMessage(data?.message || 'Dispatch submitted successfully!');
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-display mb-2">Invalid Link</h1>
          <p className="text-muted-foreground">This supplier intake link is not valid or has expired. Please contact your receiver for a new link.</p>
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
        <div className="container py-16 text-center max-w-lg mx-auto">
          <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display mb-3">Dispatch Submitted!</h1>
          <p className="text-muted-foreground mb-6">{resultMessage}</p>
          <Button onClick={() => { setSubmitted(false); setItems([emptyItem()]); setGrowerName(''); setGrowerCode(''); setCarrier(''); setNotes(''); }}>
            Submit Another Dispatch
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4">
        <div className="container flex items-center gap-3">
          <Package className="h-6 w-6" />
          <span className="font-display text-lg tracking-tight">FRESHDOCK</span>
        </div>
      </header>

      <div className="container py-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-display tracking-tight mb-1">Submit Dispatch</h1>
          <p className="text-muted-foreground">
            Sending to <span className="font-semibold text-foreground">{receiverName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Grower Details */}
          <section className="space-y-4">
            <h2 className="text-sm font-display uppercase tracking-widest text-muted-foreground">Your Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Business Name *</label>
                <Input value={growerName} onChange={e => setGrowerName(e.target.value)} placeholder="e.g. Green Valley Farms" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Grower Code</label>
                <Input value={growerCode} onChange={e => setGrowerCode(e.target.value)} placeholder="e.g. GVF-001" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input type="email" value={growerEmail} onChange={e => setGrowerEmail(e.target.value)} placeholder="your@email.com" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone</label>
                <Input type="tel" value={growerPhone} onChange={e => setGrowerPhone(e.target.value)} placeholder="04xx xxx xxx" />
              </div>
            </div>
          </section>

          {/* Dispatch Info */}
          <section className="space-y-4">
            <h2 className="text-sm font-display uppercase tracking-widest text-muted-foreground">Dispatch Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Dispatch Date *</label>
                <Input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Expected Arrival</label>
                <Input type="date" value={expectedArrival} onChange={e => setExpectedArrival(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Carrier / Transport</label>
                <Input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="e.g. NorthBound Fresh" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Total Pallets</label>
                <Input type="number" min={1} value={totalPallets} onChange={e => setTotalPallets(Number(e.target.value))} />
              </div>
            </div>
          </section>

          {/* Line Items */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-display uppercase tracking-widest text-muted-foreground">Products *</h2>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Line
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-border bg-card space-y-3">
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
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {PRODUCE_CATEGORIES.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Variety</label>
                      <Input value={item.variety} onChange={e => updateItem(idx, 'variety', e.target.value)} placeholder="e.g. Hass" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Size</label>
                      <Select value={item.size} onValueChange={v => updateItem(idx, 'size', v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {SIZES.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Pack Type</label>
                      <Select value={item.tray_type} onValueChange={v => updateItem(idx, 'tray_type', v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {TRAY_TYPES.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Qty (Cartons) *</label>
                      <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Kg per Unit</label>
                      <Input type="number" step="0.1" min={0} value={item.unit_weight || ''} onChange={e => updateItem(idx, 'unit_weight', e.target.value ? Number(e.target.value) : null)} placeholder="Optional" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="flex gap-6 text-sm text-muted-foreground pt-2">
              <span>Total Cartons: <strong className="text-foreground">{totalCartons}</strong></span>
              {totalWeight > 0 && <span>Total Weight: <strong className="text-foreground">{totalWeight.toLocaleString()} kg</strong></span>}
            </div>
          </section>

          {/* Notes */}
          <section className="space-y-2">
            <label className="text-sm font-medium block">Notes</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special handling instructions..." rows={3} />
          </section>

          {/* Submit */}
          <Button type="submit" size="lg" className="w-full font-display tracking-wide" disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Dispatch'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Powered by FreshDock · This dispatch will be sent directly to {receiverName}
          </p>
        </form>
      </div>
    </div>
  );
}
