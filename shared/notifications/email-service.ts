/**
 * Shared Email Notification Service
 * Handles email sending via Resend with database templates and user preferences
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import type { SendEmailParams, SendResult, NotificationTemplate, UserSettings } from './types.js';

/**
 * Send an email notification using database templates and user preferences
 */
export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  const { userId, templateKey, variables, attachment, metadata } = params;

  console.log('📧 Email Service: Starting email send process', {
    userId,
    templateKey,
    hasAttachment: !!attachment,
  });

  try {
    // Initialize clients
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    if (!resendApiKey) {
      throw new Error('Missing Resend API key');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // 1. Fetch user settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (settingsError) {
      console.error('❌ Error fetching user settings:', settingsError);
    }

    // 2. Check master email toggle
    const emailEnabled = settings?.email_notifications ?? true;
    if (!emailEnabled) {
      console.log('ℹ️ Email disabled by user master toggle');
      return {
        success: true,
        channel: 'email',
        recipient: '',
        skipped: true,
        skipReason: 'User has disabled email notifications',
      };
    }

    // 3. Check granular preference for this notification type
    const emailPrefKey = `${templateKey}_email`;
    const emailAllowed = settings?.[emailPrefKey] ?? true;
    
    if (!emailAllowed) {
      console.log(`ℹ️ Email disabled by user for ${templateKey}`);
      return {
        success: true,
        channel: 'email',
        recipient: '',
        skipped: true,
        skipReason: `User has disabled ${templateKey} emails`,
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
        console.log(`ℹ️ In quiet hours (${start} - ${end}), skipping email`);
        return {
          success: true,
          channel: 'email',
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

    if (!template.email_body_html || !template.email_subject) {
      throw new Error(`Template ${templateKey} has no email content`);
    }

    // 6. Get recipient email (custom or from profile)
    let recipientEmail = settings?.notification_email;

    if (!recipientEmail) {
      // Try customer profile
      const { data: customerProfile } = await supabase
        .from('customer_profiles')
        .select('email')
        .eq('user_id', userId)
        .maybeSingle();

      if (customerProfile?.email) {
        recipientEmail = customerProfile.email;
      } else {
        // Try provider profile
        const { data: providerProfile } = await supabase
          .from('providers')
          .select('email')
          .eq('user_id', userId)
          .maybeSingle();

        if (providerProfile?.email) {
          recipientEmail = providerProfile.email;
        } else {
          // Try admin user record (admins are not necessarily customers/providers)
          const { data: adminUser } = await supabase
            .from('admin_users')
            .select('email')
            .eq('user_id', userId)
            .maybeSingle();

          if (adminUser?.email) {
            recipientEmail = adminUser.email;
          }
        }
      }
    }

    if (!recipientEmail) {
      throw new Error(`No email address found for user ${userId}`);
    }

    // 7. Replace template variables
    let subject = template.email_subject;
    let htmlBody = template.email_body_html;
    let textBody = template.email_body_text || '';

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const stringValue = String(value ?? '');
      subject = subject.replace(regex, stringValue);
      htmlBody = htmlBody.replace(regex, stringValue);
      textBody = textBody.replace(regex, stringValue);
    }

    // 8. Send email via Resend
    console.log('📧 Sending email via Resend to:', recipientEmail.substring(0, 10) + '...');

    const emailPayload: any = {
      from: 'ROAM Support <support@roamyourbestlife.com>',
      to: [recipientEmail],
      subject,
      html: htmlBody,
      text: textBody,
    };

    // Add attachment if provided
    if (attachment) {
      emailPayload.attachments = [{
        filename: attachment.filename,
        content: attachment.content, // Already base64 encoded
      }];
    }

    const { data: emailData, error: emailError } = await resend.emails.send(emailPayload);

    if (emailError) {
      throw emailError;
    }

    // 9. Log success to notification_logs
    await supabase.from('notification_logs').insert({
      user_id: userId,
      recipient_email: recipientEmail,
      notification_type: templateKey,
      channel: 'email',
      status: 'sent',
      resend_id: emailData?.id,
      subject,
      body: textBody,
      sent_at: new Date().toISOString(),
      metadata,
    });

    console.log('✅ Email sent successfully:', emailData?.id);

    return {
      success: true,
      channel: 'email',
      recipient: recipientEmail,
      externalId: emailData?.id,
    };

  } catch (error) {
    console.error('❌ Email send failed:', {
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
          channel: 'email',
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
      channel: 'email',
      recipient: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

