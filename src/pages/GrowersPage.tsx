import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import {
  Search, Plus, Sprout, Edit2, Save, X, Copy, CheckCircle2, Link2,
  MessageSquare, Smartphone, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { GrowerScorecard } from '@/components/GrowerScorecard';
import { NoGrowersEmpty, NoSearchResultsEmpty } from '@/components/EmptyStates';

interface Grower {
  id: string;
  name: string;
  grower_code: string | null;
  region: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  owner_id: string;
}

interface IntakeLink {
  id: string;
  short_code: string;
  grower_name: string;
  grower_code: string | null;
  created_at: string;
}

export default function GrowersPage() {
  const { business } = useAuth();
  const [growers, setGrowers] = useState<Grower[]>([]);
  const [intakeLinks, setIntakeLinks] = useState<Record<string, IntakeLink[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Grower>>({});
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create grower dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newState, setNewState] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);

  // Intake link generation
  const [linkGrowerId, setLinkGrowerId] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchGrowers();
  }, []);

  const fetchGrowers = async () => {
    const { data } = await supabase
      .from('businesses')
      .select('id, name, grower_code, region, state, phone, email, owner_id')
      .eq('business_type', 'supplier')
      .order('name');
    if (data) {
      setGrowers(data);
      // Fetch intake links for all growers
      const { data: links } = await supabase
        .from('supplier_intake_links')
        .select('id, short_code, grower_name, grower_code, created_at')
        .order('created_at', { ascending: false });
      if (links) {
        const grouped: Record<string, IntakeLink[]> = {};
        for (const link of links) {
          // Match by grower_code or name
          const match = data.find(g =>
            (g.grower_code && link.grower_code && g.grower_code === link.grower_code) ||
            g.name.toLowerCase() === link.grower_name.toLowerCase()
          );
          if (match) {
            if (!grouped[match.id]) grouped[match.id] = [];
            grouped[match.id].push(link);
          }
        }
        setIntakeLinks(grouped);
      }
    }
    setLoading(false);
  };

  const filtered = growers.filter(g =>
    !search ||
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.grower_code || '').toLowerCase().includes(search.toLowerCase()) ||
    (g.region || '').toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (grower: Grower) => {
    setEditingId(grower.id);
    setEditForm({
      name: grower.name,
      grower_code: grower.grower_code || '',
      region: grower.region || '',
      state: grower.state || '',
      phone: grower.phone || '',
      email: grower.email || '',
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    const { error } = await supabase.from('businesses').update({
      name: editForm.name,
      grower_code: editForm.grower_code || null,
      region: editForm.region || null,
      state: editForm.state || null,
      phone: editForm.phone || null,
      email: editForm.email || null,
    }).eq('id', editingId);

    // Sync profile
    const grower = growers.find(g => g.id === editingId);
    if (grower) {
      await supabase.from('profiles').update({
        company_name: editForm.name || '',
        grower_code: editForm.grower_code || null,
        phone: editForm.phone || null,
      }).eq('user_id', grower.owner_id);
    }

    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Grower updated' });
      setEditingId(null);
      fetchGrowers();
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !business) {
      toast({ title: 'Business name required', variant: 'destructive' });
      return;
    }
    setCreating(true);

    // Create a business record (no owner_id for manually created growers — use admin's ID as placeholder)
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { setCreating(false); return; }

    // Create intake link directly (no account needed)
    const { data: linkData, error: linkError } = await supabase
      .from('supplier_intake_links')
      .insert({
        intake_token: business.public_intake_token || '',
        grower_name: newName.trim(),
        grower_code: newCode.trim() || null,
        grower_email: newEmail.trim() || null,
        grower_phone: newPhone.trim() || null,
        created_by: user.id,
      })
      .select('short_code')
      .single();

    setCreating(false);

    if (linkError) {
      toast({ title: 'Failed', description: linkError.message, variant: 'destructive' });
      return;
    }

    const url = `${window.location.origin}/s/${linkData.short_code}`;
    setGeneratedUrl(url);
    setLinkGrowerId('new');
    await navigator.clipboard.writeText(url);
    setCopied('link');
    toast({ title: 'Grower link created & copied!' });
    setTimeout(() => setCopied(null), 3000);

    setCreateOpen(false);
    resetCreateForm();
    fetchGrowers();
  };

  const resetCreateForm = () => {
    setNewName(''); setNewCode(''); setNewRegion('');
    setNewState(''); setNewPhone(''); setNewEmail('');
  };

  const generateLink = async (grower: Grower) => {
    if (!business?.public_intake_token) return;
    setGenerating(true);
    setLinkGrowerId(grower.id);
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase
      .from('supplier_intake_links')
      .insert({
        intake_token: business.public_intake_token,
        grower_name: grower.name,
        grower_code: grower.grower_code || null,
        grower_email: grower.email || null,
        grower_phone: grower.phone || null,
        created_by: user?.id,
      })
      .select('short_code')
      .single();

    setGenerating(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    const url = `${window.location.origin}/s/${data.short_code}`;
    setGeneratedUrl(url);
    await navigator.clipboard.writeText(url);
    setCopied('link');
    toast({ title: 'Link copied!' });
    setTimeout(() => setCopied(null), 3000);
    fetchGrowers();
  };

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: 'Copied!' });
    setTimeout(() => setCopied(null), 2000);
  };

  const linkGrowerName = linkGrowerId === 'new' ? newName : growers.find(g => g.id === linkGrowerId)?.name || '';
  const firstName = linkGrowerName.split(' ')[0] || linkGrowerName;
  const whatsappMsg = `Hi ${firstName}, you've been set up on Pack to Produce. Next time you're sending us produce, just tap this link to let us know what's coming — takes about a minute: ${generatedUrl}`;
  const smsMsg = `Hi ${firstName}, tap here to send your next delivery: ${generatedUrl}`;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-display tracking-tight">Growers</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{growers.length} registered grower{growers.length !== 1 ? 's' : ''}</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="font-display tracking-wide">
                <Plus className="h-4 w-4 mr-1" /> Add Grower
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Add New Grower</DialogTitle>
                <DialogDescription>Create a grower profile and generate their submission link.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Business Name *</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Valley Fresh Farms" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Grower Code</Label>
                    <Input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="e.g. VFF-042" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Region</Label>
                    <Input value={newRegion} onChange={e => setNewRegion(e.target.value)} placeholder="e.g. Riverina" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="04xx xxx xxx" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="grower@email.com" />
                  </div>
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full mt-2 font-display" disabled={creating}>
                {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : <><Link2 className="h-4 w-4 mr-2" /> Create & Generate Link</>}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search growers by name, code, or region..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {/* Generated link panel */}
        {generatedUrl && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm tracking-tight">Link for {linkGrowerName}</h3>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { setGeneratedUrl(''); setLinkGrowerId(null); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="p-2.5 rounded-md bg-background border border-border">
              <p className="text-xs font-mono text-primary break-all">{generatedUrl}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={() => copyText(generatedUrl, 'link')}>
                {copied === 'link' ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1 text-primary" /> Copied</> : <><Copy className="h-3.5 w-3.5 mr-1" /> Copy Link</>}
              </Button>
              <Button variant="outline" size="sm" onClick={() => copyText(whatsappMsg, 'whatsapp')}>
                {copied === 'whatsapp' ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1 text-primary" /> Copied</> : <><MessageSquare className="h-3.5 w-3.5 mr-1" /> WhatsApp</>}
              </Button>
              <Button variant="outline" size="sm" onClick={() => copyText(smsMsg, 'sms')}>
                {copied === 'sms' ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1 text-primary" /> Copied</> : <><Smartphone className="h-3.5 w-3.5 mr-1" /> SMS</>}
              </Button>
            </div>
          </div>
        )}

        {/* Grower list */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading growers...</div>
        ) : filtered.length === 0 ? (
          growers.length === 0 ? <NoGrowersEmpty /> : <NoSearchResultsEmpty />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {filtered.map(grower => {
              const isEditing = editingId === grower.id;
              const isExpanded = expandedId === grower.id;
              const links = intakeLinks[grower.id] || [];

              return (
                <div key={grower.id}>
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Sprout className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{grower.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {grower.grower_code || 'No code'} · {grower.region || 'No region'} · {grower.state || ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setExpandedId(isExpanded ? null : grower.id)}>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => startEdit(grower)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 font-display text-xs"
                        onClick={() => generateLink(grower)}
                        disabled={generating && linkGrowerId === grower.id}
                      >
                        {generating && linkGrowerId === grower.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <><Link2 className="h-3.5 w-3.5 mr-1" /> Send Link</>
                        }
                      </Button>
                    </div>
                  </div>

                  {/* Expanded details / edit */}
                  {isExpanded && !isEditing && (
                    <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-muted/20 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div><span className="text-xs text-muted-foreground block">Phone</span>{grower.phone || '—'}</div>
                        <div><span className="text-xs text-muted-foreground block">Email</span>{grower.email || '—'}</div>
                        <div><span className="text-xs text-muted-foreground block">Intake Links</span>{links.length} created</div>
                      </div>
                      <GrowerScorecard
                        growerId={grower.id}
                        growerName={grower.name}
                        growerCode={grower.grower_code}
                      />
                    </div>
                  )}

                  {/* Edit form */}
                  {isEditing && (
                    <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-muted/20 space-y-3">
                      <h4 className="font-display text-xs uppercase tracking-widest text-muted-foreground">Edit Grower</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs">Business Name</Label>
                          <Input value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Grower Code</Label>
                          <Input value={editForm.grower_code || ''} onChange={e => setEditForm(p => ({ ...p, grower_code: e.target.value }))} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Region</Label>
                          <Input value={editForm.region || ''} onChange={e => setEditForm(p => ({ ...p, region: e.target.value }))} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">State</Label>
                          <Input value={editForm.state || ''} onChange={e => setEditForm(p => ({ ...p, state: e.target.value }))} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Phone</Label>
                          <Input value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} className="h-8 text-sm" />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs">Email</Label>
                          <Input value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} className="h-8 text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-8 font-display text-xs" disabled={saving} onClick={handleSave}>
                          {saving ? 'Saving...' : <><Save className="h-3.5 w-3.5 mr-1" /> Save</>}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
