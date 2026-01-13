// Supabase Edge Function: notify-new-booking
// Triggered by database INSERT on bookings table
// Sends notifications to:
// 1. Business contact_email (always)
// 2. Assigned provider (if provider_id is set) based on their notification preferences

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
interface BookingRecord {
  id: string;
  business_id: string;
  provider_id: string | null;
  customer_id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  total_amount: number;
  booking_reference: string | null;
  special_instructions: string | null;
  booking_status: string;
}

interface NotificationTemplate {
  template_key: string;
  email_subject: string;
  email_body_html: string;
  email_body_text: string;
  sms_body: string;
}

// Helper to replace template variables
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
}

function formatPhoneNumber(phone: string): string {
  if (!phone) return phone;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
  if (phone.startsWith('+')) return phone;
  return `+${cleaned}`;
}

function isQuietHours(settings: any): boolean {
  if (!settings?.quiet_hours_enabled || !settings?.quiet_hours_start || !settings?.quiet_hours_end) {
    return false;
  }

  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM
  const start = settings.quiet_hours_start;
  const end = settings.quiet_hours_end;

  // Handle overnight quiet hours
  if (start > end) {
    return currentTime >= start || currentTime < end;
  }

  return currentTime >= start && currentTime < end;
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
    });
  } catch {
    return dateStr;
  }
}

// Format time for display
function formatTime(timeStr: string): string {
  try {
    const date = new Date(`2000-01-01T${timeStr}`);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return timeStr;
  }
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

// Send SMS via Twilio
async function sendSmsViaTwilio(to: string, body: string): Promise<boolean> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    console.error('Twilio credentials not configured');
    return false;
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

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ SMS sent to ${to}:`, result.sid);
      return true;
    } else {
      const error = await response.text();
      console.error(`❌ Failed to send SMS to ${to}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error sending SMS to ${to}:`, error);
    return false;
  }
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

    const booking: BookingRecord = record;
    console.log(`📧 Processing new booking notification for: ${booking.id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch related data
    const [businessResult, serviceResult, customerResult] = await Promise.all([
      supabase
        .from('business_profiles')
        .select('id, business_name, contact_email')
        .eq('id', booking.business_id)
        .single(),
      supabase
        .from('services')
        .select('id, name')
        .eq('id', booking.service_id)
        .single(),
      supabase
        .from('customer_profiles')
        .select('id, first_name, last_name, email, phone')
        .eq('id', booking.customer_id)
        .single(),
    ]);

    if (businessResult.error || !businessResult.data) {
      console.error('Failed to fetch business:', businessResult.error);
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (serviceResult.error || !serviceResult.data) {
      console.error('Failed to fetch service:', serviceResult.error);
      return new Response(
        JSON.stringify({ error: 'Service not found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (customerResult.error || !customerResult.data) {
      console.error('Failed to fetch customer:', customerResult.error);
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const business = businessResult.data;
    const service = serviceResult.data;
    const customer = customerResult.data;

    // Prepare template variables
    const customerName = `${customer.first_name} ${customer.last_name}`.trim();
    const variables: Record<string, string> = {
      customer_name: customerName,
      service_name: service.name,
      business_name: business.business_name,
      booking_date: formatDate(booking.booking_date),
      booking_time: formatTime(booking.start_time),
      booking_reference: booking.booking_reference || 'N/A',
      total_amount: booking.total_amount?.toFixed(2) || '0.00',
      special_instructions: booking.special_instructions || 'None',
      booking_id: booking.id,
    };

    // Fetch the business_new_booking template
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('template_key', 'business_new_booking')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.warn('business_new_booking template not found, using fallback');
    }

    const notificationResults: string[] = [];

    // 1. Send email to business contact_email
    if (business.contact_email) {
      console.log(`📧 Sending notification to business: ${business.contact_email}`);

      const emailSubject = template?.email_subject
        ? replaceVariables(template.email_subject, variables)
        : `New Booking: ${service.name} with ${customerName}`;

      const emailHtml = template?.email_body_html
        ? replaceVariables(template.email_body_html, variables)
        : `<p>New booking received for ${service.name} with ${customerName} on ${variables.booking_date} at ${variables.booking_time}.</p>`;

      const emailText = template?.email_body_text
        ? replaceVariables(template.email_body_text, variables)
        : `New booking received for ${service.name} with ${customerName} on ${variables.booking_date} at ${variables.booking_time}.`;

      const emailSent = await sendEmailViaResend(
        business.contact_email,
        emailSubject,
        emailHtml,
        emailText
      );

      notificationResults.push(
        `Business email (${business.contact_email}): ${emailSent ? 'sent' : 'failed'}`
      );
    } else {
      console.warn('Business has no contact_email configured');
      notificationResults.push('Business email: no contact_email configured');
    }

    // 1b. Send SMS to business phone (if configured + template has sms_body)
    // Note: businesses do not currently have per-notification preferences; this is "best effort".
    if (business.phone) {
      const smsBody = template?.sms_body
        ? replaceVariables(template.sms_body, variables)
        : `ROAM: New booking for ${service.name} with ${customerName} on ${variables.booking_date} at ${variables.booking_time}.`;

      const smsSent = await sendSmsViaTwilio(formatPhoneNumber(business.phone), smsBody);
      notificationResults.push(
        `Business SMS (${business.phone}): ${smsSent ? 'sent' : 'failed'}`
      );
    } else {
      notificationResults.push('Business SMS: no phone configured');
    }

    // 2. Send notification to assigned provider (if any)
    if (booking.provider_id) {
      console.log(`📧 Fetching assigned provider: ${booking.provider_id}`);

      const { data: provider, error: providerError } = await supabase
        .from('providers')
        .select('id, user_id, first_name, last_name, email, phone')
        .eq('id', booking.provider_id)
        .single();

      if (providerError || !provider) {
        console.error('Failed to fetch provider:', providerError);
        notificationResults.push('Provider: not found');
      } else {
        // Check provider's notification preferences
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('email_notifications, sms_notifications, provider_new_booking_email, provider_new_booking_sms, notification_email, notification_phone, quiet_hours_enabled, quiet_hours_start, quiet_hours_end')
          .eq('user_id', provider.user_id)
          .maybeSingle();

        // Defaults: email ON, SMS OFF (opt-in)
        const emailEnabled = userSettings?.email_notifications ?? true;
        const smsEnabled = userSettings?.sms_notifications ?? false;
        const emailAllowed = emailEnabled && (userSettings?.provider_new_booking_email ?? true);
        const smsAllowed = smsEnabled && (userSettings?.provider_new_booking_sms ?? false);
        const providerEmail = userSettings?.notification_email || provider.email;
        const providerPhone = userSettings?.notification_phone || provider.phone;

        // Update variables with provider name
        variables.provider_name = `${provider.first_name} ${provider.last_name}`.trim();

        // Fetch provider_new_booking template
        const { data: providerTemplate } = await supabase
          .from('notification_templates')
          .select('*')
          .eq('template_key', 'provider_new_booking')
          .eq('is_active', true)
          .single();

        // Respect quiet hours for provider notifications (both channels)
        if (isQuietHours(userSettings)) {
          notificationResults.push('Provider notifications: skipped (quiet hours enabled)');
        } else {
        // Send email if enabled
        if (emailAllowed && providerEmail) {
          const emailSubject = providerTemplate?.email_subject
            ? replaceVariables(providerTemplate.email_subject, variables)
            : `New Booking Assigned: ${service.name}`;

          const emailHtml = providerTemplate?.email_body_html
            ? replaceVariables(providerTemplate.email_body_html, variables)
            : `<p>You have a new booking for ${service.name} with ${customerName} on ${variables.booking_date} at ${variables.booking_time}.</p>`;

          const emailText = providerTemplate?.email_body_text
            ? replaceVariables(providerTemplate.email_body_text, variables)
            : `You have a new booking for ${service.name} with ${customerName} on ${variables.booking_date} at ${variables.booking_time}.`;

          const emailSent = await sendEmailViaResend(
            providerEmail,
            emailSubject,
            emailHtml,
            emailText
          );

          notificationResults.push(
            `Provider email (${providerEmail}): ${emailSent ? 'sent' : 'failed'}`
          );
        } else {
          notificationResults.push(
            `Provider email: ${!emailAllowed ? 'disabled by preference' : 'no email configured'}`
          );
        }

        // Send SMS if enabled
        if (smsAllowed && providerPhone) {
          const smsBody = providerTemplate?.sms_body
            ? replaceVariables(providerTemplate.sms_body, variables)
            : `ROAM: New booking for ${service.name} with ${customerName} on ${variables.booking_date} at ${variables.booking_time}.`;

          const smsSent = await sendSmsViaTwilio(formatPhoneNumber(providerPhone), smsBody);

          notificationResults.push(
            `Provider SMS (${providerPhone}): ${smsSent ? 'sent' : 'failed'}`
          );
        } else {
          notificationResults.push(
            `Provider SMS: ${!smsAllowed ? 'disabled by preference' : 'no phone configured'}`
          );
        }
        }
      }
    } else {
      console.log('No provider assigned to booking');
      notificationResults.push('Provider: not assigned');
    }

    console.log(`✅ Notification processing complete for booking ${booking.id}`);
    console.log('Results:', notificationResults);

    return new Response(
      JSON.stringify({
        success: true,
        bookingId: booking.id,
        results: notificationResults,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in notify-new-booking:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
