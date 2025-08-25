import React from "react";
import { Settings } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

interface SettingsWidgetProps {
  data: any;
  onRefresh: () => void;
}

export const SettingsWidget: React.FC<SettingsWidgetProps> = ({ data, onRefresh }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Business Settings</h2>
        <p className="text-gray-600">Business configuration</p>
      </div>

      <EmptyState
        title="Settings coming soon"
        description="This feature is currently under development."
        icon={<Settings className="w-12 h-12 text-gray-400" />}
      />
    </div>
  );
};
