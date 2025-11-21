import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl =
      process.env.VITE_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Bookings API missing Supabase configuration', {
        hasUrl: Boolean(supabaseUrl),
        hasServiceKey: Boolean(supabaseServiceKey),
      });
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { business_id, provider_id, limit, offset, status } = req.query;
    if (!business_id) {
      return res.status(400).json({ error: 'business_id parameter is required' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer_profiles (id, first_name, last_name, email, phone, image_url),
        customer_locations (id, location_name, street_address, city, state, zip_code),
        business_locations (id, location_name, address_line1, city, state, postal_code),
        services (id, name, description, duration_minutes, min_price),
        providers (id, first_name, last_name)
      `)
      .eq('business_id', business_id);

    if (provider_id) query = query.eq('provider_id', provider_id);
    if (status) query = query.eq('booking_status', status);

    const limitNum = limit ? Math.min(Math.max(parseInt(limit as string, 10), 1), 1000) : 50;
    const offsetNum = offset ? Math.max(parseInt(offset as string, 10), 0) : 0;

    const { data: bookings, error } = await query
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (error) {
      console.error('Bookings error:', error);
      return res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
    }

    // Normalize providers relation - Supabase sometimes returns arrays for foreign key relationships
    const normalizedBookings = (bookings || []).map((booking: any) => {
      if (booking.providers) {
        // If providers is an array, take the first element (should only be one for one-to-one relationship)
        if (Array.isArray(booking.providers)) {
          booking.providers = booking.providers.length > 0 ? booking.providers[0] : null;
        }
      }
      return booking;
    });

    const { data: stats } = await supabase
      .from('bookings')
      .select('booking_status, total_amount')
      .eq('business_id', business_id);

    const totalBookings = stats?.length || 0;
    const pendingBookings = stats?.filter(b => b.booking_status === 'pending').length || 0;
    const confirmedBookings = stats?.filter(b => b.booking_status === 'confirmed').length || 0;
    const completedBookings = stats?.filter(b => b.booking_status === 'completed').length || 0;

    const totalRevenue = stats
      ?.filter(b => b.booking_status === 'completed')
      .reduce((sum, b) => {
        const amount = parseFloat(b.total_amount || '0');
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0) || 0;

    return res.status(200).json({
      bookings: normalizedBookings,
      stats: {
        totalBookings,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        totalRevenue,
        averageBookingValue: completedBookings > 0 ? totalRevenue / completedBookings : 0
      },
      pagination: { limit: limitNum, offset: offsetNum, total: totalBookings }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
