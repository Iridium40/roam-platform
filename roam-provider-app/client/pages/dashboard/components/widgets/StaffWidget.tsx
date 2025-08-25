import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

interface StaffWidgetProps {
  data: any[];
  onRefresh: () => void;
}

export const StaffWidget: React.FC<StaffWidgetProps> = ({ data, onRefresh }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
          <p className="text-gray-600">Manage team members and roles</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      <EmptyState
        title="Staff management coming soon"
        description="This feature is currently under development."
        icon={<Users className="w-12 h-12 text-gray-400" />}
      />
    </div>
  );
};
