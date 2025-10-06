import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  Loader2,
  Bell,
  Volume2,
  Smartphone,
  Mail,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface UserSettings {
  id?: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  sound_enabled: boolean;
  auto_logout_minutes: number;
  date_format: string;
  time_format: '12h' | '24h';
  items_per_page: number;
  sidebar_collapsed: boolean;
}

interface UserSettingsSectionProps {
  userId: string;
  providerId: string;
}

export default function UserSettingsSection({ userId, providerId }: UserSettingsSectionProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationPhone, setNotificationPhone] = useState<string>('');
  const [notificationEmail, setNotificationEmail] = useState<string>('');
  const [settings, setSettings] = useState<UserSettings>({
    user_id: userId,
    theme: 'system',
    language: 'en',
    timezone: 'America/Chicago', // CST
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
    sound_enabled: true,
    auto_logout_minutes: 60,
    date_format: 'MM/DD/YYYY',
    time_format: '12h',
    items_per_page: 25,
    sidebar_collapsed: false,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings
  useEffect(() => {
    loadSettings();
  }, [userId, providerId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load user settings
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      } else {
        // Create default settings for new user
        await createDefaultSettings();
      }

      // Load provider notification_phone and notification_email
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('notification_phone, notification_email')
        .eq('id', providerId)
        .single();

      if (providerError) {
        console.error('Error loading provider notification data:', providerError);
      } else if (providerData) {
        setNotificationPhone(providerData.notification_phone || '');
        setNotificationEmail(providerData.notification_email || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    try {
      const defaultSettings: UserSettings = {
        user_id: userId,
        theme: 'system',
        language: 'en',
        timezone: 'America/Chicago', // CST
        email_notifications: true,
        push_notifications: true,
        sms_notifications: false,
        sound_enabled: true,
        auto_logout_minutes: 60,
        date_format: 'MM/DD/YYYY',
        time_format: '12h',
        items_per_page: 25,
        sidebar_collapsed: false,
      };

      const { data, error } = await supabase
        .from('user_settings')
        .insert([defaultSettings])
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Save user settings
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Save provider notification_phone and notification_email
      const { error: notificationError } = await supabase
        .from('providers')
        .update({ 
          notification_phone: notificationPhone.trim() || null,
          notification_email: notificationEmail.trim() || null 
        })
        .eq('id', providerId);

      if (notificationError) throw notificationError;

      setHasChanges(false);
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateNotificationPhone = (value: string) => {
    setNotificationPhone(value);
    setHasChanges(true);
  };

  const updateNotificationEmail = (value: string) => {
    setNotificationEmail(value);
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-roam-blue" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Settings</h2>
          <p className="text-sm text-gray-600">Manage your notification preferences</p>
        </div>
        {hasChanges && (
          <Button onClick={saveSettings} disabled={saving} className="mt-4 sm:mt-0">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        )}
      </div>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>
            Manage how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_notifications">Email Notifications</Label>
                <p className="text-sm text-gray-500">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="email_notifications"
                checked={settings.email_notifications}
                onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
              />
            </div>

            {/* Notification Email Address */}
            {settings.email_notifications && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="notification_email">Notification Email Address</Label>
                <Input
                  id="notification_email"
                  type="email"
                  placeholder="notifications@example.com"
                  value={notificationEmail}
                  onChange={(e) => updateNotificationEmail(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Enter the email address where you want to receive notifications (optional, defaults to account email)
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push_notifications">Push Notifications</Label>
              <p className="text-sm text-gray-500">
                Receive push notifications in your browser
              </p>
            </div>
            <Switch
              id="push_notifications"
              checked={settings.push_notifications}
              onCheckedChange={(checked) => updateSetting('push_notifications', checked)}
            />
          </div>

          <Separator />

          {/* Sound Enabled */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center">
              <Volume2 className="w-4 h-4 mr-2 text-gray-500" />
              <div>
                <Label htmlFor="sound_enabled">Notification Sounds</Label>
                <p className="text-sm text-gray-500">
                  Play sound when notifications arrive
                </p>
              </div>
            </div>
            <Switch
              id="sound_enabled"
              checked={settings.sound_enabled}
              onCheckedChange={(checked) => updateSetting('sound_enabled', checked)}
            />
          </div>

          <Separator />

          {/* SMS Notifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex items-center">
                <Smartphone className="w-4 h-4 mr-2 text-gray-500" />
                <div>
                  <Label htmlFor="sms_notifications">SMS Notifications</Label>
                  <p className="text-sm text-gray-500">
                    Receive notifications via text message
                  </p>
                </div>
              </div>
              <Switch
                id="sms_notifications"
                checked={settings.sms_notifications}
                onCheckedChange={(checked) => updateSetting('sms_notifications', checked)}
              />
            </div>

            {/* Notification Phone Number */}
            {settings.sms_notifications && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="notification_phone">Notification Phone Number</Label>
                <Input
                  id="notification_phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={notificationPhone}
                  onChange={(e) => updateNotificationPhone(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Enter the phone number where you want to receive SMS notifications
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
