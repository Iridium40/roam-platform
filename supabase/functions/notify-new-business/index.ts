// Supabase Edge Function: notify-new-business
// Triggered by database INSERT on business_profiles table
// Sends notification email to admin when a new business is created

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
interface BusinessRecord {
  id: string;
  business_name: string;
  business_type: string;
  contact_email: string | null;
  phone: string | null;
  verification_status: string;
  business_description: string | null;
  website_url: string | null;
  created_at: string;
}

interface NotificationTemplate {
  template_key: string;
  email_subject: string | null;
  email_body_html: string | null;
  email_body_text: string | null;
  sms_body: string | null;
}

interface AdminUser {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
}

interface UserSettings {
  user_id: string;
  email_notifications?: boolean | null;
  sms_notifications?: boolean | null;
  admin_business_verification_email?: boolean | null;
  admin_business_verification_sms?: boolean | null;
  notification_email?: string | null;
  notification_phone?: string | null;
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value ?? '');
  }
  return result;
}

// Send email via Resend
async function sendEmailViaResend(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<boolean> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ROAM <noreply@roamyourbestlife.com>',
        to: [to],
        subject: subject,
        html: htmlBody,
        text: textBody,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Email sent to ${to}:`, result.id);
      return true;
    } else {
      const error = await response.text();
      console.error(`❌ Failed to send email to ${to}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error);
    return false;
  }
}

async function sendSmsViaTwilio(to: string, body: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: 'Twilio credentials not configured' };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: body,
        }),
      }
    );

    const json = await response.json().catch(() => ({} as any));
    if (!response.ok) {
      return { ok: false, error: json?.message || 'Twilio API error' };
    }
    return { ok: true, sid: json?.sid };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Format date for display
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

// Format business type for display
function formatBusinessType(type: string): string {
  const typeMap: Record<string, string> = {
    'independent': 'Independent',
    'small_business': 'Small Business',
    'franchise': 'Franchise',
    'enterprise': 'Enterprise',
    'other': 'Other',
  };
  return typeMap[type] || type;
}

function formatPhoneNumber(phone: string): string {
  if (!phone) return phone;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
  if (phone.startsWith('+')) return phone;
  return `+${cleaned}`;
}

Deno.serve(async (req) => {
  try {
    // Parse the request body
    const { record, type } = await req.json();

    // Only process INSERT events
    if (type !== 'INSERT') {
      return new Response(
        JSON.stringify({ message: 'Ignoring non-INSERT event' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const business: BusinessRecord = record;
    console.log(`📧 Processing new business notification for: ${business.business_name} (${business.id})`);

    // Initialize Supabase client (service role for server-side notifications)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch notification template (admin_business_verification)
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('template_key', 'admin_business_verification')
      .eq('is_active', true)
      .single<NotificationTemplate>();

    if (templateError || !template) {
      console.error('❌ admin_business_verification template missing/inactive:', templateError);
      return new Response(
        JSON.stringify({ error: 'admin_business_verification template missing/inactive' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get active admin users
    const { data: admins, error: adminsError } = await supabase
      .from('admin_users')
      .select('user_id, email, first_name, last_name, is_active')
      .eq('is_active', true)
      .returns<AdminUser[]>();

    if (adminsError || !admins || admins.length === 0) {
      console.error('❌ No active admin users found:', adminsError);
      return new Response(
        JSON.stringify({ error: 'No active admin users found' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load settings for all admins
    const { data: adminSettings } = await supabase
      .from('user_settings')
      .select('user_id, email_notifications, sms_notifications, admin_business_verification_email, admin_business_verification_sms, notification_email, notification_phone')
      .in('user_id', admins.map(a => a.user_id))
      .returns<UserSettings[]>();

    const settingsMap = new Map<string, UserSettings>(
      (adminSettings || []).map(s => [s.user_id, s])
    );

    const submissionDate = formatDate(business.created_at);
    const variables: Record<string, string> = {
      business_name: business.business_name ?? '',
      owner_name: business.contact_email ? business.contact_email.split('@')[0] : 'N/A',
      contact_email: business.contact_email ?? 'Not provided',
      contact_phone: business.phone ?? 'Not provided',
      business_category: formatBusinessType(business.business_type ?? ''),
      business_location: 'N/A',
      submission_date: submissionDate,
      business_id: business.id,
    };

    const emailSubject = replaceVariables(template.email_subject || '🔔 New Business Awaiting Verification', variables);
    const emailHtml = template.email_body_html ? replaceVariables(template.email_body_html, variables) : '';
    const emailText = template.email_body_text ? replaceVariables(template.email_body_text, variables) : '';
    const smsBody = template.sms_body ? replaceVariables(template.sms_body, variables) : '';

    const sendResults: Array<{ userId: string; email?: { ok: boolean }; sms?: { ok: boolean } }> = [];

    for (const admin of admins) {
      const settings = settingsMap.get(admin.user_id);

      const emailEnabled = settings?.email_notifications ?? true;
      const smsEnabled = settings?.sms_notifications ?? false;

      const emailAllowed = emailEnabled && (settings?.admin_business_verification_email ?? true);
      const smsAllowed = smsEnabled && (settings?.admin_business_verification_sms ?? false);

      const recipientEmail = (settings?.notification_email || admin.email || '').trim();
      const recipientPhone = (settings?.notification_phone || '').trim();

      const result: { userId: string; email?: { ok: boolean }; sms?: { ok: boolean } } = { userId: admin.user_id };

      // Email
      if (emailAllowed && recipientEmail && emailHtml) {
        const ok = await sendEmailViaResend(recipientEmail, emailSubject, emailHtml, emailText);
        result.email = { ok };

        await supabase.from('notification_logs').insert({
          user_id: admin.user_id,
          recipient_email: recipientEmail,
          notification_type: 'admin_business_verification',
          channel: 'email',
          status: ok ? 'sent' : 'failed',
          subject: emailSubject,
          body: emailText,
          sent_at: ok ? new Date().toISOString() : null,
          metadata: { source: 'edge_function_notify_new_business', business_id: business.id },
        });
      } else {
        result.email = { ok: false };
      }

      // SMS
      if (smsAllowed && recipientPhone && smsBody) {
        const formattedTo = formatPhoneNumber(recipientPhone);
        const sms = await sendSmsViaTwilio(formattedTo, smsBody);
        result.sms = { ok: sms.ok };

        await supabase.from('notification_logs').insert({
          user_id: admin.user_id,
          recipient_phone: formattedTo,
          notification_type: 'admin_business_verification',
          channel: 'sms',
          status: sms.ok ? 'sent' : 'failed',
          twilio_sid: sms.sid,
          body: smsBody,
          sent_at: sms.ok ? new Date().toISOString() : null,
          error_message: sms.ok ? null : sms.error,
          metadata: { source: 'edge_function_notify_new_business', business_id: business.id },
        });
      } else {
        result.sms = { ok: false };
      }

      sendResults.push(result);
    }

    console.log(`✅ New business notification complete for ${business.business_name}`, {
      adminsNotified: sendResults.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        businessId: business.id,
        businessName: business.business_name,
        results: sendResults,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in notify-new-business:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
