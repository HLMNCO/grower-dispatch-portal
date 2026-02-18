import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast as sonnerToast } from 'sonner';
import {
  Package, Plus, ClipboardList, FileText, Settings, LogOut,
  LayoutDashboard, CheckCircle2, CalendarDays, Users, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function NavItem({ to, icon: Icon, label, active, onClick }: {
  to: string; icon: any; label: string; active: boolean; onClick?: () => void;
}) {
  return (
    <Link to={to} onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}>
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function SupplierSidebar({ onClose }: { onClose?: () => void }) {
  const { business, signOut } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sidebar-primary">
            <Package className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-display text-sm tracking-tight text-sidebar-foreground">FRESHDOCK</span>
        </div>
        {business && (
          <p className="text-xs text-sidebar-foreground/50 mt-1.5 truncate">{business.name}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <NavItem to="/dispatch" icon={LayoutDashboard} label="Home" active={pathname === '/dispatch'} onClick={onClose} />

        <Link to="/dispatch/new" onClick={onClose}>
          <Button className="w-full font-display tracking-wide mt-2 mb-2 min-h-[44px]" size="sm">
            <Plus className="h-4 w-4 mr-2" /> New Delivery
          </Button>
        </Link>

        <div className="h-px bg-sidebar-border my-3" />

        <NavItem to="/dispatch" icon={ClipboardList} label="My Deliveries" active={false} onClick={onClose} />
        <NavItem to="/supplier/templates" icon={FileText} label="Templates" active={pathname === '/supplier/templates'} onClick={onClose} />
      </div>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => sonnerToast.info("Settings coming soon")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full min-h-[44px]"
        >
          <Settings className="h-4 w-4" /> Settings
        </button>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full min-h-[44px]"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}

function ReceiverSidebar({ onClose }: { onClose?: () => void }) {
  const { signOut } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sidebar-primary">
            <Package className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-display text-sm tracking-tight text-sidebar-foreground">FRESHDOCK</span>
        </div>
        <p className="text-xs text-sidebar-foreground/50 mt-1.5">Ten Farms Receiving</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <NavItem to="/" icon={LayoutDashboard} label="Receiving Dashboard" active={pathname === '/'} onClick={onClose} />
        <NavItem to="/receiver/verify" icon={CheckCircle2} label="Receive Produce" active={pathname === '/receiver/verify'} onClick={onClose} />
        <NavItem to="/planning" icon={CalendarDays} label="Inbound Planning" active={pathname === '/planning'} onClick={onClose} />

        <div className="h-px bg-sidebar-border my-3" />

        <button
          onClick={() => { sonnerToast.info("Grower management coming soon"); onClose?.(); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full min-h-[44px]"
        >
          <Users className="h-4 w-4" /> Growers
        </button>
      </div>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => sonnerToast.info("Settings coming soon")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full min-h-[44px]"
        >
          <Settings className="h-4 w-4" /> Settings
        </button>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full min-h-[44px]"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = role === 'supplier' ? SupplierSidebar : ReceiverSidebar;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-sidebar-background border-r border-sidebar-border fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 inset-y-0 w-72 bg-sidebar-background shadow-xl">
            <div className="absolute top-3 right-3 z-10">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="text-sidebar-foreground">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 border-b border-border bg-card px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="shrink-0">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary">
              <Package className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-display text-sm tracking-tight">FRESHDOCK</span>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
