import { NotificationPreferences } from '@/components/NotificationPreferences';

export default function ProviderSettings() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
          <p className="text-muted-foreground">
            Manage how you receive updates about bookings and business activities
          </p>
        </div>

        {/* Notification Preferences Component */}
        <NotificationPreferences />
      </div>
    </div>
  );
}

