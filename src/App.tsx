import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Dashboard from "./pages/Dashboard";
import SupplierForm from "./pages/SupplierForm";
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
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dispatch" element={<ProtectedRoute><SupplierForm /></ProtectedRoute>} />
      <Route path="/receive/:id" element={<ProtectedRoute><ReceiveDispatch /></ProtectedRoute>} />
      <Route path="/planning" element={<ProtectedRoute><InboundPlanning /></ProtectedRoute>} />
      <Route path="/dispatch/scan/:token" element={<QRScanPage />} />
      <Route path="/submit/:token" element={<PublicSubmitPage />} />
      <Route path="/s/:code" element={<ShortLinkRedirect />} />
      <Route path="/receiver/verify" element={<ProtectedRoute><ReceiverVerifyPage /></ProtectedRoute>} />
      <Route path="/supplier/templates" element={<ProtectedRoute><SupplierTemplatesPage /></ProtectedRoute>} />
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
