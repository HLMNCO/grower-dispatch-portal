import { useState } from 'react';
import { Copy, CheckCircle2, Link2, Loader2, MessageSquare, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  intakeToken: string;
  compact?: boolean;
}

export default function SupplierIntakeLinkDialog({ intakeToken, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [growerName, setGrowerName] = useState('');
  const [growerCode, setGrowerCode] = useState('');
  const [growerEmail, setGrowerEmail] = useState('');
  const [growerPhone, setGrowerPhone] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  const firstName = growerName.split(' ')[0] || growerName;

  const generateLink = async () => {
    if (!growerName.trim()) {
      toast({ title: 'Missing field', description: "Enter the grower's business name", variant: 'destructive' });
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
      setCopied('link');
      toast({ title: 'Link copied!' });
      setTimeout(() => setCopied(null), 3000);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate link', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: 'Copied!' });
    setTimeout(() => setCopied(null), 2000);
  };

  // Updated messaging — Pack to Produce branding
  const whatsappMsg = `Hi ${firstName}, you've been set up on Pack to Produce. Next time you're sending us produce, just tap this link to let us know what's coming — takes about a minute: ${generatedUrl}`;
  const smsMsg = `Hi ${firstName}, tap here to send your next delivery: ${generatedUrl}`;

  const resetForm = () => {
    setGrowerName('');
    setGrowerCode('');
    setGrowerEmail('');
    setGrowerPhone('');
    setCopied(null);
    setGeneratedUrl('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        {compact ? (
          <button className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground w-full h-full">
            <Link2 className="h-5 w-5" />
            <span>Intake</span>
          </button>
        ) : (
          <Button size="sm" variant="outline" className="font-display font-bold tracking-wide">
            <Link2 className="h-4 w-4 mr-1" /> Grower Submission Link
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display font-bold tracking-tight">Grower Submission Link</DialogTitle>
          {growerName && generatedUrl && (
            <DialogDescription className="text-sm font-medium text-foreground">{growerName}</DialogDescription>
          )}
          {!generatedUrl && (
            <DialogDescription className="text-sm text-muted-foreground">
              Set up the grower's details. They'll get a short link to submit delivery info — no account needed.
            </DialogDescription>
          )}
        </DialogHeader>

        {!generatedUrl ? (
          <>
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Grower Business Name *</label>
                <Input value={growerName} onChange={e => setGrowerName(e.target.value)} placeholder="e.g. Valley Fresh Farms" className="h-11" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Grower Code</label>
                <Input value={growerCode} onChange={e => setGrowerCode(e.target.value)} placeholder="e.g. VFF-042" className="h-11" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input type="email" value={growerEmail} onChange={e => setGrowerEmail(e.target.value)} placeholder="grower@email.com" className="h-11" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Phone</label>
                  <Input type="tel" value={growerPhone} onChange={e => setGrowerPhone(e.target.value)} placeholder="04xx xxx xxx" className="h-11" />
                </div>
              </div>
            </div>
            <Button onClick={generateLink} className="w-full mt-4 h-11 font-display font-bold tracking-wide" disabled={generating}>
              {generating
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                : <><Copy className="h-4 w-4 mr-2" /> Generate & Copy Link</>}
            </Button>
          </>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Submission link</p>
              <p className="text-sm font-mono font-medium text-primary break-all">{generatedUrl}</p>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => copyText(generatedUrl, 'link')}>
              {copied === 'link'
                ? <><CheckCircle2 className="h-4 w-4 mr-1.5 text-primary" /> Copied</>
                : <><Copy className="h-4 w-4 mr-1.5" /> Copy Link</>}
            </Button>

            <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">
                <MessageSquare className="h-3.5 w-3.5" /> WhatsApp Message
              </div>
              <p className="text-sm text-foreground/80">{whatsappMsg}</p>
              <Button variant="outline" size="sm" onClick={() => copyText(whatsappMsg, 'whatsapp')}>
                {copied === 'whatsapp'
                  ? <><CheckCircle2 className="h-4 w-4 mr-1.5 text-primary" /> Copied</>
                  : <><Copy className="h-4 w-4 mr-1.5" /> Copy WhatsApp Message</>}
              </Button>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">
                <Smartphone className="h-3.5 w-3.5" /> SMS Message
              </div>
              <p className="text-sm text-foreground/80">{smsMsg}</p>
              <Button variant="outline" size="sm" onClick={() => copyText(smsMsg, 'sms')}>
                {copied === 'sms'
                  ? <><CheckCircle2 className="h-4 w-4 mr-1.5 text-primary" /> Copied</>
                  : <><Copy className="h-4 w-4 mr-1.5" /> Copy SMS Message</>}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              This link is unique to {growerName}. Don't share it with other growers.
            </p>

            <Button variant="outline" size="sm" className="w-full" onClick={resetForm}>
              Create Another Link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
