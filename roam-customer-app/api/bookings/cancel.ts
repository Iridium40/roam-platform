import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Import notification function
import { notifyProvidersBookingCancelled } from '../../lib/notifications/notify-providers-booking-cancelled';
import { handleBookingCancellation } from './payment-processor';

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

    console.log('📋 Cancellation request received:', { bookingId, cancellationReason, cancellationFee, refundAmount });

    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    // Process payment refund based on acceptance status and timing
    console.log('💰 Processing payment refund for cancellation...');
    const paymentResult = await handleBookingCancellation(
      bookingId,
      cancelledBy || 'customer',
      cancellationReason
    );

    if (!paymentResult.success) {
      console.error('⚠️ Payment refund processing failed:', paymentResult.error);
      // Continue with cancellation even if refund fails - can be retried manually
    } else {
      console.log('✅ Payment refund processed:', {
        refundAmount: paymentResult.refundAmount,
      });
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
          name
        )
      `)
      .single();

    if (updateError) {
      console.error('❌ Error cancelling booking:', {
        error: updateError,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
      });
      return res.status(500).json({ 
        error: 'Failed to cancel booking',
        details: updateError.message 
      });
    }

    if (!booking) {
      console.error('❌ No booking returned after update:', { bookingId });
      return res.status(404).json({ error: 'Booking not found' });
    }

    console.log('✅ Booking cancelled successfully:', booking.id);

    // Notify providers about the cancellation (non-blocking)
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
            console.warn('⚠️ Could not fetch business location:', locationError);
          }

          console.log('📧 Sending cancellation notifications...');
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
            business_address: businessAddress,
          },
          });
          console.log('✅ Cancellation notifications sent');
        }
      } catch (notificationError) {
        console.error('⚠️ Error sending cancellation notifications (non-fatal):', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          stack: notificationError instanceof Error ? notificationError.stack : undefined,
        });
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

