// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/components/auth/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";
import Documents from "@/pages/Documents";
import AuditLog from "@/pages/AuditLog";
import Settings from "@/pages/Settings";
import Onboarding from "@/pages/Onboarding";
import AdminPanel from "@/components/admin/AdminPanel";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import Assistant from "@/pages/Assistant";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

// Hooks
import { useAuth } from "@/hooks/useAuth";

// ------------------------------------------------------

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading } = useAuth();

  // 🔹 Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // 🔹 Public Routes (unauthenticated)
  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }

  // 🔹 Protected Routes (authenticated)
  return (
    <AppLayout>
      <Routes>
        {/* Home */}
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        {/* Core Features */}
        <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* AI Assistant */}
        <Route path="/assistant" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />

        {/* Utilities */}
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationCenter /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        {/* Toasts */}
        <Toaster />
        <Sonner />

        {/* Routing */}
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
