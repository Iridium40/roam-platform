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
    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn('⚠️ Twilio is not configured - SMS will be skipped');
      throw new Error('SMS service not configured');
    }

    // Initialize Twilio client
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    // Send SMS
    const message = await client.messages.create({
      body: params.body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: params.to,
    });

    console.log('✅ SMS sent successfully:', message.sid);

    return {
      sid: message.sid,
      success: true,
    };
  } catch (error) {
    console.error('❌ SMS service error:', error);
    throw error;
  }
}

