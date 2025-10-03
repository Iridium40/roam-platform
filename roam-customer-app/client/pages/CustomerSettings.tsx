import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Bell, Mail, MessageSquare, Shield, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function CustomerSettings() {
  const { customer } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    email_notifications: true,
    sms_notifications: true,
    push_notifications: true,
    marketing_emails: false,
  });

  useEffect(() => {
    if (customer) {
      loadSettings();
    }
  }, [customer]);

  const loadSettings = async () => {
    if (!customer) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('email_notifications, sms_notifications, push_notifications, marketing_emails')
        .eq('user_id', customer.user_id)
        .single();

      if (error) throw error;

      setSettings({
        email_notifications: data.email_notifications ?? true,
        sms_notifications: data.sms_notifications ?? true,
        push_notifications: data.push_notifications ?? true,
        marketing_emails: data.marketing_emails ?? false,
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customer) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('customer_profiles')
        .update({
          email_notifications: settings.email_notifications,
          sms_notifications: settings.sms_notifications,
          push_notifications: settings.push_notifications,
          marketing_emails: settings.marketing_emails,
        })
        .eq('user_id', customer.user_id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-roam-blue mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back to Home Button */}
        <div className="mb-6">
          <Link to="/">
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">
              Manage your notification preferences and account settings
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <SettingsIcon className="w-4 h-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>

        <div className="space-y-6">
          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-roam-blue" />
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    Choose how you want to receive updates about your bookings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="email-notifications" className="text-base font-medium">
                      Email Notifications
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive booking confirmations, reminders, and updates via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.email_notifications}
                  onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
                />
              </div>

              {/* SMS Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="sms-notifications" className="text-base font-medium">
                      SMS Notifications
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get text messages for important booking updates
                  </p>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={settings.sms_notifications}
                  onCheckedChange={(checked) => updateSetting('sms_notifications', checked)}
                />
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="push-notifications" className="text-base font-medium">
                      Push Notifications
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications on your device
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={settings.push_notifications}
                  onCheckedChange={(checked) => updateSetting('push_notifications', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Marketing Preferences */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-roam-blue" />
                <div>
                  <CardTitle>Marketing & Promotions</CardTitle>
                  <CardDescription>
                    Manage promotional communications and special offers
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="marketing-emails" className="text-base font-medium">
                    Marketing Emails
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive promotional offers, tips, and platform updates
                  </p>
                </div>
                <Switch
                  id="marketing-emails"
                  checked={settings.marketing_emails}
                  onCheckedChange={(checked) => updateSetting('marketing_emails', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-roam-blue" />
                <div>
                  <CardTitle>Privacy & Security</CardTitle>
                  <CardDescription>
                    Manage your account security and privacy settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Account Security</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Your account is protected with industry-standard encryption
                </p>
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Data Privacy</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  We respect your privacy and protect your personal information
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Privacy Policy
                  </Button>
                  <Button variant="outline" size="sm">
                    Terms of Service
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button (Mobile) */}
          <div className="md:hidden">
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <SettingsIcon className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
