import { useState, useEffect } from 'react';
import { Search, UserPlus, Check, X, Building2, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface BusinessRow {
  id: string;
  name: string;
  business_type: string;
  city: string | null;
  state: string | null;
  region: string | null;
}

interface ConnectionRow {
  id: string;
  supplier_business_id: string;
  receiver_business_id: string;
  status: string;
  requested_at: string;
}

export default function ConnectionsPage() {
  const { business, role } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<BusinessRow[]>([]);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [connectedBusinesses, setConnectedBusinesses] = useState<BusinessRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSupplier = role === 'supplier' || business?.business_type === 'supplier';
  const isReceiver = role === 'staff' || business?.business_type === 'receiver';

  useEffect(() => {
    if (business) fetchConnections();
  }, [business]);

  const fetchConnections = async () => {
    if (!business) return;
    
    const field = isSupplier ? 'supplier_business_id' : 'receiver_business_id';
    const { data: conns } = await supabase
      .from('connections')
      .select('*')
      .eq(field, business.id);

    if (conns) {
      setConnections(conns as ConnectionRow[]);

      // Fetch the connected businesses
      const otherField = isSupplier ? 'receiver_business_id' : 'supplier_business_id';
      const ids = conns.map(c => (c as any)[otherField]);
      if (ids.length > 0) {
        const { data: bizData } = await supabase
          .from('businesses')
          .select('id, name, business_type, city, state, region')
          .in('id', ids);
        if (bizData) setConnectedBusinesses(bizData as BusinessRow[]);
      }
    }
    setLoading(false);
  };

  const searchReceivers = async () => {
    if (!search.trim()) return;
    setSearching(true);
    const targetType = isSupplier ? 'receiver' : 'supplier';
    const { data } = await supabase
      .from('businesses')
      .select('id, name, business_type, city, state, region')
      .eq('business_type', targetType)
      .ilike('name', `%${search}%`)
      .limit(10);
    
    if (data) setResults(data as BusinessRow[]);
    setSearching(false);
  };

  const requestConnection = async (targetId: string) => {
    if (!business) return;

    const payload = isSupplier
      ? { supplier_business_id: business.id, receiver_business_id: targetId }
      : { supplier_business_id: targetId, receiver_business_id: business.id };

    const { error } = await supabase.from('connections').insert(payload);
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already connected', description: 'A connection already exists.' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
      return;
    }
    toast({ title: 'Connection requested', description: 'They will need to approve your request.' });
    fetchConnections();
    setResults([]);
    setSearch('');
  };

  const updateConnection = async (connId: string, status: 'approved' | 'rejected') => {
    await supabase.from('connections').update({ status, responded_at: new Date().toISOString() }).eq('id', connId);
    toast({ title: status === 'approved' ? 'Connection approved!' : 'Connection rejected' });
    fetchConnections();
  };

  const getConnectionStatus = (bizId: string) => {
    const field = isSupplier ? 'receiver_business_id' : 'supplier_business_id';
    return connections.find(c => (c as any)[field] === bizId);
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading connections...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="space-y-3">
        <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
          Find {isSupplier ? 'Receivers / Agents' : 'Suppliers / Growers'}
        </h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${isSupplier ? 'receivers' : 'suppliers'} by name...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchReceivers()}
              className="pl-10"
            />
          </div>
          <Button onClick={searchReceivers} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map(biz => {
              const existing = getConnectionStatus(biz.id);
              return (
                <div key={biz.id} className="p-4 rounded-lg border border-border bg-card flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-medium">{biz.name}</span>
                    </div>
                    {(biz.city || biz.state) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        {[biz.city, biz.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                  {existing ? (
                    <span className={`text-xs font-display uppercase tracking-wider px-2 py-1 rounded-full ${
                      existing.status === 'approved' ? 'bg-success/15 text-success' :
                      existing.status === 'pending' ? 'bg-muted text-muted-foreground' :
                      'bg-destructive/15 text-destructive'
                    }`}>{existing.status}</span>
                  ) : (
                    <Button size="sm" onClick={() => requestConnection(biz.id)}>
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Connect
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending requests (receiver view) */}
      {isReceiver && connections.filter(c => c.status === 'pending').length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
            Pending Requests
          </h2>
          <div className="space-y-2">
            {connections.filter(c => c.status === 'pending').map(conn => {
              const biz = connectedBusinesses.find(b => b.id === conn.supplier_business_id);
              return (
                <div key={conn.id} className="p-4 rounded-lg border border-accent/30 bg-accent/5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-accent" />
                      <span className="font-medium">{biz?.name || 'Unknown'}</span>
                    </div>
                    {biz && (biz.city || biz.state) && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {[biz.city, biz.state, biz.region].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateConnection(conn.id, 'approved')}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => updateConnection(conn.id, 'rejected')}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connected */}
      <div className="space-y-3">
        <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
          Connected {isSupplier ? 'Receivers' : 'Suppliers'} ({connections.filter(c => c.status === 'approved').length})
        </h2>
        {connections.filter(c => c.status === 'approved').length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground border border-dashed border-border rounded-lg text-center">
            No connections yet. Search above to find and connect with {isSupplier ? 'receivers' : 'suppliers'}.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {connections.filter(c => c.status === 'approved').map(conn => {
              const otherId = isSupplier ? conn.receiver_business_id : conn.supplier_business_id;
              const biz = connectedBusinesses.find(b => b.id === otherId);
              return (
                <div key={conn.id} className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-success" />
                    <span className="font-medium">{biz?.name || 'Unknown'}</span>
                  </div>
                  {biz && (biz.city || biz.state) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      {[biz.city, biz.state].filter(Boolean).join(', ')}
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
