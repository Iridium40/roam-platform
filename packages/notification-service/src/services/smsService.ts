import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface SMSOptions {
  to?: string;
  message: string;
  userId?: string;
  providerId?: string;
  customerId?: string;
}

export interface BookingDetails {
  customerName: string;
  serviceName: string;
  dateTime: string;
  location: string;
}

export interface CancellationDetails {
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
   * Check if SMS notifications are enabled for a user
   */
  async isSMSEnabledForUser(userId: string): Promise<boolean> {
    try {
      const { data: settings, error } = await supabase
        .from('user_settings')
        .select('sms_notifications')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.log('User settings not found for user:', userId);
        return false;
      }

      return settings?.sms_notifications === true;
    } catch (error) {
      console.error('Error checking user SMS settings:', error);
      return false;
    }
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
      const isEnabled = await this.isSMSEnabledForUser(provider.user_id);

      const hasPhone = provider.notification_phone !== null &&
                       provider.notification_phone !== '';

      console.log(`SMS enabled for provider ${providerId}:`, isEnabled && hasPhone);
      return isEnabled && hasPhone;
    } catch (error) {
      console.error('Error checking provider SMS settings:', error);
      return false;
    }
  }

  /**
   * Check if SMS notifications are enabled for a customer
   */
  async isSMSEnabledForCustomer(customerId: string): Promise<boolean> {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('user_id, phone')
        .eq('id', customerId)
        .single();

      if (error || !customer) {
        console.log('Customer not found:', customerId);
        return false;
      }

      // Check if user has SMS notifications enabled
      const isEnabled = await this.isSMSEnabledForUser(customer.user_id);

      const hasPhone = customer.phone !== null && customer.phone !== '';

      console.log(`SMS enabled for customer ${customerId}:`, isEnabled && hasPhone);
      return isEnabled && hasPhone;
    } catch (error) {
      console.error('Error checking customer SMS settings:', error);
      return false;
    }
  }

  /**
   * Get phone number for a user (provider or customer)
   */
  async getPhoneNumber(options: {
    userId?: string;
    providerId?: string;
    customerId?: string;
  }): Promise<string | null> {
    try {
      if (options.providerId) {
        const { data: provider, error } = await supabase
          .from('providers')
          .select('notification_phone')
          .eq('id', options.providerId)
          .single();

        if (!error && provider) {
          return provider.notification_phone || null;
        }
      }

      if (options.customerId) {
        const { data: customer, error } = await supabase
          .from('customers')
          .select('phone')
          .eq('id', options.customerId)
          .single();

        if (!error && customer) {
          return customer.phone || null;
        }
      }

      if (options.userId) {
        // Try to get phone from providers first
        const { data: provider } = await supabase
          .from('providers')
          .select('notification_phone')
          .eq('user_id', options.userId)
          .single();

        if (provider?.notification_phone) {
          return provider.notification_phone;
        }

        // Try customers
        const { data: customer } = await supabase
          .from('customers')
          .select('phone')
          .eq('user_id', options.userId)
          .single();

        if (customer?.phone) {
          return customer.phone;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting phone number:', error);
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
  async sendSMS(options: SMSOptions): Promise<boolean> {
    try {
      let recipientPhone = options.to;
      let isEnabled = true;

      // Check if SMS is enabled and get phone number
      if (options.providerId) {
        isEnabled = await this.isSMSEnabledForProvider(options.providerId);
        if (!isEnabled) {
          console.log(`SMS disabled for provider ${options.providerId}`);
          return false;
        }

        const phone = await this.getPhoneNumber({ providerId: options.providerId });
        if (phone) {
          recipientPhone = phone;
        } else {
          console.log(`No phone number found for provider ${options.providerId}`);
          return false;
        }
      } else if (options.customerId) {
        isEnabled = await this.isSMSEnabledForCustomer(options.customerId);
        if (!isEnabled) {
          console.log(`SMS disabled for customer ${options.customerId}`);
          return false;
        }

        const phone = await this.getPhoneNumber({ customerId: options.customerId });
        if (phone) {
          recipientPhone = phone;
        } else {
          console.log(`No phone number found for customer ${options.customerId}`);
          return false;
        }
      } else if (options.userId) {
        isEnabled = await this.isSMSEnabledForUser(options.userId);
        if (!isEnabled) {
          console.log(`SMS disabled for user ${options.userId}`);
          return false;
        }

        const phone = await this.getPhoneNumber({ userId: options.userId });
        if (phone) {
          recipientPhone = phone;
        } else {
          console.log(`No phone number found for user ${options.userId}`);
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
        body: options.message,
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
   * Send booking notification to provider
   */
  async sendProviderBookingNotification(
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
   * Send booking confirmation to customer
   */
  async sendCustomerBookingConfirmation(
    customerId: string,
    bookingDetails: BookingDetails
  ): Promise<boolean> {
    const message = `Booking Confirmed!
Service: ${bookingDetails.serviceName}
Time: ${bookingDetails.dateTime}
Location: ${bookingDetails.location}

Thanks for choosing ROAM!`;

    return this.sendSMS({ message, customerId });
  }

  /**
   * Send booking cancellation notification
   */
  async sendCancellationNotification(
    recipientId: string,
    bookingDetails: CancellationDetails,
    type: 'provider' | 'customer'
  ): Promise<boolean> {
    const message = `Booking Cancelled
${type === 'customer' ? 'Service' : 'Customer'}: ${type === 'customer' ? bookingDetails.serviceName : bookingDetails.customerName}
${type === 'provider' ? `Service: ${bookingDetails.serviceName}\n` : ''}Time: ${bookingDetails.dateTime}

Check your ROAM dashboard for details.`;

    const options: SMSOptions = { message };
    if (type === 'provider') {
      options.providerId = recipientId;
    } else {
      options.customerId = recipientId;
    }

    return this.sendSMS(options);
  }

  /**
   * Send booking reminder
   */
  async sendBookingReminder(
    recipientId: string,
    bookingDetails: BookingDetails,
    type: 'provider' | 'customer'
  ): Promise<boolean> {
    const message = `Booking Reminder
${type === 'customer' ? 'Service' : 'Customer'}: ${type === 'customer' ? bookingDetails.serviceName : bookingDetails.customerName}
Time: ${bookingDetails.dateTime}
Location: ${bookingDetails.location}

See you soon!`;

    const options: SMSOptions = { message };
    if (type === 'provider') {
      options.providerId = recipientId;
    } else {
      options.customerId = recipientId;
    }

    return this.sendSMS(options);
  }

  /**
   * Send test SMS
   */
  async sendTestSMS(options: {
    userId?: string;
    providerId?: string;
    customerId?: string;
  }): Promise<boolean> {
    const message = 'Test message from ROAM: SMS notifications are working correctly! 🎉';
    return this.sendSMS({ message, ...options });
  }
}

// Export singleton instance
export const smsService = new SMSService();
