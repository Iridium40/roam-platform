import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function NotificationPreferences() {
  const { customer, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const userId = customer?.user_id;

  useEffect(() => {
    if (userId) {
      loadSettings();
    } else if (!authLoading) {
      // Auth loaded but no user
      setLoading(false);
    }
  }, [userId, authLoading]);

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      // If no settings exist, create defaults
      if (!data) {
        const defaultSettings = {
          user_id: userId,
          email_notifications: true,
          sms_notifications: false,
          customer_booking_accepted_email: true,
          customer_booking_accepted_sms: false,
          customer_booking_completed_email: true,
          customer_booking_completed_sms: false,
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
      } else {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
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
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Your notification preferences have been updated.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
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
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose how you want to be notified about important updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Switches */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notification Channels</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-gray-500">
                  Receive notifications via email
                </div>
              </div>
              <Switch
                checked={settings?.email_notifications ?? true}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, email_notifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">SMS Notifications</div>
                <div className="text-sm text-gray-500">
                  Receive notifications via text message
                </div>
              </div>
              <Switch
                checked={settings?.sms_notifications ?? false}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sms_notifications: checked })
                }
              />
            </div>
          </div>

          {/* Customer Notifications */}
          {userType === 'CUSTOMER' && (
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-medium">Booking Notifications</h3>
              
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
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
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

