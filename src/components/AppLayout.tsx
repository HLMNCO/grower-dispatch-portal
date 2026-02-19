import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast as sonnerToast } from 'sonner';
import {
  Plus, ClipboardList, FileText, Settings, LogOut,
  LayoutDashboard, CheckCircle2, CalendarDays, Users, Menu, X,
  ClipboardCheck, Home, Moon, Sun
} from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import SupplierIntakeLinkDialog from '@/components/SupplierIntakeLinkDialog';

/** Seedling mark — inline SVG so no external dep needed */
function SeedlingMark({ size = 28, onDark = true }: { size?: number; onDark?: boolean }) {
  const green = onDark ? 'rgba(253,250,244,0.92)' : '#3a8c4e';
  const stem  = onDark ? 'rgba(253,250,244,0.5)'  : 'rgba(42,107,58,0.5)';
  return (
    <svg width={size} height={Math.round(size * 1.1)} viewBox="0 0 100 110" fill="none">
      <path d="M50 100 L50 45" stroke={stem} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M50 70 C50 70 30 65 22 50 C20 46 21 40 25 38 C30 36 38 40 44 50 C48 57 50 65 50 70Z" fill={green} />
      <path d="M50 58 C50 58 68 50 78 36 C81 31 80 25 76 23 C71 21 63 26 57 36 C53 43 50 52 50 58Z" fill="#f5c842" />
      <ellipse cx="50" cy="102" rx="14" ry="3.5" fill={onDark ? 'rgba(253,250,244,0.1)' : 'rgba(92,61,30,0.1)'} />
      <circle cx="50" cy="42" r="4" fill="#e0a820" />
    </svg>
  );
}

/** Inline wordmark */
function Wordmark({ onDark = true, size = 'sm' }: { onDark?: boolean; size?: 'sm' | 'md' }) {
  const textColor = onDark ? '#fdfaf4' : '#1a2e1d';
  const goldColor = '#f5c842';
  const monoColor = onDark ? 'rgba(253,250,244,0.4)' : 'rgba(107,128,112,0.8)';
  const fontSize = size === 'md' ? '1.1rem' : '0.875rem';
  const monoSize = size === 'md' ? '0.55rem' : '0.48rem';
  return (
    <span style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
      <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize, letterSpacing: '-0.02em', color: textColor }}>Pack</span>
      <span style={{ fontFamily: '"Space Mono", monospace', fontWeight: 400, fontSize: monoSize, letterSpacing: '0.18em', textTransform: 'uppercase', color: monoColor }}>to</span>
      <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize, letterSpacing: '-0.02em', color: goldColor }}>Produce</span>
    </span>
  );
}

function NavItem({ to, icon: Icon, label, active, onClick }: {
  to: string; icon: any; label: string; active: boolean; onClick?: () => void;
}) {
  return (
    <Link to={to} onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}>
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function SidebarHeader({ businessName }: { businessName?: string }) {
  return (
    <div className="px-4 py-5 border-b border-sidebar-border">
      <div className="flex items-center gap-2.5">
        <SeedlingMark size={26} onDark />
        <Wordmark onDark />
      </div>
      {businessName && (
        <p className="text-xs text-sidebar-foreground/45 mt-2 truncate">{businessName}</p>
      )}
    </div>
  );
}

function SupplierSidebar({ onClose }: { onClose?: () => void }) {
  const { business, signOut } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="flex flex-col h-full">
      <SidebarHeader businessName={business?.name} />

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <NavItem to="/dispatch" icon={LayoutDashboard} label="Home" active={pathname === '/dispatch'} onClick={onClose} />
        <Link to="/dispatch/new" onClick={onClose}>
          <Button className="w-full font-display font-bold tracking-wide mt-2 mb-2 min-h-[44px] bg-accent hover:bg-accent/90 text-accent-foreground" size="sm">
            <Plus className="h-4 w-4 mr-2" /> New Dispatch
          </Button>
        </Link>
        <div className="h-px bg-sidebar-border my-3" />
        <NavItem to="/dispatch" icon={ClipboardList} label="My Dispatches" active={false} onClick={onClose} />
        <NavItem to="/supplier/templates" icon={FileText} label="Templates" active={pathname === '/supplier/templates'} onClick={onClose} />
      </div>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <button onClick={() => sonnerToast.info("Settings coming soon")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full min-h-[44px]">
          <Settings className="h-4 w-4" /> Settings
        </button>
        <button onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full min-h-[44px]">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
        <DarkModeToggle />
      </div>
    </div>
  );
}

function ReceiverSidebar({ onClose }: { onClose?: () => void }) {
  const { signOut, isAdmin, canPlan } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="flex flex-col h-full">
      <SidebarHeader />

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" active={pathname === '/'} onClick={onClose} />
        <NavItem to="/receiver/verify" icon={CheckCircle2} label="Receive Produce" active={pathname === '/receiver/verify'} onClick={onClose} />
        {canPlan && (
          <NavItem to="/planning" icon={CalendarDays} label="Inbound Planning" active={pathname === '/planning'} onClick={onClose} />
        )}
        <div className="h-px bg-sidebar-border my-3" />
        {canPlan && (
          <NavItem to="/growers" icon={Users} label="Growers" active={pathname === '/growers'} onClick={onClose} />
        )}
        {isAdmin && (
          <NavItem to="/staff" icon={Users} label="Staff" active={pathname === '/staff'} onClick={onClose} />
        )}
      </div>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <button onClick={() => sonnerToast.info("Settings coming soon")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full min-h-[44px]">
          <Settings className="h-4 w-4" /> Settings
        </button>
        <button onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full min-h-[44px]">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
        <DarkModeToggle />
      </div>
    </div>
  );
}

function MobileBottomNav() {
  const { role, business, canPlan } = useAuth();
  const { pathname } = useLocation();

  const isSupplier = role === 'supplier';
  const isReceiver = role === 'staff';

  const supplierTabs = [
    { to: '/dispatch', icon: Home, label: 'Home', active: pathname === '/dispatch' },
    { to: '/dispatch/new', icon: Plus, label: 'New', active: pathname === '/dispatch/new', isPrimary: true },
    { to: '/supplier/templates', icon: FileText, label: 'Templates', active: pathname === '/supplier/templates' },
  ];

  const receiverTabs = [
    { to: '/', icon: Home, label: 'Dashboard', active: pathname === '/', isPrimary: false },
    { to: '/receiver/verify', icon: ClipboardCheck, label: 'Receive', active: pathname === '/receiver/verify', isPrimary: true },
    ...(canPlan ? [{ to: '/planning', icon: CalendarDays, label: 'Planning', active: pathname === '/planning', isPrimary: false }] : []),
  ];

  const tabs = isSupplier ? supplierTabs : isReceiver ? receiverTabs : [];
  if (tabs.length === 0) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-stretch h-[60px]">
        {tabs.map((tab: any) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-display font-bold uppercase tracking-wider transition-colors",
              tab.active ? "text-primary" : "text-muted-foreground"
            )}
          >
            {tab.isPrimary ? (
              <div className="w-11 h-11 -mt-5 rounded-full bg-primary flex items-center justify-center shadow-lg ring-4 ring-background">
                <tab.icon className="h-5 w-5 text-primary-foreground" />
              </div>
            ) : (
              <>
                <tab.icon className={cn("h-5 w-5", tab.active ? "text-primary" : "text-muted-foreground")} />
                <span>{tab.label}</span>
              </>
            )}
          </Link>
        ))}
        {isReceiver && business?.public_intake_token && (
          <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
            <SupplierIntakeLinkDialog intakeToken={business.public_intake_token} compact />
          </div>
        )}
      </div>
    </nav>
  );
}

function DarkModeToggle() {
  const { isDark, toggle } = useDarkMode();
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      aria-label="Toggle dark mode"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = role === 'supplier' ? SupplierSidebar : ReceiverSidebar;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-sidebar border-r border-sidebar-border fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 inset-y-0 w-72 bg-sidebar shadow-xl">
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
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="shrink-0 -ml-2">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <SeedlingMark size={24} onDark={false} />
            <Wordmark onDark={false} />
          </div>
          <DarkModeToggle />
        </header>

        {/* Page content */}
        <main className="flex-1 pb-[72px] lg:pb-0">
          {children}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
