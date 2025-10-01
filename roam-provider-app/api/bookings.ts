import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Initialize Supabase client for Edge Runtime
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(request: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (request.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id, provider_id, limit, offset, status } = request.query;

    if (!business_id) {
      return res.status(400).json({ error: 'business_id is required' });
    }

    // Build query with confirmed database schema from DATABASE_SCHEMA_REFERENCE.md
    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer_profiles (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        customer_locations (
          id,
          location_name,
          street_address,
          unit_number,
          city,
          state,
          zip_code,
          latitude,
          longitude,
          is_primary,
          is_active,
          access_instructions,
          location_type
        ),
        business_locations (
          id,
          location_name,
          address_line1,
          address_line2,
          city,
          state,
          postal_code
        ),
        services (
          id,
          name,
          description,
          duration_minutes,
          min_price,
          max_price
        ),
        providers (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('business_id', business_id);

    // Add filters
    if (provider_id) {
      query = query.eq('provider_id', provider_id);
    }

    if (status) {
      query = query.eq('booking_status', status);
    }

    // Add pagination
    if (limit) {
      query = query.limit(parseInt(limit as string));
    }

    if (offset) {
      query = query.range(
        parseInt(offset as string), 
        parseInt(offset as string) + (parseInt(limit as string) || 50) - 1
      );
    }

    // Order by booking date and time
    query = query.order('booking_date', { ascending: false })
                .order('start_time', { ascending: false });

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return res.status(500).json({ error: 'Failed to fetch bookings' });
    }

    // Get booking statistics
    const { data: stats, error: statsError } = await supabase
      .from('bookings')
      .select('booking_status, total_amount')
      .eq('business_id', business_id);

    if (statsError) {
      console.error('Error fetching booking stats:', statsError);
    }

    // Calculate statistics
    const totalBookings = stats?.length || 0;
    const pendingBookings = stats?.filter(b => b.booking_status === 'pending').length || 0;
    const confirmedBookings = stats?.filter(b => b.booking_status === 'confirmed').length || 0;
    const completedBookings = stats?.filter(b => b.booking_status === 'completed').length || 0;
    const cancelledBookings = stats?.filter(b => b.booking_status === 'cancelled').length || 0;
    const inProgressBookings = stats?.filter(b => b.booking_status === 'in_progress').length || 0;

    const totalRevenue = stats
      ?.filter(b => b.booking_status === 'completed')
      .reduce((sum, b) => sum + (parseFloat(b.total_amount || '0')), 0) || 0;

    const averageBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;
    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

    const bookingStats = {
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      inProgressBookings,
      totalRevenue,
      averageBookingValue,
      completionRate,
    };

    return res.status(200).json({
      bookings: bookings || [],
      stats: bookingStats,
      pagination: {
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0,
        total: totalBookings
      }
    });

  } catch (error) {
    console.error('Bookings API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}