import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  Calendar,
  DollarSign,
  Settings,
  Bell,
  AlertCircle,
  Building,
  Home,
  User,
  Menu,
  X,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useProviderAuth } from "@/contexts/auth/ProviderAuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import type { Provider } from "@roam/shared";
import type { BusinessProfile } from "@roam/shared";

// Lazy load heavy components for better initial load performance
const StaffManager = lazy(() => import("@/components/StaffManager").then(m => ({ default: m.StaffManager })));

// Import the new modular tab components
// Lazy load heavy tabs
const FinancialsTab = lazy(() => import("./dashboard/components/FinancialsTab"));
import {
  DashboardTab,
  BookingsTab,
  ServicesTab,
  ProfileTab,
  BusinessSettingsTab,
  SettingsTab,
} from "./dashboard/components";

// Loading fallback component
const TabLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Extended Provider type with nested relations for dashboard optimization
interface ProviderWithRelations extends Provider {
  business_profiles?: {
    id: string;
    business_name: string;
    business_type: string;
    phone: string;
    contact_email: string;
    website_url: string | null;
    business_description: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
    is_active: boolean;
    created_at: string;
  };
  
  business_locations?: Array<{
    id: string;
    location_name: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    is_primary: boolean;
    is_active: boolean;
  }>;
}

// Service category and subcategory types for database integration
interface ServiceCategory {
  id: string;
  service_category_type: string;
  description: string;
  is_active: boolean;
  image_url?: string;
  sort_order?: number;
}

interface ServiceSubcategory {
  id: string;
  category_id: string;
  service_subcategory_type: string;
  description: string;
  is_active: boolean;
  image_url?: string;
  category?: ServiceCategory;
}

export default function ProviderDashboard() {
  const { provider, signOut, isOwner, isDispatcher, isProvider, loading: authLoading } = useProviderAuth();
  const user = provider; // Map provider to user for compatibility
  const userId = provider?.user_id; // Get the user ID from the provider record
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Role-based permission checker
  const hasAccess = (feature: string): boolean => {
    if (isOwner) return true; // Owners have full access
    
    if (isDispatcher) {
      // Dispatchers can access: Dashboard, Bookings, Staff (read-only), Services (read-only), Profile (own profile settings), Settings
      // NO access to: Financials, Business Settings
      return ['dashboard', 'bookings', 'staff', 'services', 'profile', 'settings'].includes(feature);
    }
    
    if (isProvider) {
      // Providers can access: My Bookings, My Profile, Settings
      // NO access to: Dashboard, Staff, Financials, Business Settings, Services
      return ['bookings', 'profile', 'settings'].includes(feature);
    }
    
    return false;
  };

  // Determine current tab from URL
  const getCurrentTab = () => {
    const pathParts = location.pathname.split('/');
    const section = pathParts[pathParts.length - 1]; // Get the last part of the path
    
    // Handle various tab names
    switch (section) {
      case 'dashboard':
        return 'dashboard';
      case 'bookings':
        return 'bookings';
      case 'services':
        return 'services';
      case 'staff':
        return 'staff';
      case 'financials':
        return 'financials';
      case 'profile':
        return 'profile';
      case 'business-settings':
        return 'business-settings';
      case 'settings':
        return 'settings';
      default:
        // Providers should default to bookings, not dashboard
        return isProvider && !isOwner && !isDispatcher ? 'bookings' : 'dashboard';
    }
  };

  const activeTab = getCurrentTab();

  // Get the base path for navigation (depends on user role)
  const getBasePath = () => {
    if (isOwner) return '/owner';
    if (isDispatcher) return '/dispatcher';
    return '/provider';
  };

  const basePath = getBasePath();

  // Redirect providers away from dashboard and services if they somehow access them
  useEffect(() => {
    if (isProvider && !isOwner && !isDispatcher) {
      if (activeTab === 'dashboard') {
        navigate(`${basePath}/bookings`, { replace: true });
      } else if (activeTab === 'services') {
        navigate(`${basePath}/bookings`, { replace: true });
      }
    }
  }, [isProvider, isOwner, isDispatcher, activeTab, basePath, navigate]);

  // Legacy: Services used to be a top-level page. Redirect owners/dispatchers to Business Settings -> Services.
  useEffect(() => {
    if (!isProvider && (isOwner || isDispatcher) && activeTab === "services") {
      navigate(`${basePath}/business-settings?tab=services`, { replace: true });
    }
  }, [activeTab, basePath, isDispatcher, isOwner, isProvider, navigate]);

  // Legacy: Staff used to be a top-level page. Redirect owners/dispatchers to Business Settings -> Staff.
  useEffect(() => {
    if (!isProvider && (isOwner || isDispatcher) && activeTab === "staff") {
      navigate(`${basePath}/business-settings?tab=staff`, { replace: true });
    }
  }, [activeTab, basePath, isDispatcher, isOwner, isProvider, navigate]);

  // Navigation helper
  const navigateToTab = (tab: string) => {
    navigate(`${basePath}/${tab}`);
  };

  const [isAvailable, setIsAvailable] = useState(true);
    // Core state management - only state needed for the dashboard shell
  const [providerData, setProviderData] = useState<ProviderWithRelations | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false); // Changed: only tracks data loading, not auth
  const [error, setError] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Get notification count for bell icon
  const businessId = business?.id || providerData?.business_id;
  const { count: notificationCount } = useNotificationCount(businessId);

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/provider-portal", { replace: true });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
      navigate("/provider-portal", { replace: true });
    }
  };

  // Data loading effect - only runs when auth is complete and we have a user
  useEffect(() => {
    const loadInitialData = async () => {
      // Wait for auth to complete and provide user data
      if (!userId) return;

      try {
        setDataLoading(true);

        // ✅ Optimized: Single query with nested relations (admin app pattern)
        // Note: We don't filter by is_active here to allow approved providers to access
        // the dashboard to complete Phase 2 onboarding (which sets is_active to true)
        const { data: providerData, error: providerError } = await supabase
          .from('providers')
          .select(`
            *,
            business_profiles!business_id (
              id,
              business_name,
              business_type,
              phone,
              contact_email,
              website_url,
              business_description,
              logo_url,
              cover_image_url,
              is_active,
              created_at
            )
          `)
          .eq('user_id', userId)
          .maybeSingle();

        if (providerError) throw providerError;
        
        if (!providerData) {
          setError(`Provider profile not found for user ID: ${userId}. Please check the database.`);
          return;
        }

        // ✅ Set all data from single query (no additional queries needed)
        // Type assertion since we've already checked providerData is not null above
        const typedProviderData = providerData as ProviderWithRelations;
        setProviderData(typedProviderData);
        
        if (typedProviderData.business_profiles) {
          // Cast to partial since nested query doesn't return all fields
          setBusiness(typedProviderData.business_profiles as any);
        }
        
        // Load business locations separately
        if (typedProviderData.business_id) {
          const { data: locationsData, error: locationsError } = await supabase
            .from('business_locations')
            .select('*')
            .eq('business_id', typedProviderData.business_id)
            .eq('is_active', true)
            .order('is_primary', { ascending: false });

          if (locationsError) {
            console.error('Error loading business locations:', locationsError);
          } else {
            setLocations(locationsData || []);
          }
        }

        // Note: Staff data and bookings are now loaded by their respective tab components

      } catch (error: any) {
        console.error('Error loading initial data:', error);
        setError(error.message || 'Failed to load dashboard data');
      } finally {
        setDataLoading(false);
      }
    };

    loadInitialData();
  }, [userId]);

  // Show loading if auth is loading OR if we're fetching dashboard data
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {authLoading ? "Authenticating..." : "Loading dashboard..."}
          </p>
        </div>
      </div>
    );
  }

  // If auth is complete but no provider found, show authentication error
  if (!authLoading && !provider) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access the dashboard.</p>
          <Button onClick={() => navigate("/provider-portal")}>Go to Sign In</Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <img
                src="/default-placeholder_2.png"
                alt="ROAM Provider Management"
                className="h-12 w-auto"
              />
            </div>
            
          </div>

          {/* Desktop Navigation (centered) */}
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-1 border border-gray-200">
              {hasAccess('dashboard') && (
                <button
                  onClick={() => navigateToTab("dashboard")}
                  className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                    activeTab === "dashboard"
                      ? "bg-[#f88221] text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Dashboard
                </button>
              )}
              {hasAccess('bookings') && (
                <button
                  onClick={() => navigateToTab("bookings")}
                  className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                    activeTab === "bookings"
                      ? "bg-[#f88221] text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Bookings
                </button>
              )}
              {hasAccess('financials') && (
                <button
                  onClick={() => navigateToTab("financials")}
                  className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                    activeTab === "financials"
                      ? "bg-[#f88221] text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Financials
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                const basePath = getBasePath();
                navigate(`${basePath}/bookings?unread=true`);
              }}
              className={notificationCount.unreadMessages > 0 ? "text-red-600 hover:text-red-700" : ""}
            >
              <Bell 
                className={`w-4 h-4 ${notificationCount.unreadMessages > 0 ? "text-red-600 animate-heartbeat" : ""}`} 
              />
            </Button>
            <div className="hidden lg:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {hasAccess('profile') && (
                    <DropdownMenuItem onClick={() => navigateToTab("profile")}>
                      <User className="w-4 h-4 mr-2" />
                      Profile Settings
                    </DropdownMenuItem>
                  )}
                  {hasAccess('business-settings') && (
                    <DropdownMenuItem onClick={() => navigateToTab("business-settings")}>
                      <Building className="w-4 h-4 mr-2" />
                      Business Settings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden"
            >
              <Menu className="w-4 h-4" />
            </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          
          {/* Sliding Menu */}
          <div className="fixed inset-y-0 left-0 w-64 bg-white z-50 shadow-xl transform transition-transform duration-300 lg:hidden overflow-y-auto">
            {/* Close Button */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Navigation</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileMenu(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Navigation Links */}
            <nav className="p-4 space-y-2">
              {hasAccess('dashboard') && (
                <Button
                  variant={activeTab === "dashboard" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    navigateToTab("dashboard");
                    setShowMobileMenu(false);
                  }}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              )}
              
              {hasAccess('bookings') && (
                <Button
                  variant={activeTab === "bookings" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    navigateToTab("bookings");
                    setShowMobileMenu(false);
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Bookings
                </Button>
              )}
              
              {hasAccess('financials') && (
                <Button
                  variant={activeTab === "financials" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    navigateToTab("financials");
                    setShowMobileMenu(false);
                  }}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Financials
                </Button>
              )}
              
              {hasAccess('profile') && (
                <Button
                  variant={activeTab === "profile" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    navigateToTab("profile");
                    setShowMobileMenu(false);
                  }}
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile Settings
                </Button>
              )}
              
              {hasAccess('business-settings') && (
                <Button
                  variant={activeTab === "business-settings" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    navigateToTab("business-settings");
                    setShowMobileMenu(false);
                  }}
                >
                  <Building className="w-4 h-4 mr-2" />
                  Business Settings
                </Button>
              )}

              {/* Sign Out */}
              <div className="pt-4 border-t mt-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </Button>
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="px-6 py-8">
        {/* Dashboard Tab - Hidden for providers */}
        {activeTab === "dashboard" && hasAccess('dashboard') && (
          <DashboardTab
            providerData={providerData}
            business={business}
            providerRole={providerData?.provider_role}
          />
        )}

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <BookingsTab
            providerData={providerData}
            business={business}
            providerRole={providerData?.provider_role}
          />
        )}

        {/* Services Tab - Hidden for providers */}
        {activeTab === "services" && hasAccess('services') && (
          <ServicesTab
            providerData={providerData}
            business={business}
          />
        )}

        {/* Staff Tab */}
        {activeTab === "staff" && (
          <Suspense fallback={<TabLoadingFallback />}>
            <StaffManager
              businessId={business?.id || providerData?.business_id || ""}
              locations={locations}
            />
          </Suspense>
        )}

        {/* Financials Tab */}
        {activeTab === "financials" && (
          <Suspense fallback={<TabLoadingFallback />}>
            <FinancialsTab
              providerData={providerData}
              business={business}
            />
          </Suspense>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <ProfileTab
            providerData={providerData}
            business={business}
          />
        )}

        {/* Business Settings Tab */}
        {activeTab === "business-settings" && (
          <BusinessSettingsTab
            providerData={providerData}
            business={business}
          />
        )}

        {/* Settings Tab (Notification Settings) */}
        {activeTab === "settings" && (
          <SettingsTab
            providerData={providerData}
          />
        )}

        {/* Keep all existing modals and other UI components */}
        {/* ... [Keep all the existing modals, dialogs, and other UI components from the original file] */}
      </main>
    </div>
  );
}
