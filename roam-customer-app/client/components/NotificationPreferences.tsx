import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2 } from 'lucide-react';
import { logger } from '@/utils/logger';

export function NotificationPreferences() {
  const { customer, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<any>(null);
  const [originalSettings, setOriginalSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // SMS Consent Preferences (from customer_profiles)
  const [smsPreferences, setSmsPreferences] = useState({
    serviceMessages: true,
    marketingMessages: false,
  });
  const [originalSmsPreferences, setOriginalSmsPreferences] = useState({
    serviceMessages: true,
    marketingMessages: false,
  });
  const [savingSmsPreferences, setSavingSmsPreferences] = useState(false);
  const [hasSmsChanges, setHasSmsChanges] = useState(false);

  const userId = customer?.user_id;

  useEffect(() => {
    if (userId) {
      loadSettings();
      loadSmsPreferences();
    } else if (!authLoading) {
      // Auth loaded but no user
      setLoading(false);
    }
  }, [userId, authLoading]);

  // Detect SMS preference changes
  useEffect(() => {
    setHasSmsChanges(
      smsPreferences.serviceMessages !== originalSmsPreferences.serviceMessages ||
      smsPreferences.marketingMessages !== originalSmsPreferences.marketingMessages
    );
  }, [smsPreferences, originalSmsPreferences]);

  async function loadSmsPreferences() {
    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('sms_service_consent, sms_marketing_consent')
        .eq('user_id', userId)
        .single();

      if (error) {
        logger.error('Error loading SMS preferences:', error);
        return;
      }

      if (data) {
        const prefs = {
          serviceMessages: data.sms_service_consent ?? true,
          marketingMessages: data.sms_marketing_consent ?? false,
        };
        setSmsPreferences(prefs);
        setOriginalSmsPreferences({ ...prefs });
      }
    } catch (error) {
      logger.error('Error loading SMS preferences:', error);
    }
  }

  async function saveSmsPreferences() {
    setSavingSmsPreferences(true);
    try {
      const now = new Date().toISOString();

      const updateData: Record<string, any> = {
        sms_service_consent: smsPreferences.serviceMessages,
        sms_marketing_consent: smsPreferences.marketingMessages,
      };

      // Track consent/opt-out dates
      if (smsPreferences.marketingMessages && !originalSmsPreferences.marketingMessages) {
        updateData.sms_marketing_consent_date = now;
        updateData.sms_marketing_opt_out_date = null;
      } else if (!smsPreferences.marketingMessages && originalSmsPreferences.marketingMessages) {
        updateData.sms_marketing_opt_out_date = now;
      }

      if (smsPreferences.serviceMessages && !originalSmsPreferences.serviceMessages) {
        updateData.sms_service_consent_date = now;
        updateData.sms_service_opt_out_date = null;
      } else if (!smsPreferences.serviceMessages && originalSmsPreferences.serviceMessages) {
        updateData.sms_service_opt_out_date = now;
      }

      const { error } = await supabase
        .from('customer_profiles')
        .update(updateData)
        .eq('user_id', userId);

      if (error) throw error;

      setOriginalSmsPreferences({ ...smsPreferences });
      setHasSmsChanges(false);

      toast({
        title: 'Settings saved',
        description: 'Your SMS preferences have been updated.',
      });
    } catch (error) {
      logger.error('Error saving SMS preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save SMS preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingSmsPreferences(false);
    }
  }

  // Detect changes by comparing current settings with original
  useEffect(() => {
    if (!settings || !originalSettings) {
      setHasChanges(false);
      return;
    }

    // Compare all relevant notification preference fields
    const hasChangesDetected = 
      (settings.customer_booking_accepted_email ?? true) !== (originalSettings.customer_booking_accepted_email ?? true) ||
      (settings.customer_booking_accepted_sms ?? false) !== (originalSettings.customer_booking_accepted_sms ?? false) ||
      (settings.customer_booking_declined_email ?? true) !== (originalSettings.customer_booking_declined_email ?? true) ||
      (settings.customer_booking_declined_sms ?? false) !== (originalSettings.customer_booking_declined_sms ?? false) ||
      (settings.customer_booking_completed_email ?? true) !== (originalSettings.customer_booking_completed_email ?? true) ||
      (settings.customer_booking_completed_sms ?? false) !== (originalSettings.customer_booking_completed_sms ?? false) ||
      (settings.customer_booking_no_show_email ?? true) !== (originalSettings.customer_booking_no_show_email ?? true) ||
      (settings.customer_booking_no_show_sms ?? false) !== (originalSettings.customer_booking_no_show_sms ?? false) ||
      (settings.customer_booking_reminder_email ?? true) !== (originalSettings.customer_booking_reminder_email ?? true) ||
      (settings.customer_booking_reminder_sms ?? true) !== (originalSettings.customer_booking_reminder_sms ?? true) ||
      (settings.customer_welcome_email ?? true) !== (originalSettings.customer_welcome_email ?? true) ||
      (settings.provider_new_booking_email ?? true) !== (originalSettings.provider_new_booking_email ?? true) ||
      (settings.provider_new_booking_sms ?? true) !== (originalSettings.provider_new_booking_sms ?? true) ||
      (settings.provider_booking_cancelled_email ?? true) !== (originalSettings.provider_booking_cancelled_email ?? true) ||
      (settings.provider_booking_cancelled_sms ?? false) !== (originalSettings.provider_booking_cancelled_sms ?? false) ||
      (settings.provider_booking_rescheduled_email ?? true) !== (originalSettings.provider_booking_rescheduled_email ?? true) ||
      (settings.provider_booking_rescheduled_sms ?? false) !== (originalSettings.provider_booking_rescheduled_sms ?? false) ||
      (settings.admin_business_verification_email ?? true) !== (originalSettings.admin_business_verification_email ?? true) ||
      (settings.admin_business_verification_sms ?? false) !== (originalSettings.admin_business_verification_sms ?? false) ||
      (settings.quiet_hours_enabled ?? false) !== (originalSettings.quiet_hours_enabled ?? false) ||
      (settings.notification_email || '') !== (originalSettings.notification_email || '') ||
      (settings.notification_phone || '') !== (originalSettings.notification_phone || '');

    setHasChanges(hasChangesDetected);
  }, [settings, originalSettings]);

  async function loadSettings() {
    try {
      const response = await fetch(`/api/user-settings?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load settings');
      }
      
      // If no settings exist, create defaults
      if (!result.data) {
        const defaultSettings = {
          user_id: userId,
          email_notifications: true,
          sms_notifications: false,
          customer_booking_accepted_email: true,
          customer_booking_accepted_sms: false,
          customer_booking_declined_email: true,
          customer_booking_declined_sms: false,
          customer_booking_completed_email: true,
          customer_booking_completed_sms: false,
          customer_booking_no_show_email: true,
          customer_booking_no_show_sms: false,
          customer_booking_reminder_email: true,
          customer_booking_reminder_sms: true,
          customer_welcome_email: true,
          provider_new_booking_email: true,
          provider_new_booking_sms: true,
          provider_booking_cancelled_email: true,
          provider_booking_cancelled_sms: false,
          provider_booking_rescheduled_email: true,
          provider_booking_rescheduled_sms: false,
          admin_business_verification_email: true,
          admin_business_verification_sms: false,
          quiet_hours_enabled: false,
        };
        setSettings(defaultSettings);
        setOriginalSettings(JSON.parse(JSON.stringify(defaultSettings)));
      } else {
        setSettings(result.data);
        setOriginalSettings(JSON.parse(JSON.stringify(result.data)));
      }
      setHasChanges(false);
    } catch (error) {
      logger.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      // Automatically enable master toggles if any individual notification is enabled
      const hasAnyEmailEnabled = 
        settings?.customer_booking_accepted_email ||
        settings?.customer_booking_declined_email ||
        settings?.customer_booking_completed_email ||
        settings?.customer_booking_no_show_email ||
        settings?.customer_booking_reminder_email;
      
      const hasAnySmsEnabled = 
        settings?.customer_booking_accepted_sms ||
        settings?.customer_booking_declined_sms ||
        settings?.customer_booking_completed_sms ||
        settings?.customer_booking_no_show_sms ||
        settings?.customer_booking_reminder_sms;

      const response = await fetch('/api/user-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...settings,
          // Auto-enable master toggles if any individual notification is on
          email_notifications: hasAnyEmailEnabled,
          sms_notifications: hasAnySmsEnabled,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save settings');
      }

      toast({
        title: 'Settings saved',
        description: 'Your notification preferences have been updated.',
      });
      
      // Update original settings to reflect saved state
      setOriginalSettings(JSON.parse(JSON.stringify(settings)));
      setHasChanges(false);
    } catch (error) {
      logger.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading preferences...</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Please sign in to manage notification preferences.</div>
      </div>
    );
  }

  const userType = 'CUSTOMER'; // Customer app always shows customer notifications

  return (
    <div className="space-y-6">
      {/* SMS Consent Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Preferences</CardTitle>
          <CardDescription>
            Manage your SMS message consent for service and marketing communications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Service Messages */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium">Service Messages</p>
              <p className="text-sm text-muted-foreground mt-1">
                Booking confirmations, appointment reminders, and account notifications
              </p>
            </div>
            <div className="ml-4">
              <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                Required
              </span>
            </div>
          </div>

          {/* Marketing Messages */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium">Marketing Messages</p>
              <p className="text-sm text-muted-foreground mt-1">
                Promotional offers, discounts, and announcements
              </p>
            </div>
            <div className="ml-4">
              <Switch
                checked={smsPreferences.marketingMessages}
                onCheckedChange={(checked) =>
                  setSmsPreferences(prev => ({ ...prev, marketingMessages: checked }))
                }
              />
            </div>
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            You can also reply STOP to any text message to opt out, or HELP for assistance.
          </p>

          {/* Save button */}
          <Button
            onClick={saveSmsPreferences}
            disabled={savingSmsPreferences || !hasSmsChanges}
            className="w-full"
          >
            {savingSmsPreferences ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save SMS Preferences
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose how you want to be notified about important updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Contact Information */}
          <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-medium text-blue-900">Notification Contact Information</h3>
            <p className="text-sm text-blue-700">
              Specify where you want to receive notifications. If left empty, we'll use your profile information.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notification_email">Notification Email</Label>
                <Input
                  id="notification_email"
                  type="email"
                  placeholder="your-email@example.com"
                  value={settings?.notification_email || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, notification_email: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500">
                  Leave empty to use your profile email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification_phone">Notification Phone Number</Label>
                <Input
                  id="notification_phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={settings?.notification_phone || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, notification_phone: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500">
                  Leave empty to use your profile phone number
                </p>
              </div>
            </div>
          </div>

          {/* Customer Notifications */}
          {userType === 'CUSTOMER' && (
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-medium">Booking Notifications</h3>
              
              {/* Quick Enable All Toggles */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-blue-900">Quick Controls</p>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={
                        settings?.customer_booking_accepted_email &&
                        settings?.customer_booking_declined_email &&
                        settings?.customer_booking_reminder_email &&
                        settings?.customer_booking_completed_email &&
                        settings?.customer_booking_no_show_email
                      }
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          customer_booking_accepted_email: checked,
                          customer_booking_declined_email: checked,
                          customer_booking_reminder_email: checked,
                          customer_booking_completed_email: checked,
                          customer_booking_no_show_email: checked,
                        })
                      }
                    />
                    <span className="text-sm font-medium">Enable All Email Notifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={
                        settings?.customer_booking_accepted_sms &&
                        settings?.customer_booking_declined_sms &&
                        settings?.customer_booking_reminder_sms &&
                        settings?.customer_booking_completed_sms &&
                        settings?.customer_booking_no_show_sms
                      }
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          customer_booking_accepted_sms: checked,
                          customer_booking_declined_sms: checked,
                          customer_booking_reminder_sms: checked,
                          customer_booking_completed_sms: checked,
                          customer_booking_no_show_sms: checked,
                        })
                      }
                    />
                    <span className="text-sm font-medium">Enable All SMS Notifications</span>
                  </div>
                </div>
              </div>
              
              <NotificationToggle
                label="Booking Accepted"
                description="When your booking is confirmed"
                emailValue={settings?.customer_booking_accepted_email ?? true}
                smsValue={settings?.customer_booking_accepted_sms ?? false}
                onEmailChange={(checked) =>
                  setSettings({
                    ...settings,
                    customer_booking_accepted_email: checked,
                  })
                }
                onSmsChange={(checked) =>
                  setSettings({
                    ...settings,
                    customer_booking_accepted_sms: checked,
                  })
                }
              />

              <NotificationToggle
                label="Booking Declined"
                description="When a provider declines your request"
                emailValue={settings?.customer_booking_declined_email ?? true}
                smsValue={settings?.customer_booking_declined_sms ?? false}
                onEmailChange={(checked) =>
                  setSettings({
                    ...settings,
                    customer_booking_declined_email: checked,
                  })
                }
                onSmsChange={(checked) =>
                  setSettings({
                    ...settings,
                    customer_booking_declined_sms: checked,
                  })
                }
              />

              <NotificationToggle
                label="Booking Reminder"
                description="Day before your appointment"
                emailValue={settings?.customer_booking_reminder_email ?? true}
                smsValue={settings?.customer_booking_reminder_sms ?? true}
                onEmailChange={(checked) =>
                  setSettings({
                    ...settings,
                    customer_booking_reminder_email: checked,
                  })
                }
                onSmsChange={(checked) =>
                  setSettings({
                    ...settings,
                    customer_booking_reminder_sms: checked,
                  })
                }
              />

              <NotificationToggle
                label="Booking Completed"
                description="After your service is complete"
                emailValue={settings?.customer_booking_completed_email ?? true}
                smsValue={settings?.customer_booking_completed_sms ?? false}
                onEmailChange={(checked) =>
                  setSettings({
                    ...settings,
                    customer_booking_completed_email: checked,
                  })
                }
                onSmsChange={(checked) =>
                  setSettings({
                    ...settings,
                    customer_booking_completed_sms: checked,
                  })
                }
              />

              <NotificationToggle
                label="Booking No-Show"
                description="When you miss an appointment"
                emailValue={settings?.customer_booking_no_show_email ?? true}
                smsValue={settings?.customer_booking_no_show_sms ?? false}
                onEmailChange={(checked) =>
                  setSettings({
                    ...settings,
                    customer_booking_no_show_email: checked,
                  })
                }
                onSmsChange={(checked) =>
                  setSettings({
                    ...settings,
                    customer_booking_no_show_sms: checked,
                  })
                }
              />
            </div>
          )}

          {/* Provider Notifications */}
          {['PROVIDER', 'BUSINESS_OWNER', 'DISPATCHER'].includes(userType) && (
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-medium">Provider Notifications</h3>
              
              <NotificationToggle
                label="New Booking Request"
                description="When you receive a new booking"
                emailValue={settings?.provider_new_booking_email ?? true}
                smsValue={settings?.provider_new_booking_sms ?? true}
                onEmailChange={(checked) =>
                  setSettings({
                    ...settings,
                    provider_new_booking_email: checked,
                  })
                }
                onSmsChange={(checked) =>
                  setSettings({
                    ...settings,
                    provider_new_booking_sms: checked,
                  })
                }
              />

              <NotificationToggle
                label="Booking Cancelled"
                description="When a customer cancels"
                emailValue={settings?.provider_booking_cancelled_email ?? true}
                smsValue={settings?.provider_booking_cancelled_sms ?? false}
                onEmailChange={(checked) =>
                  setSettings({
                    ...settings,
                    provider_booking_cancelled_email: checked,
                  })
                }
                onSmsChange={(checked) =>
                  setSettings({
                    ...settings,
                    provider_booking_cancelled_sms: checked,
                  })
                }
              />

              <NotificationToggle
                label="Reschedule Request"
                description="When a customer reschedules"
                emailValue={settings?.provider_booking_rescheduled_email ?? true}
                smsValue={settings?.provider_booking_rescheduled_sms ?? false}
                onEmailChange={(checked) =>
                  setSettings({
                    ...settings,
                    provider_booking_rescheduled_email: checked,
                  })
                }
                onSmsChange={(checked) =>
                  setSettings({
                    ...settings,
                    provider_booking_rescheduled_sms: checked,
                  })
                }
              />
            </div>
          )}

          <Button 
            onClick={saveSettings} 
            disabled={saving || !hasChanges}
            className="w-full"
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
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  emailValue,
  smsValue,
  onEmailChange,
  onSmsChange,
}: {
  label: string;
  description: string;
  emailValue: boolean;
  smsValue: boolean;
  onEmailChange: (checked: boolean) => void;
  onSmsChange: (checked: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="font-medium">{label}</div>
      <div className="text-sm text-gray-500 mb-2">{description}</div>
      <div className="flex gap-6 pl-4">
        <div className="flex items-center gap-2">
          <Switch checked={emailValue} onCheckedChange={onEmailChange} />
          <span className="text-sm">Email</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={smsValue} onCheckedChange={onSmsChange} />
          <span className="text-sm">SMS</span>
        </div>
      </div>
    </div>
  );
}

