import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { BrandedLoading } from "@/components/BrandedLoading";
import { toast } from "sonner";
import { useEffect } from "react";
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
  const { user, loading } = useAuth();
  if (loading) return <BrandedLoading />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <BrandedLoading />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Redirects to the correct home based on user role */
function RoleBasedHome() {
  const { role, roleLoaded, loading } = useAuth();

  useEffect(() => {
    if (roleLoaded && !role) {
      toast.error("Your account isn't set up yet. Contact Ten Farms to get access.");
    }
    if (roleLoaded && role === 'transporter') {
      toast.error("Transporter accounts are no longer active. Contact Ten Farms for access.");
    }
  }, [roleLoaded, role]);

  if (loading || !roleLoaded) return <BrandedLoading />;
  if (!role || role === 'transporter') return <Navigate to="/auth" replace />;
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
      <Route path="/dispatch" element={<ProtectedRoute><AppLayout><SupplierHome /></AppLayout></ProtectedRoute>} />
      <Route path="/dispatch/new" element={<ProtectedRoute><AppLayout><SupplierForm /></AppLayout></ProtectedRoute>} />
      <Route path="/dispatch/:id" element={<ProtectedRoute><AppLayout><SupplierDispatchDetail /></AppLayout></ProtectedRoute>} />
      <Route path="/supplier/templates" element={<ProtectedRoute><AppLayout><SupplierTemplatesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/receive/:id" element={<ProtectedRoute><AppLayout><ReceiveDispatch /></AppLayout></ProtectedRoute>} />
      <Route path="/planning" element={<ProtectedRoute><AppLayout><InboundPlanning /></AppLayout></ProtectedRoute>} />
      <Route path="/receiver/verify" element={<ProtectedRoute><AppLayout><ReceiverVerifyPage /></AppLayout></ProtectedRoute>} />
      <Route path="/growers" element={<ProtectedRoute><AppLayout><GrowersPage /></AppLayout></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute><AppLayout><StaffManagementPage /></AppLayout></ProtectedRoute>} />
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
