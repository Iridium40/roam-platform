import { AdminLayout } from "@/components/layout/admin-layout";
import { NotificationPreferences } from "@/components/NotificationPreferences";

export default function AdminSettings() {
  return (
    <AdminLayout title="Settings">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Notification Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage how you receive notifications about business verifications and platform updates
          </p>
        </div>

        {/* Notification Preferences Component */}
        <NotificationPreferences />
      </div>
    </AdminLayout>
  );
}
