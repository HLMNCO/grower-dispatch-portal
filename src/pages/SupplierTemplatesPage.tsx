import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, FileText, Plus, Pencil, Copy, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface TemplateRow {
  id: string;
  template_name: string;
  receiver_business_id: string | null;
  template_data: any;
  created_at: string;
  last_used_at: string | null;
}

export default function SupplierTemplatesPage() {
  const { business } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [receivers, setReceivers] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (business) { fetchTemplates(); fetchReceivers(); }
  }, [business]);

  const fetchTemplates = async () => {
    if (!business) return;
    const { data } = await supabase
      .from('dispatch_templates')
      .select('*')
      .eq('business_id', business.id)
      .order('last_used_at', { ascending: false, nullsFirst: false });
    if (data) setTemplates(data as TemplateRow[]);
    setLoading(false);
  };

  const fetchReceivers = async () => {
    const { data } = await supabase.from('businesses').select('id, name').eq('business_type', 'receiver');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(b => { map[b.id] = b.name; });
      setReceivers(map);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('dispatch_templates').delete().eq('id', id);
    toast({ title: 'Template deleted' });
    fetchTemplates();
  };

  const handleDuplicate = async (tmpl: TemplateRow) => {
    await supabase.from('dispatch_templates').insert({
      business_id: business!.id,
      template_name: `${tmpl.template_name} (copy)`,
      receiver_business_id: tmpl.receiver_business_id,
      template_data: tmpl.template_data,
    });
    toast({ title: 'Template duplicated' });
    fetchTemplates();
  };

  const handleRename = async () => {
    if (!editingId || !editName.trim()) return;
    await supabase.from('dispatch_templates').update({ template_name: editName.trim() }).eq('id', editingId);
    toast({ title: 'Template renamed' });
    setEditingId(null);
    setEditName('');
    fetchTemplates();
  };

  const getProductSummary = (tmpl: TemplateRow) => {
    const d = tmpl.template_data as any;
    if (!d?.items) return '-';
    return d.items.filter((i: any) => i.product).map((i: any) => i.product).join(', ') || '-';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-display tracking-tight">Delivery Advice Templates</h1>
            </div>
          </div>
          <Link to="/dispatch/new">
            <Button size="sm" className="font-display">
              <Plus className="h-4 w-4 mr-1" /> New Delivery Advice
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="font-display text-lg">No templates yet</h3>
            <p className="text-sm text-muted-foreground">When creating a delivery advice, use "Save as Template" to reuse your common dispatch configurations.</p>
            <Link to="/dispatch/new">
              <Button className="mt-4 font-display">Create First Delivery Advice</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(tmpl => (
              <div key={tmpl.id} className="p-4 rounded-lg border border-border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold">{tmpl.template_name}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingId(tmpl.id); setEditName(tmpl.template_name); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDuplicate(tmpl)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(tmpl.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {tmpl.receiver_business_id && receivers[tmpl.receiver_business_id] && (
                    <span>To: {receivers[tmpl.receiver_business_id]}</span>
                  )}
                  <span>Products: {getProductSummary(tmpl)}</span>
                  {tmpl.last_used_at && <span>Last used: {format(new Date(tmpl.last_used_at), 'dd MMM yyyy')}</span>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-display mt-2"
                  onClick={() => navigate(`/dispatch/new?template=${tmpl.id}`)}
                >
                  <ArrowRight className="h-3.5 w-3.5 mr-1" /> Use Template
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Name Dialog */}
      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Rename Template</DialogTitle>
          </DialogHeader>
          <Input value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
