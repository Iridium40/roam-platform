import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import twilio from 'twilio';

// Initialize Resend for email sending
const resend = new Resend(process.env.RESEND_API_KEY);

type NotificationType = 
  | 'customer_welcome'
  | 'customer_booking_accepted'
  | 'customer_booking_completed'
  | 'customer_booking_reminder'
  | 'provider_new_booking'
  | 'provider_booking_cancelled'
  | 'provider_booking_rescheduled'
  | 'admin_business_verification';

// Inline notification service for Vercel compatibility
async function sendNotificationViaService(
  userId: string,
  notificationType: string,
  templateVariables: Record<string, any>,
  metadata?: Record<string, any>
) {
  try {
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials for notification service');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get user settings (includes notification preferences)
    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // 2. Check master toggles
    const emailEnabled = settings?.email_notifications ?? true;
    const smsEnabled = settings?.sms_notifications ?? false;

    // 3. Check granular preferences
    const emailPrefKey = `${notificationType}_email`;
    const smsPrefKey = `${notificationType}_sms`;
    
    const emailAllowed = emailEnabled && (settings?.[emailPrefKey] ?? true);
    const smsAllowed = smsEnabled && (settings?.[smsPrefKey] ?? false);

    console.log(`🔍 Notification preferences for ${notificationType}:`, {
      userId,
      emailEnabled,
      smsEnabled,
      emailAllowed,
      smsAllowed,
      emailPrefKey,
      smsPrefKey,
    });

    // 4. Check quiet hours
    if (settings?.quiet_hours_enabled) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM
      const start = settings.quiet_hours_start;
      const end = settings.quiet_hours_end;

      if (start && end) {
        const isQuietTime = start > end
          ? (currentTime >= start || currentTime <= end)
          : (currentTime >= start && currentTime <= end);

        if (isQuietTime) {
          console.log('⏰ Skipping notification - quiet hours active');
          return;
        }
      }
    }

    // 5. Get notification template from database
    const { data: template } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('template_key', notificationType)
      .eq('is_active', true)
      .single();

    if (!template) {
      console.error(`❌ Template not found: ${notificationType}`);
      return;
    }

    // 6. Get recipient contact info (prioritize custom notification email/phone)
    let recipientEmail = settings?.notification_email;
    let recipientPhone = settings?.notification_phone;

    if (!recipientEmail || !recipientPhone) {
      // Fallback to profile data
      const { data: customerProfile } = await supabase
        .from('customer_profiles')
        .select('email, phone')
        .eq('user_id', userId)
        .maybeSingle();

      if (customerProfile) {
        recipientEmail = recipientEmail || customerProfile.email;
        recipientPhone = recipientPhone || customerProfile.phone;
      }

      // Try provider profile if customer not found
      if (!recipientEmail || !recipientPhone) {
        const { data: providerProfile } = await supabase
          .from('providers')
          .select('email, phone')
          .eq('user_id', userId)
          .maybeSingle();

        if (providerProfile) {
          recipientEmail = recipientEmail || providerProfile.email;
          recipientPhone = recipientPhone || providerProfile.phone;
        }
      }
    }

    console.log(`📬 Recipient info:`, {
      hasEmail: !!recipientEmail,
      hasPhone: !!recipientPhone,
      emailMasked: recipientEmail ? `${recipientEmail.substring(0, 3)}***` : 'none',
      phoneMasked: recipientPhone ? `***${recipientPhone.slice(-4)}` : 'none',
    });

    // 7. Send email if enabled and recipient exists
    if (emailAllowed && recipientEmail && template.email_body_html) {
      try {
        // Replace template variables
        let subject = template.email_subject || '';
        let htmlBody = template.email_body_html || '';
        let textBody = template.email_body_text || '';

        for (const [key, value] of Object.entries(templateVariables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          subject = subject.replace(regex, String(value ?? ''));
          htmlBody = htmlBody.replace(regex, String(value ?? ''));
          textBody = textBody.replace(regex, String(value ?? ''));
        }

        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'ROAM Support <support@roamyourbestlife.com>',
          to: [recipientEmail],
          subject,
          html: htmlBody,
          text: textBody,
        });

        if (emailError) {
          throw emailError;
        }

        // Log success
        await supabase.from('notification_logs').insert({
          user_id: userId,
          recipient_email: recipientEmail,
          notification_type: notificationType,
          channel: 'email',
          status: 'sent',
          resend_id: emailData?.id,
          subject,
          body: textBody,
          sent_at: new Date().toISOString(),
          metadata,
        });

        console.log(`✅ Email sent: ${notificationType} to ${recipientEmail}`);
      } catch (emailError) {
        console.error('❌ Email send failed:', emailError);
        
        // Log failure
        await supabase.from('notification_logs').insert({
          user_id: userId,
          recipient_email: recipientEmail,
          notification_type: notificationType,
          channel: 'email',
          status: 'failed',
          error_message: emailError instanceof Error ? emailError.message : String(emailError),
          metadata,
        });
      }
    } else {
      console.log(`ℹ️ Email skipped for ${notificationType}:`, {
        emailAllowed,
        hasRecipient: !!recipientEmail,
        hasTemplate: !!template.email_body_html,
      });
    }

    // 8. Send SMS if enabled and recipient exists
    if (smsAllowed && recipientPhone && template.sms_body) {
      try {
        // Check for Twilio credentials
        const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.VITE_TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.VITE_TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

        if (!accountSid || !authToken || !fromNumber) {
          console.warn('⚠️ Twilio is not configured - SMS will be skipped', {
            hasAccountSid: !!accountSid,
            hasAuthToken: !!authToken,
            hasFromNumber: !!fromNumber,
          });
          throw new Error('SMS service not configured');
        }

        // Replace template variables in SMS body
        let smsBody = template.sms_body || '';
        for (const [key, value] of Object.entries(templateVariables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          smsBody = smsBody.replace(regex, String(value ?? ''));
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

        const formattedTo = formatPhoneNumber(recipientPhone);
        const formattedFrom = formatPhoneNumber(fromNumber);

        console.log('📱 Sending SMS:', {
          to: formattedTo,
          from: formattedFrom,
          bodyLength: smsBody.length,
        });

        // Initialize Twilio client
        const client = twilio(accountSid, authToken);
        
        // Send SMS
        const message = await client.messages.create({
          body: smsBody,
          from: formattedFrom,
          to: formattedTo,
        });

        console.log('✅ SMS sent successfully:', message.sid);

        // Log success
        await supabase.from('notification_logs').insert({
          user_id: userId,
          recipient_phone: recipientPhone,
          notification_type: notificationType,
          channel: 'sms',
          status: 'sent',
          twilio_sid: message.sid,
          body: smsBody,
          sent_at: new Date().toISOString(),
          metadata,
        });

        console.log(`✅ SMS sent: ${notificationType} to ${recipientPhone}`);
      } catch (smsError) {
        console.error('❌ SMS send failed:', smsError);
        
        // Log failure
        await supabase.from('notification_logs').insert({
          user_id: userId,
          recipient_phone: recipientPhone,
          notification_type: notificationType,
          channel: 'sms',
          status: 'failed',
          error_message: smsError instanceof Error ? smsError.message : String(smsError),
          metadata,
        });
      }
    } else {
      console.log(`ℹ️ SMS skipped for ${notificationType}:`, {
        smsAllowed,
        hasRecipient: !!recipientPhone,
        hasTemplate: !!template.sms_body,
      });
    }

  } catch (error) {
    console.error('❌ Notification service error:', error);
  }
}

/**
 * POST /api/notifications/send
 * 
 * Send a notification to a user
 * 
 * Body:
 * {
 *   userId: string,
 *   notificationType: NotificationType,
 *   templateVariables: Record<string, any>,
 *   metadata?: Record<string, any>
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, notificationType, templateVariables, metadata } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!notificationType) {
      return res.status(400).json({ error: 'notificationType is required' });
    }

    if (!templateVariables || typeof templateVariables !== 'object') {
      return res.status(400).json({ error: 'templateVariables object is required' });
    }

    // Validate notification type
    const validTypes: NotificationType[] = [
      'customer_welcome',
      'customer_booking_accepted',
      'customer_booking_completed',
      'customer_booking_reminder',
      'provider_new_booking',
      'provider_booking_cancelled',
      'provider_booking_rescheduled',
      'admin_business_verification',
    ];

    if (!validTypes.includes(notificationType)) {
      return res.status(400).json({ 
        error: 'Invalid notification type',
        validTypes 
      });
    }

    console.log(`📧 Sending ${notificationType} notification to user ${userId}`);

    // Send notification using inline service
    await sendNotificationViaService(
      userId,
      notificationType,
      templateVariables,
      metadata
    );

    console.log(`✅ Notification sent successfully: ${notificationType}`);

    return res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
    });

  } catch (error) {
    console.error('❌ Notification API error:', error);
    return res.status(500).json({
      error: 'Failed to send notification',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

