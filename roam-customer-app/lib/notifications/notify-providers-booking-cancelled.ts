/**
 * Notify providers when a booking is cancelled
 * 
 * Logic:
 * - Always notify all providers with provider_role = 'owner' or 'dispatcher' for the business
 * - If booking.provider_id is set: Also notify that specific provider
 * 
 * Uses shared notification service for consistency with confirmed/declined notifications
 */

import { createClient } from '@supabase/supabase-js';
import { sendNotification } from '../../shared/notifications/index.js';

const getSupabaseServiceClient = () => {
  if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(
    process.env.VITE_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export interface BookingCancellationNotificationData {
  booking: {
    id: string;
    business_id: string;
    provider_id: string | null;
    booking_date: string;
    start_time: string;
    cancellation_reason?: string | null;
  };
  service: {
    name: string;
  };
  customer: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
  business: {
    name: string;
    business_address?: string;
  };
}

/**
 * Notify providers about a cancelled booking
 */
export async function notifyProvidersBookingCancelled(data: BookingCancellationNotificationData): Promise<void> {
  const supabase = getSupabaseServiceClient();
  
  try {
    const { booking, service, customer, business } = data;
    
    // Always notify owners and dispatchers
    console.log(`📋 Booking cancelled, notifying owners and dispatchers for business ${booking.business_id}`);
    
    const { data: businessProviders, error: providersError } = await supabase
      .from('providers')
      .select('id, user_id, provider_role, is_active')
      .eq('business_id', booking.business_id)
      .eq('is_active', true)
      .in('provider_role', ['owner', 'dispatcher']);

    if (providersError) {
      console.error('❌ Error fetching business providers:', providersError);
      throw providersError;
    }

    let providersToNotify: Array<{ id: string; user_id: string; provider_role: string }> = businessProviders || [];

    // If booking is assigned to a provider, also notify that provider (if not already in the list)
    if (booking.provider_id) {
      const { data: assignedProvider, error: providerError } = await supabase
        .from('providers')
        .select('id, user_id, provider_role, is_active')
        .eq('id', booking.provider_id)
        .eq('is_active', true)
        .single();

      if (!providerError && assignedProvider) {
        // Check if provider is already in the list (in case they're also an owner/dispatcher)
        const alreadyNotified = providersToNotify.some(p => p.id === assignedProvider.id);
        if (!alreadyNotified) {
          providersToNotify.push(assignedProvider);
          console.log(`📋 Also notifying assigned provider ${booking.provider_id}`);
        }
      }
    }

    if (providersToNotify.length === 0) {
      console.warn(`⚠️ No providers found for business ${booking.business_id}`);
      return;
    }

    console.log(`📧 Notifying ${providersToNotify.length} provider(s) about cancelled booking ${booking.id}`);

    // Format booking date and time
    const bookingDate = booking.booking_date 
      ? new Date(booking.booking_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Date TBD';
    
    const bookingTime = booking.start_time
      ? new Date(`2000-01-01T${booking.start_time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : 'Time TBD';

    const customerName = `${customer.first_name} ${customer.last_name}`.trim();
    const location = business.business_address || 'Location TBD';
    const cancellationReason = booking.cancellation_reason || 'No reason provided';

    // Send notifications using shared notification service
    const notificationPromises = providersToNotify.map(async (provider) => {
      try {
        console.log(`📤 Sending cancellation notification to provider ${provider.id} (${provider.provider_role})`);

        await sendNotification({
          userId: provider.user_id,
          notificationType: 'provider_booking_cancelled',
          variables: {
            provider_name: provider.provider_role === 'owner' ? 'Owner' : provider.provider_role === 'dispatcher' ? 'Dispatcher' : 'Provider',
            customer_name: customerName,
            service_name: service.name,
            booking_date: bookingDate,
            booking_time: bookingTime,
            booking_location: location,
            cancellation_reason: cancellationReason,
            booking_id: booking.id,
            business_name: business.name,
            booking_reference: booking.booking_reference || 'N/A',
          },
          metadata: {
            booking_id: booking.id,
            business_id: booking.business_id,
            provider_id: provider.id,
            provider_role: provider.provider_role,
            assigned: provider.id === booking.provider_id,
          },
        });

        console.log(`✅ Cancellation notification sent to provider ${provider.id} (${provider.provider_role})`);
      } catch (error) {
        console.error(`❌ Failed to notify provider ${provider.id}:`, error);
        // Continue with other providers even if one fails
      }
    });

    await Promise.allSettled(notificationPromises);
    console.log(`✅ Completed notifying providers for cancelled booking ${booking.id}`);
  } catch (error) {
    console.error('❌ Error in notifyProvidersBookingCancelled:', error);
    // Don't throw - notifications are non-critical
  }
}

