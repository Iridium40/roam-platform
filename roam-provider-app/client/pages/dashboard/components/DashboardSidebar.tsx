import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  Building,
  MapPin,
  FileText,
  Bell,
  X,
} from "lucide-react";

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const navigationItems = [
  {
    id: "bookings",
    label: "Bookings",
    icon: Calendar,
    description: "Manage appointments and schedules",
    badge: "12",
  },
  {
    id: "revenue",
    label: "Revenue",
    icon: DollarSign,
    description: "Track earnings and payments",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "Business insights and reports",
  },
  {
    id: "locations",
    label: "Locations",
    icon: MapPin,
    description: "Manage business locations",
    badge: "2",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Manage alerts and communications",
    badge: "3",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    description: "Business configuration",
  },
];

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  onTabChange,
  isMobileOpen,
  onMobileClose,
}) => {
  // Handle tab change and close mobile menu
  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    // Close mobile menu when a tab is selected
    if (window.innerWidth < 768) {
      onMobileClose();
    }
  };

  // Debug: Log navigation items
  console.log('Navigation items:', navigationItems.map(item => ({ id: item.id, label: item.label })));
  console.log('Active tab:', activeTab);
  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[45] md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-[60] w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{ minHeight: '100vh' }}
      >
        <div className="flex flex-col h-full">
          {/* Mobile close button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 md:hidden">
            <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
            <Button variant="ghost" size="sm" onClick={onMobileClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {/* Debug: Show total navigation items */}
            <div className="text-xs text-gray-500 mb-2">
              Total items: {navigationItems.length}
            </div>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              console.log('Rendering navigation item:', item.id, item.label);

              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={`
                    w-full justify-start h-auto p-3
                    ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-gray-100"}
                    ${item.id === 'staff' ? 'border-2 border-red-500' : ''}
                  `}
                  onClick={() => handleTabChange(item.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5" />
                    <div className="flex-1 text-left">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs opacity-70 mt-1">{item.description}</p>
                    </div>
                  </div>
                </Button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p>ROAM Partner Portal</p>
              <p>v1.0.0</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
