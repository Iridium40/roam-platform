import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { notificationService } from '../../lib/notifications/notification-service';

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

    // Note: Status history tracking removed - table doesn't exist in current schema
    // The booking record itself maintains the current status

    // Send notifications based on status change (non-blocking)
    // Don't await - let it run in background
    if (notifyCustomer || notifyProvider) {
      console.log('📧 Queueing notifications for status:', newStatus);
      // Fire and forget - don't block the response
      sendStatusNotifications(booking, newStatus, { notifyCustomer, notifyProvider })
        .catch((notificationError) => {
        console.error('⚠️ Notification error (non-fatal):', notificationError);
        });
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
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
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

    const bookingDateRaw = booking.booking_date || booking.original_booking_date;
    const startTimeRaw = booking.start_time || booking.booking_time || booking.original_start_time;
    const locationName = business?.business_name || booking.business_name || 'Location';
    const locationAddress = business?.business_address || booking.business_address || booking.service_location;
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

    // Send notifications using the NotificationService (checks granular preferences & uses DB templates)
    
    // Notify customer when booking is confirmed/accepted
    if ((newStatus === 'confirmed' || newStatus === 'accepted') && options.notifyCustomer && customer?.user_id) {
      try {
        await notificationService.send({
          userId: customer.user_id,
          notificationType: 'customer_booking_accepted',
          templateVariables: {
            customer_name: customerName,
            service_name: serviceName,
            provider_name: provider ? `${provider.first_name} ${provider.last_name}` : 'Provider',
            booking_date: bookingDate,
            booking_time: bookingTime,
            booking_location: locationAddress || 'Location TBD',
            total_amount: totalAmountFormatted,
            booking_id: booking.id,
          },
          metadata: {
            booking_id: booking.id,
            event_type: 'booking_accepted',
          },
        });
        console.log('✅ customer_booking_accepted notification sent via NotificationService');
      } catch (error) {
        console.error('⚠️ Failed to send customer_booking_accepted notification:', error);
      }
    }
    
    // Notify customer when booking is completed
    if (newStatus === 'completed' && options.notifyCustomer && customer?.user_id) {
      try {
        await notificationService.send({
          userId: customer.user_id,
          notificationType: 'customer_booking_completed',
          templateVariables: {
            customer_name: customerName,
            service_name: serviceName,
            provider_name: provider ? `${provider.first_name} ${provider.last_name}` : 'Provider',
            provider_id: provider?.id || '',
            booking_id: booking.id,
            booking_date: bookingDate,
            booking_time: bookingTime,
            booking_location: locationAddress || 'Location TBD',
            total_amount: totalAmountFormatted,
          },
          metadata: {
            booking_id: booking.id,
            event_type: 'booking_completed',
          },
        });
        console.log('✅ customer_booking_completed notification sent via NotificationService');
      } catch (error) {
        console.error('⚠️ Failed to send customer_booking_completed notification:', error);
      }
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
