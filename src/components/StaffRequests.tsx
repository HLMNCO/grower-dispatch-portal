import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Check, X, Sprout, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface StaffRequest {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  status: string;
  requested_role: string;
  created_at: string;
}

interface GrowerDetails {
  businessId: string;
  name: string;
  grower_code: string;
  region: string;
  state: string;
  phone: string;
}

export default function StaffRequests() {
  const { business, user } = useAuth();
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [growerDetails, setGrowerDetails] = useState<Record<string, GrowerDetails>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('staff_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (data) {
      setRequests(data as StaffRequest[]);
      // Fetch business details for supplier requests
      const supplierUserIds = (data as StaffRequest[])
        .filter(r => r.requested_role === 'supplier')
        .map(r => r.user_id);
      if (supplierUserIds.length > 0) {
        const { data: businesses } = await supabase
          .from('businesses')
          .select('id, owner_id, name, grower_code, region, state, phone')
          .in('owner_id', supplierUserIds);
        if (businesses) {
          const map: Record<string, GrowerDetails> = {};
          for (const b of businesses) {
            const req = (data as StaffRequest[]).find(r => r.user_id === b.owner_id);
            if (req) {
              map[req.id] = {
                businessId: b.id,
                name: b.name || '',
                grower_code: b.grower_code || '',
                region: b.region || '',
                state: b.state || '',
                phone: b.phone || '',
              };
            }
          }
          setGrowerDetails(map);
        }
      }
    }
    setLoading(false);
  };

  const updateGrowerField = (reqId: string, field: keyof GrowerDetails, value: string) => {
    setGrowerDetails(prev => ({
      ...prev,
      [reqId]: { ...prev[reqId], [field]: value },
    }));
  };

  const handleSaveDetails = async (reqId: string) => {
    const details = growerDetails[reqId];
    if (!details) return;
    setSavingId(reqId);

    const { error } = await supabase.from('businesses').update({
      name: details.name,
      grower_code: details.grower_code || null,
      region: details.region || null,
      state: details.state || null,
      phone: details.phone || null,
    }).eq('id', details.businessId);

    // Also sync profile
    const req = requests.find(r => r.id === reqId);
    if (req) {
      await supabase.from('profiles').update({
        company_name: details.name,
        grower_code: details.grower_code || null,
        phone: details.phone || null,
      }).eq('user_id', req.user_id);
    }

    setSavingId(null);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Details saved' });
    }
  };

  const handleApprove = async (request: StaffRequest) => {
    if (!business || !user) return;

    const role = request.requested_role === 'supplier' ? 'supplier' : 'staff';
    const { error: roleError } = await supabase.from('user_roles').insert({
      user_id: request.user_id,
      role: role,
    });

    if (roleError) {
      toast({ title: 'Failed to assign role', description: roleError.message, variant: 'destructive' });
      return;
    }

    await supabase.from('staff_requests').update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', request.id);

    if (role === 'staff') {
      await supabase.from('profiles').update({
        business_id: business.id,
        company_name: business.name,
        display_name: request.display_name,
      }).eq('user_id', request.user_id);
    }

    toast({ title: `${request.display_name} approved as ${role}` });
    setRequests(prev => prev.filter(r => r.id !== request.id));
  };

  const handleReject = async (request: StaffRequest) => {
    if (!user) return;

    await supabase.from('staff_requests').update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', request.id);

    toast({ title: `${request.display_name} rejected` });
    setRequests(prev => prev.filter(r => r.id !== request.id));
  };

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-amber-200/50">
        <UserPlus className="h-4 w-4 text-amber-600 shrink-0" />
        <h3 className="font-display text-sm tracking-tight">
          Access Requests · {requests.length}
        </h3>
      </div>
      <div className="divide-y divide-border">
        {requests.map(req => {
          const isSupplier = req.requested_role === 'supplier';
          const isExpanded = expandedId === req.id;
          const details = growerDetails[req.id];

          return (
            <div key={req.id}>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 flex items-center gap-2.5">
                  <div className="shrink-0">
                    {isSupplier ? (
                      <Sprout className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Package className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{req.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {isSupplier ? 'Grower' : 'Staff'} · {req.email} · {format(new Date(req.created_at), 'dd MMM')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isSupplier && details && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-muted-foreground"
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-8 px-2 text-destructive hover:bg-destructive/10" onClick={() => handleReject(req)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" className="h-8 px-3 font-display" onClick={() => handleApprove(req)}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                </div>
              </div>

              {/* Expandable grower details editor */}
              {isSupplier && isExpanded && details && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/50 bg-muted/20">
                  <h4 className="font-display text-xs uppercase tracking-widest text-muted-foreground">Edit Grower Details</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs">Business Name</Label>
                      <Input
                        value={details.name}
                        onChange={e => updateGrowerField(req.id, 'name', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Grower Code</Label>
                      <Input
                        value={details.grower_code}
                        onChange={e => updateGrowerField(req.id, 'grower_code', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="e.g. VFF-042"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Region</Label>
                      <Input
                        value={details.region}
                        onChange={e => updateGrowerField(req.id, 'region', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="e.g. Riverina"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">State</Label>
                      <Input
                        value={details.state}
                        onChange={e => updateGrowerField(req.id, 'state', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="e.g. NSW"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Phone</Label>
                      <Input
                        value={details.phone}
                        onChange={e => updateGrowerField(req.id, 'phone', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 font-display text-xs"
                    disabled={savingId === req.id}
                    onClick={() => handleSaveDetails(req.id)}
                  >
                    {savingId === req.id ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
