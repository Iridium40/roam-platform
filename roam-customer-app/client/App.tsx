import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import "@/utils/testUtils";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { PageErrorBoundary } from "@/components/ErrorBoundary";
import { 
  CustomerFavorites, 
  CustomerLocations, 
  CustomerTransactions, 
  CustomerProfile, 
  CustomerSettings 
} from "@/components/placeholders/PlaceholderPages";



// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin text-roam-blue mx-auto mb-4" />
      <p className="text-lg font-semibold">Loading...</p>
    </div>
  </div>
);

// Placeholder components moved to separate file

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PageErrorBoundary>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/bookings" element={<MyBookings />} />
                <Route
                  path="/my-bookings"
                  element={
                    <ProtectedRoute>
                      <MyBookings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customer/favorites"
                  element={
                    <ProtectedRoute>
                      <CustomerFavorites />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customer/locations"
                  element={
                    <ProtectedRoute>
                      <CustomerLocations />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customer/transactions"
                  element={
                    <ProtectedRoute>
                      <CustomerTransactions />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customer/profile"
                  element={
                    <ProtectedRoute>
                      <CustomerProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customer/settings"
                  element={
                    <ProtectedRoute>
                      <CustomerSettings />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </PageErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
