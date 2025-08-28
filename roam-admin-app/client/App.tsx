import "./global.css";

// HMR error handling for development
if (import.meta.hot) {
  import.meta.hot.on("vite:error", (err) => {
    console.error("HMR Error:", err);
  });

  // Accept HMR updates for this module
  import.meta.hot.accept(() => {
  });
}

// ResizeObserver error prevention
// This wraps the native ResizeObserver to prevent loop errors
if (typeof window !== "undefined" && window.ResizeObserver) {
  const OriginalResizeObserver = window.ResizeObserver;

  window.ResizeObserver = class extends OriginalResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      const wrappedCallback: ResizeObserverCallback = (entries, observer) => {
        window.requestAnimationFrame(() => {
          try {
            callback(entries, observer);
          } catch (error) {
            // Silently handle ResizeObserver errors
            if (!String(error).includes("ResizeObserver loop")) {
              throw error; // Re-throw non-ResizeObserver errors
            }
          }
        });
      };
      super(wrappedCallback);
    }
  };
}

// Additional console error suppression as fallback
const originalError = console.error;
console.error = (...args) => {
  const errorMessage = String(args[0] || "");
  if (
    errorMessage.includes("ResizeObserver loop") ||
    errorMessage.includes("undelivered notifications")
  ) {
    return; // Suppress ResizeObserver warnings
  }
  originalError.apply(console, args);
};

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { handleAuthError } from "@/lib/auth-error-handler";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import AnnouncementPopup from "@/components/AnnouncementPopup";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

// Lazy load large components for better performance
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminCustomers = lazy(() => import("./pages/AdminCustomers"));
const AdminBusinesses = lazy(() => import("./pages/AdminBusinesses"));
const AdminVerification = lazy(() => import("./pages/AdminVerification"));
const AdminProviders = lazy(() => import("./pages/AdminProviders"));
const AdminServices = lazy(() => import("./pages/AdminServices"));
const AdminBookings = lazy(() => import("./pages/AdminBookings"));
const AdminPromotions = lazy(() => import("./pages/AdminPromotions"));
const AdminReviews = lazy(() => import("./pages/AdminReviews"));
const AdminAnnouncements = lazy(() => import("./pages/AdminAnnouncements"));
const AdminReports = lazy(() => import("./pages/AdminReports"));
const AdminFinancial = lazy(() => import("./pages/AdminFinancial"));
const AdminSystemSettings = lazy(() => import("./pages/AdminSystemSettings"));
const AdminProfile = lazy(() => import("./pages/AdminProfile"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));

const queryClient = new QueryClient();

// Global error handling for authentication errors
window.addEventListener("unhandledrejection", async (event) => {
  const error = event.reason;
  if (
    error?.message?.includes("Invalid Refresh Token") ||
    error?.message?.includes("Refresh Token Not Found") ||
    error?.message?.includes("JWT expired")
  ) {
    event.preventDefault(); // Prevent the error from being logged to console
    await handleAuthError(error);
  }
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={<Navigate to="/admin/dashboard" replace />}
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader text="Loading Users..." />}>
                    <AdminUsers />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/customers"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader text="Loading Customers..." />}>
                    <AdminCustomers />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/businesses"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader text="Loading Businesses..." />}>
                    <AdminBusinesses />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/verification"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader text="Loading Verification..." />}>
                    <AdminVerification />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/providers"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader text="Loading Providers..." />}>
                    <AdminProviders />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/services"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader text="Loading Services..." />}>
                    <AdminServices />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader text="Loading Bookings..." />}>
                    <AdminBookings />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/promotions"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader text="Loading Promotions..." />}>
                    <AdminPromotions />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reviews"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader text="Loading Reviews..." />}>
                    <AdminReviews />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/announcements"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader text="Loading Announcements..." />}>
                    <AdminAnnouncements />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader text="Loading Reports..." />}>
                    <AdminReports />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/financial"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader text="Loading Financial..." />}>
                    <AdminFinancial />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/system-settings"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader text="Loading System Settings..." />}>
                    <AdminSystemSettings />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader text="Loading Profile..." />}>
                    <AdminProfile />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader text="Loading Settings..." />}>
                    <AdminSettings />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <AnnouncementPopup appType="admin" />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
