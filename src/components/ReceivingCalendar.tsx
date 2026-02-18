import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Package, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface CalendarDispatch {
  id: string;
  display_id: string;
  grower_name: string;
  expected_arrival: string | null;
  dispatch_date: string;
  total_pallets: number;
  status: string;
  carrier: string | null;
  truck_number: string | null;
  transporter_con_note_number: string;
  delivery_advice_number: string | null;
}

export default function ReceivingCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dispatches, setDispatches] = useState<CalendarDispatch[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const { business } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (business) fetchDispatches();
  }, [business, currentMonth]);

  const fetchDispatches = async () => {
    if (!business) return;
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    let query = supabase
      .from('dispatches')
      .select('id, display_id, grower_name, expected_arrival, dispatch_date, total_pallets, status, carrier, truck_number, transporter_con_note_number, delivery_advice_number')
      .order('expected_arrival', { ascending: true });

    if (business.business_type === 'receiver') {
      query = query.eq('receiver_business_id', business.id);
    } else {
      query = query.eq('supplier_business_id', business.id);
    }

    query = query.or(`expected_arrival.gte.${start},dispatch_date.gte.${start}`)
      .or(`expected_arrival.lte.${end},dispatch_date.lte.${end}`);

    const { data } = await query;
    if (data) setDispatches(data as CalendarDispatch[]);
    setLoading(false);
  };

  const days = useMemo(() => eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  }), [currentMonth]);

  const getDispatchesForDay = (day: Date) => {
    return dispatches.filter(d => {
      const arrivalDate = d.expected_arrival ? new Date(d.expected_arrival) : null;
      const dispDate = new Date(d.dispatch_date);
      return (arrivalDate && isSameDay(arrivalDate, day)) || (!arrivalDate && isSameDay(dispDate, day));
    });
  };

  const selectedDispatches = selectedDay ? getDispatchesForDay(selectedDay) : [];
  const startDayOfWeek = startOfMonth(currentMonth).getDay();
  const totalPalletsForDay = (day: Date) => getDispatchesForDay(day).reduce((s, d) => s + d.total_pallets, 0);

  return (
    <div className="space-y-6">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg tracking-tight">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs font-display" onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading calendar...</div>
      ) : (
        <>
          {/* Calendar grid */}
          <div className="rounded-lg border border-border overflow-hidden bg-card">
            <div className="grid grid-cols-7 bg-muted/50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="p-2 text-center text-xs font-display uppercase tracking-widest text-muted-foreground border-b border-border">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] sm:min-h-[100px] border-b border-r border-border bg-muted/20" />
              ))}

              {days.map(day => {
                const dayDispatches = getDispatchesForDay(day);
                const pallets = totalPalletsForDay(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const today = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-border p-1.5 text-left transition-colors hover:bg-primary/5 ${
                      isSelected ? 'bg-primary/10 ring-1 ring-inset ring-primary' : ''
                    }`}
                  >
                    <div className={`text-xs font-display mb-1 ${today ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : 'text-muted-foreground'}`}>
                      {format(day, 'd')}
                    </div>
                    {dayDispatches.length > 0 && (
                      <div className="space-y-0.5">
                        {dayDispatches.slice(0, 2).map(d => (
                          <div key={d.id} className="text-[10px] leading-tight px-1 py-0.5 rounded bg-primary/10 text-primary truncate">
                            {d.grower_name}
                          </div>
                        ))}
                        {dayDispatches.length > 2 && (
                          <div className="text-[10px] text-muted-foreground px-1">+{dayDispatches.length - 2} more</div>
                        )}
                        {pallets > 0 && (
                          <div className="text-[10px] text-muted-foreground px-1 font-display">{pallets}p</div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div className="space-y-3">
              <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
                {format(selectedDay, 'EEEE, d MMMM')} — {selectedDispatches.length} arrival{selectedDispatches.length !== 1 ? 's' : ''}, {selectedDispatches.reduce((s, d) => s + d.total_pallets, 0)} pallets
              </h3>

              {selectedDispatches.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 border border-dashed border-border rounded-lg text-center">No arrivals expected.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDispatches.map(d => (
                    <button
                      key={d.id}
                      onClick={() => navigate(`/receive/${d.id}`)}
                      className="w-full p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-xs">{d.display_id}</span>
                          <StatusBadge status={d.status as any} />
                        </div>
                        <span className="text-xs text-muted-foreground font-display">{d.total_pallets} pallets</span>
                      </div>
                      <div className="text-sm font-medium">{d.grower_name}</div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" /> {d.delivery_advice_number || d.transporter_con_note_number}
                        </span>
                        {d.carrier && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" /> {d.carrier}
                          </span>
                        )}
                        {d.truck_number && (
                          <span className="font-display">Rego: {d.truck_number}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
