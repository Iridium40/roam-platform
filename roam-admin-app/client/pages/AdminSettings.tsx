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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings,
  Moon,
  Sun,
  Bell,
  Globe,
  Lock,
  Database,
  Mail,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Shield,
  Eye,
  Clock,
  Palette,
  Volume2,
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
  sound_enabled: boolean;
  auto_logout_minutes: number;
  date_format: string;
  time_format: string;
  items_per_page: number;
  created_at?: string;
  updated_at?: string;
}

const defaultSettings: Partial<UserSettings> = {
  theme: "system",
  language: "en",
  timezone: "UTC",
  email_notifications: true,
  push_notifications: true,
  sound_enabled: true,
  auto_logout_minutes: 60,
  date_format: "MM/DD/YYYY",
  time_format: "12h",
  items_per_page: 25,
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

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

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // If table doesn't exist or user not found, use default settings or localStorage
        if (
          error.code === "PGRST116" ||
          error.message.includes("does not exist")
        ) {
          // Using default/localStorage settings - user_settings table not found or no user record

          // Try to load from localStorage first
          const savedSettings = localStorage.getItem("admin_settings");
          let userSettings;

          if (savedSettings) {
            try {
              userSettings = { ...JSON.parse(savedSettings), user_id: user.id };
            } catch (e) {
              userSettings = { ...defaultSettings, user_id: user.id };
            }
          } else {
            userSettings = { ...defaultSettings, user_id: user.id };
          }

          setSettings(userSettings as UserSettings);
          setEditForm(userSettings);
          return;
        }

        console.error("Error fetching settings:", error);
        setError(`Failed to load settings: ${error.message}`);
        return;
      }

      const userSettings = data || { ...defaultSettings, user_id: user.id };
      setSettings(userSettings as UserSettings);
      setEditForm(userSettings);
    } catch (error: any) {
      console.error("Error in fetchSettings:", error);
      // Use default settings as fallback
      const userSettings = { ...defaultSettings, user_id: user?.id };
      setSettings(userSettings as UserSettings);
      setEditForm(userSettings);
    } finally {
      setLoading(false);
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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Customize your admin panel experience and preferences
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={resetToDefaults} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button
              onClick={saveSettings}
              disabled={saving || !unsavedChanges}
              size="sm"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Appearance Settings */}
          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance
              </ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent className="space-y-6">
              <div>
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={editForm.theme || "system"}
                  onValueChange={(value) => handleChange("theme", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose your preferred theme
                </p>
              </div>


              <div>
                <Label htmlFor="items_per_page">Items per page</Label>
                <Select
                  value={String(editForm.items_per_page || 25)}
                  onValueChange={(value) =>
                    handleChange("items_per_page", parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 items</SelectItem>
                    <SelectItem value="25">25 items</SelectItem>
                    <SelectItem value="50">50 items</SelectItem>
                    <SelectItem value="100">100 items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </ROAMCardContent>
          </ROAMCard>

          {/* Notification Settings */}
          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent className="space-y-6">
              <div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="email_notifications"
                    checked={editForm.email_notifications || false}
                    onCheckedChange={(checked) =>
                      handleChange("email_notifications", checked)
                    }
                  />
                  <Label htmlFor="email_notifications" className="text-sm">
                    Email notifications
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Receive email alerts for important events
                </p>
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="push_notifications"
                    checked={editForm.push_notifications || false}
                    onCheckedChange={(checked) =>
                      handleChange("push_notifications", checked)
                    }
                  />
                  <Label htmlFor="push_notifications" className="text-sm">
                    Push notifications
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Browser notifications for real-time updates
                </p>
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sound_enabled"
                    checked={editForm.sound_enabled || false}
                    onCheckedChange={(checked) =>
                      handleChange("sound_enabled", checked)
                    }
                  />
                  <Label htmlFor="sound_enabled" className="text-sm">
                    Sound alerts
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Play sounds for notifications and alerts
                </p>
              </div>
            </ROAMCardContent>
          </ROAMCard>

          {/* Regional Settings */}
          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Regional & Format
              </ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent className="space-y-6">
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={editForm.timezone || "UTC"}
                  onValueChange={(value) => handleChange("timezone", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">
                      Eastern Time
                    </SelectItem>
                    <SelectItem value="America/Chicago">
                      Central Time
                    </SelectItem>
                    <SelectItem value="America/Denver">
                      Mountain Time
                    </SelectItem>
                    <SelectItem value="America/Los_Angeles">
                      Pacific Time
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date_format">Date Format</Label>
                <Select
                  value={editForm.date_format || "MM/DD/YYYY"}
                  onValueChange={(value) => handleChange("date_format", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="time_format">Time Format</Label>
                <Select
                  value={editForm.time_format || "12h"}
                  onValueChange={(value) => handleChange("time_format", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                    <SelectItem value="24h">24 Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </ROAMCardContent>
          </ROAMCard>

          {/* Security Settings */}
          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security & Privacy
              </ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent className="space-y-6">
              <div>
                <Label htmlFor="auto_logout_minutes">Auto Logout</Label>
                <Select
                  value={String(editForm.auto_logout_minutes || 60)}
                  onValueChange={(value) =>
                    handleChange("auto_logout_minutes", parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="480">8 hours</SelectItem>
                    <SelectItem value="0">Never</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically sign out after inactivity
                </p>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Data & Privacy</h4>
                <p className="text-sm text-muted-foreground">
                  Your settings and preferences are stored securely and are only
                  used to customize your experience.
                </p>
              </div>
            </ROAMCardContent>
          </ROAMCard>
        </div>
      </div>
    </AdminLayout>
  );
}
