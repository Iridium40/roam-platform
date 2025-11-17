import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { NotificationPreferences } from '@/components/NotificationPreferences';

export default function CustomerSettings() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back to Home Button */}
        <div className="mb-6">
          <Link to="/booknow">
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-foreground/70 hover:text-foreground hover:bg-accent/50 px-3 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
          <p className="text-muted-foreground">
            Choose how you want to receive updates about your bookings
          </p>
        </div>

        {/* Notification Preferences Component */}
        <NotificationPreferences />
      </div>
    </div>
  );
}
