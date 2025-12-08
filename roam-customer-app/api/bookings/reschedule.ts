import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
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

    // Get current booking to preserve original dates if not provided and check status
    const { data: currentBooking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        original_booking_date, 
        original_start_time, 
        booking_date, 
        start_time, 
        created_at,
        reschedule_count,
        booking_status,
        service_fee_charged,
        remaining_balance_charged
      `)
      .eq('id', bookingId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching booking for reschedule:', fetchError);
      return res.status(404).json({ error: 'Booking not found' });
    }

    const originalDate = originalBookingDate || currentBooking?.original_booking_date || currentBooking?.booking_date;
    const originalTime = originalStartTime || currentBooking?.original_start_time || currentBooking?.start_time;
    const rescheduleCount = (currentBooking?.reschedule_count || 0) + 1;

    // Check if booking was previously confirmed
    const wasAccepted = currentBooking?.booking_status === 'confirmed' ||
                        currentBooking?.service_fee_charged === true;

    // Update booking with reschedule data
    // If booking was accepted, change status back to pending so business can accept again
    const updateData: any = {
      booking_date: bookingDate,
      start_time: startTime,
      reschedule_reason: rescheduleReason || 'Rescheduled by customer',
      rescheduled_at: new Date().toISOString(),
      rescheduled_by: rescheduledBy || null,
      original_booking_date: originalDate,
      original_start_time: originalTime,
      reschedule_count: rescheduleCount,
    };

    // If booking was accepted, change status back to pending
    // Note: Payments are already charged, so we don't need to update payment status
    // The business just needs to re-accept the rescheduled booking
    if (wasAccepted) {
      updateData.booking_status = 'pending';
      console.log('🔄 Changing booking status from confirmed to pending for reschedule');
      console.log('ℹ️ Payments already charged - no payment changes needed');
    }

    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
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
    console.log('💰 Payment status:', {
      wasAccepted,
      serviceFeeCharged: currentBooking?.service_fee_charged,
      remainingBalanceCharged: currentBooking?.remaining_balance_charged,
      note: 'All payments are charged immediately upon acceptance. No charges or refunds occur during reschedule - only status updates',
    });

    // Notify providers about the reschedule (non-blocking)
    // Business users (owners/dispatchers) will be notified via email/SMS
    // Booking status has been changed to 'pending' so business must accept again
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

        // Format booking dates and times
        const newBookingDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const [hours, minutes] = booking.start_time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const newBookingTime = `${displayHour}:${minutes} ${ampm}`;

        // Format original booking date and time
        const oldBookingDate = booking.original_booking_date
          ? new Date(booking.original_booking_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'N/A';

        const oldBookingTime = booking.original_start_time
          ? (() => {
              const [h, m] = booking.original_start_time.split(':');
              const hr = parseInt(h);
              const ap = hr >= 12 ? 'PM' : 'AM';
              const dh = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
              return `${dh}:${m} ${ap}`;
            })()
          : 'N/A';

        const customerName = `${customer.first_name} ${customer.last_name}`.trim() || 'Customer';
        const rescheduleReason = booking.reschedule_reason || 'No reason provided';

        // Query provider profiles to find who should be notified
        const { data: providers } = await supabase
          .from('provider_profiles')
          .select('user_id, provider_role, first_name, last_name')
          .eq('business_id', booking.business_id)
          .eq('is_active', true);

        if (providers && providers.length > 0) {
          console.log('📧 Sending reschedule notifications to providers...');
          
          // Notify each relevant provider
          for (const provider of providers) {
            // Always notify owner and dispatcher
            // Only notify assigned provider if they're assigned to this booking
            const shouldNotify =
              provider.provider_role === 'owner' ||
              provider.provider_role === 'dispatcher' ||
              (provider.provider_role === 'assigned_provider' && booking.provider_id === provider.user_id);

            if (shouldNotify) {
              await sendNotification({
                userId: provider.user_id,
                notificationType: 'provider_booking_rescheduled',
                variables: {
                  provider_name: provider.provider_role === 'owner' ? 'Owner' : provider.provider_role === 'dispatcher' ? 'Dispatcher' : 'Provider',
                  customer_name: customerName,
                  service_name: service.name,
                  old_booking_date: oldBookingDate,
                  old_booking_time: oldBookingTime,
                  new_booking_date: newBookingDate,
                  new_booking_time: newBookingTime,
                  booking_location: businessAddress || 'Location TBD',
                  reschedule_reason: rescheduleReason,
                  booking_id: booking.id,
                  business_name: business.business_name,
                  booking_reference: booking.booking_reference || 'N/A',
                },
                metadata: {
                  booking_id: booking.id,
                  action: 'rescheduled',
                },
              });
            }
          }
          
          console.log('✅ Reschedule notifications sent');
        }
      }
    } catch (notificationError) {
      console.error('⚠️ Error sending reschedule notifications (non-fatal):', {
        error: notificationError instanceof Error ? notificationError.message : String(notificationError),
        stack: notificationError instanceof Error ? notificationError.stack : undefined,
      });
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

