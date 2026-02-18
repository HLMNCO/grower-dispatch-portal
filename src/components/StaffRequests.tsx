import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Check, X } from 'lucide-react';
import { format } from 'date-fns';

interface StaffRequest {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  status: string;
  created_at: string;
}

export default function StaffRequests() {
  const { business, user } = useAuth();
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('staff_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (data) setRequests(data as StaffRequest[]);
    setLoading(false);
  };

  const handleApprove = async (request: StaffRequest) => {
    if (!business || !user) return;

    // Update the request status
    await supabase.from('staff_requests').update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', request.id);

    // Link the user's profile to this business
    await supabase.from('profiles').update({
      business_id: business.id,
      company_name: business.name,
      display_name: request.display_name,
    }).eq('user_id', request.user_id);

    toast({ title: `${request.display_name} approved` });
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
          Staff Access Requests · {requests.length}
        </h3>
      </div>
      <div className="divide-y divide-border">
        {requests.map(req => (
          <div key={req.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{req.display_name}</p>
              <p className="text-xs text-muted-foreground truncate">{req.email} · {format(new Date(req.created_at), 'dd MMM')}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button size="sm" variant="outline" className="h-8 px-2 text-destructive hover:bg-destructive/10" onClick={() => handleReject(req)}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" className="h-8 px-3 font-display" onClick={() => handleApprove(req)}>
                <Check className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
