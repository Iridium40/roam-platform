import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './email-service';

// Import SMS service - use optional import pattern for Vercel compatibility
let sendSMSFunction: ((params: { to: string; body: string }) => Promise<any>) | null = null;

// Lazy load SMS service to avoid module loading errors
async function loadSendSMS() {
  if (sendSMSFunction) {
    return sendSMSFunction;
  }
  
  try {
    const smsModule = await import('./sms-service');
    sendSMSFunction = smsModule.sendSMS;
    return sendSMSFunction;
  } catch (e) {
    console.warn('⚠️ Could not load SMS service module:', e);
    return null;
  }
}

// Initialize Supabase client with service role key for server-side operations
const getSupabaseServiceClient = () => {
  if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(
    process.env.VITE_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export type NotificationType = 
  | 'customer_welcome'
  | 'customer_booking_accepted'
  | 'customer_booking_completed'
  | 'customer_booking_reminder'
  | 'provider_new_booking'
  | 'provider_booking_cancelled'
  | 'provider_booking_rescheduled'
  | 'admin_business_verification';

export interface NotificationData {
  userId: string;
  notificationType: NotificationType;
  templateVariables: Record<string, any>;
  metadata?: Record<string, any>;
}

export class NotificationService {
  async send(data: NotificationData): Promise<void> {
    try {
      const supabase = getSupabaseServiceClient();

      // 1. Get user data from auth.users
      const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(data.userId);

      if (userError || !authUser.user) {
        throw new Error(`User not found: ${data.userId}`);
      }

      const user = authUser.user;

      // 2. Get user settings (includes notification preferences and contact info)
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', data.userId)
        .maybeSingle();

      if (settingsError) {
        console.error('Settings error, using defaults:', settingsError);
      }

      // 3. Determine notification email and phone
      // Priority: user_settings.notification_email/phone -> profile email/phone -> auth.users email/phone
      let notificationEmail = settings?.notification_email?.trim() || null;
      let notificationPhone = settings?.notification_phone?.trim() || null;

      // Fallback to profile data if not set in user_settings
      if (!notificationEmail || !notificationPhone) {
        // Try to get from customer_profiles or providers table
        const { data: customerProfile } = await supabase
          .from('customer_profiles')
          .select('email, phone')
          .eq('user_id', data.userId)
          .maybeSingle();

        if (customerProfile) {
          notificationEmail = notificationEmail || customerProfile.email;
          notificationPhone = notificationPhone || customerProfile.phone;
        } else {
          // Try providers table
          const { data: providerProfile } = await supabase
            .from('providers')
            .select('email, phone')
            .eq('user_id', data.userId)
            .maybeSingle();

          if (providerProfile) {
            notificationEmail = notificationEmail || providerProfile.email;
            notificationPhone = notificationPhone || providerProfile.phone;
          }
        }
      }

      // Final fallback to auth.users
      notificationEmail = notificationEmail || user.email;
      notificationPhone = notificationPhone || user.phone;

      console.log(`📧 Notification contact for user ${data.userId}:`, {
        email: notificationEmail ? '✓' : '✗',
        phone: notificationPhone ? '✓' : '✗'
      });

      // 4. Get notification template
      const { data: template, error: templateError } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('template_key', data.notificationType)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        throw new Error(`Template not found: ${data.notificationType}`);
      }

      // 5. Check quiet hours
      if (settings?.quiet_hours_enabled && this.isQuietHours(settings)) {
        console.log('⏰ Skipping notification - quiet hours active');
        return;
      }

      // 6. Determine channels based on user preferences
      const channels = this.getChannelsForNotification(
        data.notificationType,
        settings
      );

      // 7. Send via enabled channels using notification contact info
      const promises: Promise<void>[] = [];

      if (channels.email && notificationEmail) {
        promises.push(
          this.sendEmailNotification(
            notificationEmail,
            template,
            data.templateVariables,
            data.userId,
            data.notificationType,
            data.metadata
          )
        );
      }

      if (channels.sms && notificationPhone) {
        promises.push(
          this.sendSMSNotification(
            notificationPhone,
            template,
            data.templateVariables,
            data.userId,
            data.notificationType,
            data.metadata
          )
        );
      }

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('❌ Notification service error:', error);
      throw error;
    }
  }

  private async sendEmailNotification(
    email: string,
    template: any,
    variables: Record<string, any>,
    userId: string,
    notificationType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const supabase = getSupabaseServiceClient();

    try {
      const subject = this.replaceVariables(template.email_subject, variables);
      const htmlBody = this.replaceVariables(template.email_body_html, variables);
      const textBody = this.replaceVariables(template.email_body_text, variables);

      const result = await sendEmail({
        to: email,
        subject,
        html: htmlBody,
        text: textBody,
      });

      await this.logNotification({
        userId,
        recipientEmail: email,
        notificationType,
        channel: 'email',
        status: 'sent',
        resendId: result.id,
        subject,
        body: textBody,
        metadata,
      });
    } catch (error) {
      console.error('❌ Email notification failed:', error);
      await this.logNotification({
        userId,
        recipientEmail: email,
        notificationType,
        channel: 'email',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata,
      });
    }
  }

  private async sendSMSNotification(
    phone: string,
    template: any,
    variables: Record<string, any>,
    userId: string,
    notificationType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const supabase = getSupabaseServiceClient();

    try {
      if (!template.sms_body) {
        console.log('⚠️ No SMS template available for:', notificationType);
        return;
      }

      const body = this.replaceVariables(template.sms_body, variables);

      const sendSMS = await loadSendSMS();
      if (!sendSMS) {
        console.warn('⚠️ SMS service not available, skipping SMS notification');
        return;
      }

      const result = await sendSMS({
        to: phone,
        body,
      });

      await this.logNotification({
        userId,
        recipientPhone: phone,
        notificationType,
        channel: 'sms',
        status: 'sent',
        twilioSid: result.sid,
        body,
        metadata,
      });
    } catch (error) {
      console.error('❌ SMS notification failed:', error);
      await this.logNotification({
        userId,
        recipientPhone: phone,
        notificationType,
        channel: 'sms',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata,
      });
    }
  }

  private replaceVariables(
    template: string,
    variables: Record<string, any>
  ): string {
    if (!template) return '';
    
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value ?? ''));
    }

    return result;
  }

  private getChannelsForNotification(
    notificationType: NotificationType,
    settings: any
  ): { email: boolean; sms: boolean } {
    // Default: email on, SMS off
    if (!settings) {
      return { email: true, sms: false };
    }

    // Check if master toggles are enabled
    const emailEnabled = settings.email_notifications ?? true;
    const smsEnabled = settings.sms_notifications ?? false;

    // Map notification types to their preference columns
    const prefMap: Record<NotificationType, { email: string; sms: string }> = {
      customer_welcome: {
        email: 'customer_welcome_email',
        sms: 'customer_welcome_email', // No SMS for welcome
      },
      customer_booking_accepted: {
        email: 'customer_booking_accepted_email',
        sms: 'customer_booking_accepted_sms',
      },
      customer_booking_completed: {
        email: 'customer_booking_completed_email',
        sms: 'customer_booking_completed_sms',
      },
      customer_booking_reminder: {
        email: 'customer_booking_reminder_email',
        sms: 'customer_booking_reminder_sms',
      },
      provider_new_booking: {
        email: 'provider_new_booking_email',
        sms: 'provider_new_booking_sms',
      },
      provider_booking_cancelled: {
        email: 'provider_booking_cancelled_email',
        sms: 'provider_booking_cancelled_sms',
      },
      provider_booking_rescheduled: {
        email: 'provider_booking_rescheduled_email',
        sms: 'provider_booking_rescheduled_sms',
      },
      admin_business_verification: {
        email: 'admin_business_verification_email',
        sms: 'admin_business_verification_sms',
      },
    };

    const mapping = prefMap[notificationType];
    
    return {
      email: emailEnabled && (settings[mapping.email] ?? true),
      sms: smsEnabled && (settings[mapping.sms] ?? false),
    };
  }

  private isQuietHours(settings: any): boolean {
    if (!settings.quiet_hours_start || !settings.quiet_hours_end) {
      return false;
    }

    // Get current time in user's timezone
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    const start = settings.quiet_hours_start;
    const end = settings.quiet_hours_end;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }

    // Normal quiet hours (e.g., 08:00 to 22:00)
    return currentTime >= start && currentTime <= end;
  }

  private async logNotification(data: {
    userId: string;
    recipientEmail?: string;
    recipientPhone?: string;
    notificationType: string;
    channel: 'email' | 'sms';
    status: 'pending' | 'sent' | 'delivered' | 'failed';
    resendId?: string;
    twilioSid?: string;
    subject?: string;
    body?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const supabase = getSupabaseServiceClient();

    try {
      const { error } = await supabase
        .from('notification_logs')
        .insert({
          user_id: data.userId,
          recipient_email: data.recipientEmail,
          recipient_phone: data.recipientPhone,
          notification_type: data.notificationType,
          channel: data.channel,
          status: data.status,
          resend_id: data.resendId,
          twilio_sid: data.twilioSid,
          subject: data.subject,
          body: data.body,
          error_message: data.errorMessage,
          sent_at: data.status === 'sent' ? new Date().toISOString() : null,
          metadata: data.metadata,
        });

      if (error) {
        console.error('❌ Failed to log notification:', error);
      }
    } catch (error) {
      console.error('❌ Error logging notification:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

