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
const SimpleMyBookings = lazy(() => import("./pages/SimpleMyBookings"));
const ProgressiveIndex = lazy(() => import("./pages/ProgressiveIndex"));
const SimpleIndex = lazy(() => import("./pages/SimpleIndex"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BookService = lazy(() => import("./pages/BookService"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const BusinessProfile = lazy(() => import("./pages/BusinessProfile"));
const ProviderProfile = lazy(() => import("./pages/ProviderProfile"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const WhyRoam = lazy(() => import("./pages/WhyRoam"));
const SignIn = lazy(() => import("./pages/SignIn"));
const BecomeProvider = lazy(() => import("./pages/BecomeProvider"));
const CustomerLocations = lazy(() => import("./pages/CustomerLocations"));
const CustomerTransactions = lazy(() => import("./pages/CustomerTransactions"));
const CustomerProfile = lazy(() => import("./pages/CustomerProfile"));
const CustomerSettings = lazy(() => import("./pages/CustomerSettings"));
const Test = lazy(() => import("./pages/Test"));

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
                <Route path="/" element={<SimpleHomeIndex />} />
                <Route path="/bookings" element={<SimpleMyBookings />} />
                <Route path="/book-service/:serviceId" element={<BookService />} />
                <Route path="/booking-success" element={<BookingSuccess />} />
                <Route path="/business/:businessId" element={<BusinessProfile />} />
                <Route path="/provider/:providerId" element={<ProviderProfile />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/whyroam" element={<WhyRoam />} />
                <Route path="/sign-in" element={<SignIn />} />
                <Route path="/become-a-provider" element={<BecomeProvider />} />
                <Route
                  path="/my-bookings"
                  element={
                    <ProtectedRoute>
                      <SimpleMyBookings />
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
                <Route path="/test" element={<Test />} />
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
