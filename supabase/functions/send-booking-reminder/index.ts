// Supabase Edge Function: send-booking-reminder
// Sends reminder notifications to customers 24 hours before their scheduled bookings
// Uses the notification template: customer_booking_reminder (id: 67bda99d-6579-43ac-8cb0-a1f146c4f411)

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
interface BookingRecord {
  id: string;
  booking_reference: string | null;
  booking_date: string;
  start_time: string;
  customer_id: string;
  guest_email: string | null;
  guest_name: string | null;
  booking_status: string;
  delivery_type: string | null;
  customer_profiles: {
    id: string;
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
  } | null;
  services: {
    id: string;
    name: string;
  } | null;
  providers: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  business_profiles: {
    id: string;
    business_name: string;
  } | null;
  business_locations: {
    id: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
  } | null;
  customer_locations: {
    id: string;
    street_address: string;
    unit_number: string | null;
    city: string;
    state: string;
    zip_code: string;
  } | null;
}

interface NotificationTemplate {
  id: string;
  template_key: string;
  email_subject: string;
  email_body_html: string;
  email_body_text: string;
  sms_body: string;
  is_active: boolean;
}

// Helper to replace template variables
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
}

// Format phone number for Twilio
function formatPhoneNumber(phone: string): string {
  if (!phone) return phone;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
  if (phone.startsWith('+')) return phone;
  return `+${cleaned}`;
}

// Format date for display
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
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
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return { ok: false, error: 'RESEND_API_KEY not configured' };
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
      return { ok: true, id: result.id };
    } else {
      const error = await response.text();
      console.error(`❌ Failed to send email to ${to}:`, error);
      return { ok: false, error };
    }
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error);
    return { ok: false, error: String(error) };
  }
}

// Send SMS via Twilio
async function sendSmsViaTwilio(to: string, body: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    console.error('Twilio credentials not configured');
    return { ok: false, error: 'Twilio credentials not configured' };
  }

  try {
    const formattedTo = formatPhoneNumber(to);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedTo,
          From: fromNumber,
          Body: body,
        }),
      }
    );

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ SMS sent to ${formattedTo}:`, result.sid);
      return { ok: true, sid: result.sid };
    } else {
      const error = await response.text();
      console.error(`❌ Failed to send SMS to ${formattedTo}:`, error);
      return { ok: false, error };
    }
  } catch (error) {
    console.error(`❌ Error sending SMS to ${to}:`, error);
    return { ok: false, error: String(error) };
  }
}

// Format location string
function formatLocation(booking: BookingRecord): string {
  let location = 'Location TBD';
  
  if (booking.delivery_type === 'customer_location' || booking.delivery_type === 'both_locations') {
    const customerLocation = booking.customer_locations;
    if (customerLocation) {
      location = `${customerLocation.street_address || ''}${customerLocation.unit_number ? ` ${customerLocation.unit_number}` : ''}, ${customerLocation.city || ''}, ${customerLocation.state || ''} ${customerLocation.zip_code || ''}`.trim();
    }
  } else {
    const businessLocation = booking.business_locations;
    if (businessLocation) {
      location = `${businessLocation.address_line1 || ''}${businessLocation.address_line2 ? ` ${businessLocation.address_line2}` : ''}, ${businessLocation.city || ''}, ${businessLocation.state || ''} ${businessLocation.postal_code || ''}`.trim();
    }
  }
  
  return location;
}

Deno.serve(async (req) => {
  try {
    // Allow both GET (for cron) and POST requests
    if (req.method !== 'GET' && req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('📧 Starting booking reminder job...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`📅 Looking for bookings scheduled for: ${tomorrowDateStr}`);

    // Fetch the customer_booking_reminder template
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('template_key', 'customer_booking_reminder')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('❌ Failed to fetch notification template:', templateError);
      return new Response(
        JSON.stringify({ error: 'Notification template not found', details: templateError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📝 Using template: ${template.template_key}`);

    // Find all confirmed bookings scheduled for tomorrow
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        booking_date,
        start_time,
        customer_id,
        guest_email,
        guest_name,
        booking_status,
        delivery_type,
        customer_profiles:customer_id (
          id,
          user_id,
          email,
          first_name,
          last_name,
          phone
        ),
        services:service_id (
          id,
          name
        ),
        providers:provider_id (
          id,
          first_name,
          last_name
        ),
        business_profiles:business_id (
          id,
          business_name
        ),
        business_locations:business_location_id (
          id,
          address_line1,
          address_line2,
          city,
          state,
          postal_code
        ),
        customer_locations:customer_location_id (
          id,
          street_address,
          unit_number,
          city,
          state,
          zip_code
        )
      `)
      .eq('booking_date', tomorrowDateStr)
      .eq('booking_status', 'confirmed')
      .is('cancelled_at', null);

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bookings', details: bookingsError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!bookings || bookings.length === 0) {
      console.log('✅ No bookings found for tomorrow');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No bookings found for tomorrow',
          remindersSent: 0,
          date: tomorrowDateStr
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${bookings.length} booking(s) for tomorrow`);

    // Check which reminders have already been sent today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingReminders } = await supabase
      .from('notification_logs')
      .select('metadata')
      .eq('notification_type', 'customer_booking_reminder')
      .gte('sent_at', `${today}T00:00:00Z`)
      .lt('sent_at', `${today}T23:59:59Z`);

    const sentBookingIds = new Set(
      existingReminders
        ?.map(r => (r.metadata as any)?.booking_id)
        .filter(Boolean) || []
    );

    let emailsSent = 0;
    let smsSent = 0;
    let emailsFailed = 0;
    let smsFailed = 0;
    let skipped = 0;
    const results: any[] = [];

    // Process each booking
    for (const booking of bookings as unknown as BookingRecord[]) {
      // Skip if reminder already sent today
      if (sentBookingIds.has(booking.id)) {
        console.log(`⏭️ Skipping booking ${booking.id} - reminder already sent today`);
        skipped++;
        continue;
      }

      // Get customer info (handle array or single object)
      const customerProfile = Array.isArray(booking.customer_profiles) 
        ? booking.customer_profiles[0] 
        : booking.customer_profiles;
      
      const customerEmail = booking.guest_email || customerProfile?.email;
      const customerPhone = customerProfile?.phone;
      const customerName = booking.guest_name || 
        `${customerProfile?.first_name || ''} ${customerProfile?.last_name || ''}`.trim() || 
        'Valued Customer';

      if (!customerEmail && !customerPhone) {
        console.warn(`⚠️ No contact info found for booking ${booking.id}`);
        continue;
      }

      // Get service, provider, and business info
      const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
      const provider = Array.isArray(booking.providers) ? booking.providers[0] : booking.providers;
      const business = Array.isArray(booking.business_profiles) ? booking.business_profiles[0] : booking.business_profiles;

      const serviceName = service?.name || 'Service';
      const providerName = provider ? `${provider.first_name} ${provider.last_name}` : 'Provider';
      const businessName = business?.business_name || 'Business';
      const location = formatLocation(booking);

      // Prepare template variables
      const variables: Record<string, string> = {
        customer_name: customerName,
        service_name: serviceName,
        provider_name: providerName,
        business_name: businessName,
        booking_date: formatDate(booking.booking_date),
        booking_time: formatTime(booking.start_time),
        booking_location: location,
        booking_id: booking.booking_reference || booking.id,
      };

      const bookingResult: any = {
        bookingId: booking.id,
        bookingReference: booking.booking_reference,
        customerName,
        email: { status: 'not_sent' },
        sms: { status: 'not_sent' },
      };

      // Check customer notification preferences
      let emailEnabled = true;
      let smsEnabled = true;

      if (customerProfile?.user_id) {
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('email_notifications, sms_notifications')
          .eq('user_id', customerProfile.user_id)
          .maybeSingle();

        if (userSettings) {
          emailEnabled = userSettings.email_notifications ?? true;
          smsEnabled = userSettings.sms_notifications ?? true;
        }
      }

      // Send email if enabled and email exists
      if (emailEnabled && customerEmail) {
        const emailSubject = replaceVariables(template.email_subject, variables);
        const emailHtml = replaceVariables(template.email_body_html, variables);
        const emailText = replaceVariables(template.email_body_text, variables);

        const emailResult = await sendEmailViaResend(customerEmail, emailSubject, emailHtml, emailText);
        
        if (emailResult.ok) {
          emailsSent++;
          bookingResult.email = { status: 'sent', to: customerEmail, id: emailResult.id };

          // Log notification
          if (customerProfile?.user_id) {
            await supabase.from('notification_logs').insert({
              user_id: customerProfile.user_id,
              recipient_email: customerEmail,
              notification_type: 'customer_booking_reminder',
              channel: 'email',
              status: 'sent',
              resend_id: emailResult.id,
              subject: emailSubject,
              body: emailText,
              sent_at: new Date().toISOString(),
              metadata: {
                booking_id: booking.id,
                booking_reference: booking.booking_reference,
                booking_date: booking.booking_date,
                start_time: booking.start_time,
              },
            });
          }
        } else {
          emailsFailed++;
          bookingResult.email = { status: 'failed', to: customerEmail, error: emailResult.error };
        }
      } else if (!emailEnabled) {
        bookingResult.email = { status: 'disabled_by_preference' };
      } else {
        bookingResult.email = { status: 'no_email' };
      }

      // Send SMS if enabled and phone exists
      if (smsEnabled && customerPhone) {
        const smsBody = replaceVariables(template.sms_body, variables);
        const smsResult = await sendSmsViaTwilio(customerPhone, smsBody);

        if (smsResult.ok) {
          smsSent++;
          bookingResult.sms = { status: 'sent', to: customerPhone, sid: smsResult.sid };

          // Log SMS notification
          if (customerProfile?.user_id) {
            await supabase.from('notification_logs').insert({
              user_id: customerProfile.user_id,
              recipient_phone: formatPhoneNumber(customerPhone),
              notification_type: 'customer_booking_reminder',
              channel: 'sms',
              status: 'sent',
              twilio_sid: smsResult.sid,
              body: smsBody,
              sent_at: new Date().toISOString(),
              metadata: {
                booking_id: booking.id,
                booking_reference: booking.booking_reference,
                booking_date: booking.booking_date,
                start_time: booking.start_time,
              },
            });
          }
        } else {
          smsFailed++;
          bookingResult.sms = { status: 'failed', to: customerPhone, error: smsResult.error };
        }
      } else if (!smsEnabled) {
        bookingResult.sms = { status: 'disabled_by_preference' };
      } else {
        bookingResult.sms = { status: 'no_phone' };
      }

      results.push(bookingResult);
      console.log(`✅ Processed booking ${booking.id}: Email ${bookingResult.email.status}, SMS ${bookingResult.sms.status}`);
    }

    const summary = {
      success: true,
      date: tomorrowDateStr,
      totalBookings: bookings.length,
      skipped,
      emailsSent,
      emailsFailed,
      smsSent,
      smsFailed,
      results,
    };

    console.log(`✅ Reminder job completed:`, JSON.stringify({
      date: tomorrowDateStr,
      totalBookings: bookings.length,
      skipped,
      emailsSent,
      emailsFailed,
      smsSent,
      smsFailed,
    }));

    return new Response(
      JSON.stringify(summary),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in send-booking-reminder:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
