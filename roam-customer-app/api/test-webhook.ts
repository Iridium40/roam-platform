import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  try {
    // Simulate the webhook logic to create the booking
    console.log('🧪 Test webhook: Creating booking for session:', sessionId);

    // Generate booking reference
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const seqPart = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const bookingReference = `BK${year}${randomPart}${seqPart}`;

    // Create a test booking with the session ID
    const bookingData = {
      customer_id: 'b61cf249-bfd6-4d20-b939-50d4b83119ef', // From your logs
      service_id: 'test-service-id',
      business_id: 'test-business-id',
      provider_id: null,
      booking_date: new Date().toISOString().split('T')[0],
      start_time: '10:00:00',
      delivery_type: 'pickup',
      business_location_id: null,
      customer_location_id: null,
      special_instructions: 'Test booking created manually',
      guest_name: 'Test User',
      guest_email: 'test@example.com',
      guest_phone: '555-0123',
      total_amount: 995,
      service_fee: 199,
      stripe_checkout_session_id: sessionId,
      payment_status: 'paid',
      booking_status: 'confirmed',
      booking_reference: bookingReference,
    };

    console.log('💾 Creating test booking:', bookingReference);

    // Create booking in database
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select()
      .single();

    if (bookingError) {
      console.error('❌ Error creating booking:', bookingError);
      return res.status(500).json({ error: 'Failed to create booking', details: bookingError });
    }

    console.log('✅ Test booking created successfully:', booking.id);

    return res.status(200).json({ 
      success: true, 
      booking: booking,
      message: 'Test booking created successfully' 
    });

  } catch (error) {
    console.error('❌ Test webhook failed:', error);
    return res.status(500).json({ error: 'Test webhook failed', details: error });
  }
}
