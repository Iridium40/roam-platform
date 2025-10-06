import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface SMSOptions {
  to?: string;
  message: string;
  providerId?: string;
}

interface BookingDetails {
  customerName: string;
  serviceName: string;
  dateTime: string;
  location: string;
}

interface CancellationDetails {
  customerName: string;
  serviceName: string;
  dateTime: string;
}

class SMSService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

    if (!accountSid || !authToken) {
      console.error('Twilio credentials not configured');
      throw new Error('Twilio credentials missing');
    }

    this.client = twilio(accountSid, authToken);
    console.log('SMS Service initialized with phone:', this.fromNumber);
  }

  /**
   * Check if SMS notifications are enabled for a provider
   */
  async isSMSEnabledForProvider(providerId: string): Promise<boolean> {
    try {
      const { data: provider, error } = await supabase
        .from('providers')
        .select('user_id, notification_phone')
        .eq('id', providerId)
        .single();

      if (error || !provider) {
        console.log('Provider not found:', providerId);
        return false;
      }

      // Check if user has SMS notifications enabled
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('sms_notifications')
        .eq('user_id', provider.user_id)
        .single();

      if (settingsError) {
        console.log('User settings not found for user:', provider.user_id);
        return false;
      }

      const isEnabled = settings?.sms_notifications === true && 
                       provider.notification_phone !== null &&
                       provider.notification_phone !== '';

      console.log(`SMS enabled for provider ${providerId}:`, isEnabled);
      return isEnabled;
    } catch (error) {
      console.error('Error checking SMS settings:', error);
      return false;
    }
  }

  /**
   * Get provider's notification phone number
   */
  async getProviderPhone(providerId: string): Promise<string | null> {
    try {
      const { data: provider, error } = await supabase
        .from('providers')
        .select('notification_phone')
        .eq('id', providerId)
        .single();

      if (error || !provider) {
        console.log('Provider not found:', providerId);
        return null;
      }

      return provider.notification_phone || null;
    } catch (error) {
      console.error('Error getting provider phone:', error);
      return null;
    }
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except leading +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Ensure it starts with + for international format
    if (!normalized.startsWith('+')) {
      // Assume US number if no country code
      normalized = '+1' + normalized;
    }
    
    return normalized;
  }

  /**
   * Validate phone number format (E.164)
   */
  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Send SMS notification
   */
  async sendSMS({ to, message, providerId }: SMSOptions): Promise<boolean> {
    try {
      let recipientPhone = to;

      // If providerId is provided, check if SMS is enabled and get phone
      if (providerId) {
        const isEnabled = await this.isSMSEnabledForProvider(providerId);
        if (!isEnabled) {
          console.log(`SMS disabled for provider ${providerId}`);
          return false;
        }

        // Get the phone number from provider settings
        const phone = await this.getProviderPhone(providerId);
        if (phone) {
          recipientPhone = phone;
        } else {
          console.log(`No phone number found for provider ${providerId}`);
          return false;
        }
      }

      if (!recipientPhone) {
        console.error('No recipient phone number provided');
        return false;
      }

      // Normalize and validate phone number
      const normalizedPhone = this.normalizePhoneNumber(recipientPhone);
      if (!this.isValidPhoneNumber(normalizedPhone)) {
        console.error('Invalid phone number format:', recipientPhone);
        return false;
      }

      // Send SMS via Twilio
      console.log(`Sending SMS to ${normalizedPhone}`);
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: normalizedPhone,
      });

      console.log('SMS sent successfully:', result.sid);
      return true;
    } catch (error: any) {
      console.error('Error sending SMS:', error.message || error);
      return false;
    }
  }

  /**
   * Send booking notification
   */
  async sendBookingNotification(
    providerId: string, 
    bookingDetails: BookingDetails
  ): Promise<boolean> {
    const message = `New Booking Alert!
Customer: ${bookingDetails.customerName}
Service: ${bookingDetails.serviceName}
Time: ${bookingDetails.dateTime}
Location: ${bookingDetails.location}

View details in your ROAM dashboard.`;

    return this.sendSMS({ message, providerId });
  }

  /**
   * Send booking cancellation notification
   */
  async sendCancellationNotification(
    providerId: string, 
    bookingDetails: CancellationDetails
  ): Promise<boolean> {
    const message = `Booking Cancelled
Customer: ${bookingDetails.customerName}
Service: ${bookingDetails.serviceName}
Time: ${bookingDetails.dateTime}

Check your ROAM dashboard for details.`;

    return this.sendSMS({ message, providerId });
  }

  /**
   * Send booking reminder
   */
  async sendBookingReminder(
    providerId: string, 
    bookingDetails: BookingDetails
  ): Promise<boolean> {
    const message = `Booking Reminder
Customer: ${bookingDetails.customerName}
Service: ${bookingDetails.serviceName}
Time: ${bookingDetails.dateTime}
Location: ${bookingDetails.location}

See you soon!`;

    return this.sendSMS({ message, providerId });
  }

  /**
   * Send test SMS (for testing purposes)
   */
  async sendTestSMS(providerId: string): Promise<boolean> {
    const message = 'Test message from ROAM: SMS notifications are working correctly! 🎉';
    return this.sendSMS({ message, providerId });
  }
}

// Export singleton instance
export const smsService = new SMSService();
