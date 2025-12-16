import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  processBookingAcceptance,
  processBookingDecline,
} from './payment-processor.js';
import { sendNotification } from '../../shared/notifications/index.js';

// Initialize Resend for email sending
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Generate iCal file content for calendar invite
 */
function generateICalFile(
  summary: string,
  description: string,
  location: string,
  startDate: Date,
  endDate: Date,
  organizerEmail: string = 'support@roamyourbestlife.com',
  organizerName: string = 'ROAM',
  attendeeEmail: string
): string {
  // Format dates in UTC (iCal format: YYYYMMDDTHHMMSSZ)
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  // Generate unique ID for the event
  const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}@roamyourbestlife.com`;

  // Escape special characters in text fields
  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ROAM//Booking Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(location)}`,
    `ORGANIZER;CN="${escapeText(organizerName)}":MAILTO:${organizerEmail}`,
    `ATTENDEE;CN="${escapeText(attendeeEmail)}";RSVP=TRUE:MAILTO:${attendeeEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Booking starts in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return ical;
}


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

    // Validate that booking has a provider assigned before confirming
    if (newStatus === 'confirmed') {
      // First, fetch the current booking to check if it has a provider_id
      const { data: currentBooking, error: fetchError } = await supabase
        .from('bookings')
        .select('id, provider_id, booking_status')
        .eq('id', bookingId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching booking for validation:', fetchError);
        return res.status(500).json({
          error: 'Failed to validate booking',
          details: fetchError.message
        });
      }

      if (!currentBooking) {
        console.error('❌ Booking not found:', { bookingId });
        return res.status(404).json({
          error: 'Booking not found',
          details: `No booking found with ID: ${bookingId}`
        });
      }

      if (!currentBooking.provider_id) {
        console.error('❌ Cannot accept booking without assigned provider:', {
          bookingId,
          currentStatus: currentBooking.booking_status,
          providerId: currentBooking.provider_id
        });
        return res.status(400).json({
          error: 'Cannot accept booking without assigned provider',
          details: 'A provider must be assigned to the booking before it can be accepted.',
          bookingId,
          currentStatus: currentBooking.booking_status
        });
      }

      console.log('✅ Booking has provider assigned:', {
        bookingId,
        providerId: currentBooking.provider_id,
        newStatus
      });
    }

    console.log('✅ Updating booking status:', { bookingId, newStatus, updatedBy, reason, timestamp: new Date().toISOString() });

    // Build update data - include decline_reason if declining
    const updateData: Record<string, any> = {
      booking_status: newStatus
    };
    
    // If declining, save the decline reason
    if (newStatus === 'declined' && reason) {
      updateData.decline_reason = reason;
      console.log('📝 Saving decline reason:', reason);
    }

    // Update booking status in Supabase
    console.log('🔍 Executing Supabase update query...');
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
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
          name,
          duration_minutes
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

    // Process payments based on status change
    let paymentProcessingResult: any = null;
    if (newStatus === 'confirmed') {
      console.log('💰 Processing payment for booking confirmation...');
      const paymentResult = await processBookingAcceptance(bookingId, updatedBy);
      paymentProcessingResult = paymentResult;
      
      if (!paymentResult.success) {
        console.error('⚠️ ======= PAYMENT PROCESSING FAILED =======');
        console.error('⚠️ Booking ID:', bookingId);
        console.error('⚠️ Error:', paymentResult.error);
        console.error('⚠️ Status update succeeded but payment was NOT charged');
        console.error('⚠️ Manual intervention may be required');
        // Don't fail the status update - payment can be retried
        // But log the error for monitoring
      } else {
        console.log('✅ ======= PAYMENT PROCESSING SUCCEEDED =======');
        console.log('✅ Payment processed successfully:', {
          bookingId,
          serviceFeeCharged: paymentResult.serviceFeeCharged,
          serviceAmountCharged: paymentResult.serviceAmountCharged,
          serviceAmountAuthorized: paymentResult.serviceAmountAuthorized,
          paymentIntentId: paymentResult.paymentIntentId,
        });
      }
    } else if (newStatus === 'declined') {
      console.log('🚫 Processing payment cancellation for booking decline...');
      const declineResult = await processBookingDecline(bookingId, updatedBy, reason);
      
      if (!declineResult.success) {
        console.error('⚠️ Payment cancellation failed:', declineResult.error);
        // Don't fail the status update - payment cancellation can be retried
      } else {
        console.log('✅ Payment cancellation processed successfully');
      }
    }

    // Note: Status history tracking removed - table doesn't exist in current schema
    // The booking record itself maintains the current status

    // Send notifications based on status change (non-blocking)
    // Don't await - let it run in background
    if (notifyCustomer || notifyProvider) {
      console.log('📧 Queueing notifications for status:', newStatus, { notifyCustomer, notifyProvider });
      // IMPORTANT: Must await in serverless - function can terminate after response sent
      try {
        await sendStatusNotifications(booking, newStatus, { notifyCustomer, notifyProvider });
        console.log('✅ Notifications sent successfully');
      } catch (notificationError) {
        console.error('⚠️ Notification error (non-fatal):', notificationError);
        console.error('⚠️ Notification error stack:', notificationError instanceof Error ? notificationError.stack : 'No stack');
        // Continue - don't fail the booking status update if notifications fail
      }
    } else {
      console.log('⚠️ Notifications skipped - both notifyCustomer and notifyProvider are false');
    }

    console.log('🎉 Status update completed successfully');
    return res.status(200).json({ 
      success: true, 
      booking,
      timestamp: new Date().toISOString(),
      // Include payment processing result for transparency
      paymentProcessing: paymentProcessingResult ? {
        success: paymentProcessingResult.success,
        error: paymentProcessingResult.error || null,
        serviceFeeCharged: paymentProcessingResult.serviceFeeCharged || false,
        serviceAmountCharged: paymentProcessingResult.serviceAmountCharged || false,
      } : null
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

    // total_amount already includes service_fee, so we don't need to add it again
    // remaining_balance is for future payments, not part of the current total
    const totalAmountValue = booking.total_amount ?? 0;

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
    
    // Notify customer when booking is confirmed
    if (newStatus === 'confirmed' && options.notifyCustomer && customer?.user_id) {
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

      // Check user settings for email preferences
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('email_notifications, customer_booking_accepted_email, notification_email')
        .eq('user_id', customer.user_id)
        .maybeSingle();

      const emailAllowed = (userSettings?.email_notifications ?? true) && (userSettings?.customer_booking_accepted_email ?? true);
      const recipientEmail = userSettings?.notification_email || customerEmail;

      console.log('📧 User notification preferences:', {
        emailAllowed,
        recipientEmail: recipientEmail?.substring(0, 10) + '...',
        userHasSettings: !!userSettings,
      });

      if (!emailAllowed) {
        console.log('ℹ️ Customer has disabled email notifications for booking accepted');
      } else if (recipientEmail) {
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
          // Generate calendar invite for customer
          let calendarLinks: { google?: string; outlook?: string; ics?: string } = {};
          let icalContent: string | null = null;

          if (bookingDateRaw && startTimeRaw && customerEmail) {
            try {
              // Parse booking date and time
              const bookingDateTime = new Date(`${bookingDateRaw}T${startTimeRaw}`);
              if (!isNaN(bookingDateTime.getTime())) {
                // Get service duration (default to 60 minutes if not available)
                const durationMinutes = service?.duration_minutes || booking.duration_minutes || 60;
                const endDateTime = new Date(bookingDateTime.getTime() + durationMinutes * 60000);

                // Generate calendar summary and description
                const calendarSummary = `${serviceName} with ${provider ? `${provider.first_name} ${provider.last_name}` : 'Provider'}`;
                const calendarDescription = `Service: ${serviceName}\nProvider: ${provider ? `${provider.first_name} ${provider.last_name}` : 'Provider'}\n\nLocation: ${locationAddress}\n\nBooking ID: ${booking.id}`;

                // Generate ICS file
                icalContent = generateICalFile(
                  calendarSummary,
                  calendarDescription,
                  locationAddress,
                  bookingDateTime,
                  endDateTime,
                  'support@roamyourbestlife.com',
                  'ROAM',
                  customerEmail
                );

                // Generate calendar links
                const formatDateForURL = (date: Date): string => {
                  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                };

                const startDateStr = formatDateForURL(bookingDateTime);
                const endDateStr = formatDateForURL(endDateTime);
                const encodedSummary = encodeURIComponent(calendarSummary);
                const encodedDescription = encodeURIComponent(calendarDescription);
                const encodedLocation = encodeURIComponent(locationAddress);

                // Google Calendar link
                calendarLinks.google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedSummary}&dates=${startDateStr}/${endDateStr}&details=${encodedDescription}&location=${encodedLocation}`;

                // Outlook Calendar link
                calendarLinks.outlook = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodedSummary}&startdt=${bookingDateTime.toISOString()}&enddt=${endDateTime.toISOString()}&body=${encodedDescription}&location=${encodedLocation}`;

                // ICS file download link
                const baseUrl = process.env.VERCEL_URL 
                  ? `https://${process.env.VERCEL_URL}` 
                  : process.env.PROVIDER_APP_API_URL || 'https://provider.roamyourbestlife.com';
                calendarLinks.ics = `${baseUrl}/api/bookings/calendar-invite/${booking.id}`;
              }
            } catch (calendarError) {
              console.error('❌ Error generating calendar links:', {
                error: calendarError,
                message: calendarError instanceof Error ? calendarError.message : String(calendarError),
                stack: calendarError instanceof Error ? calendarError.stack : undefined,
              });
            }
          }

          console.log('📧 Calendar generation result:', {
            hasIcalContent: !!icalContent,
            hasRecipientEmail: !!recipientEmail,
            icalContentLength: icalContent?.length || 0,
          });

          // Send notification via shared service (uses database template with logo)
          console.log('📧 Preparing to send customer_booking_accepted notification');
          
          // Prepare attachment if calendar was generated successfully
          const attachment = icalContent ? {
            filename: 'booking.ics',
            content: Buffer.from(icalContent).toString('base64'),
          } : undefined;

          if (!icalContent) {
            console.warn('⚠️ Calendar generation failed, sending email without attachment');
          }

          await sendNotification({
            userId: customer.user_id,
            notificationType: 'customer_booking_accepted',
            variables: {
              customer_name: customerName,
              service_name: serviceName,
              provider_name: provider ? `${provider.first_name} ${provider.last_name}` : 'Provider',
              booking_date: bookingDate,
              booking_time: bookingTime,
              booking_location: locationAddress,
              total_amount: totalAmountFormatted,
              booking_id: booking.id,
              booking_reference: booking.booking_reference || 'N/A',
            },
            attachment,
            metadata: {
              booking_id: booking.id,
              status: 'confirmed',
            },
          });

          console.log('✅ Customer booking confirmation email process completed');
        } catch (notificationError) {
          console.error('❌ Error in confirmation email process:', {
            error: notificationError,
            message: notificationError instanceof Error ? notificationError.message : String(notificationError),
            stack: notificationError instanceof Error ? notificationError.stack : undefined,
            customerUserId: customer?.user_id,
            recipientEmail: recipientEmail?.substring(0, 10) + '...',
          });
        }
      } else {
        console.log('ℹ️ Customer notification skipped: no recipient email or emailAllowed=false');
      }
    } else {
      console.log('ℹ️ Customer notification skipped:', {
        newStatus,
        notifyCustomer: options.notifyCustomer,
        statusMatches: newStatus === 'confirmed',
      });
    }

    // Send calendar invite to provider when booking is confirmed
    if (newStatus === 'confirmed' && provider?.user_id && options.notifyProvider) {
      try {
        console.log('📅 Preparing to send calendar invite to provider:', {
          providerUserId: provider.user_id,
          providerId: provider.id,
          providerName: provider ? `${provider.first_name} ${provider.last_name}` : 'Provider',
        });

        // Get provider's notification email from user_settings or providers table
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('notification_email')
          .eq('user_id', provider.user_id)
          .maybeSingle();

        // Also get provider record for notification_email fallback
        const { data: providerRecord } = await supabase
          .from('providers')
          .select('notification_email, email')
          .eq('id', provider.id)
          .single();

        // Priority: user_settings.notification_email -> providers.notification_email -> providers.email
        const providerNotificationEmail = 
          userSettings?.notification_email || 
          providerRecord?.notification_email || 
          providerRecord?.email || 
          provider.email;

        if (!providerNotificationEmail) {
          console.warn('⚠️ Cannot send calendar invite: No provider email found', {
            providerUserId: provider.user_id,
            providerId: provider.id,
          });
          return;
        }

        // Calculate booking start and end times
        if (!bookingDateRaw || !startTimeRaw) {
          console.warn('⚠️ Cannot send calendar invite: Missing booking date or time', {
            bookingDateRaw,
            startTimeRaw,
          });
          return;
        }

        // Parse booking date and time
        const bookingDateTime = new Date(`${bookingDateRaw}T${startTimeRaw}`);
        if (isNaN(bookingDateTime.getTime())) {
          console.error('❌ Invalid booking date/time:', { bookingDateRaw, startTimeRaw });
          return;
        }

        // Get service duration (default to 60 minutes if not available)
        const durationMinutes = service?.duration_minutes || booking.duration_minutes || 60;
        const endDateTime = new Date(bookingDateTime.getTime() + durationMinutes * 60000);

        // Validate location before sending calendar invite
        if (!locationAddress || locationAddress === 'Location TBD' || locationAddress.trim() === '') {
          console.warn('⚠️ Cannot send calendar invite: Invalid or missing location', {
            locationAddress,
            bookingId: booking.id,
            businessLocationId: booking.business_location_id,
            customerLocationId: booking.customer_location_id,
          });
          // Still send the email notification, but without calendar attachment
          console.log('📧 Sending booking confirmation email without calendar invite due to missing location');
        } else {
          // Generate calendar invite with location
          const calendarSummary = `${serviceName} - ${customerName}`;
          const calendarDescription = `Service: ${serviceName}\nCustomer: ${customerName}${customerEmail ? `\nEmail: ${customerEmail}` : ''}${customer?.phone ? `\nPhone: ${customer.phone}` : ''}\n\nLocation: ${locationAddress}\n\nBooking ID: ${booking.id}`;
          
          const icalContent = generateICalFile(
            calendarSummary,
            calendarDescription,
            locationAddress, // Location is included in the calendar invite
            bookingDateTime,
            endDateTime,
            'support@roamyourbestlife.com',
            'ROAM',
            providerNotificationEmail
          );

          // Send calendar invite email with attachment
          const { data: emailData, error: emailError } = await resend.emails.send({
            from: 'ROAM Support <support@roamyourbestlife.com>',
            to: [providerNotificationEmail],
            subject: `📅 Calendar Invite: ${serviceName} - ${bookingDate}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4F46E5;">Booking Confirmed</h2>
                <p>Hi ${provider.first_name || 'Provider'},</p>
                <p>A new booking has been confirmed and added to your calendar:</p>
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Service:</strong> ${serviceName}</p>
                  <p><strong>Customer:</strong> ${customerName}</p>
                  <p><strong>Date:</strong> ${bookingDate}</p>
                  <p><strong>Time:</strong> ${bookingTime}</p>
                  <p><strong>Duration:</strong> ${durationMinutes} minutes</p>
                  <p><strong>Location:</strong> ${locationAddress}</p>
                </div>
                <p>Please accept the calendar invite attached to this email to add this booking to your calendar. The location has been included in the calendar event.</p>
                <p>If you have any questions, please contact us at <a href="mailto:support@roamyourbestlife.com">support@roamyourbestlife.com</a></p>
                <p>Best regards,<br>The ROAM Team</p>
              </div>
            `,
            text: `
Booking Confirmed

Hi ${provider.first_name || 'Provider'},

A new booking has been confirmed and added to your calendar:

Service: ${serviceName}
Customer: ${customerName}
Date: ${bookingDate}
Time: ${bookingTime}
Duration: ${durationMinutes} minutes
Location: ${locationAddress}

Please accept the calendar invite attached to this email to add this booking to your calendar. The location has been included in the calendar event.

If you have any questions, please contact us at support@roamyourbestlife.com

Best regards,
The ROAM Team
            `,
            attachments: [
              {
                filename: 'booking.ics',
                content: Buffer.from(icalContent).toString('base64'),
              },
            ],
          });

          if (emailError) {
            console.error('❌ Error sending calendar invite:', emailError);
          } else {
            console.log('✅ Calendar invite sent successfully to provider:', {
              email: providerNotificationEmail,
              resendId: emailData?.id,
              location: locationAddress,
            });
          }
          return; // Exit early if calendar invite was sent successfully
        }

        // Send booking confirmation email without calendar attachment (location missing)
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'ROAM Support <support@roamyourbestlife.com>',
          to: [providerNotificationEmail],
          subject: `Booking Confirmed: ${serviceName} - ${bookingDate}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4F46E5;">Booking Confirmed</h2>
              <p>Hi ${provider.first_name || 'Provider'},</p>
              <p>A new booking has been confirmed:</p>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Service:</strong> ${serviceName}</p>
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Date:</strong> ${bookingDate}</p>
                <p><strong>Time:</strong> ${bookingTime}</p>
                <p><strong>Duration:</strong> ${durationMinutes} minutes</p>
                ${locationAddress && locationAddress !== 'Location TBD' ? `<p><strong>Location:</strong> ${locationAddress}</p>` : '<p><strong>Location:</strong> To be determined</p>'}
              </div>
              <p style="color: #dc2626; font-weight: bold;">⚠️ Note: Calendar invite not included - location information is pending.</p>
              <p>If you have any questions, please contact us at <a href="mailto:support@roamyourbestlife.com">support@roamyourbestlife.com</a></p>
              <p>Best regards,<br>The ROAM Team</p>
            </div>
          `,
          text: `
Booking Confirmed

Hi ${provider.first_name || 'Provider'},

A new booking has been confirmed:

Service: ${serviceName}
Customer: ${customerName}
Date: ${bookingDate}
Time: ${bookingTime}
Duration: ${durationMinutes} minutes
${locationAddress && locationAddress !== 'Location TBD' ? `Location: ${locationAddress}` : 'Location: To be determined'}

⚠️ Note: Calendar invite not included - location information is pending.

If you have any questions, please contact us at support@roamyourbestlife.com

Best regards,
The ROAM Team
          `,
        });

        if (emailError) {
          console.error('❌ Error sending booking confirmation email:', emailError);
        } else {
          console.log('✅ Booking confirmation email sent (without calendar invite):', {
            email: providerNotificationEmail,
            resendId: emailData?.id,
            reason: 'Location missing or invalid',
          });
        }
      } catch (calendarError) {
        console.error('❌ Error sending calendar invite:', {
          error: calendarError,
          message: calendarError instanceof Error ? calendarError.message : String(calendarError),
          stack: calendarError instanceof Error ? calendarError.stack : undefined,
        });
        // Don't throw - calendar invite failure shouldn't block booking acceptance
      }
    }
    
    // Notify customer when booking is completed
    if (newStatus === 'completed' && options.notifyCustomer && customer?.user_id) {
      console.log('📧 Notifying customer of completed booking via service:', {
        userId: customer.user_id,
        customerEmail,
        customerName,
        serviceName,
      });
      
      const providerName = provider ? `${provider.first_name} ${provider.last_name}` : business?.business_name || 'Provider';
      const reviewLink = `https://roamyourbestlife.com/customer/review/${booking.id}`;
      
      await sendNotification({
        userId: customer.user_id,
        notificationType: 'customer_booking_completed',
        variables: {
          customer_name: customerName,
          provider_name: providerName,
          service_name: serviceName,
          booking_date: bookingDate,
          booking_time: bookingTime,
          location: locationAddress,
          total_amount: totalAmountFormatted,
          review_url: reviewLink,
          provider_id: provider?.id || booking.provider_id || '',
          booking_reference: booking.booking_reference || 'N/A',
        },
        metadata: {
          booking_id: booking.id,
          status: newStatus,
        },
      });
    }
    
    // Notify customer when booking is declined
    if (newStatus === 'declined' && options.notifyCustomer && customer?.user_id) {
      console.log('📧 Notifying customer of declined booking via service:', {
        userId: customer.user_id,
        customerEmail,
        customerName,
        serviceName,
      });
      
      const providerName = provider ? `${provider.first_name} ${provider.last_name}` : business?.business_name || 'Provider';
      const declineReason = booking.decline_reason || 'The provider is unavailable at the requested time.';
      
      await sendNotification({
        userId: customer.user_id,
        notificationType: 'customer_booking_declined',
        variables: {
          customer_name: customerName,
          provider_name: providerName,
          service_name: serviceName,
          booking_date: bookingDate,
          booking_time: bookingTime,
          booking_location: locationAddress,
          decline_reason: declineReason,
          booking_url: 'https://roamyourbestlife.com/customer/bookings',
          booking_reference: booking.booking_reference || 'N/A',
        },
        metadata: {
          booking_id: booking.id,
          status: newStatus,
          decline_reason: declineReason,
        },
      });
    }

    // Notify customer when booking is marked as no_show
    if (newStatus === 'no_show' && options.notifyCustomer && customer?.user_id) {
      console.log('📧 Sending no_show notification to customer:', customer.user_id);
      try {
        await sendNotification({
          userId: customer.user_id,
          notificationType: 'customer_booking_no_show',
          variables: {
            customer_name: customerName,
            service_name: serviceName,
            provider_name: provider ? `${provider.first_name} ${provider.last_name}` : 'Provider',
            booking_date: bookingDate,
            booking_time: bookingTime,
            booking_location: locationAddress,
            total_amount: totalAmountFormatted,
            booking_id: booking.id,
            booking_reference: booking.booking_reference || 'N/A',
          },
          metadata: {
            booking_id: booking.id,
            event_type: 'booking_no_show',
          },
        });
        console.log('✅ No-show notification sent successfully');
      } catch (noShowError) {
        console.error('❌ Error sending no-show notification:', {
          error: noShowError,
          message: noShowError instanceof Error ? noShowError.message : String(noShowError),
          stack: noShowError instanceof Error ? noShowError.stack : undefined,
        });
      }
    }
    
    // Notify providers when booking is cancelled by customer
    if (newStatus === 'cancelled' && options.notifyProvider && business) {
      console.log('📧 Booking cancelled - notifying providers');
      
      // Query owners and dispatchers for the business
      const { data: businessProviders, error: providersError } = await supabase
        .from('providers')
        .select('id, user_id, provider_role, is_active')
        .eq('business_id', booking.business_id)
        .eq('is_active', true)
        .in('provider_role', ['owner', 'dispatcher']);

      let providersToNotify: Array<{ id: string; user_id: string; provider_role: string }> = businessProviders || [];

      // If booking has an assigned provider, add them too
      if (booking.provider_id) {
        const { data: assignedProvider } = await supabase
          .from('providers')
          .select('id, user_id, provider_role, is_active')
          .eq('id', booking.provider_id)
          .eq('is_active', true)
          .single();

        if (assignedProvider) {
          const alreadyNotified = providersToNotify.some(p => p.id === assignedProvider.id);
          if (!alreadyNotified) {
            providersToNotify.push(assignedProvider);
          }
        }
      }

      console.log(`📧 Notifying ${providersToNotify.length} provider(s) about cancellation`);

      // Send notification to each provider
      for (const providerToNotify of providersToNotify) {
        try {
          await sendNotification({
            userId: providerToNotify.user_id,
            notificationType: 'provider_booking_cancelled',
            variables: {
              provider_name: `${providerToNotify.provider_role}`,
              customer_name: customerName,
              service_name: serviceName,
              booking_date: bookingDate,
              booking_time: bookingTime,
              booking_location: locationAddress,
              cancellation_reason: booking.cancellation_reason || 'No reason provided',
              booking_id: booking.id,
              booking_reference: booking.booking_reference || 'N/A',
            },
            metadata: {
              booking_id: booking.id,
              event_type: 'booking_cancelled',
              provider_id: providerToNotify.id,
            },
          });
          console.log(`✅ Cancellation notification sent to provider ${providerToNotify.id}`);
        } catch (error) {
          console.error(`❌ Failed to notify provider ${providerToNotify.id}:`, error);
        }
      }
    }

    // Notify providers when booking is rescheduled by customer
    if (options.notifyProvider && business && (
      booking.rescheduled_at || 
      booking.reschedule_reason || 
      (booking.original_booking_date && booking.original_booking_date !== booking.booking_date) ||
      (booking.original_start_time && booking.original_start_time !== booking.start_time)
    )) {
      console.log('📧 Booking rescheduled - notifying providers');
      
      // Query owners and dispatchers for the business
      const { data: businessProviders, error: providersError } = await supabase
        .from('providers')
        .select('id, user_id, provider_role, is_active')
        .eq('business_id', booking.business_id)
        .eq('is_active', true)
        .in('provider_role', ['owner', 'dispatcher']);

      let providersToNotify: Array<{ id: string; user_id: string; provider_role: string }> = businessProviders || [];

      // If booking has an assigned provider, add them too
      if (booking.provider_id) {
        const { data: assignedProvider } = await supabase
          .from('providers')
          .select('id, user_id, provider_role, is_active')
          .eq('id', booking.provider_id)
          .eq('is_active', true)
          .single();

        if (assignedProvider) {
          const alreadyNotified = providersToNotify.some(p => p.id === assignedProvider.id);
          if (!alreadyNotified) {
            providersToNotify.push(assignedProvider);
          }
        }
      }

      console.log(`📧 Notifying ${providersToNotify.length} provider(s) about reschedule`);

      // Format original date and time
      const originalDate = booking.original_booking_date
        ? new Date(booking.original_booking_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Unknown';

      const originalTime = booking.original_start_time
        ? new Date(`2000-01-01T${booking.original_start_time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : 'Unknown';

      // Send notification to each provider
      for (const providerToNotify of providersToNotify) {
        try {
          await sendNotification({
            userId: providerToNotify.user_id,
            notificationType: 'provider_booking_rescheduled',
            variables: {
              provider_name: `${providerToNotify.provider_role}`,
              customer_name: customerName,
              service_name: serviceName,
              old_booking_date: originalDate,
              old_booking_time: originalTime,
              new_booking_date: bookingDate,
              new_booking_time: bookingTime,
              booking_location: locationAddress,
              reschedule_reason: booking.reschedule_reason || 'No reason provided',
              booking_id: booking.id,
              booking_reference: booking.booking_reference || 'N/A',
            },
            metadata: {
              booking_id: booking.id,
              event_type: 'booking_rescheduled',
              provider_id: providerToNotify.id,
            },
          });
          console.log(`✅ Reschedule notification sent to provider ${providerToNotify.id}`);
        } catch (error) {
          console.error(`❌ Failed to notify provider ${providerToNotify.id}:`, error);
        }
      }
    }

    // ✅ All customer notifications now handled by NotificationService above
    // (which checks granular preferences, quiet hours, uses DB templates, etc.)

  } catch (error) {
    console.error('❌ Error in sendStatusNotifications:', error);
  }
}
