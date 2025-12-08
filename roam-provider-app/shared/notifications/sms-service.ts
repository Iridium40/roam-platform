/**
 * Shared SMS Notification Service
 * Handles SMS sending via Twilio with database templates and user preferences
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SendSMSParams, SendResult, NotificationTemplate, UserSettings } from './types.js';

/**
 * Send an SMS notification using database templates and user preferences
 */
export async function sendSMS(params: SendSMSParams): Promise<SendResult> {
  const { userId, templateKey, variables, metadata } = params;

  console.log('📱 SMS Service: Starting SMS send process', {
    userId,
    templateKey,
  });

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check Twilio credentials
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.warn('⚠️ Twilio credentials not configured, skipping SMS');
      return {
        success: true,
        channel: 'sms',
        recipient: '',
        skipped: true,
        skipReason: 'Twilio not configured',
      };
    }

    // 1. Fetch user settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (settingsError) {
      console.error('❌ Error fetching user settings:', settingsError);
    }

    // 2. Check master SMS toggle
    const smsEnabled = settings?.sms_notifications ?? false; // SMS defaults to OFF
    if (!smsEnabled) {
      console.log('ℹ️ SMS disabled by user master toggle');
      return {
        success: true,
        channel: 'sms',
        recipient: '',
        skipped: true,
        skipReason: 'User has disabled SMS notifications',
      };
    }

    // 3. Check granular preference for this notification type
    const smsPrefKey = `${templateKey}_sms`;
    const smsAllowed = settings?.[smsPrefKey] ?? false; // SMS defaults to OFF
    
    if (!smsAllowed) {
      console.log(`ℹ️ SMS disabled by user for ${templateKey}`);
      return {
        success: true,
        channel: 'sms',
        recipient: '',
        skipped: true,
        skipReason: `User has disabled ${templateKey} SMS`,
      };
    }

    // 4. Check quiet hours
    if (settings?.quiet_hours_enabled && settings.quiet_hours_start && settings.quiet_hours_end) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM
      const start = settings.quiet_hours_start;
      const end = settings.quiet_hours_end;

      const isQuietTime = start > end
        ? currentTime >= start || currentTime < end  // Crosses midnight
        : currentTime >= start && currentTime < end; // Same day

      if (isQuietTime) {
        console.log(`ℹ️ In quiet hours (${start} - ${end}), skipping SMS`);
        return {
          success: true,
          channel: 'sms',
          recipient: '',
          skipped: true,
          skipReason: 'User is in quiet hours',
        };
      }
    }

    // 5. Fetch notification template
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      throw new Error(`Template not found: ${templateKey}`);
    }

    if (!template.sms_body) {
      console.log(`ℹ️ Template ${templateKey} has no SMS content, skipping`);
      return {
        success: true,
        channel: 'sms',
        recipient: '',
        skipped: true,
        skipReason: 'Template has no SMS content',
      };
    }

    // 6. Get recipient phone (custom or from profile)
    let recipientPhone = settings?.notification_phone;

    if (!recipientPhone) {
      // Try customer profile
      const { data: customerProfile } = await supabase
        .from('customer_profiles')
        .select('phone')
        .eq('user_id', userId)
        .maybeSingle();

      if (customerProfile?.phone) {
        recipientPhone = customerProfile.phone;
      } else {
        // Try provider profile
        const { data: providerProfile } = await supabase
          .from('providers')
          .select('phone')
          .eq('user_id', userId)
          .maybeSingle();

        if (providerProfile?.phone) {
          recipientPhone = providerProfile.phone;
        }
      }
    }

    if (!recipientPhone) {
      throw new Error(`No phone number found for user ${userId}`);
    }

    // 7. Replace template variables
    let smsBody = template.sms_body;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const stringValue = String(value ?? '');
      smsBody = smsBody.replace(regex, stringValue);
    }

    // 8. Send SMS via Twilio
    console.log('📱 Sending SMS via Twilio to:', recipientPhone.substring(0, 5) + '***');

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: recipientPhone,
        From: twilioPhoneNumber,
        Body: smsBody,
      }),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      throw new Error(`Twilio API error: ${twilioData.message || 'Unknown error'}`);
    }

    // 9. Log success to notification_logs
    await supabase.from('notification_logs').insert({
      user_id: userId,
      recipient_phone: recipientPhone,
      notification_type: templateKey,
      channel: 'sms',
      status: 'sent',
      twilio_sid: twilioData.sid,
      body: smsBody,
      sent_at: new Date().toISOString(),
      metadata,
    });

    console.log('✅ SMS sent successfully:', twilioData.sid);

    return {
      success: true,
      channel: 'sms',
      recipient: recipientPhone,
      externalId: twilioData.sid,
    };

  } catch (error) {
    console.error('❌ SMS send failed:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      userId,
      templateKey,
    });

    // Log failure
    try {
      const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('notification_logs').insert({
          user_id: userId,
          notification_type: templateKey,
          channel: 'sms',
          status: 'failed',
          error_message: error instanceof Error ? error.message : String(error),
          metadata,
        });
      }
    } catch (logError) {
      console.error('❌ Failed to log error:', logError);
    }

    return {
      success: false,
      channel: 'sms',
      recipient: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

