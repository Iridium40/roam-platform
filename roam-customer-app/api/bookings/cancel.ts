import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleBookingCancellation } from './payment-processor.js';
import { sendNotification } from '../../shared/notifications/index.js';

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

        // Format booking date and time
        const bookingDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const [hours, minutes] = booking.start_time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const bookingTime = `${displayHour}:${minutes} ${ampm}`;

        const customerName = `${customer.first_name} ${customer.last_name}`.trim() || 'Customer';
        const cancellationReason = booking.cancellation_reason || 'No reason provided';

        // bookings.provider_id references providers.id (not auth user_id). Resolve assigned provider user_id for comparisons.
        let assignedProviderUserId: string | null = null;
        if (booking.provider_id) {
          const { data: assignedProvider } = await supabase
            .from('providers')
            .select('user_id, is_active')
            .eq('id', booking.provider_id)
            .eq('is_active', true)
            .maybeSingle();

          assignedProviderUserId = assignedProvider?.user_id || null;
        }

        // Query provider profiles to find who should be notified
        const { data: providers } = await supabase
          .from('provider_profiles')
          .select('user_id, provider_role, first_name, last_name')
          .eq('business_id', booking.business_id)
          .eq('is_active', true);

        if (providers && providers.length > 0) {
          // Notify each relevant provider
          for (const provider of providers) {
            // Always notify owner and dispatcher
            // Only notify assigned provider if they're assigned to this booking
            const shouldNotify =
              provider.provider_role === 'owner' ||
              provider.provider_role === 'dispatcher' ||
              (provider.provider_role === 'assigned_provider' && !!assignedProviderUserId && provider.user_id === assignedProviderUserId);

            if (shouldNotify) {
              await sendNotification({
                userId: provider.user_id,
                notificationType: 'provider_booking_cancelled',
                variables: {
                  provider_name: provider.provider_role === 'owner' ? 'Owner' : provider.provider_role === 'dispatcher' ? 'Dispatcher' : 'Provider',
                  customer_name: customerName,
                  service_name: service.name,
                  booking_date: bookingDate,
                  booking_time: bookingTime,
                  booking_location: businessAddress || 'Location TBD',
                  cancellation_reason: cancellationReason,
                  booking_id: booking.id,
                  business_name: business.business_name,
                  booking_reference: booking.booking_reference || 'N/A',
                },
                metadata: {
                  booking_id: booking.id,
                  action: 'cancelled',
                },
              });
            }
          }
        }
      }
    } catch (notificationError) {
      console.error('Error sending cancellation notifications:', notificationError);
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

