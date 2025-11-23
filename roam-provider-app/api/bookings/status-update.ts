import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize Resend for email sending
const resend = new Resend(process.env.RESEND_API_KEY);

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
    console.log(`🔍 Looking up notification template: ${notificationType} for user: ${userId}`);
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('template_key', notificationType)
      .eq('is_active', true)
      .single();

    if (templateError) {
      console.error(`❌ Error fetching template: ${notificationType}`, {
        error: templateError,
        message: templateError.message,
        code: templateError.code,
        details: templateError.details,
        hint: templateError.hint,
      });
      return;
    }

    if (!template) {
      console.error(`❌ Template not found or inactive: ${notificationType}`);
      console.error(`❌ Check if template exists in notification_templates table with template_key='${notificationType}' and is_active=true`);
      return;
    }

    console.log(`✅ Template found: ${notificationType}`, {
      templateId: template.id,
      templateKey: template.template_key,
      hasEmailBody: !!template.email_body_html,
      hasSubject: !!template.email_subject,
      emailBodyLength: template.email_body_html?.length || 0,
      subjectLength: template.email_subject?.length || 0,
    });

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

    // 7. Send email if enabled and recipient exists
    console.log(`📧 Email sending check:`, {
      emailAllowed,
      hasRecipientEmail: !!recipientEmail,
      recipientEmail: recipientEmail ? recipientEmail.substring(0, 10) + '...' : null, // Log partial email for privacy
      hasTemplateBody: !!template.email_body_html,
      notificationType,
      userId,
    });

    if (!emailAllowed) {
      console.log(`ℹ️ Email not allowed for ${notificationType} - user preferences or quiet hours`);
    }
    if (!recipientEmail) {
      console.warn(`⚠️ No recipient email found for user ${userId}`);
    }
    if (!template.email_body_html) {
      console.warn(`⚠️ Template ${notificationType} has no email body HTML`);
    }

    if (emailAllowed && recipientEmail && template.email_body_html) {
      try {
        console.log(`📧 Preparing to send email to: ${recipientEmail}`);
        // Replace template variables
        let subject = template.email_subject || '';
        let htmlBody = template.email_body_html || '';
        let textBody = template.email_body_text || '';

        console.log(`📧 Template variables:`, templateVariables);

        for (const [key, value] of Object.entries(templateVariables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          subject = subject.replace(regex, String(value ?? ''));
          htmlBody = htmlBody.replace(regex, String(value ?? ''));
          textBody = textBody.replace(regex, String(value ?? ''));
        }

        console.log(`📧 Sending email via Resend...`);

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

    // 8. SMS sending would go here (similar pattern)
    if (smsAllowed && recipientPhone && template.sms_body) {
      console.log(`📱 SMS notifications not yet implemented for ${notificationType}`);
    }

  } catch (error) {
    console.error('❌ Notification service error:', error);
  }
}

// Safely import notification functions - these may fail in some environments
let sendSMS: any = null;
let notifyProvidersBookingCancelled: any = null;
let notifyProvidersBookingRescheduled: any = null;

try {
  const smsModule = require('../../lib/notifications/sms-service.js');
  sendSMS = smsModule.sendSMS;
} catch (e) {
  console.warn('⚠️ Could not load SMS service module:', e);
}

try {
  const cancelledModule = require('../../lib/notifications/notify-providers-booking-cancelled.js');
  notifyProvidersBookingCancelled = cancelledModule.notifyProvidersBookingCancelled;
} catch (e) {
  console.warn('⚠️ Could not load booking cancelled notification module:', e);
}

try {
  const rescheduledModule = require('../../lib/notifications/notify-providers-booking-rescheduled.js');
  notifyProvidersBookingRescheduled = rescheduledModule.notifyProvidersBookingRescheduled;
} catch (e) {
  console.warn('⚠️ Could not load booking rescheduled notification module:', e);
}

// ✅ Email sending now handled by NotificationService (no need for inline Resend setup)

// ✅ Old inline email templates removed - now using NotificationService with DB templates

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
    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseServiceKey 
      });
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing Supabase credentials'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = req.body;
    const { 
      bookingId, 
      newStatus, 
      updatedBy, 
      reason, 
      notifyCustomer = true,
      notifyProvider = true 
    } = body;

    // Validate required fields
    if (!bookingId || !newStatus || !updatedBy) {
      console.error('❌ Missing required fields:', { bookingId, newStatus, updatedBy });
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: `bookingId: ${!!bookingId}, newStatus: ${!!newStatus}, updatedBy: ${!!updatedBy}`
      });
    }

    console.log('✅ Updating booking status:', { bookingId, newStatus, updatedBy, timestamp: new Date().toISOString() });

    // Update booking status in Supabase
    console.log('🔍 Executing Supabase update query...');
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_status: newStatus
      })
      .eq('id', bookingId)
      .select(`
        *,
        customer_profiles (
          id,
          first_name,
          last_name,
          email,
          phone,
          user_id
        ),
        providers (
          id,
          first_name,
          last_name,
          email,
          phone,
          user_id
        ),
        business_profiles (
          id,
          business_name,
          contact_email
        ),
        business_locations!bookings_business_location_id_fkey (
          id,
          location_name,
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          country
        ),
        customer_locations!bookings_customer_location_id_fkey (
          id,
          location_name,
          street_address,
          unit_number,
          city,
          state,
          zip_code
        ),
        services (
          id,
          name
        )
      `)
      .single();

    if (updateError) {
      console.error('❌ Error updating booking:', {
        error: updateError,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
        bookingId,
        newStatus
      });
      return res.status(500).json({ 
        error: 'Failed to update booking',
        details: updateError.message,
        code: updateError.code
      });
    }

    if (!booking) {
      console.error('❌ No booking returned after update:', { bookingId });
      return res.status(404).json({ 
        error: 'Booking not found or not updated',
        details: `No booking found with ID: ${bookingId}`
      });
    }

    console.log('✅ Booking updated successfully:', { bookingId, newStatus, timestamp: new Date().toISOString() });
    console.log('📧 Notification settings:', { notifyCustomer, notifyProvider, willNotify: notifyCustomer || notifyProvider });

    // Note: Status history tracking removed - table doesn't exist in current schema
    // The booking record itself maintains the current status

    // Send notifications based on status change (non-blocking)
    // Don't await - let it run in background
    if (notifyCustomer || notifyProvider) {
      console.log('📧 Queueing notifications for status:', newStatus, { notifyCustomer, notifyProvider });
      // Fire and forget - don't block the response
      sendStatusNotifications(booking, newStatus, { notifyCustomer, notifyProvider })
        .catch((notificationError) => {
        console.error('⚠️ Notification error (non-fatal):', notificationError);
        console.error('⚠️ Notification error stack:', notificationError instanceof Error ? notificationError.stack : 'No stack');
        });
    } else {
      console.log('⚠️ Notifications skipped - both notifyCustomer and notifyProvider are false');
    }

    console.log('🎉 Status update completed successfully');
    return res.status(200).json({ 
      success: true, 
      booking,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Status update error (catch block):', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      body: req.body
    });
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code
    });
  }
}

/**
 * Queue notifications based on booking status change
 * This is a lightweight approach that just queues notifications without external dependencies
 */
async function sendStatusNotifications(
  booking: any,
  newStatus: string,
  options: { notifyCustomer: boolean; notifyProvider: boolean }
) {
  try {
    console.log('📧 sendStatusNotifications called:', {
      newStatus,
      notifyCustomer: options.notifyCustomer,
      notifyProvider: options.notifyProvider,
      bookingId: booking?.id,
      customerProfilesType: typeof booking.customer_profiles,
      isCustomerArray: Array.isArray(booking.customer_profiles)
    });

    const customer = Array.isArray(booking.customer_profiles)
      ? booking.customer_profiles[0]
      : booking.customer_profiles;
    const provider = Array.isArray(booking.providers)
      ? booking.providers[0]
      : booking.providers;

    const business = Array.isArray(booking.business_profiles)
      ? booking.business_profiles[0]
      : booking.business_profiles;

    const service = Array.isArray(booking.services)
      ? booking.services[0]
      : booking.services;

    console.log('📧 Extracted data:', {
      hasCustomer: !!customer,
      customerUserId: customer?.user_id,
      customerEmail: customer?.email,
      customerName: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : null,
      hasProvider: !!provider,
      hasBusiness: !!business,
      hasService: !!service,
      hasBusinessLocations: !!booking.business_locations,
      businessLocationsType: typeof booking.business_locations,
      isBusinessLocationsArray: Array.isArray(booking.business_locations),
      businessLocationsLength: Array.isArray(booking.business_locations) ? booking.business_locations.length : 0,
      hasCustomerLocations: !!booking.customer_locations,
      customerLocationsType: typeof booking.customer_locations,
      isCustomerLocationsArray: Array.isArray(booking.customer_locations),
      customerLocationsLength: Array.isArray(booking.customer_locations) ? booking.customer_locations.length : 0,
      businessLocationId: booking.business_location_id,
      customerLocationId: booking.customer_location_id,
    });

    const bookingDateRaw = booking.booking_date || booking.original_booking_date;
    const startTimeRaw = booking.start_time || booking.booking_time || booking.original_start_time;
    const locationName = business?.business_name || booking.business_name || 'Location';
    
    // Format location address from business_locations or customer_locations
    // Note: Supabase foreign key relationships can return either a single object or an array
    let locationAddress = '';
    
    // Helper function to get location object (handles both array and single object)
    const getLocationObject = (locationData: any) => {
      if (!locationData) return null;
      if (Array.isArray(locationData)) {
        return locationData.length > 0 ? locationData[0] : null;
      }
      return locationData; // Single object
    };
    
    // Check if booking has business location (most common case)
    const businessLocation = getLocationObject(booking.business_locations);
    if (businessLocation) {
      console.log('📧 Found business location:', {
        address_line1: businessLocation.address_line1,
        address_line2: businessLocation.address_line2,
        city: businessLocation.city,
        state: businessLocation.state,
        postal_code: businessLocation.postal_code,
      });
      const parts = [
        businessLocation.address_line1,
        businessLocation.address_line2,
        businessLocation.city && businessLocation.state && businessLocation.postal_code 
          ? `${businessLocation.city}, ${businessLocation.state} ${businessLocation.postal_code}` 
          : null,
      ].filter(Boolean);
      locationAddress = parts.join(', ');
      console.log('📧 Formatted business location address:', locationAddress);
    }
    // Check if booking has customer location (for mobile services)
    else {
      const customerLocation = getLocationObject(booking.customer_locations);
      if (customerLocation) {
        console.log('📧 Found customer location:', {
          street_address: customerLocation.street_address,
          unit_number: customerLocation.unit_number,
          city: customerLocation.city,
          state: customerLocation.state,
          zip_code: customerLocation.zip_code,
        });
        const parts = [
          customerLocation.street_address,
          customerLocation.unit_number,
          customerLocation.city && customerLocation.state && customerLocation.zip_code 
            ? `${customerLocation.city}, ${customerLocation.state} ${customerLocation.zip_code}` 
            : null,
        ].filter(Boolean);
        locationAddress = parts.join(', ');
        console.log('📧 Formatted customer location address:', locationAddress);
      }
      // Fallback (should rarely happen)
      else {
        console.warn('⚠️ No location data found in booking. Using fallback.');
        locationAddress = 'Location TBD';
      }
    }
    
    // Ensure location is not empty or "TBD" if we have location IDs
    if ((locationAddress === 'Location TBD' || !locationAddress) && (booking.business_location_id || booking.customer_location_id)) {
      console.warn('⚠️ Location IDs exist but location data not fetched. Location ID:', {
        business_location_id: booking.business_location_id,
        customer_location_id: booking.customer_location_id,
        business_locations: booking.business_locations,
        customer_locations: booking.customer_locations,
      });
    }
    
    // Final validation - ensure location is not empty
    if (!locationAddress || locationAddress.trim() === '') {
      console.warn('⚠️ Location address is empty, using fallback');
      locationAddress = 'Location TBD';
    }
    
    const serviceName = service?.name || booking.service_name || 'Service';

    const totalAmountValue =
      (booking.total_amount ?? 0) +
      (booking.service_fee ?? 0) +
      (booking.remaining_balance ?? 0);

    const totalAmountFormatted = totalAmountValue.toFixed(2);

    const customerName = customer
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer'
      : booking.guest_name || 'Customer';
    const customerEmail = customer?.email || booking.guest_email;

    if (!customer && !provider) {
      console.warn('⚠️ Missing customer and provider data, skipping notifications');
      return;
    }

    // Create a Supabase client for this function
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️ Missing Supabase credentials, skipping notifications');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Format booking data for templates
    const bookingDate = bookingDateRaw ? new Date(bookingDateRaw).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) : 'Date TBD';
    
    const bookingTime = startTimeRaw ? new Date(`2000-01-01T${startTimeRaw}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }) : 'Time TBD';

    // Send notifications using inline notification service (Vercel-compatible)
    
    // Notify customer when booking is confirmed/accepted
    if ((newStatus === 'confirmed' || newStatus === 'accepted') && options.notifyCustomer) {
      console.log('📧 Checking if customer notification should be sent:', {
        newStatus,
        notifyCustomer: options.notifyCustomer,
        hasCustomer: !!customer,
        customerUserId: customer?.user_id,
        customerName,
        customerEmail: customer?.email,
        locationAddress,
        bookingDate,
        bookingTime,
        serviceName,
      });

      if (!customer?.user_id) {
        console.error('❌ Cannot send notification: customer.user_id is missing', {
          bookingId: booking.id,
          customerId: customer?.id,
          customerEmail: customer?.email,
          customerName,
          customerData: customer,
        });
      } else {
        console.log('📧 Sending customer_booking_accepted notification to user:', customer.user_id);
        console.log('📧 Notification payload:', {
          customer_name: customerName,
          service_name: serviceName,
          provider_name: provider ? `${provider.first_name} ${provider.last_name}` : 'Provider',
          booking_date: bookingDate,
          booking_time: bookingTime,
          booking_location: locationAddress,
          total_amount: totalAmountFormatted,
          booking_id: booking.id,
        });
        try {
          const notificationResult = await sendNotificationViaService(
            customer.user_id,
            'customer_booking_accepted',
            {
              customer_name: customerName,
              service_name: serviceName,
              provider_name: provider ? `${provider.first_name} ${provider.last_name}` : 'Provider',
              booking_date: bookingDate,
              booking_time: bookingTime,
              booking_location: locationAddress,
              total_amount: totalAmountFormatted,
              booking_id: booking.id,
            },
            {
              booking_id: booking.id,
              event_type: 'booking_accepted',
            }
          );
          console.log('✅ Notification sent successfully. Result:', notificationResult);
        } catch (notificationError) {
          console.error('❌ Error sending notification:', {
            error: notificationError,
            message: notificationError instanceof Error ? notificationError.message : String(notificationError),
            stack: notificationError instanceof Error ? notificationError.stack : undefined,
          });
        }
      }
    } else {
      console.log('ℹ️ Customer notification skipped:', {
        newStatus,
        notifyCustomer: options.notifyCustomer,
        statusMatches: newStatus === 'confirmed' || newStatus === 'accepted',
      });
    }
    
    // Notify customer when booking is completed
    if (newStatus === 'completed' && options.notifyCustomer && customer?.user_id) {
      await sendNotificationViaService(
        customer.user_id,
        'customer_booking_completed',
        {
          customer_name: customerName,
          service_name: serviceName,
          provider_name: provider ? `${provider.first_name} ${provider.last_name}` : 'Provider',
          provider_id: provider?.id || '',
          booking_id: booking.id,
          booking_date: bookingDate,
          booking_time: bookingTime,
          booking_location: locationAddress,
          total_amount: totalAmountFormatted,
        },
        {
          booking_id: booking.id,
          event_type: 'booking_completed',
        }
      );
    }
    // Notify providers when booking is cancelled (owners/dispatchers + assigned provider)
    if (newStatus === 'cancelled' && options.notifyProvider && business && notifyProvidersBookingCancelled) {
      try {
        await notifyProvidersBookingCancelled({
          booking: {
            id: booking.id,
            business_id: booking.business_id,
            provider_id: booking.provider_id,
            booking_date: bookingDateRaw || '',
            start_time: startTimeRaw || '',
            cancellation_reason: booking.cancellation_reason,
          },
          service: {
            name: serviceName,
          },
          customer: {
            first_name: customer?.first_name || booking.guest_name?.split(' ')[0] || 'Customer',
            last_name: customer?.last_name || booking.guest_name?.split(' ').slice(1).join(' ') || '',
          },
          business: {
            name: locationName,
            business_address: locationAddress,
          },
        });
      } catch (notificationError) {
        console.error('⚠️ Error sending cancellation notifications (non-fatal):', notificationError);
      }
    }

    // Notify providers when booking is rescheduled (owners/dispatchers + assigned provider)
    // Check if this is a reschedule by looking for reschedule fields
    if (options.notifyProvider && business && notifyProvidersBookingRescheduled && (
      booking.rescheduled_at || 
      booking.reschedule_reason || 
      (booking.original_booking_date && booking.original_booking_date !== booking.booking_date) ||
      (booking.original_start_time && booking.original_start_time !== booking.start_time)
    )) {
      try {
        await notifyProvidersBookingRescheduled({
          booking: {
            id: booking.id,
            business_id: booking.business_id,
            provider_id: booking.provider_id,
            booking_date: booking.booking_date || '',
            start_time: booking.start_time || '',
            original_booking_date: booking.original_booking_date,
            original_start_time: booking.original_start_time,
            reschedule_reason: booking.reschedule_reason,
          },
          service: {
            name: serviceName,
          },
          customer: {
            first_name: customer?.first_name || booking.guest_name?.split(' ')[0] || 'Customer',
            last_name: customer?.last_name || booking.guest_name?.split(' ').slice(1).join(' ') || '',
          },
          business: {
            name: locationName,
            business_address: locationAddress,
          },
        });
      } catch (notificationError) {
        console.error('⚠️ Error sending reschedule notifications (non-fatal):', notificationError);
      }
    }

    // ✅ All customer notifications now handled by NotificationService above
    // (which checks granular preferences, quiet hours, uses DB templates, etc.)

  } catch (error) {
    console.error('❌ Error in sendStatusNotifications:', error);
  }
}
