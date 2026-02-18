import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { BrandedLoading } from "@/components/BrandedLoading";
import { toast } from "sonner";
import { useEffect } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Dashboard from "./pages/Dashboard";
import SupplierForm from "./pages/SupplierForm";
import SupplierHome from "./pages/SupplierHome";
import SupplierDispatchDetail from "./pages/SupplierDispatchDetail";
import ReceiveDispatch from "./pages/ReceiveDispatch";
import InboundPlanning from "./pages/InboundPlanning";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import QRScanPage from "./pages/QRScanPage";
import ReceiverVerifyPage from "./pages/ReceiverVerifyPage";
import SupplierTemplatesPage from "./pages/SupplierTemplatesPage";
import PublicSubmitPage from "./pages/PublicSubmitPage";
import ShortLinkRedirect from "./pages/ShortLinkRedirect";
import GrowersPage from "./pages/GrowersPage";
import StaffManagementPage from "./pages/StaffManagementPage";
import { AppLayout } from "./components/AppLayout";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, roleLoaded } = useAuth();
  if (loading || !roleLoaded) return <BrandedLoading />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

/** Only accessible by staff/receiver role */
function ReceiverRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, roleLoaded, role } = useAuth();
  if (loading || !roleLoaded) return <BrandedLoading />;
  if (!user) return <Navigate to="/auth" replace />;
  if (role === 'supplier') return <Navigate to="/dispatch" replace />;
  return <>{children}</>;
}

/** Only accessible by supplier role */
function SupplierRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, roleLoaded, role } = useAuth();
  if (loading || !roleLoaded) return <BrandedLoading />;
  if (!user) return <Navigate to="/auth" replace />;
  if (role === 'staff') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <BrandedLoading />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Pending approval screen for users without a role */
function PendingApprovalScreen() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Clock className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-display tracking-tight">Access Request Pending</h2>
          <p className="text-sm text-muted-foreground">
            Ten Farms Admin has received your request. You'll be notified via email once your account has been approved.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">This usually takes less than 24 hours.</p>
        <Button variant="outline" onClick={() => signOut()}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}

/** Redirects to the correct home based on user role */
function RoleBasedHome() {
  const { role, roleLoaded, loading } = useAuth();

  useEffect(() => {
    if (roleLoaded && role === 'transporter') {
      toast.error("Transporter accounts are no longer active. Contact Ten Farms for access.");
    }
  }, [roleLoaded, role]);

  if (loading || !roleLoaded) return <BrandedLoading />;
  if (!role) return <PendingApprovalScreen />;
  if (role === 'transporter') return <Navigate to="/auth" replace />;
  if (role === 'supplier') return <Navigate to="/dispatch" replace />;
  return <Dashboard />;
}

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
      {/* Public routes */}
      <Route path="/dispatch/scan/:token" element={<QRScanPage />} />
      <Route path="/submit/:token" element={<PublicSubmitPage />} />
      <Route path="/s/:code" element={<ShortLinkRedirect />} />
      {/* Protected routes with layout */}
      <Route path="/" element={<ProtectedRoute><AppLayout><RoleBasedHome /></AppLayout></ProtectedRoute>} />
      <Route path="/dispatch" element={<SupplierRoute><AppLayout><SupplierHome /></AppLayout></SupplierRoute>} />
      <Route path="/dispatch/new" element={<SupplierRoute><AppLayout><SupplierForm /></AppLayout></SupplierRoute>} />
      <Route path="/dispatch/:id" element={<SupplierRoute><AppLayout><SupplierDispatchDetail /></AppLayout></SupplierRoute>} />
      <Route path="/supplier/templates" element={<SupplierRoute><AppLayout><SupplierTemplatesPage /></AppLayout></SupplierRoute>} />
      <Route path="/receive/:id" element={<ReceiverRoute><AppLayout><ReceiveDispatch /></AppLayout></ReceiverRoute>} />
      <Route path="/planning" element={<ReceiverRoute><AppLayout><InboundPlanning /></AppLayout></ReceiverRoute>} />
      <Route path="/receiver/verify" element={<ReceiverRoute><AppLayout><ReceiverVerifyPage /></AppLayout></ReceiverRoute>} />
      <Route path="/growers" element={<ReceiverRoute><AppLayout><GrowersPage /></AppLayout></ReceiverRoute>} />
      <Route path="/staff" element={<ReceiverRoute><AppLayout><StaffManagementPage /></AppLayout></ReceiverRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
