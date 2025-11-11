// Twilio integration for SMS notifications
import twilio from 'twilio';

export interface SendSMSParams {
  to: string;
  body: string;
}

export interface SMSResult {
  sid: string;
  success: boolean;
}

/**
 * Send an SMS using Twilio
 */
export async function sendSMS(params: SendSMSParams): Promise<SMSResult> {
  try {
    // Check for Twilio credentials (Vercel uses non-VITE_ prefixed variables)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn('⚠️ Twilio is not configured - SMS will be skipped', {
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken,
        hasFromNumber: !!fromNumber,
        envKeys: Object.keys(process.env).filter(k => k.includes('TWILIO')),
      });
      throw new Error('SMS service not configured');
    }

    // Format phone numbers - ensure US numbers start with +1
    const formatPhoneNumber = (phone: string): string => {
      if (!phone) return phone;
      const cleaned = phone.replace(/\D/g, ''); // Remove non-digits
      
      // If it's 10 digits, it's a US number - add +1
      if (cleaned.length === 10) {
        return `+1${cleaned}`;
      }
      
      // If it's 11 digits and starts with 1, it's a US number - add +
      if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
      }
      
      // If it already starts with +, return as is
      if (phone.startsWith('+')) {
        return phone;
      }
      
      // Otherwise, add + prefix
      return `+${cleaned}`;
    };

    const formattedTo = formatPhoneNumber(params.to);
    const formattedFrom = formatPhoneNumber(fromNumber);

    console.log('📱 Sending SMS:', {
      to: formattedTo,
      from: formattedFrom,
      bodyLength: params.body.length,
    });

    // Initialize Twilio client
    const client = twilio(
      accountSid,
      authToken
    );
    
    // Send SMS
    const message = await client.messages.create({
      body: params.body,
      from: formattedFrom,
      to: formattedTo,
    });

    console.log('✅ SMS sent successfully:', message.sid);

    return {
      sid: message.sid,
      success: true,
    };
  } catch (error) {
    console.error('❌ SMS service error:', {
      error: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      status: (error as any)?.status,
      moreInfo: (error as any)?.moreInfo,
    });
    throw error;
  }
}

