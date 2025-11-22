import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // TODO: Implement notification service
    // For now, we'll skip notifications to avoid build errors
    console.log('Booking created successfully:', booking.id);

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
