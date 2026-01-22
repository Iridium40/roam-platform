import "./global.css";

import { Toaster } from "@/components/ui/toaster";
// Import testUtils only in development
if (import.meta.env.DEV) {
  import("@/utils/testUtils");
}
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { PageErrorBoundary } from "@/components/ErrorBoundary";
import AnnouncementPopup from "@/components/AnnouncementPopup";
import { CustomerFavorites } from "@/components/CustomerFavorites";
import ScrollToTop from "@/components/ScrollToTop";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const BookingDetails = lazy(() => import("./pages/BookingDetails"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BookService = lazy(() => import("./pages/BookService"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const BusinessProfile = lazy(() => import("./pages/BusinessProfile"));
const ProviderProfile = lazy(() => import("./pages/ProviderProfile"));
const MarketingLanding = lazy(() => import("./pages/MarketingLanding"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const SignIn = lazy(() => import("./pages/SignIn"));
const BecomeProvider = lazy(() => import("./pages/BecomeProvider"));
const CustomerLocations = lazy(() => import("./pages/CustomerLocations"));
const CustomerTransactions = lazy(() => import("./pages/CustomerTransactions"));
const CustomerProfile = lazy(() => import("./pages/CustomerProfile"));
const CustomerSettings = lazy(() => import("./pages/CustomerSettings"));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const Test = lazy(() => import("./pages/Test"));
const TipSuccess = lazy(() => import("./pages/TipSuccess"));
const TipCancel = lazy(() => import("./pages/TipCancel"));
const PayBalance = lazy(() => import("./pages/PayBalance"));
const BalancePaymentSuccess = lazy(() => import("./pages/BalancePaymentSuccess"));
const Privacy = lazy(() => import("./pages/Privacy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const Accessibility = lazy(() => import("./pages/Accessibility"));
const Services = lazy(() => import("./pages/Services"));
const BusinessResults = lazy(() => import("./pages/BusinessResults"));

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

// Configure QueryClient with optimized caching defaults for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data considered fresh for 5 minutes
      gcTime: 1000 * 60 * 30, // Cache garbage collected after 30 minutes (formerly cacheTime)
      retry: 2, // Retry failed requests twice
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      retry: 1, // Retry failed mutations once
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <PageErrorBoundary>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<MarketingLanding />} />
                <Route path="/bookings" element={<MyBookings />} />
                <Route path="/book-service/:serviceId" element={<BookService />} />
                <Route path="/booking-success" element={<BookingSuccess />} />
                <Route path="/business/:businessId" element={<BusinessProfile />} />
                <Route path="/provider/:providerId" element={<ProviderProfile />} />
                <Route path="/landing" element={<MarketingLanding />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/whyroam" element={<MarketingLanding />} />
                <Route path="/booknow" element={<Index />} />
                <Route path="/home" element={<Index />} />
                <Route path="/sign-in" element={<SignIn />} />
                <Route path="/become-a-provider" element={<BecomeProvider />} />
                <Route
                  path="/my-bookings"
                  element={
                    <ProtectedRoute>
                      <MyBookings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-bookings/:bookingId"
                  element={
                    <ProtectedRoute>
                      <BookingDetails />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-bookings/:bookingId/pay-balance"
                  element={
                    <ProtectedRoute>
                      <PayBalance />
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
                <Route
                  path="/customer/payment-methods"
                  element={
                    <ProtectedRoute>
                      <PaymentMethods />
                    </ProtectedRoute>
                  }
                />
                <Route path="/test" element={<Test />} />
                <Route path="/tip-success" element={<TipSuccess />} />
                <Route path="/tip-cancel" element={<TipCancel />} />
                <Route path="/balance-payment-success" element={<BalancePaymentSuccess />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/cookie-policy" element={<CookiePolicy />} />
                <Route path="/accessibility" element={<Accessibility />} />
                <Route path="/services" element={<Services />} />
                <Route path="/businesses" element={<BusinessResults />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </PageErrorBoundary>
      </BrowserRouter>
      <AnnouncementPopup appType="customer" />
    </TooltipProvider>
  </QueryClientProvider>
);export default App;
