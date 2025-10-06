import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Mail,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Volume2,
  Loader2,
  Smartphone,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

interface UserSettings {
  id?: string;
  user_id: string;
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  sound_enabled: boolean;
  auto_logout_minutes: number;
  date_format: string;
  time_format: string;
  items_per_page: number;
  sidebar_collapsed: boolean;
  created_at?: string;
  updated_at?: string;
}

const defaultSettings: Partial<UserSettings> = {
  theme: "system",
  language: "en",
  timezone: "America/Chicago", // CST
  email_notifications: true,
  push_notifications: true,
  sms_notifications: false,
  sound_enabled: true,
  auto_logout_minutes: 60,
  date_format: "MM/DD/YYYY",
  time_format: "12h",
  items_per_page: 25,
  sidebar_collapsed: false,
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [notificationPhone, setNotificationPhone] = useState<string>("");
  const [notificationEmail, setNotificationEmail] = useState<string>("");
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  const { user } = useAuth();

  // Form state for editing
  const [editForm, setEditForm] = useState<Partial<UserSettings>>({});

  // Fetch user settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        setError("No authenticated user found");
        return;
      }

      // Fetch admin user info for notification phone and email
      const { data: adminData } = await supabase
        .from("admin_users")
        .select("id, notification_phone, notification_email")
        .eq("user_id", user.id)
        .single();

      if (adminData) {
        setAdminUserId(adminData.id);
        setNotificationPhone(adminData.notification_phone || "");
        setNotificationEmail(adminData.notification_email || "");
      }

      // Load user settings
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data as UserSettings);
        setEditForm(data);
      } else {
        // Create default settings for new user
        await createDefaultSettings();
      }
    } catch (error: any) {
      console.error("Error in fetchSettings:", error);
      setError(`Failed to load settings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Create default settings
  const createDefaultSettings = async () => {
    try {
      if (!user?.id) return;

      const newSettings = {
        ...defaultSettings,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from("user_settings")
        .insert([newSettings])
        .select()
        .single();

      if (error) throw error;

      setSettings(data as UserSettings);
      setEditForm(data);
    } catch (error: any) {
      console.error("Error creating default settings:", error);
      // Use defaults locally if database insert fails
      const userSettings = { ...defaultSettings, user_id: user?.id };
      setSettings(userSettings as UserSettings);
      setEditForm(userSettings);
    }
  };

  // Save settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!user?.id) {
        setError("No authenticated user found");
        return;
      }

      const settingsData = {
        ...editForm,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      // Save notification phone and email to admin_users if we have an admin user ID
      if (adminUserId) {
        const { error: notificationError } = await supabase
          .from("admin_users")
          .update({ 
            notification_phone: notificationPhone?.trim() || null,
            notification_email: notificationEmail?.trim() || null
          })
          .eq("id", adminUserId);

        if (notificationError) {
          console.error("Error updating notification settings:", notificationError);
        }
      }

      // Try to update existing settings or insert new ones
      const { data, error } = await supabase
        .from("user_settings")
        .upsert(settingsData, {
          onConflict: "user_id",
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving settings to database:", error);
        // Fallback to localStorage
        localStorage.setItem("admin_settings", JSON.stringify(editForm));
        setSuccessMessage("Settings saved locally (database unavailable)");
      } else {
        setSettings(data as UserSettings);
        setSuccessMessage("Settings saved successfully!");
        // Also backup to localStorage
        localStorage.setItem("admin_settings", JSON.stringify(data));
      }

      setUnsavedChanges(false);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Apply theme changes immediately
      applyTheme(editForm.theme || "system");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      setError(`Error saving settings: ${error.message}`);

      // Fallback to localStorage
      localStorage.setItem("admin_settings", JSON.stringify(editForm));
      setSuccessMessage("Settings saved locally (database error)");
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Apply theme to document
  const applyTheme = (theme: string) => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else if (theme === "system") {
      // Use system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  };

  // Handle form changes
  const handleChange = (key: keyof UserSettings, value: any) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setEditForm({ ...defaultSettings, user_id: user?.id });
    setUnsavedChanges(true);
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  // Apply theme on initial load
  useEffect(() => {
    if (settings?.theme) {
      applyTheme(settings.theme);
    }
  }, [settings]);

  if (loading) {
    return (
      <AdminLayout title="Settings">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-roam-blue" />
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your notification preferences and account settings
            </p>
          </div>
          {unsavedChanges && (
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="mt-4 sm:mt-0"
            >
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

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {unsavedChanges && (
          <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            <AlertTriangle className="w-5 h-5" />
            <span>
              You have unsaved changes. Remember to save your settings.
            </span>
          </div>
        )}

        {/* Notification Settings - Full width single column */}
        <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent className="space-y-4">
              {/* Email Notifications */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    id="email_notifications"
                    checked={editForm.email_notifications || false}
                    onCheckedChange={(checked) =>
                      handleChange("email_notifications", checked)
                    }
                  />
                </div>

                {/* Notification Email Address */}
                {editForm.email_notifications && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="notification_email">Notification Email Address</Label>
                    <Input
                      id="notification_email"
                      type="email"
                      placeholder="notifications@example.com"
                      value={notificationEmail}
                      onChange={(e) => {
                        setNotificationEmail(e.target.value);
                        setUnsavedChanges(true);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
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
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in your browser
                  </p>
                </div>
                <Switch
                  id="push_notifications"
                  checked={editForm.push_notifications || false}
                  onCheckedChange={(checked) =>
                    handleChange("push_notifications", checked)
                  }
                />
              </div>

              <Separator />

              {/* Sound Enabled */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="sound_enabled">Notification Sounds</Label>
                    <p className="text-sm text-muted-foreground">
                      Play sound when notifications arrive
                    </p>
                  </div>
                </div>
                <Switch
                  id="sound_enabled"
                  checked={editForm.sound_enabled || false}
                  onCheckedChange={(checked) =>
                    handleChange("sound_enabled", checked)
                  }
                />
              </div>

              <Separator />

              {/* SMS Notifications */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor="sms_notifications">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via text message
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="sms_notifications"
                    checked={editForm.sms_notifications || false}
                    onCheckedChange={(checked) =>
                      handleChange("sms_notifications", checked)
                    }
                  />
                </div>

                {/* Notification Phone Number */}
                {editForm.sms_notifications && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="notification_phone">Notification Phone Number</Label>
                    <Input
                      id="notification_phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={notificationPhone}
                      onChange={(e) => {
                        setNotificationPhone(e.target.value);
                        setUnsavedChanges(true);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the phone number where you want to receive SMS notifications
                    </p>
                  </div>
                )}
              </div>
            </ROAMCardContent>
          </ROAMCard>
      </div>
    </AdminLayout>
  );
}
