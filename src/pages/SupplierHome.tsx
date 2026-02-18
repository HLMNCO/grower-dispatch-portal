import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Package, AlertTriangle, Clock, Truck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { BrandedLoading } from '@/components/BrandedLoading';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function SupplierHome() {
  const { user, business } = useAuth();
  const navigate = useNavigate();

  const firstName = user?.user_metadata?.display_name?.split(' ')[0] || 'there';

  const { data: dispatches = [], isLoading } = useQuery({
    queryKey: ['supplier-dispatches', business?.id],
    queryFn: async () => {
      if (!business) return [];
      const { data } = await supabase
        .from('dispatches')
        .select('*')
        .eq('supplier_business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!business,
  });

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const thisWeek = dispatches.filter(d => new Date(d.created_at) >= weekStart);
  const inTransit = dispatches.filter(d => d.status === 'in-transit').length;
  const awaitingCount = dispatches.filter(d => d.status === 'pending').length;
  const issueCount = dispatches.filter(d => d.status === 'issue').length;

  if (isLoading) return <BrandedLoading />;

  return (
    <div className="container py-6 sm:py-8 space-y-6 sm:space-y-8 max-w-4xl">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-display tracking-tight">{getGreeting()}, {firstName}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {business?.name}{business?.grower_code && ` · Grower Code: ${business.grower_code}`}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border border-border bg-card">
          <p className="text-2xl font-display">{thisWeek.length}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">This week</p>
        </div>
        <div className={`p-4 rounded-lg border bg-card ${inTransit > 0 ? 'border-warning/50' : 'border-border'}`}>
          <p className={`text-2xl font-display ${inTransit > 0 ? 'text-warning-foreground' : ''}`}>{inTransit}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">In transit</p>
        </div>
        <div className={`p-4 rounded-lg border bg-card ${issueCount > 0 ? 'border-destructive/50' : 'border-border'}`}>
          <p className={`text-2xl font-display ${issueCount > 0 ? 'text-destructive' : ''}`}>{issueCount}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Issues</p>
        </div>
        <div className={`p-4 rounded-lg border bg-card ${awaitingCount > 0 ? 'border-warning/50' : 'border-border'}`}>
          <p className={`text-2xl font-display ${awaitingCount > 0 ? 'text-warning-foreground' : ''}`}>{awaitingCount}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Awaiting</p>
        </div>
      </div>

      {/* CTA */}
      <Link to="/dispatch/new">
        <Button size="lg" className="w-full sm:w-auto font-display tracking-wide text-base min-h-[44px]">
          <Plus className="h-5 w-5 mr-2" /> New Delivery Advice
        </Button>
      </Link>

      {/* Recent dispatches */}
      <section>
        <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-3">Recent Dispatches</h3>
        {dispatches.length === 0 ? (
          <div className="py-12 text-center space-y-3 border border-dashed border-border rounded-lg">
            <Truck className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-display">No deliveries yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              When you send produce to Ten Farms, your deliveries will appear here.
            </p>
            <Link to="/dispatch/new">
              <Button className="mt-2 font-display min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" /> Send a Delivery
              </Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">DA Number</th>
                    <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground hidden sm:table-cell">To</th>
                    <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Departure</th>
                    <th className="text-left p-3 font-display text-xs uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {dispatches.map((d: any) => (
                    <tr key={d.id} className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/dispatch/${d.id}`)}>
                      <td className="p-3">
                        <span className="font-display text-xs">{d.delivery_advice_number || d.display_id}</span>
                      </td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">Ten Farms</td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">{format(new Date(d.dispatch_date), 'dd MMM yyyy')}</td>
                      <td className="p-3"><StatusBadge status={d.status} /></td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" className="font-display text-xs min-h-[44px]">
                          View <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
