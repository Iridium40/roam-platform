import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth/AuthProvider";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardSidebar } from "./components/DashboardSidebar";
import { DashboardContent } from "./components/DashboardContent";
import { FullScreenLoader } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import type { Provider, BusinessProfile } from "@/lib/database.types";

export default function ProviderDashboard() {
  const { provider, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("bookings");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState({
    provider: null as Provider | null,
    business: null as BusinessProfile | null,
    bookings: [],
    staffMembers: [],
    locations: [],
    metrics: {
      activeLocations: 0,
      teamMembers: 0,
      servicesOffered: 0,
      totalBookings: 0,
      totalRevenue: 0,
    },
  });

  useEffect(() => {
    if (!authLoading && provider) {
      initializeDashboard();
    }
  }, [authLoading, provider]);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load dashboard data
      const data = await loadDashboardData();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    // This would be implemented to load all dashboard data
    // For now, return mock data structure
    return {
      provider: provider,
      business: null,
      bookings: [],
      staffMembers: [],
      locations: [],
      metrics: {
        activeLocations: 0,
        teamMembers: 0,
        servicesOffered: 0,
        totalBookings: 0,
        totalRevenue: 0,
      },
    };
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleRefresh = () => {
    initializeDashboard();
  };

  if (authLoading) {
    return <FullScreenLoader text="Loading dashboard..." />;
  }

  if (!provider) {
    return (
      <ErrorState
        error="You must be logged in as a provider to access this dashboard"
        title="Access Denied"
        showActions={false}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        title="Dashboard Error"
        onRetry={handleRefresh}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        provider={dashboardData.provider}
        business={dashboardData.business}
        onMobileMenuToggle={() => setShowMobileMenu(!showMobileMenu)}
      />

      <div className="flex">
        <DashboardSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isMobileOpen={showMobileMenu}
          onMobileClose={() => setShowMobileMenu(false)}
        />

        <DashboardContent
          activeTab={activeTab}
          data={dashboardData}
          loading={loading}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
}
