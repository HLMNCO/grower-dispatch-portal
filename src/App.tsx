import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { BrandedLoading } from "@/components/BrandedLoading";
import Dashboard from "./pages/Dashboard";
import SupplierForm from "./pages/SupplierForm";
import SupplierHome from "./pages/SupplierHome";
import SupplierDispatchDetail from "./pages/SupplierDispatchDetail";
import TransporterDashboard from "./pages/TransporterDashboard";
import TransporterDispatchDetail from "./pages/TransporterDispatchDetail";
import ReceiveDispatch from "./pages/ReceiveDispatch";
import InboundPlanning from "./pages/InboundPlanning";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import QRScanPage from "./pages/QRScanPage";
import ReceiverVerifyPage from "./pages/ReceiverVerifyPage";
import SupplierTemplatesPage from "./pages/SupplierTemplatesPage";
import PublicSubmitPage from "./pages/PublicSubmitPage";
import ShortLinkRedirect from "./pages/ShortLinkRedirect";

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
  const { role, loading } = useAuth();
  if (loading) return <BrandedLoading />;
  if (role === 'supplier') return <Navigate to="/dispatch" replace />;
  if (role === 'transporter') return <Navigate to="/transporter" replace />;
  // staff / receiver is the default
  return <Dashboard />;
}

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
      <Route path="/" element={<ProtectedRoute><RoleBasedHome /></ProtectedRoute>} />
      {/* Supplier routes */}
      <Route path="/dispatch" element={<ProtectedRoute><SupplierHome /></ProtectedRoute>} />
      <Route path="/dispatch/new" element={<ProtectedRoute><SupplierForm /></ProtectedRoute>} />
      <Route path="/dispatch/:id" element={<ProtectedRoute><SupplierDispatchDetail /></ProtectedRoute>} />
      <Route path="/supplier/templates" element={<ProtectedRoute><SupplierTemplatesPage /></ProtectedRoute>} />
      {/* Transporter routes */}
      <Route path="/transporter" element={<ProtectedRoute><TransporterDashboard /></ProtectedRoute>} />
      <Route path="/transporter/dispatch/:id" element={<ProtectedRoute><TransporterDispatchDetail /></ProtectedRoute>} />
      {/* Receiver routes */}
      <Route path="/receive/:id" element={<ProtectedRoute><ReceiveDispatch /></ProtectedRoute>} />
      <Route path="/planning" element={<ProtectedRoute><InboundPlanning /></ProtectedRoute>} />
      <Route path="/receiver/verify" element={<ProtectedRoute><ReceiverVerifyPage /></ProtectedRoute>} />
      {/* Public routes */}
      <Route path="/dispatch/scan/:token" element={<QRScanPage />} />
      <Route path="/submit/:token" element={<PublicSubmitPage />} />
      <Route path="/s/:code" element={<ShortLinkRedirect />} />
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
