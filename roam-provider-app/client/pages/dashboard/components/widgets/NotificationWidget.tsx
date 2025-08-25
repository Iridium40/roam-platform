import React from "react";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

interface NotificationWidgetProps {
  onRefresh: () => void;
}

export const NotificationWidget: React.FC<NotificationWidgetProps> = ({ onRefresh }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
        <p className="text-gray-600">Manage alerts and communications</p>
      </div>

      <EmptyState
        title="Notification management coming soon"
        description="This feature is currently under development."
        icon={<Bell className="w-12 h-12 text-gray-400" />}
      />
    </div>
  );
};
