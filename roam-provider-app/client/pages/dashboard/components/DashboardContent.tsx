import React from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { BookingWidget } from "./widgets/BookingWidget";
import { StaffWidget } from "./widgets/StaffWidget";
import { RevenueWidget } from "./widgets/RevenueWidget";
import { AnalyticsWidget } from "./widgets/AnalyticsWidget";
import { LocationWidget } from "./widgets/LocationWidget";
import ServicesTab from "./ServicesTab";
import { NotificationWidget } from "./widgets/NotificationWidget";
import { SettingsWidget } from "./widgets/SettingsWidget";

interface DashboardData {
  provider: any;
  business: any;
  bookings: any[];
  staffMembers: any[];
  locations: any[];
  metrics: {
    activeLocations: number;
    teamMembers: number;
    servicesOffered: number;
    totalBookings: number;
    totalRevenue: number;
  };
}

interface DashboardContentProps {
  activeTab: string;
  data: DashboardData;
  loading: boolean;
  onRefresh: () => void;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({
  activeTab,
  data,
  loading,
  onRefresh,
}) => {
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner text="Loading..." />
        </div>
      );
    }

    switch (activeTab) {
      case "bookings":
        return <BookingWidget data={data.bookings} onRefresh={onRefresh} />;
      case "staff":
        return <StaffWidget data={data.staffMembers} onRefresh={onRefresh} />;
      case "revenue":
        return <RevenueWidget data={data.metrics} onRefresh={onRefresh} />;
      case "analytics":
        return <AnalyticsWidget data={data.metrics} onRefresh={onRefresh} />;
      case "locations":
        return <LocationWidget data={data.locations} onRefresh={onRefresh} />;
      case "services":
        return <ServicesTab providerData={data.provider} business={data.business} />;
      case "notifications":
        return <NotificationWidget onRefresh={onRefresh} />;
      case "settings":
        return <SettingsWidget data={data.business} onRefresh={onRefresh} />;
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Select a tab to view content</p>
          </div>
        );
    }
  };

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {renderContent()}
      </div>
    </main>
  );
};
