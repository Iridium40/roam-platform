import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/bookings-optimized
 * 
 * Optimized bookings API with server-side filtering, pagination, and stats.
 * Uses PostgreSQL functions for maximum efficiency.
 * 
 * Query params:
 * - business_id: UUID (required)
 * - provider_id: UUID (optional, auto-set for provider role users)
 * - status: string (optional) - filter by booking_status
 * - category: 'present' | 'future' | 'past' (optional) - filter by time category
 * - date_from: YYYY-MM-DD (optional)
 * - date_to: YYYY-MM-DD (optional)
 * - search: string (optional) - search customer name, service name, reference
 * - limit: number (default 25, max 500)
 * - offset: number (default 0)
 * - counts_only: boolean (optional) - return only counts, no booking data
 * 
 * Response:
 * {
 *   bookings: [...],
 *   stats: { present_count, future_count, past_count, pending_bookings, ... },
 *   pagination: { limit, offset, total, has_more }
 * }
 */
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

  const startTime = Date.now();

  try {
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse query parameters
    const {
      business_id,
      provider_id,
      status,
      category,
      date_from,
      date_to,
      search,
      limit = '25',
      offset = '0',
      counts_only,
    } = req.query;

    if (!business_id || typeof business_id !== 'string') {
      return res.status(400).json({ error: 'business_id parameter is required' });
    }

    // Verify authorization and get provider info
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get provider record to check role and determine filtering
    const { data: providerData, error: providerError } = await supabase
      .from('providers')
      .select('id, business_id, provider_role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (providerError || !providerData) {
      return res.status(403).json({ error: 'Provider profile not found' });
    }

    if (providerData.business_id !== business_id) {
      return res.status(403).json({ error: 'Access denied to this business' });
    }

    // Determine provider_id filter based on role
    // Providers can only see their own bookings, owners/dispatchers can see all
    let effectiveProviderId: string | null = null;
    if (providerData.provider_role === 'provider') {
      effectiveProviderId = providerData.id;
    } else if (provider_id && typeof provider_id === 'string') {
      effectiveProviderId = provider_id;
    }

    const limitNum = Math.min(Math.max(parseInt(limit as string, 10) || 25, 1), 500);
    const offsetNum = Math.max(parseInt(offset as string, 10) || 0, 0);

    // If counts_only, just return the counts
    if (counts_only === 'true') {
      const { data: counts, error: countsError } = await supabase
        .rpc('get_provider_booking_counts', {
          p_business_id: business_id,
          p_provider_id: effectiveProviderId,
          p_date_from: date_from || null,
          p_date_to: date_to || null,
        })
        .single();

      if (countsError) {
        console.error('Error fetching booking counts:', countsError);
        
        // Fallback to simple count if function fails for any reason
        console.log('Falling back to simple count due to error:', countsError.code);
        return await fallbackCounts(supabase, business_id, effectiveProviderId, res, startTime);
      }

      return res.status(200).json({
        counts,
        _meta: {
          query_time_ms: Date.now() - startTime,
          business_id,
          provider_role: providerData.provider_role,
        }
      });
    }

    // Fetch paginated bookings with stats
    const { data: results, error: bookingsError } = await supabase
      .rpc('get_provider_bookings_paginated', {
        p_business_id: business_id,
        p_provider_id: effectiveProviderId,
        p_status: status || null,
        p_category: category || null,
        p_date_from: date_from || null,
        p_date_to: date_to || null,
        p_search: search || null,
        p_limit: limitNum,
        p_offset: offsetNum,
      });

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      
      // Fallback to regular query if function fails for any reason
      // Common errors: 42883 (function doesn't exist), 42703 (column doesn't exist)
      console.log('Falling back to direct query due to error:', bookingsError.code);
      return await fallbackBookings(supabase, business_id, effectiveProviderId, req.query, res, startTime);
    }

    // Extract stats from first row (same for all rows)
    const stats = results?.[0]?.stats || {
      total_bookings: 0,
      pending_bookings: 0,
      confirmed_bookings: 0,
      completed_bookings: 0,
      cancelled_bookings: 0,
      in_progress_bookings: 0,
      present_count: 0,
      future_count: 0,
      past_count: 0,
      total_revenue: 0,
      pending_revenue: 0,
    };

    const totalCount = results?.[0]?.total_count || 0;
    // Transform flattened view fields back into nested objects
    const bookings = (results || []).map((r: any) => {
      const booking = r.booking;
      // Reconstruct customer_profiles object from flattened fields
      if (booking.customer_user_id || booking.customer_first_name) {
        booking.customer_profiles = {
          id: booking.customer_id,
          user_id: booking.customer_user_id,
          first_name: booking.customer_first_name,
          last_name: booking.customer_last_name,
          email: booking.customer_email,
          phone: booking.customer_phone,
          image_url: booking.customer_image_url,
        };
        // Remove flattened fields to avoid duplication
        delete booking.customer_user_id;
        delete booking.customer_first_name;
        delete booking.customer_last_name;
        delete booking.customer_email;
        delete booking.customer_phone;
        delete booking.customer_image_url;
      }
      // Reconstruct providers object from flattened fields
      if (booking.provider_user_id || booking.provider_first_name) {
        booking.providers = {
          id: booking.provider_id,
          user_id: booking.provider_user_id,
          first_name: booking.provider_first_name,
          last_name: booking.provider_last_name,
          image_url: booking.provider_image_url,
        };
        // Remove flattened fields to avoid duplication
        delete booking.provider_user_id;
        delete booking.provider_first_name;
        delete booking.provider_last_name;
        delete booking.provider_image_url;
      }
      // Reconstruct services object from flattened fields
      if (booking.service_name) {
        booking.services = {
          id: booking.service_id,
          name: booking.service_name,
          description: booking.service_description,
          duration_minutes: booking.service_duration,
          min_price: booking.service_min_price,
          pricing_type: booking.service_pricing_type,
        };
        // Remove flattened fields
        delete booking.service_name;
        delete booking.service_description;
        delete booking.service_duration;
        delete booking.service_min_price;
        delete booking.service_pricing_type;
      }
      return booking;
    });

    const queryTime = Date.now() - startTime;

    return res.status(200).json({
      bookings,
      stats,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: totalCount,
        has_more: offsetNum + bookings.length < totalCount,
      },
      _meta: {
        query_time_ms: queryTime,
        business_id,
        provider_role: providerData.provider_role,
        filters_applied: {
          provider_id: effectiveProviderId,
          status: status || null,
          category: category || null,
          date_from: date_from || null,
          date_to: date_to || null,
          search: search || null,
        }
      }
    });

  } catch (error: any) {
    console.error('Bookings API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Fallback for counts when function doesn't exist
async function fallbackCounts(
  supabase: any, 
  businessId: string, 
  providerId: string | null,
  res: VercelResponse,
  startTime: number
) {
  let query = supabase
    .from('bookings')
    .select('booking_status, booking_date')
    .eq('business_id', businessId);

  if (providerId) {
    query = query.eq('provider_id', providerId);
  }

  const { data: bookings, error } = await query;

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch booking counts' });
  }

  const today = new Date().toISOString().split('T')[0];
  const finalStatuses = new Set(['completed', 'cancelled', 'declined', 'no_show']);

  const counts = {
    present_count: 0,
    future_count: 0,
    past_count: 0,
    pending_count: 0,
    confirmed_count: 0,
    in_progress_count: 0,
    completed_count: 0,
    cancelled_count: 0,
    total_count: bookings?.length || 0,
  };

  (bookings || []).forEach((b: any) => {
    const status = b.booking_status;
    const date = b.booking_date;

    // Count by status
    if (status === 'pending') counts.pending_count++;
    else if (status === 'confirmed') counts.confirmed_count++;
    else if (status === 'in_progress') counts.in_progress_count++;
    else if (status === 'completed') counts.completed_count++;
    else if (status === 'cancelled') counts.cancelled_count++;

    // Count by category
    if (finalStatuses.has(status)) {
      counts.past_count++;
    } else if (date > today) {
      counts.future_count++;
    } else {
      counts.present_count++;
    }
  });

  return res.status(200).json({
    counts,
    _meta: {
      query_time_ms: Date.now() - startTime,
      business_id: businessId,
      fallback_mode: true,
    }
  });
}

// Fallback for bookings when function doesn't exist
async function fallbackBookings(
  supabase: any,
  businessId: string,
  providerId: string | null,
  query: any,
  res: VercelResponse,
  startTime: number
) {
  const { status, limit = '25', offset = '0' } = query;
  const limitNum = Math.min(parseInt(limit, 10) || 25, 500);
  const offsetNum = parseInt(offset, 10) || 0;

  let bookingsQuery = supabase
    .from('bookings')
    .select(`
      *,
      customer_profiles (id, user_id, first_name, last_name, email, phone, image_url),
      services (id, name, description, duration_minutes, min_price, pricing_type),
      providers (id, user_id, first_name, last_name, image_url),
      customer_locations (id, location_name, street_address, unit_number, city, state, zip_code),
      business_locations (id, location_name, address_line1, address_line2, city, state, postal_code)
    `, { count: 'exact' })
    .eq('business_id', businessId);

  if (providerId) {
    bookingsQuery = bookingsQuery.eq('provider_id', providerId);
  }

  if (status) {
    bookingsQuery = bookingsQuery.eq('booking_status', status);
  }

  const { data: bookings, error, count } = await bookingsQuery
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false })
    .range(offsetNum, offsetNum + limitNum - 1);

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch bookings' });
  }

  return res.status(200).json({
    bookings: bookings || [],
    stats: {
      total_bookings: count || 0,
    },
    pagination: {
      limit: limitNum,
      offset: offsetNum,
      total: count || 0,
      has_more: offsetNum + (bookings?.length || 0) < (count || 0),
    },
    _meta: {
      query_time_ms: Date.now() - startTime,
      business_id: businessId,
      fallback_mode: true,
    }
  });
}

