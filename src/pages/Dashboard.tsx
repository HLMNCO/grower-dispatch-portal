import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, addDays, isSameDay } from 'date-fns';
import { Package, Truck, AlertTriangle, CheckCircle2, Clock, ArrowRight, Search, Filter, LogOut, Users, Plus, CalendarDays, Bell, BarChart3, FileText, ClipboardCheck, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import ConnectionsPage from './ConnectionsPage';
import ReceivingCalendar from '@/components/ReceivingCalendar';
import SupplierIntakeLinkDialog from '@/components/SupplierIntakeLinkDialog';

interface DispatchRow {
  id: string;
  display_id: string;
  grower_name: string;
  grower_code: string | null;
  transporter_con_note_number: string;
  delivery_advice_number: string | null;
  carrier: string | null;
  dispatch_date: string;
  expected_arrival: string | null;
  total_pallets: number;
  status: string;
  notes: string | null;
  created_at: string;
  receiver_business_id: string | null;
  supplier_business_id: string | null;
  truck_number: string | null;
}

const statCards = [
  { label: 'Pending', icon: Clock, filterStatus: 'pending' },
  { label: 'In Transit', icon: Truck, filterStatus: 'in-transit' },
  { label: 'Arrived', icon: Package, filterStatus: 'arrived' },
  { label: 'Issues', icon: AlertTriangle, filterStatus: 'issue' },
  { label: 'Received', icon: CheckCircle2, filterStatus: 'received' },
];

function TomorrowSummary({ dispatches }: { dispatches: DispatchRow[] }) {
  const tomorrow = addDays(new Date(), 1);
  const tomorrowArrivals = dispatches.filter(
    d => d.expected_arrival && isSameDay(new Date(d.expected_arrival), tomorrow) && d.status !== 'received'
  );

  if (tomorrowArrivals.length === 0) return null;

  const totalPallets = tomorrowArrivals.reduce((sum, d) => sum + d.total_pallets, 0);

  return (
    <Alert className="border-primary/30 bg-primary/5">
      <Bell className="h-4 w-4 text-primary" />
      <AlertTitle className="font-display tracking-tight">
        Tomorrow's Arrivals — {format(tomorrow, 'EEEE, d MMM')}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-1">
        <p className="text-sm font-medium">
          {tomorrowArrivals.length} dispatch{tomorrowArrivals.length !== 1 ? 'es' : ''} · {totalPallets} pallet{totalPallets !== 1 ? 's' : ''} expected
        </p>
        <div className="mt-2 grid gap-1.5">
          {tomorrowArrivals.map(d => (
            <div key={d.id} className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{d.grower_name}</span>
              <span>{d.total_pallets} plt</span>
              {d.carrier && <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{d.carrier}</span>}
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}

/** Mobile dispatch card — replaces table rows on small screens */
function DispatchCard({ dispatch, onClick }: { dispatch: DispatchRow; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">{dispatch.display_id}</span>
            <StatusBadge status={dispatch.status as any} />
          </div>
          <p className="font-medium text-sm truncate">{dispatch.grower_name}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{format(new Date(dispatch.dispatch_date), 'dd MMM')}</span>
            {dispatch.expected_arrival && (
              <span>ETA {format(new Date(dispatch.expected_arrival), 'dd MMM')}</span>
            )}
            <span>{dispatch.total_pallets} plt</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      </div>
    </button>
  );
}

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dispatches, setDispatches] = useState<DispatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dispatches');
  const { role, business, signOut } = useAuth();
  const navigate = useNavigate();

  const isSupplier = role === 'supplier' || business?.business_type === 'supplier';
  const isReceiver = role === 'staff' || business?.business_type === 'receiver';

  useEffect(() => {
    if (business) fetchDispatches();
  }, [business]);

  const fetchDispatches = async () => {
    if (!business) { setLoading(false); return; }

    let query = supabase.from('dispatches').select('*').order('created_at', { ascending: false });

    if (business.business_type === 'receiver') {
      query = query.eq('receiver_business_id', business.id);
    } else {
      query = query.eq('supplier_business_id', business.id);
    }

    const { data, error } = await query;
    if (!error && data) setDispatches(data as unknown as DispatchRow[]);
    setLoading(false);
  };

  const filtered = dispatches.filter(d => {
    const matchesSearch = !search ||
      d.grower_name.toLowerCase().includes(search.toLowerCase()) ||
      d.transporter_con_note_number.toLowerCase().includes(search.toLowerCase()) ||
      (d.delivery_advice_number || '').toLowerCase().includes(search.toLowerCase()) ||
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
      {/* Header — responsive: stacks actions on mobile */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-display tracking-tight leading-tight">FRESHDOCK</h1>
                <p className="text-xs text-muted-foreground truncate max-w-[140px] sm:max-w-none">{business?.name || 'Loading...'}</p>
              </div>
            </div>

            {/* Desktop actions */}
            <div className="hidden sm:flex gap-2 items-center">
              {isSupplier && (
                <>
                  <Link to="/dispatch/new">
                    <Button size="sm" className="font-display tracking-wide">
                      <Plus className="h-4 w-4 mr-1" /> New Delivery Advice
                    </Button>
                  </Link>
                  <Link to="/supplier/templates">
                    <Button size="sm" variant="outline" className="font-display tracking-wide">
                      <FileText className="h-4 w-4 mr-1" /> Templates
                    </Button>
                  </Link>
                </>
              )}
              {isReceiver && (
                <>
                  {business?.public_intake_token && (
                    <SupplierIntakeLinkDialog intakeToken={business.public_intake_token} />
                  )}
                  <Link to="/receiver/verify">
                    <Button size="sm" variant="outline" className="font-display tracking-wide">
                      <ClipboardCheck className="h-4 w-4 mr-1" /> Verify
                    </Button>
                  </Link>
                  <Link to="/planning">
                    <Button size="sm" variant="outline" className="font-display tracking-wide">
                      <BarChart3 className="h-4 w-4 mr-1" /> Planning
                    </Button>
                  </Link>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile: just logout */}
            <div className="flex sm:hidden items-center gap-1">
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile action bar — scrollable row */}
          <div className="flex sm:hidden gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {isSupplier && (
              <>
                <Link to="/dispatch/new" className="shrink-0">
                  <Button size="sm" className="font-display tracking-wide text-xs h-8">
                    <Plus className="h-3.5 w-3.5 mr-1" /> New
                  </Button>
                </Link>
                <Link to="/supplier/templates" className="shrink-0">
                  <Button size="sm" variant="outline" className="font-display tracking-wide text-xs h-8">
                    <FileText className="h-3.5 w-3.5 mr-1" /> Templates
                  </Button>
                </Link>
              </>
            )}
            {isReceiver && (
              <>
                {business?.public_intake_token && (
                  <div className="shrink-0">
                    <SupplierIntakeLinkDialog intakeToken={business.public_intake_token} />
                  </div>
                )}
                <Link to="/receiver/verify" className="shrink-0">
                  <Button size="sm" variant="outline" className="font-display tracking-wide text-xs h-8">
                    <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Verify
                  </Button>
                </Link>
                <Link to="/planning" className="shrink-0">
                  <Button size="sm" variant="outline" className="font-display tracking-wide text-xs h-8">
                    <BarChart3 className="h-3.5 w-3.5 mr-1" /> Planning
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="container py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 sm:mb-6 w-full sm:w-auto">
            <TabsTrigger value="dispatches" className="flex-1 sm:flex-initial">
              <Package className="h-4 w-4 mr-1.5" /> Dispatches
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 sm:flex-initial">
              <CalendarDays className="h-4 w-4 mr-1.5" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="connections" className="flex-1 sm:flex-initial">
              <Users className="h-4 w-4 mr-1.5" /> Connections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dispatches" className="space-y-4 sm:space-y-6">
            {/* Tomorrow's Arrivals Summary */}
            {isReceiver && <TomorrowSummary dispatches={dispatches} />}

            {/* Stat Cards — 3+2 layout on mobile, 5 on desktop */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
              {statCards.map(card => {
                const count = counts[card.filterStatus] || 0;
                const isActive = statusFilter === card.filterStatus;
                return (
                  <button key={card.filterStatus} onClick={() => setStatusFilter(isActive ? 'all' : card.filterStatus)}
                    className={`p-3 sm:p-4 rounded-lg border text-left transition-all ${isActive ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:border-primary/30'}`}>
                    <card.icon className={`h-4 w-4 mb-1.5 sm:mb-2 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-xl sm:text-2xl font-display">{count}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider leading-tight">{card.label}</p>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="flex gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by grower, DA number, or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
              {statusFilter !== 'all' && (
                <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
                  <Filter className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>

            {/* Content: Cards on mobile, Table on desktop */}
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading dispatches...</div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {filtered.map(dispatch => (
                    <DispatchCard
                      key={dispatch.id}
                      dispatch={dispatch}
                      onClick={() => navigate(`/receive/${dispatch.id}`)}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      {dispatches.length === 0
                        ? (isSupplier ? 'No dispatches yet. Create your first dispatch!' : 'No incoming dispatches yet.')
                        : 'No dispatches match your search.'}
                    </div>
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">ID</th>
                          <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Grower</th>
                          <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">DA Number</th>
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
                            <td className="p-3 font-display text-xs">{dispatch.delivery_advice_number || '-'}</td>
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
              </>
            )}
          </TabsContent>

          <TabsContent value="calendar">
            <ReceivingCalendar />
          </TabsContent>

          <TabsContent value="connections">
            <ConnectionsPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
