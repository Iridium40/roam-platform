import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { notifyProvidersBookingRescheduled } from '../../lib/notifications/notify-providers-booking-rescheduled';

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

    if (!bookingId || !bookingDate || !startTime) {
      return res.status(400).json({ error: 'bookingId, bookingDate, and startTime are required' });
    }

    // Get current booking to preserve original dates if not provided
    const { data: currentBooking } = await supabase
      .from('bookings')
      .select('original_booking_date, original_start_time, booking_date, start_time, reschedule_count')
      .eq('id', bookingId)
      .single();

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

    if (updateError || !booking) {
      console.error('Error rescheduling booking:', updateError);
      return res.status(500).json({ error: 'Failed to reschedule booking' });
    }

    // Notify providers about the reschedule (non-blocking)
    try {
      const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
      const customer = Array.isArray(booking.customer_profiles) ? booking.customer_profiles[0] : booking.customer_profiles;
      const business = Array.isArray(booking.business_profiles) ? booking.business_profiles[0] : booking.business_profiles;

      if (service && customer && business) {
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
      }
    } catch (notificationError) {
      console.error('⚠️ Error sending reschedule notifications (non-fatal):', notificationError);
      // Continue - don't fail the reschedule if notifications fail
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

