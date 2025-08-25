import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

interface RevenueWidgetProps {
  data: any;
  onRefresh: () => void;
}

export const RevenueWidget: React.FC<RevenueWidgetProps> = ({ data, onRefresh }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Revenue Analytics</h2>
        <p className="text-gray-600">Track earnings and payments</p>
      </div>

      <EmptyState
        title="Revenue tracking coming soon"
        description="This feature is currently under development."
        icon={<DollarSign className="w-12 h-12 text-gray-400" />}
      />
    </div>
  );
};
