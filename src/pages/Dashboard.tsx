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
import StaffRequests from '@/components/StaffRequests';
import { DashboardSkeleton } from '@/components/Skeletons';

interface DispatchRow {
  id: string;
  display_id: string;
  grower_name: string;
  grower_code: string | null;
  transporter_con_note_number: string;
  delivery_advice_number: string | null;
  internal_lot_number: string | null;
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
  { label: 'Inbound', icon: Truck, filterStatus: 'pending' },
  { label: 'Awaiting Entry', icon: FileText, filterStatus: 'received-pending-admin' },
  { label: 'Issues', icon: AlertTriangle, filterStatus: 'issue' },
  { label: 'Completed', icon: CheckCircle2, filterStatus: 'received' },
];

/** Derive display status: arrived without lot # → received-pending-admin */
function getDisplayStatus(d: DispatchRow) {
  if (d.status === 'arrived' && !d.internal_lot_number) return 'received-pending-admin';
  return d.status;
}

function TomorrowSummary({ dispatches }: { dispatches: DispatchRow[] }) {
  const tomorrow = addDays(new Date(), 1);
  const tomorrowArrivals = dispatches.filter(
    d => d.expected_arrival && isSameDay(new Date(d.expected_arrival), tomorrow) && d.status !== 'received'
  );

  if (tomorrowArrivals.length === 0) return null;

  const totalPallets = tomorrowArrivals.reduce((sum, d) => sum + d.total_pallets, 0);

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 overflow-hidden">
      <div className="px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2 border-b border-primary/20">
        <Bell className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-display tracking-tight text-xs sm:text-sm">Tomorrow — {format(tomorrow, 'EEE, d MMM')}</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {tomorrowArrivals.length} dispatch{tomorrowArrivals.length !== 1 ? 'es' : ''} · {totalPallets} plt
          </p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {tomorrowArrivals.map(d => (
          <div key={d.id} className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm">
            <span className="font-medium text-foreground truncate min-w-0 flex-1">{d.grower_name}</span>
            <span className="text-muted-foreground tabular-nums whitespace-nowrap shrink-0">{d.total_pallets} plt</span>
          </div>
        ))}
      </div>
    </div>
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
            <StatusBadge status={getDisplayStatus(dispatch)} />
          </div>
          <p className="font-medium text-sm truncate">{dispatch.grower_name}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{format(new Date(dispatch.dispatch_date), 'dd MMM')}</span>
            {dispatch.expected_arrival && (
              <span>ETA {format(new Date(dispatch.expected_arrival), 'dd MMM')}</span>
            )}
            <span>{dispatch.total_pallets} plt</span>
            {!dispatch.internal_lot_number && ['received-pending-admin', 'arrived', 'received'].includes(dispatch.status) && (
              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />No lot #
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      </div>
    </button>
  );
}


interface BulkLotEntryProps {
  dispatches: DispatchRow[];
  onSaved: () => void;
}

function BulkLotEntry({ dispatches, onSaved }: BulkLotEntryProps) {
  const [lots, setLots] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSaveAll = async () => {
    const entries = Object.entries(lots).filter(([, v]) => v.trim());
    if (entries.length === 0) return;
    setSaving(true);
    await Promise.all(
      entries.map(([id, lot]) =>
        supabase.from('dispatches').update({ internal_lot_number: lot.trim(), status: 'received' } as any).eq('id', id)
      )
    );
    setSaving(false);
    setLots({});
    onSaved();
    toast({ title: `${entries.length} lot number${entries.length !== 1 ? 's' : ''} saved` });
  };

  const filledCount = Object.values(lots).filter(v => v.trim()).length;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-500/20 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-sm tracking-tight">Bulk Lot Entry</h3>
          <p className="text-xs text-muted-foreground">{dispatches.length} dispatches awaiting lot numbers</p>
        </div>
        {filledCount > 0 && (
          <Button size="sm" onClick={handleSaveAll} disabled={saving} className="font-display shrink-0">
            {saving ? 'Saving...' : `Save ${filledCount} Lot${filledCount !== 1 ? 's' : ''}`}
          </Button>
        )}
      </div>
      <div className="divide-y divide-amber-500/10">
        {dispatches.slice(0, 10).map(d => (
          <div key={d.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{d.grower_name}</p>
              <p className="text-xs text-muted-foreground">{d.display_id}</p>
            </div>
            <Input
              className="w-40 h-8 text-sm font-display"
              placeholder="LOT-XXXXXX"
              value={lots[d.id] || ''}
              onChange={e => setLots(prev => ({ ...prev, [d.id]: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveAll();
              }}
            />
          </div>
        ))}
        {dispatches.length > 10 && (
          <p className="px-4 py-2 text-xs text-muted-foreground">
            Showing first 10 — clear filter to see all
          </p>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dispatches, setDispatches] = useState<DispatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dispatches');
  const { role, business, signOut, isAdmin, canPlan } = useAuth();
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
      (d.internal_lot_number || '').toLowerCase().includes(search.toLowerCase()) ||
      d.display_id.toLowerCase().includes(search.toLowerCase());
    const displayStatus = getDisplayStatus(d);
    const matchesStatus = statusFilter === 'all' || displayStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = dispatches.reduce((acc, d) => {
    const ds = getDisplayStatus(d);
    acc[ds] = (acc[ds] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header — responsive: stacks actions on mobile */}
      {/* Header — hidden on mobile (AppLayout handles it), visible on desktop */}
      <header className="hidden lg:block border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-display font-bold tracking-tight leading-tight">Pack to Produce</h1>
                <p className="text-xs text-muted-foreground">{business?.name || 'Loading...'}</p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
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
                      <ClipboardCheck className="h-4 w-4 mr-1" /> Receive
                    </Button>
                  </Link>
                  {canPlan && (
                    <Link to="/planning">
                      <Button size="sm" variant="outline" className="font-display tracking-wide">
                        <BarChart3 className="h-4 w-4 mr-1" /> Planning
                      </Button>
                    </Link>
                  )}
                </>
              )}
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
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
            {isReceiver && isAdmin && <StaffRequests />}

            {/* Stat Cards — 3+2 layout on mobile, 5 on desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {statCards.map(card => {
                const count = counts[card.filterStatus] || 0;
                const isActive = statusFilter === card.filterStatus;
                return (
                  <button key={card.filterStatus} onClick={() => setStatusFilter(isActive ? 'all' : card.filterStatus)}
                    className={`flex items-center gap-2 p-2.5 sm:p-4 rounded-lg border text-left transition-all sm:block overflow-hidden ${isActive ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:border-primary/30'}`}>
                    <card.icon className={`h-4 w-4 shrink-0 sm:mb-2 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-lg sm:text-2xl font-display leading-none shrink-0">{count}</p>
                    <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wide leading-tight truncate min-w-0">{card.label}</p>
                  </button>
                );
              })}
            </div>

            {/* Bulk Lot Entry — shown when "Awaiting Entry" filter is active */}
            {statusFilter === 'received-pending-admin' && filtered.length > 0 && (
              <BulkLotEntry dispatches={filtered} onSaved={fetchDispatches} />
            )}

            {/* Search */}
            <div className="flex gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by grower, lot number, or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
              {statusFilter !== 'all' && (
                <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
                  <Filter className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>

            {/* Content: Cards on mobile, Table on desktop */}
            {loading ? (
              <DashboardSkeleton />
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
                          <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Lot #</th>
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
                            <td className="p-3 font-display text-xs">
                              {dispatch.internal_lot_number || (
                                ['received-pending-admin', 'arrived', 'received'].includes(dispatch.status) 
                                  ? <span className="inline-flex items-center gap-1 text-amber-600"><span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />No lot #</span>
                                  : <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground">{format(new Date(dispatch.dispatch_date), 'dd MMM')}</td>
                            <td className="p-3 text-muted-foreground">{dispatch.expected_arrival ? format(new Date(dispatch.expected_arrival), 'dd MMM') : '-'}</td>
                            <td className="p-3">{dispatch.total_pallets}</td>
                            <td className="p-3"><StatusBadge status={getDisplayStatus(dispatch)} /></td>
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
