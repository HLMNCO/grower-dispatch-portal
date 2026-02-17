import { useState, useEffect, useMemo } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isBefore } from 'date-fns';
import { ChevronLeft, ChevronRight, Package, Truck, BarChart3, TrendingUp, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';

interface PlanningDispatch {
  id: string;
  display_id: string;
  grower_name: string;
  grower_code: string | null;
  expected_arrival: string | null;
  dispatch_date: string;
  total_pallets: number;
  status: string;
  carrier: string | null;
  con_note_number: string;
}

interface PlanningItem {
  dispatch_id: string;
  product: string;
  variety: string | null;
  size: string | null;
  tray_type: string | null;
  quantity: number;
  unit_weight: number | null;
  weight: number | null;
}

const DOCK_CAPACITY = 40; // pallets per day default

export default function InboundPlanning() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dispatches, setDispatches] = useState<PlanningDispatch[]>([]);
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(true);
  const { business } = useAuth();
  const navigate = useNavigate();

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart]);

  useEffect(() => {
    if (business) fetchData();
  }, [business, weekStart]);

  const fetchData = async () => {
    if (!business) return;
    setLoading(true);
    const start = format(weekStart, 'yyyy-MM-dd');
    const end = format(weekEnd, 'yyyy-MM-dd');

    const { data: dispData } = await supabase
      .from('dispatches')
      .select('id, display_id, grower_name, grower_code, expected_arrival, dispatch_date, total_pallets, status, carrier, con_note_number')
      .eq('receiver_business_id', business.id)
      .gte('expected_arrival', start)
      .lte('expected_arrival', end)
      .order('expected_arrival');

    if (dispData) {
      setDispatches(dispData as PlanningDispatch[]);
      // Fetch items for all dispatches
      const ids = dispData.map(d => d.id);
      if (ids.length > 0) {
        const { data: itemData } = await supabase
          .from('dispatch_items')
          .select('dispatch_id, product, variety, size, tray_type, quantity, unit_weight, weight')
          .in('dispatch_id', ids);
        if (itemData) setItems(itemData as PlanningItem[]);
      } else {
        setItems([]);
      }
    }
    setLoading(false);
  };

  const getDispatchesForDay = (day: Date) =>
    dispatches.filter(d => d.expected_arrival && isSameDay(new Date(d.expected_arrival), day));

  const getDayStats = (day: Date) => {
    const dayDisps = getDispatchesForDay(day);
    const pallets = dayDisps.reduce((s, d) => s + d.total_pallets, 0);
    const dayItemIds = new Set(dayDisps.map(d => d.id));
    const dayItems = items.filter(i => dayItemIds.has(i.dispatch_id));
    const totalUnits = dayItems.reduce((s, i) => s + i.quantity, 0);
    const growers = new Set(dayDisps.map(d => d.grower_name)).size;
    const issues = dayDisps.filter(d => d.status === 'issue').length;
    return { pallets, totalUnits, growers, dispatches: dayDisps.length, issues };
  };

  // Product breakdown for selected day
  const selectedDayDispatches = selectedDay ? getDispatchesForDay(selectedDay) : [];
  const selectedDayItemIds = new Set(selectedDayDispatches.map(d => d.id));
  const selectedDayItems = items.filter(i => selectedDayItemIds.has(i.dispatch_id));

  // Group items by product + size
  const productBreakdown = useMemo(() => {
    const map = new Map<string, { product: string; size: string; variety: string; trayType: string; totalQty: number; totalWeight: number; unitWeight: number | null }>();
    selectedDayItems.forEach(item => {
      const key = `${item.product}|${item.size || ''}|${item.variety || ''}`;
      const existing = map.get(key);
      const w = item.unit_weight ? item.quantity * item.unit_weight : (item.weight || 0);
      if (existing) {
        existing.totalQty += item.quantity;
        existing.totalWeight += w;
      } else {
        map.set(key, {
          product: item.product,
          size: item.size || '-',
          variety: item.variety || '-',
          trayType: item.tray_type || '-',
          totalQty: item.quantity,
          totalWeight: w,
          unitWeight: item.unit_weight,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [selectedDayItems]);

  // Grower breakdown for selected day
  const growerBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; code: string; pallets: number; dispatches: number; items: number }>();
    selectedDayDispatches.forEach(d => {
      const existing = map.get(d.grower_name);
      const dItems = items.filter(i => i.dispatch_id === d.id);
      const itemCount = dItems.reduce((s, i) => s + i.quantity, 0);
      if (existing) {
        existing.pallets += d.total_pallets;
        existing.dispatches += 1;
        existing.items += itemCount;
      } else {
        map.set(d.grower_name, {
          name: d.grower_name,
          code: d.grower_code || '-',
          pallets: d.total_pallets,
          dispatches: 1,
          items: itemCount,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.pallets - a.pallets);
  }, [selectedDayDispatches, items]);

  // Weekly totals
  const weeklyStats = useMemo(() => {
    const totalPallets = dispatches.reduce((s, d) => s + d.total_pallets, 0);
    const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
    const totalDispatches = dispatches.length;
    const uniqueGrowers = new Set(dispatches.map(d => d.grower_name)).size;
    return { totalPallets, totalUnits, totalDispatches, uniqueGrowers };
  }, [dispatches, items]);

  const selectedStats = selectedDay ? getDayStats(selectedDay) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-display tracking-tight">Inbound Planning</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-6 space-y-6">
        {/* Week Nav */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg tracking-tight">
            {format(weekStart, 'd MMM')} — {format(weekEnd, 'd MMM yyyy')}
          </h2>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs font-display" onClick={() => { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })); setSelectedDay(new Date()); }}>
              This Week
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weekly Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Pallets', value: weeklyStats.totalPallets, icon: Package },
            { label: 'Total Units', value: weeklyStats.totalUnits.toLocaleString(), icon: TrendingUp },
            { label: 'Dispatches', value: weeklyStats.totalDispatches, icon: Truck },
            { label: 'Growers', value: weeklyStats.uniqueGrowers, icon: BarChart3 },
          ].map(card => (
            <div key={card.label} className="p-4 rounded-lg border border-border bg-card">
              <card.icon className="h-4 w-4 text-muted-foreground mb-1" />
              <p className="text-2xl font-display">{card.value}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading planning data...</div>
        ) : (
          <>
            {/* Daily Capacity Bars */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-3 border-b border-border bg-muted/30">
                <h3 className="font-display text-xs uppercase tracking-widest text-muted-foreground">Daily Pallet Forecast</h3>
              </div>
              <div className="grid grid-cols-7 divide-x divide-border">
                {days.map(day => {
                  const stats = getDayStats(day);
                  const capacity = Math.min((stats.pallets / DOCK_CAPACITY) * 100, 100);
                  const isOver = stats.pallets > DOCK_CAPACITY;
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const today = isToday(day);
                  const past = isBefore(day, new Date()) && !today;

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(day)}
                      className={`p-3 text-center transition-colors hover:bg-primary/5 ${isSelected ? 'bg-primary/10' : ''} ${past ? 'opacity-60' : ''}`}
                    >
                      <div className={`text-xs font-display uppercase tracking-wider mb-1 ${today ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                        {format(day, 'EEE')}
                      </div>
                      <div className={`text-xs mb-2 ${today ? 'text-primary' : 'text-muted-foreground'}`}>
                        {format(day, 'd MMM')}
                      </div>

                      {/* Capacity bar */}
                      <div className="h-20 w-full bg-muted/50 rounded-md overflow-hidden flex flex-col-reverse relative mb-2">
                        <div
                          className={`transition-all rounded-md ${isOver ? 'bg-destructive/70' : capacity > 75 ? 'bg-warning/70' : 'bg-primary/40'}`}
                          style={{ height: `${Math.max(capacity, stats.pallets > 0 ? 8 : 0)}%` }}
                        />
                        {isOver && (
                          <div className="absolute top-1 right-1">
                            <AlertTriangle className="h-3 w-3 text-destructive" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <p className={`text-sm font-display font-bold ${isOver ? 'text-destructive' : ''}`}>
                          {stats.pallets}<span className="text-[10px] text-muted-foreground font-normal">p</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">{stats.dispatches} disp</p>
                        <p className="text-[10px] text-muted-foreground">{stats.growers} grower{stats.growers !== 1 ? 's' : ''}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Detail */}
            {selectedDay && selectedStats && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base tracking-tight">
                    {format(selectedDay, 'EEEE, d MMMM')}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-display">{selectedStats.pallets} pallets</span>
                    <span>{selectedStats.totalUnits.toLocaleString()} units</span>
                    <span>{selectedStats.dispatches} dispatches</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Product Breakdown */}
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="p-3 border-b border-border bg-muted/30">
                      <h4 className="font-display text-xs uppercase tracking-widest text-muted-foreground">Product Breakdown</h4>
                    </div>
                    {productBreakdown.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">No items for this day.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/20">
                            <th className="text-left p-2.5 text-xs font-display uppercase tracking-widest text-muted-foreground">Product</th>
                            <th className="text-left p-2.5 text-xs font-display uppercase tracking-widest text-muted-foreground">Size</th>
                            <th className="text-right p-2.5 text-xs font-display uppercase tracking-widest text-muted-foreground">Qty</th>
                            <th className="text-right p-2.5 text-xs font-display uppercase tracking-widest text-muted-foreground">Kg/Unit</th>
                            <th className="text-right p-2.5 text-xs font-display uppercase tracking-widest text-muted-foreground">Total Kg</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productBreakdown.map((row, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="p-2.5">
                                <div className="font-medium">{row.product}</div>
                                <div className="text-xs text-muted-foreground">{row.variety}</div>
                              </td>
                              <td className="p-2.5 text-muted-foreground">{row.size}</td>
                              <td className="p-2.5 text-right font-display font-bold">{row.totalQty}</td>
                              <td className="p-2.5 text-right text-muted-foreground">{row.unitWeight ? `${row.unitWeight}` : '-'}</td>
                              <td className="p-2.5 text-right text-muted-foreground">{row.totalWeight ? `${row.totalWeight.toLocaleString()}` : '-'}</td>
                            </tr>
                          ))}
                          <tr className="border-t border-border bg-muted/30">
                            <td colSpan={2} className="p-2.5 font-display text-xs uppercase tracking-wider text-muted-foreground">Total</td>
                            <td className="p-2.5 text-right font-display font-bold">{productBreakdown.reduce((s, r) => s + r.totalQty, 0)}</td>
                            <td className="p-2.5" />
                            <td className="p-2.5 text-right font-display text-muted-foreground">{productBreakdown.reduce((s, r) => s + r.totalWeight, 0).toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Grower Breakdown */}
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="p-3 border-b border-border bg-muted/30">
                      <h4 className="font-display text-xs uppercase tracking-widest text-muted-foreground">Grower Summary</h4>
                    </div>
                    {growerBreakdown.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">No arrivals for this day.</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {growerBreakdown.map((g, i) => (
                          <div key={i} className="p-3 flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{g.name}</div>
                              <div className="text-xs text-muted-foreground">{g.code} · {g.dispatches} dispatch{g.dispatches !== 1 ? 'es' : ''}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-display text-sm font-bold">{g.pallets}p</div>
                              <div className="text-xs text-muted-foreground">{g.items.toLocaleString()} units</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dispatch List for Day */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="p-3 border-b border-border bg-muted/30">
                    <h4 className="font-display text-xs uppercase tracking-widest text-muted-foreground">Dispatches</h4>
                  </div>
                  {selectedDayDispatches.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">No arrivals expected.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/20">
                          <th className="text-left p-2.5 text-xs font-display uppercase tracking-widest text-muted-foreground">ID</th>
                          <th className="text-left p-2.5 text-xs font-display uppercase tracking-widest text-muted-foreground">Grower</th>
                          <th className="text-left p-2.5 text-xs font-display uppercase tracking-widest text-muted-foreground">Con Note</th>
                          <th className="text-left p-2.5 text-xs font-display uppercase tracking-widest text-muted-foreground">Carrier</th>
                          <th className="text-right p-2.5 text-xs font-display uppercase tracking-widest text-muted-foreground">Pallets</th>
                          <th className="text-left p-2.5 text-xs font-display uppercase tracking-widest text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDayDispatches.map(d => (
                          <tr key={d.id} className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/receive/${d.id}`)}>
                            <td className="p-2.5 font-display text-xs">{d.display_id}</td>
                            <td className="p-2.5">
                              <div className="font-medium">{d.grower_name}</div>
                              <div className="text-xs text-muted-foreground">{d.grower_code || '-'}</div>
                            </td>
                            <td className="p-2.5 font-display text-xs">{d.con_note_number}</td>
                            <td className="p-2.5 text-muted-foreground">{d.carrier || '-'}</td>
                            <td className="p-2.5 text-right font-display">{d.total_pallets}</td>
                            <td className="p-2.5"><StatusBadge status={d.status as any} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
