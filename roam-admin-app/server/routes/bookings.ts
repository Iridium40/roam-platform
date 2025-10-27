import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

export async function handleBookings(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        return await getBookings(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in bookings API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}

async function getBookings(req: Request, res: Response) {
  try {
    const { 
      booking_status,
      provider_id,
      customer_id,
      business_id,
      date_from,
      date_to,
      search,
      page = '1',
      limit = '50',
      sortBy = 'booking_date',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('bookings')
      .select(`
        id,
        customer_id,
        provider_id,
        service_id,
        booking_date,
        booking_time,
        booking_status,
        total_amount,
        duration_minutes,
        special_requests,
        payment_status,
        payment_method,
        cancellation_reason,
        created_at,
        updated_at,
        customer_profiles!inner (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        provider_profiles!inner (
          id,
          first_name,
          last_name,
          email,
          business_id,
          business_profiles!inner (
            business_name,
            business_type
          )
        ),
        services!inner (
          id,
          service_name,
          category,
          subcategory,
          price,
          duration_minutes as service_duration
        )
      `);

    if (search) {
      query = query.or(`
        customer_profiles.first_name.ilike.%${search}%,
        customer_profiles.last_name.ilike.%${search}%,
        provider_profiles.first_name.ilike.%${search}%,
        provider_profiles.last_name.ilike.%${search}%,
        services.service_name.ilike.%${search}%
      `);
    }

    if (booking_status && booking_status !== 'all') {
      query = query.eq('booking_status', booking_status);
    }

    if (provider_id) {
      query = query.eq('provider_id', provider_id);
    }

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    if (business_id) {
      query = query.eq('provider_profiles.business_id', business_id);
    }

    if (date_from) {
      query = query.gte('booking_date', date_from);
    }

    if (date_to) {
      query = query.lte('booking_date', date_to);
    }

    // Apply sorting
    const sortField = sortBy as string;
    const order = sortOrder === 'desc' ? { ascending: false } : { ascending: true };
    query = query.order(sortField, order);

    // Apply pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    query = query.range(offset, offset + limitNum - 1);

    const { data: bookings, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Error fetching bookings:', fetchError);
      return res.status(500).json({ 
        error: fetchError.message,
        details: fetchError.details 
      });
    }

    // Transform and enrich booking data
    const enrichedBookings = await Promise.all(
      (bookings || []).map(async (booking: any) => {
        // Get review if exists
        const { data: review } = await supabase
          .from('reviews')
          .select('overall_rating, review_text, created_at')
          .eq('booking_id', booking.id)
          .single();

        // Get payment details if available
        const { data: payment } = await supabase
          .from('payments')
          .select('stripe_payment_intent_id, amount_paid, payment_date, refund_amount')
          .eq('booking_id', booking.id)
          .single();

        return {
          ...booking,
          customer_name: `${booking.customer_profiles?.first_name || ''} ${booking.customer_profiles?.last_name || ''}`.trim(),
          provider_name: `${booking.provider_profiles?.first_name || ''} ${booking.provider_profiles?.last_name || ''}`.trim(),
          business_name: booking.provider_profiles?.business_profiles?.business_name || 'Unknown',
          service_name: booking.services?.service_name || 'Unknown Service',
          service_category: booking.services?.category || 'Unknown',
          has_review: !!review,
          review_rating: review?.overall_rating || null,
          payment_details: payment ? {
            stripe_payment_intent_id: payment.stripe_payment_intent_id,
            amount_paid: payment.amount_paid,
            payment_date: payment.payment_date,
            refund_amount: payment.refund_amount
          } : null,
          booking_datetime: new Date(`${booking.booking_date}T${booking.booking_time}`).toISOString(),
          duration_display: `${booking.duration_minutes || booking.services?.service_duration || 0} minutes`
        };
      })
    );

    return res.status(200).json({ 
      data: enrichedBookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });

  } catch (error) {
    console.error('Error in getBookings:', error);
    return res.status(500).json({ error: 'Failed to fetch bookings' });
  }
}

// Get booking statistics for dashboard
export async function handleBookingStats(req: Request, res: Response) {
  try {
    const { days = '30', business_id, provider_id } = req.query;
    
    const daysBack = parseInt(days as string);
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    const [overallStats, statusBreakdown, revenueStats, popularServices] = await Promise.all([
      getOverallBookingStats(startDate, business_id as string, provider_id as string),
      getBookingStatusBreakdown(startDate, business_id as string, provider_id as string),
      getRevenueStats(startDate, business_id as string, provider_id as string),
      getPopularServices(startDate, business_id as string, provider_id as string)
    ]);

    return res.status(200).json({
      data: {
        overall: overallStats,
        status_breakdown: statusBreakdown,
        revenue: revenueStats,
        popular_services: popularServices,
        period_days: daysBack
      }
    });

  } catch (error) {
    console.error('Error in handleBookingStats:', error);
    return res.status(500).json({ error: 'Failed to fetch booking statistics' });
  }
}

// Get booking trends (daily/weekly/monthly)
export async function handleBookingTrends(req: Request, res: Response) {
  try {
    const { period = 'daily', days = '30', business_id, provider_id } = req.query;
    
    const daysBack = parseInt(days as string);
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('bookings')
      .select(`
        booking_date,
        booking_status,
        total_amount,
        provider_id,
        provider_profiles!inner (business_id)
      `)
      .gte('booking_date', startDate.split('T')[0]); // Use date only

    if (business_id) {
      query = query.eq('provider_profiles.business_id', business_id);
    }

    if (provider_id) {
      query = query.eq('provider_id', provider_id);
    }

    const { data: bookings, error } = await query.order('booking_date', { ascending: true });

    if (error) {
      console.error('Error fetching booking trends:', error);
      return res.status(500).json({ error: error.message });
    }

    // Group bookings by period
    const trends = groupBookingsByPeriod(bookings || [], period as string);

    return res.status(200).json({ 
      data: trends,
      period,
      days: daysBack
    });

  } catch (error) {
    console.error('Error in handleBookingTrends:', error);
    return res.status(500).json({ error: 'Failed to fetch booking trends' });
  }
}

// Helper functions
async function getOverallBookingStats(startDate: string, businessId?: string, providerId?: string) {
  try {
    let query = supabase.from('bookings').select('*', { count: 'exact', head: true });
    
    if (businessId) {
      query = query.eq('provider_profiles.business_id', businessId);
    }
    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    const { count: totalBookings } = await query.gte('created_at', startDate);

    const { count: completedBookings } = await query
      .gte('created_at', startDate)
      .eq('booking_status', 'completed');

    const { count: cancelledBookings } = await query
      .gte('created_at', startDate)
      .eq('booking_status', 'cancelled');

    const { count: pendingBookings } = await query
      .gte('created_at', startDate)
      .eq('booking_status', 'pending');

    return {
      total_bookings: totalBookings || 0,
      completed_bookings: completedBookings || 0,
      cancelled_bookings: cancelledBookings || 0,
      pending_bookings: pendingBookings || 0,
      completion_rate: totalBookings ? Math.round((completedBookings || 0) / totalBookings * 100) : 0,
      cancellation_rate: totalBookings ? Math.round((cancelledBookings || 0) / totalBookings * 100) : 0
    };
  } catch (error) {
    console.error('Error getting overall booking stats:', error);
    return { total_bookings: 0, completed_bookings: 0, cancelled_bookings: 0, pending_bookings: 0, completion_rate: 0, cancellation_rate: 0 };
  }
}

async function getBookingStatusBreakdown(startDate: string, businessId?: string, providerId?: string) {
  try {
    let query = supabase
      .from('bookings')
      .select('booking_status');

    if (businessId) {
      query = query.eq('provider_profiles.business_id', businessId);
    }
    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    const { data: bookings } = await query.gte('created_at', startDate);

    const statusCounts = (bookings || []).reduce((acc: any, booking: any) => {
      acc[booking.booking_status] = (acc[booking.booking_status] || 0) + 1;
      return acc;
    }, {});

    return statusCounts;
  } catch (error) {
    console.error('Error getting booking status breakdown:', error);
    return {};
  }
}

async function getRevenueStats(startDate: string, businessId?: string, providerId?: string) {
  try {
    let query = supabase
      .from('bookings')
      .select('total_amount, booking_status');

    if (businessId) {
      query = query.eq('provider_profiles.business_id', businessId);
    }
    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    const { data: bookings } = await query.gte('created_at', startDate);

    const totalRevenue = (bookings || [])
      .filter(b => b.booking_status === 'completed')
      .reduce((sum: number, booking: any) => sum + (booking.total_amount || 0), 0);

    const pendingRevenue = (bookings || [])
      .filter(b => ['pending', 'confirmed'].includes(b.booking_status))
      .reduce((sum: number, booking: any) => sum + (booking.total_amount || 0), 0);

    const averageBookingValue = bookings && bookings.length > 0 ? 
      totalRevenue / bookings.filter(b => b.booking_status === 'completed').length : 0;

    return {
      total_revenue: totalRevenue,
      pending_revenue: pendingRevenue,
      average_booking_value: Math.round(averageBookingValue * 100) / 100
    };
  } catch (error) {
    console.error('Error getting revenue stats:', error);
    return { total_revenue: 0, pending_revenue: 0, average_booking_value: 0 };
  }
}

async function getPopularServices(startDate: string, businessId?: string, providerId?: string) {
  try {
    let query = supabase
      .from('bookings')
      .select(`
        service_id,
        services!inner (service_name, category),
        provider_profiles!inner (business_id)
      `);

    if (businessId) {
      query = query.eq('provider_profiles.business_id', businessId);
    }
    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    const { data: bookings } = await query.gte('created_at', startDate);

    const serviceCounts = (bookings || []).reduce((acc: any, booking: any) => {
      const serviceName = booking.services?.service_name || 'Unknown Service';
      const serviceCategory = booking.services?.category || 'Unknown';
      
      if (!acc[serviceName]) {
        acc[serviceName] = { 
          name: serviceName, 
          category: serviceCategory, 
          booking_count: 0 
        };
      }
      acc[serviceName].booking_count += 1;
      return acc;
    }, {});

    return Object.values(serviceCounts)
      .sort((a: any, b: any) => b.booking_count - a.booking_count)
      .slice(0, 10);
  } catch (error) {
    console.error('Error getting popular services:', error);
    return [];
  }
}

function groupBookingsByPeriod(bookings: any[], period: string) {
  const grouped: any = {};

  bookings.forEach(booking => {
    let key: string;
    const date = new Date(booking.booking_date);

    switch (period) {
      case 'daily':
        key = booking.booking_date; // Already in YYYY-MM-DD format
        break;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        key = booking.booking_date;
    }

    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        total_bookings: 0,
        completed_bookings: 0,
        cancelled_bookings: 0,
        total_revenue: 0
      };
    }

    grouped[key].total_bookings += 1;
    if (booking.booking_status === 'completed') {
      grouped[key].completed_bookings += 1;
      grouped[key].total_revenue += booking.total_amount || 0;
    } else if (booking.booking_status === 'cancelled') {
      grouped[key].cancelled_bookings += 1;
    }
  });

  return Object.values(grouped).sort((a: any, b: any) => a.period.localeCompare(b.period));
}