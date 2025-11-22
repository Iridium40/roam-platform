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

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const SimpleHomeIndex = lazy(() => import("./pages/SimpleHomeIndex"));
const IndexFixed = lazy(() => import("./pages/IndexFixed"));
const MyBookingsFixed = lazy(() => import("./pages/MyBookingsFixed"));
const ProgressiveIndex = lazy(() => import("./pages/ProgressiveIndex"));
const SimpleIndex = lazy(() => import("./pages/SimpleIndex"));
const SimpleMyBookingsTest = lazy(() => import("./pages/SimpleMyBookingsTest"));
const MinimalMyBookings = lazy(() => import("./pages/MinimalMyBookings"));
const WorkingMyBookings = lazy(() => import("./pages/WorkingMyBookings"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BookService = lazy(() => import("./pages/BookService"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const BusinessProfile = lazy(() => import("./pages/BusinessProfile"));
const TwilioMessagingTest = lazy(() => import("./components/TwilioMessagingTest"));
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
const Privacy = lazy(() => import("./pages/Privacy"));
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
                  path="/my-bookings-protected"
                  element={
                    <ProtectedRoute>
                      <SimpleMyBookingsTest />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-bookings-full"
                  element={<MinimalMyBookings />}
                />
                <Route
                  path="/my-bookings-mock"
                  element={
                    <ProtectedRoute>
                      <WorkingMyBookings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-bookings-original"
                  element={<MyBookings />}
                />
                <Route
                  path="/test-twilio"
                  element={<TwilioMessagingTest />}
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
                <Route path="/privacy" element={<Privacy />} />
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
