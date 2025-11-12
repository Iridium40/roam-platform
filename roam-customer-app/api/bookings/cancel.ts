import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { notifyProvidersBookingCancelled } from '../../lib/notifications/notify-providers-booking-cancelled';

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
    const { bookingId, cancellationReason, cancellationFee, refundAmount, cancelledBy } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    // Update booking status to cancelled
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy || null,
        cancellation_reason: cancellationReason || 'Cancelled by customer',
        cancellation_fee: cancellationFee || 0,
        refund_amount: refundAmount || 0,
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
      console.error('Error cancelling booking:', updateError);
      return res.status(500).json({ error: 'Failed to cancel booking' });
    }

    // Notify providers about the cancellation (non-blocking)
    try {
      const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
      const customer = Array.isArray(booking.customer_profiles) ? booking.customer_profiles[0] : booking.customer_profiles;
      const business = Array.isArray(booking.business_profiles) ? booking.business_profiles[0] : booking.business_profiles;

      if (service && customer && business) {
        await notifyProvidersBookingCancelled({
          booking: {
            id: booking.id,
            business_id: booking.business_id,
            provider_id: booking.provider_id,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            cancellation_reason: booking.cancellation_reason,
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
      console.error('⚠️ Error sending cancellation notifications (non-fatal):', notificationError);
      // Continue - don't fail the cancellation if notifications fail
    }

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error('Cancellation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

