/**
 * Notify providers when a booking is rescheduled
 * 
 * Logic:
 * - Always notify all providers with provider_role = 'owner' or 'dispatcher' for the business
 * - If booking.provider_id is set: Also notify that specific provider
 */

import { createClient } from '@supabase/supabase-js';
import { notificationService } from './notification-service.js';

const getSupabaseServiceClient = () => {
  if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(
    process.env.VITE_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export interface BookingRescheduleNotificationData {
  booking: {
    id: string;
    business_id: string;
    provider_id: string | null;
    booking_date: string; // New date
    start_time: string; // New time
    original_booking_date?: string | null;
    original_start_time?: string | null;
    reschedule_reason?: string | null;
  };
  service: {
    name: string;
  };
  customer: {
    first_name: string;
    last_name: string;
  };
  business: {
    name: string;
    business_address?: string;
  };
}

/**
 * Notify providers about a rescheduled booking
 */
export async function notifyProvidersBookingRescheduled(data: BookingRescheduleNotificationData): Promise<void> {
  const supabase = getSupabaseServiceClient();
  
  try {
    const { booking, service, customer, business } = data;
    
    // Always notify owners and dispatchers
    console.log(`📋 Booking rescheduled, notifying owners and dispatchers for business ${booking.business_id}`);
    
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

    console.log(`📧 Notifying ${providersToNotify.length} provider(s) about rescheduled booking ${booking.id}`);

    // Format dates and times
    const formatDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return 'Date TBD';
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatTime = (timeStr: string | null | undefined) => {
      if (!timeStr) return 'Time TBD';
      return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    };

    const newBookingDate = formatDate(booking.booking_date);
    const newBookingTime = formatTime(booking.start_time);
    const oldBookingDate = formatDate(booking.original_booking_date || booking.booking_date);
    const oldBookingTime = formatTime(booking.original_start_time || booking.start_time);

    const customerName = `${customer.first_name} ${customer.last_name}`.trim();
    const location = business.business_address || 'Location TBD';
    const rescheduleReason = booking.reschedule_reason || 'No reason provided';

    // Send notifications to each provider
    const notificationPromises = providersToNotify.map(async (provider) => {
      try {
        await notificationService.send({
          userId: provider.user_id,
          notificationType: 'provider_booking_rescheduled',
          templateVariables: {
            provider_name: provider.provider_role === 'owner' ? 'Owner' : provider.provider_role === 'dispatcher' ? 'Dispatcher' : 'Provider',
            customer_name: customerName,
            service_name: service.name,
            booking_date: oldBookingDate, // Original date
            booking_time: oldBookingTime, // Original time
            new_booking_date: newBookingDate, // New date
            new_booking_time: newBookingTime, // New time
            booking_location: location,
            reschedule_reason: rescheduleReason,
            booking_id: booking.id,
            business_name: business.name,
          },
          metadata: {
            booking_id: booking.id,
            business_id: booking.business_id,
            provider_id: provider.id,
            provider_role: provider.provider_role,
            assigned: provider.id === booking.provider_id,
          },
        });

        console.log(`✅ Reschedule notification sent to provider ${provider.id} (${provider.provider_role})`);
      } catch (error) {
        console.error(`❌ Failed to notify provider ${provider.id}:`, error);
        // Continue with other providers even if one fails
      }
    });

    await Promise.allSettled(notificationPromises);
    console.log(`✅ Completed notifying providers for rescheduled booking ${booking.id}`);
  } catch (error) {
    console.error('❌ Error in notifyProvidersBookingRescheduled:', error);
    // Don't throw - notifications are non-critical
  }
}

