import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { ROAM_EMAIL_TEMPLATES } from '../../shared/emailTemplates';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret for security
  const cronSecret = req.headers['authorization']?.replace('Bearer ', '') || req.body?.cron_secret;
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('📧 Starting day-before reminder email job...');

    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`📅 Looking for bookings scheduled for: ${tomorrowDateStr}`);

    // Find all confirmed bookings scheduled for tomorrow
    // Exclude cancelled, declined, completed, and no_show bookings
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
        customer_profiles:customer_id (
          id,
          user_id,
          email,
          first_name,
          last_name
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
          address_line1,
          address_line2,
          city,
          state,
          postal_code
        ),
        delivery_type
      `)
      .eq('booking_date', tomorrowDateStr)
      .eq('booking_status', 'confirmed')
      .is('cancelled_at', null);

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
      return res.status(500).json({ error: 'Failed to fetch bookings', details: bookingsError.message });
    }

    if (!bookings || bookings.length === 0) {
      console.log('✅ No bookings found for tomorrow');
      return res.status(200).json({ 
        success: true, 
        message: 'No bookings found for tomorrow',
        remindersSent: 0 
      });
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
        ?.map(r => r.metadata?.booking_id)
        .filter(Boolean) || []
    );

    let remindersSent = 0;
    let remindersFailed = 0;
    const results: any[] = [];

    // Process each booking
    for (const booking of bookings) {
      // Skip if reminder already sent today
      if (sentBookingIds.has(booking.id)) {
        console.log(`⏭️ Skipping booking ${booking.id} - reminder already sent today`);
        continue;
      }

      // Determine customer email and name
      const customerEmail = booking.guest_email || 
        (Array.isArray(booking.customer_profiles) 
          ? booking.customer_profiles[0]?.email 
          : booking.customer_profiles?.email);
      
      const customerName = booking.guest_name || 
        (Array.isArray(booking.customer_profiles)
          ? `${booking.customer_profiles[0]?.first_name || ''} ${booking.customer_profiles[0]?.last_name || ''}`.trim()
          : `${booking.customer_profiles?.first_name || ''} ${booking.customer_profiles?.last_name || ''}`.trim());

      if (!customerEmail) {
        console.warn(`⚠️ No email found for booking ${booking.id}`);
        remindersFailed++;
        continue;
      }

      // Get service name
      const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
      const serviceName = service?.name || 'Service';

      // Get provider name
      const provider = Array.isArray(booking.providers) ? booking.providers[0] : booking.providers;
      const providerName = provider 
        ? `${provider.first_name} ${provider.last_name}` 
        : 'Provider';

      // Get business name
      const business = Array.isArray(booking.business_profiles) 
        ? booking.business_profiles[0] 
        : booking.business_profiles;
      const businessName = business?.business_name || 'Business';

      // Format booking date and time
      const bookingDate = new Date(`${booking.booking_date}T${booking.start_time}`).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const bookingTime = new Date(`${booking.booking_date}T${booking.start_time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Get location
      let location = 'Location TBD';
      if (booking.delivery_type === 'customer_location' || booking.delivery_type === 'both_locations') {
        const customerLocation = Array.isArray(booking.customer_locations) 
          ? booking.customer_locations[0] 
          : booking.customer_locations;
        if (customerLocation) {
          location = `${customerLocation.address_line1 || ''}${customerLocation.address_line2 ? ` ${customerLocation.address_line2}` : ''}, ${customerLocation.city || ''}, ${customerLocation.state || ''} ${customerLocation.postal_code || ''}`.trim();
        }
      } else {
        const businessLocation = Array.isArray(booking.business_locations) 
          ? booking.business_locations[0] 
          : booking.business_locations;
        if (businessLocation) {
          location = `${businessLocation.address_line1 || ''}${businessLocation.address_line2 ? ` ${businessLocation.address_line2}` : ''}, ${businessLocation.city || ''}, ${businessLocation.state || ''} ${businessLocation.postal_code || ''}`.trim();
        }
      }

      // Generate email content
      const emailHtml = ROAM_EMAIL_TEMPLATES.bookingReminder(
        customerName || 'Valued Customer',
        serviceName,
        providerName,
        bookingDate,
        bookingTime,
        location
      );

      const emailText = `Hi ${customerName || 'Valued Customer'},

This is a friendly reminder about your upcoming appointment tomorrow.

Tomorrow's Appointment:
- Service: ${serviceName}
- Provider: ${providerName}
- Date: ${bookingDate}
- Time: ${bookingTime}
- Location: ${location}

Before Your Appointment:
- Arrive 5-10 minutes early
- Bring any required items
- Contact provider if you need to reschedule

View your booking: https://roamyourbestlife.com/my-bookings

See you soon!
The ROAM Team`;

      try {
        // Send email via Resend
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'ROAM Support <support@roamyourbestlife.com>',
          to: [customerEmail],
          subject: `⏰ Reminder: Your ${serviceName} Appointment is Tomorrow`,
          html: emailHtml,
          text: emailText,
        });

        if (emailError) {
          throw emailError;
        }

        // Log notification
        const customerUserId = Array.isArray(booking.customer_profiles)
          ? booking.customer_profiles[0]?.user_id
          : booking.customer_profiles?.user_id;

        if (customerUserId) {
          await supabase.from('notification_logs').insert({
            user_id: customerUserId,
            recipient_email: customerEmail,
            notification_type: 'customer_booking_reminder',
            channel: 'email',
            status: 'sent',
            resend_id: emailData?.id,
            subject: `⏰ Reminder: Your ${serviceName} Appointment is Tomorrow`,
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

        remindersSent++;
        results.push({
          bookingId: booking.id,
          email: customerEmail,
          status: 'sent',
        });

        console.log(`✅ Reminder sent for booking ${booking.id} to ${customerEmail}`);
      } catch (emailError: any) {
        console.error(`❌ Failed to send reminder for booking ${booking.id}:`, emailError);
        remindersFailed++;
        results.push({
          bookingId: booking.id,
          email: customerEmail,
          status: 'failed',
          error: emailError.message,
        });
      }
    }

    console.log(`✅ Reminder job completed: ${remindersSent} sent, ${remindersFailed} failed`);

    return res.status(200).json({
      success: true,
      message: `Processed ${bookings.length} booking(s)`,
      remindersSent,
      remindersFailed,
      results,
    });

  } catch (error: any) {
    console.error('❌ Error in reminder job:', error);
    return res.status(500).json({
      error: 'Failed to process reminders',
      details: error.message,
    });
  }
}

