import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role for guest bookings (no auth required)
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
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('🎫 Creating guest booking...');
    
    const {
      service_id,
      business_id,
      provider_id,
      booking_date,
      start_time,
      guest_name,
      guest_email,
      guest_phone,
      delivery_type,
      business_location_id,
      customer_location_id,
      special_instructions,
      total_amount,
      service_fee,
      remaining_balance,
      booking_status,
      payment_status,
    } = req.body;

    // Validate required fields
    if (!service_id || !business_id || !booking_date || !start_time || !guest_name || !guest_email) {
      return res.status(400).json({ 
        error: 'Missing required fields: service_id, business_id, booking_date, start_time, guest_name, guest_email' 
      });
    }

    // Basic email validation
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(guest_email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Verify service exists and is offered by the business
    const { data: businessService, error: serviceError } = await supabase
      .from('business_services')
      .select('id, is_active')
      .eq('business_id', business_id)
      .eq('service_id', service_id)
      .eq('is_active', true)
      .single();

    if (serviceError || !businessService) {
      return res.status(400).json({ 
        error: 'Service is not available from this business' 
      });
    }

    // Verify business has Stripe Connect set up
    const { data: stripeConnect, error: stripeError } = await supabase
      .from('stripe_connect_accounts')
      .select('charges_enabled')
      .eq('business_id', business_id)
      .single();

    if (stripeError || !stripeConnect?.charges_enabled) {
      return res.status(400).json({ 
        error: 'Business is not set up for payments' 
      });
    }

    // Create the guest booking
    // Note: customer_id is null for guest bookings
    const bookingData = {
      service_id,
      business_id,
      customer_id: null, // No customer account for guests
      provider_id: provider_id || null,
      booking_date,
      start_time,
      guest_name,
      guest_email,
      guest_phone: guest_phone || null,
      delivery_type: delivery_type || 'business_location',
      business_location_id: business_location_id || null,
      customer_location_id: customer_location_id || null,
      special_instructions: special_instructions || '',
      total_amount: total_amount || 0,
      service_fee: service_fee || 0,
      remaining_balance: remaining_balance || 0,
      booking_status: booking_status || 'pending',
      payment_status: payment_status || 'pending',
      // Guest bookings are identified by customer_id being null
    };

    console.log('📝 Guest booking data:', {
      ...bookingData,
      guest_email: '***' // Mask email in logs
    });

    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select('id, booking_reference')
      .single();

    if (bookingError) {
      console.error('❌ Error creating guest booking:', bookingError);
      return res.status(500).json({ 
        error: 'Failed to create booking',
        details: bookingError.message 
      });
    }

    console.log('✅ Guest booking created:', {
      bookingId: newBooking.id,
      bookingReference: newBooking.booking_reference
    });

    return res.status(200).json({
      success: true,
      bookingId: newBooking.id,
      bookingReference: newBooking.booking_reference
    });

  } catch (error: any) {
    console.error('❌ Guest booking creation failed:', error);
    return res.status(500).json({
      error: 'Failed to create guest booking',
      details: error.message
    });
  }
}
