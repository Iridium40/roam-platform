import React from "react";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

interface ServiceWidgetProps {
  onRefresh: () => void;
}

export const ServiceWidget: React.FC<ServiceWidgetProps> = ({ onRefresh }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Service Management</h2>
        <p className="text-gray-600">Manage service offerings</p>
      </div>

      <EmptyState
        title="Service management coming soon"
        description="This feature is currently under development."
        icon={<FileText className="w-12 h-12 text-gray-400" />}
      />
    </div>
  );
};
