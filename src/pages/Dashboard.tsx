import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Package, Truck, AlertTriangle, CheckCircle2, Clock, ArrowRight, Search, Filter, LogOut, Users, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ConnectionsPage from './ConnectionsPage';

interface DispatchRow {
  id: string;
  display_id: string;
  grower_name: string;
  grower_code: string | null;
  con_note_number: string;
  carrier: string | null;
  dispatch_date: string;
  expected_arrival: string | null;
  total_pallets: number;
  status: string;
  notes: string | null;
  created_at: string;
  receiver_business_id: string | null;
  supplier_business_id: string | null;
}

const statCards = [
  { label: 'Pending', icon: Clock, filterStatus: 'pending' },
  { label: 'In Transit', icon: Truck, filterStatus: 'in-transit' },
  { label: 'Arrived', icon: Package, filterStatus: 'arrived' },
  { label: 'Issues', icon: AlertTriangle, filterStatus: 'issue' },
  { label: 'Received', icon: CheckCircle2, filterStatus: 'received' },
];

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dispatches, setDispatches] = useState<DispatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dispatches');
  const { role, business, signOut } = useAuth();
  const navigate = useNavigate();

  const isSupplier = role === 'supplier' || business?.business_type === 'supplier';

  useEffect(() => {
    if (business) fetchDispatches();
  }, [business]);

  const fetchDispatches = async () => {
    if (!business) { setLoading(false); return; }

    let query = supabase.from('dispatches').select('*').order('created_at', { ascending: false });

    // Filter by business
    if (business.business_type === 'receiver') {
      query = query.eq('receiver_business_id', business.id);
    } else {
      query = query.eq('supplier_business_id', business.id);
    }

    const { data, error } = await query;
    if (!error && data) setDispatches(data as DispatchRow[]);
    setLoading(false);
  };

  const filtered = dispatches.filter(d => {
    const matchesSearch = !search ||
      d.grower_name.toLowerCase().includes(search.toLowerCase()) ||
      d.con_note_number.toLowerCase().includes(search.toLowerCase()) ||
      d.display_id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = dispatches.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-display tracking-tight">FRESHDOCK</h1>
              <p className="text-xs text-muted-foreground">{business?.name || 'Loading...'}</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {isSupplier && (
              <Link to="/dispatch">
                <Button size="sm" className="font-display tracking-wide">
                  <Plus className="h-4 w-4 mr-1" /> New Dispatch
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dispatches">
              <Package className="h-4 w-4 mr-1.5" /> Dispatches
            </TabsTrigger>
            <TabsTrigger value="connections">
              <Users className="h-4 w-4 mr-1.5" /> Connections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dispatches" className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {statCards.map(card => {
                const count = counts[card.filterStatus] || 0;
                const isActive = statusFilter === card.filterStatus;
                return (
                  <button key={card.filterStatus} onClick={() => setStatusFilter(isActive ? 'all' : card.filterStatus)}
                    className={`p-4 rounded-lg border text-left transition-all ${isActive ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:border-primary/30'}`}>
                    <card.icon className={`h-4 w-4 mb-2 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-2xl font-display">{count}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by grower, con note, or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
              {statusFilter !== 'all' && (
                <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
                  <Filter className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading dispatches...</div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">ID</th>
                        <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Grower</th>
                        <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Con Note</th>
                        <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Dispatch</th>
                        <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">ETA</th>
                        <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Pallets</th>
                        <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Status</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(dispatch => (
                        <tr key={dispatch.id} className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => navigate(`/receive/${dispatch.id}`)}>
                          <td className="p-3 font-display text-xs">{dispatch.display_id}</td>
                          <td className="p-3">
                            <div className="font-medium">{dispatch.grower_name}</div>
                            <div className="text-xs text-muted-foreground">{dispatch.grower_code || '-'}</div>
                          </td>
                          <td className="p-3 font-display text-xs">{dispatch.con_note_number}</td>
                          <td className="p-3 text-muted-foreground">{format(new Date(dispatch.dispatch_date), 'dd MMM')}</td>
                          <td className="p-3 text-muted-foreground">{dispatch.expected_arrival ? format(new Date(dispatch.expected_arrival), 'dd MMM') : '-'}</td>
                          <td className="p-3">{dispatch.total_pallets}</td>
                          <td className="p-3"><StatusBadge status={dispatch.status as any} /></td>
                          <td className="p-3"><ArrowRight className="h-4 w-4 text-muted-foreground" /></td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            {dispatches.length === 0
                              ? (isSupplier ? 'No dispatches yet. Create your first dispatch!' : 'No incoming dispatches yet. Suppliers will appear here once connected.')
                              : 'No dispatches match your search.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="connections">
            <ConnectionsPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
