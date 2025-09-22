// src/App.tsx
import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/components/auth/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Hooks
import { useAuth } from "@/hooks/useAuth";

// Lazy-loaded pages
const Index = lazy(() => import("@/pages/Index"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Documents = lazy(() => import("@/pages/Documents"));
const AuditLog = lazy(() => import("@/pages/AuditLog"));
const Settings = lazy(() => import("@/pages/Settings"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const AdminPanel = lazy(() => import("@/components/admin/AdminPanel"));
const NotificationCenter = lazy(() => import("@/components/notifications/NotificationCenter"));
const Assistant = lazy(() => import("@/pages/Assistant"));
const Auth = lazy(() => import("@/pages/Auth"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

function LoadingFallback({ fullScreen }: { fullScreen?: boolean }) {
  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          <p className="mt-3 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  );
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // TODO: wire to telemetry (Sentry/Datadog)
    // console.error("Unhandled error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-muted-foreground">Try refreshing the page or contact support.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

type AppRoute = {
  path: string;
  element: React.ReactNode;
  protected?: boolean;
};

const routes: AppRoute[] = [
  { path: "/", element: <Index />, protected: true },
  { path: "/dashboard", element: <Dashboard />, protected: true },

  { path: "/documents", element: <Documents />, protected: true },
  { path: "/audit", element: <AuditLog />, protected: true },
  { path: "/settings", element: <Settings />, protected: true },

  { path: "/assistant", element: <Assistant />, protected: true },

  { path: "/onboarding", element: <Onboarding />, protected: true },
  { path: "/admin", element: <AdminPanel />, protected: true },
  { path: "/notifications", element: <NotificationCenter />, protected: true },

  { path: "/auth", element: <Auth />, protected: false },
  { path: "*", element: <NotFound />, protected: false },
];

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback fullScreen />;
  }

  // Unauthenticated: restrict to public routes (auth & not found)
  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback fullScreen />}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // Authenticated: app layout + protected routing
  return (
    <AppLayout>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {routes.map((r) => {
              const element = r.protected ? <ProtectedRoute>{r.element}</ProtectedRoute> : r.element;
              return <Route key={r.path} path={r.path} element={element} />;
            })}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
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
