import "./global.css";

import { Toaster } from "@/components/ui/toaster";
// Import test utilities for development (available in browser console as window.testUtils)
import "@/utils/testUtils";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth/AuthProvider";
import { ProtectedRoute, RoleBasedRedirect } from "@/components/ProtectedRoute";
import SystemBrandingInitializer from "@/components/SystemBrandingInitializer";
import AnnouncementPopup from "@/components/AnnouncementPopup";
import Layout from "./components/layout/Layout";
import ScrollToTop from "./components/ScrollToTop";

// Type declaration for React root container
declare global {
  interface HTMLElement {
    _reactRoot?: ReturnType<typeof createRoot>;
  }
}

// Provider Portal Pages Only
import ProviderPortal from "./pages/ProviderPortal";
import ProviderLogin from "./pages/ProviderLogin";
import ProviderSignup from "./pages/ProviderSignup";
import ProviderDashboard from "./pages/ProviderDashboard";
import ChangePassword from "./pages/ChangePassword";
import AccountPendingPage from "./pages/AccountPendingPage";
import ProviderOnboardingFlow from "./pages/onboarding/ProviderOnboardingFlow";
import ProviderOnboardingPhase1 from "./pages/onboarding/ProviderOnboardingPhase1";
import LandingPage from "./pages/LandingPage";
import Blog from "./pages/Blog";
import ErrorBoundary from "./lib/errors/ErrorBoundary";
import NotFound from "./pages/NotFound";
import SignIn from "./pages/SignIn";
import Phase2Entry from "./pages/onboarding/Phase2Entry";
import ImageUploadTest from "./pages/testing/ImageUploadTest";
import Phase2Test from "./pages/onboarding/Phase2Test";
import StaffOnboardingFlow from "./pages/onboarding/StaffOnboardingFlow";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import CancellationPolicy from "./pages/CancellationPolicy";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ProviderAgreement from "./pages/ProviderAgreement";
import Services from "./pages/Services";
import TermsOfService from "./pages/TermsOfService";
import HowItWorksPage from "./pages/HowItWorks";
import AboutPage from "./pages/About";
import Contact from "./pages/Contact";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute - data considered fresh
      gcTime: 1000 * 60 * 5, // 5 minutes - cache retention (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      retry: 1, // Single retry on failure
      refetchOnMount: true, // Refetch when component mounts
    },
    mutations: {
      retry: 1, // Single retry on mutation failure
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SystemBrandingInitializer />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            {/* Public marketing pages */}
            <Route element={<Layout />}>
              <Route path="/roampro" element={<LandingPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/services" element={<Services />} />
              <Route path="/contact" element={<Contact />} />
              {/* Legacy provider portal route - redirect to login */}
              <Route path="/provider-portal" element={<Navigate to="/provider-login" replace />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/provider-agreement" element={<ProviderAgreement />} />
              <Route path="/cancellation" element={<CancellationPolicy />} />
            </Route>

            {/* Provider Authentication - Separate Login & Signup */}
            <Route path="/provider-login" element={<ProviderLogin />} />
            <Route path="/provider-signup" element={<ProviderSignup />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/account-pending" element={<AccountPendingPage />} />
            {/* Legacy /login route - redirect to provider-login */}
            <Route path="/login" element={<Navigate to="/provider-login" replace />} />

            {/* Landing redirect */}
            <Route path="/" element={<Navigate to="/roampro" replace />} />

            {/* Blog */}
            <Route path="/blog" element={<Blog />} />

            {/* Provider Portal Authentication */}
            <Route path="/sign-in" element={<SignIn />} />

            {/* Development/Testing */}
            <Route path="/image-upload-test" element={<ImageUploadTest />} />
            <Route path="/phase2-test" element={<Phase2Test />} />

            {/* Staff Onboarding (Public route) */}
            <Route path="/staff-onboarding" element={<StaffOnboardingFlow />} />

            {/* Protected routes - any authenticated provider */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RoleBasedRedirect />
                </ProtectedRoute>
              }
            />

            {/* Owner-specific routes */}
            <Route
              path="/owner/dashboard"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/bookings"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/messages"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/services"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <Navigate to="/owner/business-settings?tab=services" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/staff"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <Navigate to="/owner/business-settings?tab=staff" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/financials"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/profile"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/business-settings"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />

            {/* Dispatcher-specific routes */}
            <Route
              path="/dispatcher/dashboard"
              element={
                <ProtectedRoute allowedRoles={["owner", "dispatcher"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dispatcher/bookings"
              element={
                <ProtectedRoute allowedRoles={["owner", "dispatcher"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dispatcher/messages"
              element={
                <ProtectedRoute allowedRoles={["owner", "dispatcher"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dispatcher/services"
              element={
                <ProtectedRoute allowedRoles={["owner", "dispatcher"]}>
                  <Navigate to="/dispatcher/business-settings?tab=services" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dispatcher/staff"
              element={
                <ProtectedRoute allowedRoles={["owner", "dispatcher"]}>
                  <Navigate to="/dispatcher/business-settings?tab=staff" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dispatcher/financials"
              element={
                <ProtectedRoute allowedRoles={["owner", "dispatcher"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dispatcher/profile"
              element={
                <ProtectedRoute allowedRoles={["owner", "dispatcher"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dispatcher/business-settings"
              element={
                <ProtectedRoute allowedRoles={["owner", "dispatcher"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />

            {/* Provider-specific routes */}
            {/* Dashboard route hidden for providers - they are redirected to bookings */}
            <Route
              path="/provider/dashboard"
              element={
                <ProtectedRoute
                  allowedRoles={["owner", "dispatcher"]}
                >
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/bookings"
              element={
                <ProtectedRoute
                  allowedRoles={["owner", "dispatcher", "provider"]}
                >
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/messages"
              element={
                <ProtectedRoute
                  allowedRoles={["owner", "dispatcher", "provider"]}
                >
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/services"
              element={
                <ProtectedRoute
                  allowedRoles={["owner", "dispatcher"]}
                >
                  <Navigate to="/provider/business-settings?tab=services" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/staff"
              element={
                <ProtectedRoute
                  allowedRoles={["owner", "dispatcher"]}
                >
                  <Navigate to="/provider/business-settings?tab=staff" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/financials"
              element={
                <ProtectedRoute
                  allowedRoles={["owner", "dispatcher", "provider"]}
                >
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/profile"
              element={
                <ProtectedRoute
                  allowedRoles={["owner", "dispatcher", "provider"]}
                >
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/business-settings"
              element={
                <ProtectedRoute
                  allowedRoles={["owner", "dispatcher", "provider"]}
                >
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/settings"
              element={
                <ProtectedRoute
                  allowedRoles={["owner", "dispatcher", "provider"]}
                >
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/settings"
              element={
                <ProtectedRoute
                  allowedRoles={["owner", "dispatcher", "provider"]}
                >
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dispatcher/settings"
              element={
                <ProtectedRoute
                  allowedRoles={["owner", "dispatcher", "provider"]}
                >
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />

            {/* Legacy route redirects */}
            <Route
              path="/provider-dashboard"
              element={
                <ProtectedRoute>
                  <RoleBasedRedirect />
                </ProtectedRoute>
              }
            />



            {/* Provider Onboarding Flow - New comprehensive system */}
            <Route
              path="/provider-onboarding"
              element={
                <ErrorBoundary>
                  <ProviderOnboardingFlow />
                </ErrorBoundary>
              }
            />
            
            {/* Alternative onboarding route for easier access */}
            <Route
              path="/become-a-provider"
              element={
                <ErrorBoundary>
                  <ProviderOnboardingFlow />
                </ErrorBoundary>
              }
            />

            {/* Alternative onboarding route (without hyphen) */}
            <Route
              path="/provider-onboarding-flow"
              element={
                <ErrorBoundary>
                  <ProviderOnboardingFlow />
                </ErrorBoundary>
              }
            />

            {/* Phase 1 Route */}
            <Route
              path="/provider-onboarding/phase1"
              element={
                <ErrorBoundary>
                  <ProviderOnboardingPhase1 />
                </ErrorBoundary>
              }
            />

            {/* Phase 2 Entry Point - Token validation */}
            <Route
              path="/provider-onboarding/phase2"
              element={
                <ErrorBoundary>
                  <Phase2Entry />
                </ErrorBoundary>
              }
            />

            {/* Phase 2 Steps */}
            <Route
              path="/provider-onboarding/phase2/:step"
              element={
                <ErrorBoundary>
                  <ProviderOnboardingFlow />
                </ErrorBoundary>
              }
            />

            {/* Onboarding Complete */}
            <Route
              path="/provider-onboarding/complete"
              element={
                <ErrorBoundary>
                  <ProviderOnboardingFlow />
                </ErrorBoundary>
              }
            />



            {/* 404 - Catch all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Analytics />
      <SpeedInsights />
      <AnnouncementPopup appType="provider" />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
