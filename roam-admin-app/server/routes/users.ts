import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

export async function handleUsers(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        return await getUsers(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in users API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}

async function getUsers(req: Request, res: Response) {
  try {
    const { 
      user_type, // 'admin', 'customer', 'provider'
      status,
      search,
      page = '1',
      limit = '50',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Get admin users if requested
    if (user_type === 'admin') {
      return await getAdminUsers(req, res);
    }

    // Get customer and provider stats combined
    const [customersResult, providersResult] = await Promise.all([
      getCustomerProfiles(req, res, false), // Don't send response yet
      getProviderProfiles(req, res, false)  // Don't send response yet
    ]);

    if (user_type === 'customer') {
      return customersResult;
    } else if (user_type === 'provider') {
      return providersResult;
    }

    // Return combined stats if no specific type requested
    const customerData = await getCustomerStats();
    const providerData = await getProviderStats();
    const adminData = await getAdminStats();

    return res.status(200).json({
      data: {
        overview: {
          total_users: customerData.total + providerData.total + adminData.total,
          customers: customerData,
          providers: providerData,
          admins: adminData
        }
      }
    });

  } catch (error) {
    console.error('Error in getUsers:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

async function getAdminUsers(req: Request, res: Response) {
  try {
    const { 
      search,
      page = '1',
      limit = '50',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('admin_users')
      .select(`
        id,
        user_id,
        email,
        first_name,
        last_name,
        role,
        is_active,
        created_at,
        last_login,
        image_url
      `);

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
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

    const { data: users, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Error fetching admin users:', fetchError);
      return res.status(500).json({ 
        error: fetchError.message,
        details: fetchError.details 
      });
    }

    return res.status(200).json({ 
      data: users || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });

  } catch (error) {
    console.error('Error in getAdminUsers:', error);
    return res.status(500).json({ error: 'Failed to fetch admin users' });
  }
}

async function getCustomerProfiles(req: Request, res: Response, sendResponse = true) {
  try {
    const { 
      search,
      page = '1',
      limit = '50',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('customer_profiles')
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        email,
        phone,
        is_active,
        created_at,
        date_of_birth,
        preferred_location_id,
        email_notifications,
        sms_notifications,
        customer_locations!customer_locations_customer_id_fkey (
          address_line1,
          city,
          state,
          zipcode
        )
      `);

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
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

    const { data: customers, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Error fetching customers:', fetchError);
      if (sendResponse) {
        return res.status(500).json({ 
          error: fetchError.message,
          details: fetchError.details 
        });
      }
      return null;
    }

    // Get booking counts for each customer
    const customersWithStats = await Promise.all(
      (customers || []).map(async (customer: any) => {
        const { count: bookingCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', customer.id);

        const { data: totalSpent } = await supabase
          .from('bookings')
          .select('total_amount')
          .eq('customer_id', customer.id)
          .eq('booking_status', 'completed');

        const totalAmount = totalSpent?.reduce((sum: number, booking: any) => 
          sum + (booking.total_amount || 0), 0) || 0;

        return {
          ...customer,
          full_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
          total_bookings: bookingCount || 0,
          total_spent: totalAmount,
          primary_address: customer.customer_locations?.[0] ? 
            `${customer.customer_locations[0].city}, ${customer.customer_locations[0].state}` : null
        };
      })
    );

    const result = { 
      data: customersWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    };

    if (sendResponse) {
      return res.status(200).json(result);
    }
    return result;

  } catch (error) {
    console.error('Error in getCustomerProfiles:', error);
    if (sendResponse) {
      return res.status(500).json({ error: 'Failed to fetch customers' });
    }
    return null;
  }
}

async function getProviderProfiles(req: Request, res: Response, sendResponse = true) {
  try {
    const { 
      search,
      verification_status,
      page = '1',
      limit = '50',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('provider_profiles')
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        email,
        phone,
        business_id,
        verification_status,
        provider_role,
        years_of_experience,
        bio,
        is_active,
        created_at,
        business_profiles!inner (
          id,
          business_name
        )
      `);

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (verification_status && verification_status !== 'all') {
      query = query.eq('verification_status', verification_status);
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

    const { data: providers, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Error fetching providers:', fetchError);
      if (sendResponse) {
        return res.status(500).json({ 
          error: fetchError.message,
          details: fetchError.details 
        });
      }
      return null;
    }

    // Get booking counts and ratings for each provider
    const providersWithStats = await Promise.all(
      (providers || []).map(async (provider: any) => {
        const { count: bookingCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', provider.id);

        const { data: reviews } = await supabase
          .from('reviews')
          .select('overall_rating')
          .in('booking_id', 
            await supabase
              .from('bookings')
              .select('id')
              .eq('provider_id', provider.id)
              .then(result => result.data?.map(b => b.id) || [])
          );

        const avgRating = reviews && reviews.length > 0 ? 
          reviews.reduce((sum: number, r: any) => sum + r.overall_rating, 0) / reviews.length : 0;

        return {
          ...provider,
          full_name: `${provider.first_name || ''} ${provider.last_name || ''}`.trim(),
          business_name: provider.business_profiles?.business_name || 'Unknown',
          total_bookings: bookingCount || 0,
          average_rating: Math.round(avgRating * 10) / 10,
          review_count: reviews?.length || 0
        };
      })
    );

    const result = { 
      data: providersWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    };

    if (sendResponse) {
      return res.status(200).json(result);
    }
    return result;

  } catch (error) {
    console.error('Error in getProviderProfiles:', error);
    if (sendResponse) {
      return res.status(500).json({ error: 'Failed to fetch providers' });
    }
    return null;
  }
}

// Helper functions for stats
async function getCustomerStats() {
  try {
    const { count: total } = await supabase
      .from('customer_profiles')
      .select('*', { count: 'exact', head: true });

    const { count: active } = await supabase
      .from('customer_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: recentSignups } = await supabase
      .from('customer_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    return { total: total || 0, active: active || 0, recent_signups: recentSignups || 0 };
  } catch (error) {
    console.error('Error getting customer stats:', error);
    return { total: 0, active: 0, recent_signups: 0 };
  }
}

async function getProviderStats() {
  try {
    const { count: total } = await supabase
      .from('provider_profiles')
      .select('*', { count: 'exact', head: true });

    const { count: verified } = await supabase
      .from('provider_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'approved');

    const { count: pending } = await supabase
      .from('provider_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending');

    return { total: total || 0, verified: verified || 0, pending_verification: pending || 0 };
  } catch (error) {
    console.error('Error getting provider stats:', error);
    return { total: 0, verified: 0, pending_verification: 0 };
  }
}

async function getAdminStats() {
  try {
    const { count: total } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true });

    const { count: active } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    return { total: total || 0, active: active || 0 };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return { total: 0, active: 0 };
  }
}

// Get user activity/engagement metrics
export async function handleUserActivity(req: Request, res: Response) {
  try {
    const { user_type, days = '30' } = req.query;
    
    const daysBack = parseInt(days as string);
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
    
    if (user_type === 'customer') {
      // Customer activity: bookings, reviews
      const { data: customerActivity } = await supabase
        .from('bookings')
        .select(`
          booking_date,
          customer_id,
          customer_profiles!inner (first_name, last_name)
        `)
        .gte('created_at', startDate)
        .order('booking_date', { ascending: false });

      return res.status(200).json({ data: customerActivity || [] });
      
    } else if (user_type === 'provider') {
      // Provider activity: completed bookings, reviews received
      const { data: providerActivity } = await supabase
        .from('bookings')
        .select(`
          booking_date,
          booking_status,
          provider_id,
          provider_profiles!inner (first_name, last_name)
        `)
        .gte('created_at', startDate)
        .order('booking_date', { ascending: false });

      return res.status(200).json({ data: providerActivity || [] });
    }

    return res.status(400).json({ error: 'user_type parameter required (customer or provider)' });

  } catch (error) {
    console.error('Error in handleUserActivity:', error);
    return res.status(500).json({ error: 'Failed to fetch user activity' });
  }
}