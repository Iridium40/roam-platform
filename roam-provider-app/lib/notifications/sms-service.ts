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
    // Check for Twilio credentials (support both VITE_ and non-VITE_ prefixed variables)
    // VITE_ prefix is for client-side, but we check both for server-side compatibility
    // Support both Auth Token and API Key authentication methods
    const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.VITE_TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.VITE_TWILIO_AUTH_TOKEN;
    const apiKeySid = process.env.TWILIO_API_KEY_SID || process.env.VITE_TWILIO_API_KEY_SID;
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET || process.env.VITE_TWILIO_API_KEY_SECRET;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

    // Determine authentication method: API Key (preferred) or Auth Token (fallback)
    const useApiKey = !!(apiKeySid && apiKeySecret);
    const useAuthToken = !!(authToken);
    
    if (!accountSid || (!useApiKey && !useAuthToken) || !fromNumber) {
      const envKeys = Object.keys(process.env).filter(k => k.includes('TWILIO'));
      console.warn('⚠️ Twilio is not configured - SMS will be skipped', {
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken,
        hasApiKey: !!useApiKey,
        hasFromNumber: !!fromNumber,
        envKeys,
        accountSidSource: accountSid ? (process.env.TWILIO_ACCOUNT_SID ? 'TWILIO_ACCOUNT_SID' : 'VITE_TWILIO_ACCOUNT_SID') : 'none',
        authMethod: useApiKey ? 'API Key' : (useAuthToken ? 'Auth Token' : 'none'),
      });
      throw new Error('SMS service not configured');
    }

    // Log which credentials are being used (without exposing actual values)
    console.log('🔐 Using Twilio credentials:', {
      accountSidLength: accountSid.length,
      authMethod: useApiKey ? 'API Key' : 'Auth Token',
      fromNumber,
      accountSidPrefix: accountSid.substring(0, 2),
    });

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
    // Use API Key authentication if available (more secure), otherwise use Auth Token
    const client = useApiKey
      ? twilio(apiKeySid!, apiKeySecret!, { accountSid })
      : twilio(accountSid, authToken!);
    
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
    const twilioError = error as any;
    const errorCode = twilioError?.code;
    const errorStatus = twilioError?.status;
    
    // Provide specific guidance for common Twilio errors
    if (errorCode === 20003) {
      console.error('❌ Twilio Authentication Error (20003):', {
        message: 'Invalid Twilio credentials. Please verify:',
        checks: [
          'TWILIO_ACCOUNT_SID or VITE_TWILIO_ACCOUNT_SID is correct',
          'TWILIO_AUTH_TOKEN or VITE_TWILIO_AUTH_TOKEN is correct',
          'Credentials match your Twilio Console',
          'No extra spaces or quotes in environment variables',
        ],
        moreInfo: twilioError?.moreInfo || 'https://www.twilio.com/docs/errors/20003',
      });
    }
    
    console.error('❌ SMS service error:', {
      error: error instanceof Error ? error.message : String(error),
      code: errorCode,
      status: errorStatus,
      moreInfo: twilioError?.moreInfo,
    });
    throw error;
  }
}

