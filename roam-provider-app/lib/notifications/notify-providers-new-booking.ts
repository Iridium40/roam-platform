/**
 * Notify providers when a new booking is created
 * 
 * Logic:
 * - If booking.provider_id is null: Notify all providers with provider_role = 'owner' or 'dispatcher' for the business
 * - If booking.provider_id is set: Notify that specific provider
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

export interface BookingNotificationData {
  booking: {
    id: string;
    business_id: string;
    provider_id: string | null;
    booking_date: string;
    start_time: string;
    total_amount: number;
    special_instructions?: string | null;
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
 * Notify providers about a new booking
 */
export async function notifyProvidersNewBooking(data: BookingNotificationData): Promise<void> {
  const supabase = getSupabaseServiceClient();
  
  try {
    const { booking, service, customer, business } = data;
    
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
    const totalAmount = booking.total_amount?.toFixed(2) || '0.00';

    // Determine which providers to notify
    let providersToNotify: Array<{ id: string; user_id: string; provider_role: string; email?: string; phone?: string }> = [];

    if (booking.provider_id) {
      // Booking is assigned to a specific provider - notify that provider
      console.log(`📋 Booking assigned to provider ${booking.provider_id}, notifying assigned provider`);
      
      const { data: assignedProvider, error: providerError } = await supabase
        .from('providers')
        .select('id, user_id, provider_role, email, phone, is_active')
        .eq('id', booking.provider_id)
        .eq('is_active', true)
        .single();

      if (providerError || !assignedProvider) {
        console.error('❌ Error fetching assigned provider:', providerError);
        // Fallback: notify owners/dispatchers if assigned provider not found
        console.log('⚠️ Assigned provider not found, falling back to owners/dispatchers');
      } else {
        providersToNotify = [assignedProvider];
      }
    }

    // If no assigned provider or assigned provider not found, notify owners and dispatchers
    if (providersToNotify.length === 0) {
      console.log(`📋 Booking not assigned, notifying owners and dispatchers for business ${booking.business_id}`);
      
      const { data: businessProviders, error: providersError } = await supabase
        .from('providers')
        .select('id, user_id, provider_role, email, phone, is_active')
        .eq('business_id', booking.business_id)
        .eq('is_active', true)
        .in('provider_role', ['owner', 'dispatcher']);

      if (providersError) {
        console.error('❌ Error fetching business providers:', providersError);
        throw providersError;
      }

      if (!businessProviders || businessProviders.length === 0) {
        console.warn(`⚠️ No owners or dispatchers found for business ${booking.business_id}`);
        return;
      }

      providersToNotify = businessProviders;
    }

    console.log(`📧 Notifying ${providersToNotify.length} provider(s) about new booking ${booking.id}`);

    // Send notifications to each provider
    const notificationPromises = providersToNotify.map(async (provider) => {
      try {
        const templateVariables = {
          provider_name: provider.provider_role === 'owner' ? 'Owner' : provider.provider_role === 'dispatcher' ? 'Dispatcher' : 'Provider',
          customer_name: customerName,
          service_name: service.name,
          booking_date: bookingDate,
          booking_time: bookingTime,
          booking_location: location,
          total_amount: totalAmount,
          booking_id: booking.id,
          business_name: business.name,
          special_instructions: booking.special_instructions || 'None',
        };

        await notificationService.send({
          userId: provider.user_id,
          notificationType: 'provider_new_booking',
          templateVariables,
          metadata: {
            booking_id: booking.id,
            business_id: booking.business_id,
            provider_id: provider.id,
            provider_role: provider.provider_role,
            assigned: !!booking.provider_id,
          },
        });

        console.log(`✅ Notification sent to provider ${provider.id} (${provider.provider_role})`);
      } catch (error) {
        console.error(`❌ Failed to notify provider ${provider.id}:`, error);
        // Continue with other providers even if one fails
      }
    });

    await Promise.allSettled(notificationPromises);
    console.log(`✅ Completed notifying providers for booking ${booking.id}`);
  } catch (error) {
    console.error('❌ Error in notifyProvidersNewBooking:', error);
    // Don't throw - notifications are non-critical
  }
}

