import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleBookingCancellation } from './payment-processor.js';

// Helper function to dynamically import notification function
// Uses dynamic import to handle module resolution issues in Vercel's serverless environment
async function getNotifyProvidersBookingCancelled() {
  try {
    const importPaths = [
      '../../lib/notifications/notify-providers-booking-cancelled.js',
      '../../lib/notifications/notify-providers-booking-cancelled',
      './lib/notifications/notify-providers-booking-cancelled.js',
      './lib/notifications/notify-providers-booking-cancelled',
    ];

    for (const importPath of importPaths) {
      try {
        const module = await import(importPath);
        const fn = module.notifyProvidersBookingCancelled || module.default;
        if (fn && typeof fn === 'function') {
          return fn;
        }
      } catch (err) {
        continue;
      }
    }

    console.warn('Could not load notify-providers-booking-cancelled module');
    return null;
  } catch (err) {
    console.warn('Error loading notify-providers-booking-cancelled module:', err);
    return null;
  }
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
    const { bookingId, cancellationReason, cancellationFee, refundAmount, cancelledBy } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    // Process payment refund based on acceptance status and timing
    const paymentResult = await handleBookingCancellation(
      bookingId,
      cancelledBy || 'customer',
      cancellationReason
    );

    if (!paymentResult.success) {
      console.error('Payment refund processing failed:', paymentResult.error);
      // Continue with cancellation even if refund fails - can be retried manually
    }

    // Use refund amount from payment processor if available, otherwise use provided values
    const finalRefundAmount = paymentResult.refundAmount !== undefined 
      ? paymentResult.refundAmount 
      : (refundAmount || 0);
    const finalCancellationFee = paymentResult.refundAmount !== undefined
      ? ((paymentResult.refundAmount || 0) > 0 
          ? (cancellationFee || 0) 
          : (cancellationFee || 0)) // Keep provided fee if refund was processed
      : (cancellationFee || 0);

    // Update booking status to cancelled
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy || null,
        cancellation_reason: cancellationReason || 'Cancelled by customer',
        cancellation_fee: finalCancellationFee,
        refund_amount: finalRefundAmount,
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
          business_name
        )
      `)
      .single();

    if (updateError) {
      console.error('Error cancelling booking:', updateError.message);
      return res.status(500).json({ 
        error: 'Failed to cancel booking',
        details: updateError.message 
      });
    }

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Notify providers about the cancellation (non-blocking)
    try {
      const notifyFn = await getNotifyProvidersBookingCancelled();
      if (notifyFn) {
        const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
        const customer = Array.isArray(booking.customer_profiles) ? booking.customer_profiles[0] : booking.customer_profiles;
        const business = Array.isArray(booking.business_profiles) ? booking.business_profiles[0] : booking.business_profiles;

        if (service && customer && business) {
          // Fetch business location to get address
          let businessAddress = '';
          try {
            const { data: businessLocation } = await supabase
              .from('business_locations')
              .select('address_line1, address_line2, city, state, postal_code')
              .eq('business_id', booking.business_id)
              .eq('is_primary', true)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle();

            if (businessLocation) {
              const addressParts = [
                businessLocation.address_line1,
                businessLocation.address_line2,
                businessLocation.city,
                businessLocation.state,
                businessLocation.postal_code,
              ].filter(Boolean);
              businessAddress = addressParts.join(', ');
            }
          } catch (locationError) {
            // Non-fatal
          }

          await notifyFn({
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
              name: business.business_name,
              business_address: businessAddress,
            },
          });
        }
      }
    } catch (notificationError) {
      // Non-fatal - continue even if notifications fail
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

