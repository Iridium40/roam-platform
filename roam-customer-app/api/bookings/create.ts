import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to dynamically import notification function
async function getNotifyProvidersNewBooking() {
  try {
    const importPaths = [
      '../lib/notifications/notify-providers-new-booking.js',
      '../lib/notifications/notify-providers-new-booking',
      './lib/notifications/notify-providers-new-booking.js',
      './lib/notifications/notify-providers-new-booking',
    ];

    for (const importPath of importPaths) {
      try {
        const module = await import(importPath);
        const fn = module.notifyProvidersNewBooking || module.default;
        if (fn && typeof fn === 'function') {
          console.log(`✅ Successfully loaded notify-providers-new-booking from: ${importPath}`);
          return fn;
        }
      } catch (err) {
        continue;
      }
    }

    console.warn('⚠️ Could not load notify-providers-new-booking module');
    return null;
  } catch (err) {
    console.warn('⚠️ Error loading notify-providers-new-booking module:', err);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      serviceId,
      bookingDate,
      startTime,
      guestName,
      guestEmail,
      guestPhone,
      deliveryType,
      specialInstructions,
      customerId
    } = req.body;

    // Validate required fields
    if (!serviceId || !bookingDate || !startTime || !customerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get service details with business type
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select(`
        *,
        providers (
          id,
          first_name,
          last_name,
          email,
          phone,
          user_id
        ),
        business_profiles (
          id,
          business_name,
          contact_email,
          business_type
        )
      `)
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // For independent businesses, automatically assign to owner
    let assignedProviderId = null;
    if (service.business_profiles?.business_type === 'independent' && service.business_id) {
      console.log('Independent business detected, finding owner provider...');
      
      const { data: ownerProvider, error: ownerError } = await supabase
        .from('providers')
        .select('id')
        .eq('business_id', service.business_id)
        .eq('provider_role', 'owner')
        .single();

      if (ownerProvider && !ownerError) {
        assignedProviderId = ownerProvider.id;
        console.log('Auto-assigning booking to owner provider:', assignedProviderId);
      } else {
        console.log('Owner provider not found for independent business');
      }
    }

    // Create booking
    const bookingData: any = {
      service_id: serviceId,
      customer_id: customerId,
      booking_date: bookingDate,
      start_time: startTime,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      delivery_type: deliveryType,
      special_instructions: specialInstructions,
      booking_status: 'pending',
      total_amount: service.price,
      created_at: new Date().toISOString()
    };

    // Add provider_id if auto-assigned
    if (assignedProviderId) {
      bookingData.provider_id = assignedProviderId;
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        providers (
          id,
          first_name,
          last_name,
          email,
          phone,
          user_id
        ),
        business_profiles (
          id,
          name,
          email
        )
      `)
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return res.status(500).json({ error: 'Failed to create booking' });
    }

    console.log('Booking created successfully:', booking.id);

    // Send notifications to business users (non-blocking)
    // This will notify the assigned provider OR all owners/dispatchers
    try {
      const notifyFn = await getNotifyProvidersNewBooking();
      
      if (notifyFn) {
        // Get customer details
        const customer = Array.isArray(booking.customers) ? booking.customers[0] : booking.customers;
        
        // Get business location for address
        const { data: businessLocation } = await supabase
          .from('business_locations')
          .select('address_line1, address_line2, city, state, postal_code')
          .eq('business_id', service.business_profiles.id)
          .eq('is_primary', true)
          .maybeSingle();

        // Format business address
        const businessAddress = businessLocation 
          ? `${businessLocation.address_line1 || ''}${businessLocation.address_line2 ? ` ${businessLocation.address_line2}` : ''}, ${businessLocation.city || ''}, ${businessLocation.state || ''} ${businessLocation.postal_code || ''}`.trim()
          : '';
        
        // Send notification (this is non-blocking and won't fail the booking if it errors)
        await notifyFn({
          booking: {
            id: booking.id,
            business_id: service.business_profiles.id,
            provider_id: assignedProviderId,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            total_amount: booking.total_amount,
            special_instructions: booking.special_instructions,
          },
          service: {
            name: service.name,
          },
          customer: {
            first_name: customer?.first_name || guestName?.split(' ')[0] || 'Guest',
            last_name: customer?.last_name || guestName?.split(' ').slice(1).join(' ') || '',
            email: customer?.email || guestEmail,
            phone: customer?.phone || guestPhone,
          },
          business: {
            name: service.business_profiles.business_name,
            business_address: businessAddress,
          },
        });

        console.log('✅ Notification sent for booking:', booking.id);
      } else {
        console.warn('⚠️ Notification function not available');
      }
    } catch (notificationError) {
      // Notifications are non-critical, log but don't fail the booking
      console.error('⚠️ Failed to send notifications (non-fatal):', notificationError);
    }

    return res.status(201).json({
      success: true,
      booking: {
        id: booking.id,
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
        status: booking.booking_status,
        totalAmount: booking.total_amount,
        service: {
          id: service.id,
          name: service.name,
          description: service.description
        },
        provider: {
          id: service.providers.id,
          name: `${service.providers.first_name} ${service.providers.last_name}`,
          email: service.providers.email
        },
        business: {
          id: service.business_profiles.id,
          name: service.business_profiles.name
        }
      }
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
