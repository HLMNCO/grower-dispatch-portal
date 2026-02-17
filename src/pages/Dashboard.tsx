import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Package, Truck, AlertTriangle, CheckCircle2, Clock, ArrowRight, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { mockDispatches } from '@/data/mockDispatches';
import { Dispatch } from '@/types/dispatch';

const statCards = [
  { label: 'Pending', icon: Clock, filterStatus: 'pending' as const },
  { label: 'In Transit', icon: Truck, filterStatus: 'in-transit' as const },
  { label: 'Arrived', icon: Package, filterStatus: 'arrived' as const },
  { label: 'Issues', icon: AlertTriangle, filterStatus: 'issue' as const },
  { label: 'Received', icon: CheckCircle2, filterStatus: 'received' as const },
];

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Dispatch['status'] | 'all'>('all');
  const navigate = useNavigate();

  const filtered = mockDispatches.filter(d => {
    const matchesSearch = !search || 
      d.growerName.toLowerCase().includes(search.toLowerCase()) ||
      d.conNoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = mockDispatches.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-display tracking-tight">Dispatch Control</h1>
              <p className="text-xs text-muted-foreground">Inbound receiving & validation</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/dispatch">
              <Button variant="outline" size="sm">Supplier Form</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {statCards.map(card => {
            const count = counts[card.filterStatus] || 0;
            const isActive = statusFilter === card.filterStatus;
            return (
              <button
                key={card.filterStatus}
                onClick={() => setStatusFilter(isActive ? 'all' : card.filterStatus)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  isActive
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
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
            <Input
              placeholder="Search by grower, con note, or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {statusFilter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
              <Filter className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Dispatch Table */}
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
                  <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Items</th>
                  <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Pallets</th>
                  <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(dispatch => (
                  <tr
                    key={dispatch.id}
                    className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/receive/${dispatch.id}`)}
                  >
                    <td className="p-3 font-display text-xs">{dispatch.id}</td>
                    <td className="p-3">
                      <div className="font-medium">{dispatch.growerName}</div>
                      <div className="text-xs text-muted-foreground">{dispatch.growerCode}</div>
                    </td>
                    <td className="p-3 font-display text-xs">{dispatch.conNoteNumber}</td>
                    <td className="p-3 text-muted-foreground">{format(new Date(dispatch.dispatchDate), 'dd MMM')}</td>
                    <td className="p-3 text-muted-foreground">{format(new Date(dispatch.expectedArrival), 'dd MMM')}</td>
                    <td className="p-3">{dispatch.items.length} lines</td>
                    <td className="p-3">{dispatch.totalPallets}</td>
                    <td className="p-3"><StatusBadge status={dispatch.status} /></td>
                    <td className="p-3">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">No dispatches found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
