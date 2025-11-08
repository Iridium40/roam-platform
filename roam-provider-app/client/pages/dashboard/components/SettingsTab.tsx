import React from 'react';
import { NotificationPreferences } from '@/components/NotificationPreferences';

interface SettingsTabProps {
  providerData: any;
}

export default function SettingsTab({ providerData }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage how you receive updates about bookings and business activities
        </p>
      </div>

      {/* Notification Preferences Component */}
      <NotificationPreferences />
    </div>
  );
}

