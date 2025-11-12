import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Import notification function - make it optional to prevent build failures
let notifyProvidersBookingRescheduled: any = null;
try {
  const notificationModule = require('../../lib/notifications/notify-providers-booking-rescheduled');
  notifyProvidersBookingRescheduled = notificationModule.notifyProvidersBookingRescheduled;
} catch (e) {
  // Notification function not available - reschedule will still work
  console.warn('Notification module not available, reschedule will proceed without notifications');
}

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
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
    const {
      bookingId,
      bookingDate,
      startTime,
      rescheduleReason,
      rescheduledBy,
      originalBookingDate,
      originalStartTime,
    } = req.body;

    console.log('📋 Reschedule request received:', { bookingId, bookingDate, startTime });

    if (!bookingId || !bookingDate || !startTime) {
      return res.status(400).json({ error: 'bookingId, bookingDate, and startTime are required' });
    }

    // Get current booking to preserve original dates if not provided
    const { data: currentBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('original_booking_date, original_start_time, booking_date, start_time, reschedule_count')
      .eq('id', bookingId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching booking for reschedule:', fetchError);
      return res.status(404).json({ error: 'Booking not found' });
    }

    const originalDate = originalBookingDate || currentBooking?.original_booking_date || currentBooking?.booking_date;
    const originalTime = originalStartTime || currentBooking?.original_start_time || currentBooking?.start_time;
    const rescheduleCount = (currentBooking?.reschedule_count || 0) + 1;

    // Update booking with reschedule data
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_date: bookingDate,
        start_time: startTime,
        reschedule_reason: rescheduleReason || 'Rescheduled by customer',
        rescheduled_at: new Date().toISOString(),
        rescheduled_by: rescheduledBy || null,
        original_booking_date: originalDate,
        original_start_time: originalTime,
        reschedule_count: rescheduleCount,
        last_reschedule_date: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select(`
        *,
        services (
          name
        ),
        customer_profiles (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        business_profiles (
          id,
          name,
          business_address
        )
      `)
      .single();

    if (updateError) {
      console.error('❌ Error rescheduling booking:', {
        error: updateError,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
      });
      return res.status(500).json({ 
        error: 'Failed to reschedule booking',
        details: updateError.message 
      });
    }

    if (!booking) {
      console.error('❌ No booking returned after reschedule:', { bookingId });
      return res.status(404).json({ error: 'Booking not found' });
    }

    console.log('✅ Booking rescheduled successfully:', booking.id);

    // Notify providers about the reschedule (non-blocking)
    if (notifyProvidersBookingRescheduled) {
      try {
        const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
        const customer = Array.isArray(booking.customer_profiles) ? booking.customer_profiles[0] : booking.customer_profiles;
        const business = Array.isArray(booking.business_profiles) ? booking.business_profiles[0] : booking.business_profiles;

        if (!service || !customer || !business) {
          console.warn('⚠️ Missing booking data for notifications:', {
            hasService: !!service,
            hasCustomer: !!customer,
            hasBusiness: !!business,
          });
        } else {
          console.log('📧 Sending reschedule notifications...');
          await notifyProvidersBookingRescheduled({
            booking: {
              id: booking.id,
              business_id: booking.business_id,
              provider_id: booking.provider_id,
              booking_date: booking.booking_date,
              start_time: booking.start_time,
              original_booking_date: booking.original_booking_date,
              original_start_time: booking.original_start_time,
              reschedule_reason: booking.reschedule_reason,
            },
            service: {
              name: service.name,
            },
            customer: {
              first_name: customer.first_name || '',
              last_name: customer.last_name || '',
              email: customer.email,
              phone: customer.phone,
            },
            business: {
              name: business.name,
              business_address: business.business_address,
            },
          });
          console.log('✅ Reschedule notifications sent');
        }
      } catch (notificationError) {
        console.error('⚠️ Error sending reschedule notifications (non-fatal):', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          stack: notificationError instanceof Error ? notificationError.stack : undefined,
        });
        // Continue - don't fail the reschedule if notifications fail
      }
    } else {
      console.log('ℹ️ Notification function not available, skipping provider notifications');
    }

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error('Reschedule error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

