import React from "react";
import { MapPin } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

interface LocationWidgetProps {
  data: any[];
  onRefresh: () => void;
}

export const LocationWidget: React.FC<LocationWidgetProps> = ({ data, onRefresh }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Location Management</h2>
        <p className="text-gray-600">Manage business locations</p>
      </div>

      <EmptyState
        title="Location management coming soon"
        description="This feature is currently under development."
        icon={<MapPin className="w-12 h-12 text-gray-400" />}
      />
    </div>
  );
};
