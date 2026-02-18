import { useState } from 'react';
import { Copy, CheckCircle2, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  intakeToken: string;
}

export default function SupplierIntakeLinkDialog({ intakeToken }: Props) {
  const [open, setOpen] = useState(false);
  const [growerName, setGrowerName] = useState('');
  const [growerCode, setGrowerCode] = useState('');
  const [growerEmail, setGrowerEmail] = useState('');
  const [growerPhone, setGrowerPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  const generateLink = async () => {
    if (!growerName.trim()) {
      toast({ title: 'Missing field', description: 'Enter the grower\'s business name', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase
        .from('supplier_intake_links')
        .insert({
          intake_token: intakeToken,
          grower_name: growerName.trim(),
          grower_code: growerCode.trim() || null,
          grower_email: growerEmail.trim() || null,
          grower_phone: growerPhone.trim() || null,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select('short_code')
        .single();

      if (error) throw error;

      const url = `${window.location.origin}/s/${data.short_code}`;
      setGeneratedUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: 'Link copied!', description: `Share this short link with ${growerName.trim()} — they'll only need to fill in dispatch details.` });
      setTimeout(() => setCopied(false), 3000);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate link', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const copyAgain = async () => {
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    toast({ title: 'Copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setGrowerName('');
    setGrowerCode('');
    setGrowerEmail('');
    setGrowerPhone('');
    setCopied(false);
    setGeneratedUrl('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="font-display tracking-wide">
          <Link2 className="h-4 w-4 mr-1" /> Supplier Intake Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">Create Grower Link</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Set up the grower's details first. They'll get a short link where they only need to enter dispatch info, products, and snap the transporter's sheet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Grower Business Name *</label>
            <Input
              value={growerName}
              onChange={e => setGrowerName(e.target.value)}
              placeholder="e.g. Sats Bananas"
              className="h-11"
              disabled={!!generatedUrl}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Grower Code</label>
            <Input
              value={growerCode}
              onChange={e => setGrowerCode(e.target.value)}
              placeholder="e.g. SAT-001"
              className="h-11"
              disabled={!!generatedUrl}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                value={growerEmail}
                onChange={e => setGrowerEmail(e.target.value)}
                placeholder="grower@email.com"
                className="h-11"
                disabled={!!generatedUrl}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input
                type="tel"
                value={growerPhone}
                onChange={e => setGrowerPhone(e.target.value)}
                placeholder="04xx xxx xxx"
                className="h-11"
                disabled={!!generatedUrl}
              />
            </div>
          </div>
        </div>

        {generatedUrl ? (
          <div className="mt-4 space-y-3">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">Link ready — copied to clipboard!</p>
              <p className="text-sm font-mono font-medium text-primary">/s/{generatedUrl.split('/s/')[1]}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={copyAgain}>
                {copied ? <><CheckCircle2 className="h-4 w-4 mr-1.5 text-primary" /> Copied</> : <><Copy className="h-4 w-4 mr-1.5" /> Copy Again</>}
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={resetForm}>
                Create Another
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={generateLink} className="w-full mt-4 h-11 font-display tracking-wide" disabled={generating}>
            {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Copy className="h-4 w-4 mr-2" /> Generate & Copy Link</>}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
