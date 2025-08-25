import React from "react";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

interface AnalyticsWidgetProps {
  data: any;
  onRefresh: () => void;
}

export const AnalyticsWidget: React.FC<AnalyticsWidgetProps> = ({ data, onRefresh }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Business Analytics</h2>
        <p className="text-gray-600">Business insights and reports</p>
      </div>

      <EmptyState
        title="Analytics coming soon"
        description="This feature is currently under development."
        icon={<BarChart3 className="w-12 h-12 text-gray-400" />}
      />
    </div>
  );
};
