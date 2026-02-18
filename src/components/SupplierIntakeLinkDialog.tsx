import { useState } from 'react';
import { Copy, CheckCircle2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

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

  const generateLink = () => {
    if (!growerName.trim()) {
      toast({ title: 'Missing field', description: 'Enter the grower\'s business name', variant: 'destructive' });
      return;
    }

    const params = new URLSearchParams();
    params.set('name', growerName.trim());
    if (growerCode.trim()) params.set('code', growerCode.trim());
    if (growerEmail.trim()) params.set('email', growerEmail.trim());
    if (growerPhone.trim()) params.set('phone', growerPhone.trim());

    const url = `${window.location.origin}/submit/${intakeToken}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: 'Link copied!', description: `Share this link with ${growerName.trim()} — they'll only need to fill in dispatch details.` });
    setTimeout(() => setCopied(false), 3000);
  };

  const resetForm = () => {
    setGrowerName('');
    setGrowerCode('');
    setGrowerEmail('');
    setGrowerPhone('');
    setCopied(false);
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
            Set up the grower's details first. They'll get a link where they only need to enter dispatch info, products, and snap the transporter's sheet.
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
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Grower Code</label>
            <Input
              value={growerCode}
              onChange={e => setGrowerCode(e.target.value)}
              placeholder="e.g. SAT-001"
              className="h-11"
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
              />
            </div>
          </div>
        </div>

        <Button onClick={generateLink} className="w-full mt-4 h-11 font-display tracking-wide">
          {copied ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Copied!</> : <><Copy className="h-4 w-4 mr-2" /> Generate & Copy Link</>}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
