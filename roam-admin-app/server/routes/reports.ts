import { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

export async function handleReportMetrics(req: Request, res: Response) {
  try {
    const { dateRange = "30" } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange as string));
    
    // Fetch user metrics
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('created_at, last_sign_in_at')
      .gte('created_at', startDate.toISOString());
    
    if (usersError) throw usersError;
    
    // Fetch booking metrics
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('total_amount, created_at, booking_status')
      .gte('created_at', startDate.toISOString());
    
    if (bookingsError) throw bookingsError;
    
    // Fetch previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - parseInt(dateRange as string));
    
    const { data: prevUsers, error: prevUsersError } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', startDate.toISOString());
    
    if (prevUsersError) throw prevUsersError;
    
    const { data: prevBookings, error: prevBookingsError } = await supabase
      .from('bookings')
      .select('total_amount, created_at')
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', startDate.toISOString());
    
    if (prevBookingsError) throw prevBookingsError;
    
    // Calculate metrics
    const totalUsers = users?.length || 0;
    const prevTotalUsers = prevUsers?.length || 0;
    const userChange = prevTotalUsers > 0 ? ((totalUsers - prevTotalUsers) / prevTotalUsers) * 100 : 0;
    
    const totalBookings = bookings?.length || 0;
    const prevTotalBookings = prevBookings?.length || 0;
    const bookingChange = prevTotalBookings > 0 ? ((totalBookings - prevTotalBookings) / prevTotalBookings) * 100 : 0;
    
    const totalRevenue = bookings?.reduce((sum, booking) => 
      sum + (booking.total_amount || 0), 0) || 0;
    const prevRevenue = prevBookings?.reduce((sum, booking) => 
      sum + (booking.total_amount || 0), 0) || 0;
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    
    // Calculate average rating
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating, created_at')
      .gte('created_at', startDate.toISOString());
    
    if (reviewsError) throw reviewsError;
    
    const avgRating = reviews && reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length 
      : 0;
    
    const { data: prevReviews, error: prevReviewsError } = await supabase
      .from('reviews')
      .select('rating, created_at')
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', startDate.toISOString());
    
    if (prevReviewsError) throw prevReviewsError;
    
    const prevAvgRating = prevReviews && prevReviews.length > 0 
      ? prevReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / prevReviews.length 
      : 0;
    
    const ratingChange = prevAvgRating > 0 ? ((avgRating - prevAvgRating) / prevAvgRating) * 100 : 0;
    
    const metrics = {
      totalUsers: {
        count: totalUsers,
        change: userChange,
        period: `Last ${dateRange} days`
      },
      totalBookings: {
        count: totalBookings,
        change: bookingChange,
        period: `Last ${dateRange} days`
      },
      totalRevenue: {
        amount: totalRevenue,
        change: revenueChange,
        period: `Last ${dateRange} days`
      },
      avgRating: {
        rating: avgRating,
        change: ratingChange,
        period: `Last ${dateRange} days`
      }
    };
    
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error fetching report metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch report metrics' 
    });
  }
}

export async function handleUserReports(req: Request, res: Response) {
  try {
    const { dateRange = "30", search = "" } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange as string));
    
    let query = supabase
      .from('admin_user_reports_view')
      .select('*')
      .gte('registration_date', startDate.toISOString())
      .order('registration_date', { ascending: false });
    
    if (search) {
      query = query.or(`email.ilike.%${search}%,customer_first_name.ilike.%${search}%,customer_last_name.ilike.%${search}%,provider_first_name.ilike.%${search}%,provider_last_name.ilike.%${search}%,business_name.ilike.%${search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Transform data to match frontend interface
    const userReports = data?.map(user => ({
      id: user.id,
      user_type: user.user_type as 'customer' | 'provider' | 'business',
      status: user.status as 'active' | 'inactive' | 'suspended',
      registration_date: user.registration_date,
      last_activity: user.last_activity || user.registration_date,
      total_bookings: user.total_bookings || 0,
      total_spent: user.total_spent || 0,
      avg_rating: user.avg_rating || 0,
      location: user.location || 'Unknown',
    })) || [];
    
    res.json({ success: true, data: userReports });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user reports' 
    });
  }
}

export async function handleBookingReports(req: Request, res: Response) {
  try {
    const { dateRange = "30", search = "" } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange as string));
    
    let query = supabase
      .from('admin_booking_reports_view')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (search) {
      query = query.or(`service_name.ilike.%${search}%,business_name.ilike.%${search}%,customer_name.ilike.%${search}%,customer_first_name.ilike.%${search}%,customer_last_name.ilike.%${search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Transform data to match frontend interface
    const bookingReports = data?.map(booking => ({
      id: booking.id,
      service_name: booking.service_name || 'Unknown Service',
      business_name: booking.business_name || 'Unknown Business',
      customer_name: booking.customer_name || 'Guest',
      booking_date: booking.created_at,
      status: booking.booking_status,
      amount: booking.amount || 0,
      rating: booking.rating || undefined,
      review: booking.review || undefined,
    })) || [];
    
    res.json({ success: true, data: bookingReports });
  } catch (error) {
    console.error('Error fetching booking reports:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch booking reports' 
    });
  }
}

export async function handleBusinessReports(req: Request, res: Response) {
  try {
    const { dateRange = "30", search = "" } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange as string));
    
    let query = supabase
      .from('admin_business_reports_view')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,business_type.ilike.%${search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Transform data to match frontend interface
    const businessReports = data?.map(business => ({
      id: business.id,
      business_name: business.business_name,
      business_type: business.business_type,
      verification_status: business.verification_status,
      total_providers: business.total_providers || 0,
      total_services: business.total_services || 0,
      total_bookings: business.total_bookings || 0,
      total_revenue: business.total_revenue || 0,
      avg_rating: business.avg_rating || 0,
      location: business.location || 'Unknown',
    })) || [];
    
    res.json({ success: true, data: businessReports });
  } catch (error) {
    console.error('Error fetching business reports:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch business reports' 
    });
  }
}

export async function handleServiceReports(req: Request, res: Response) {
  try {
    const { dateRange = "30", search = "" } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange as string));
    
    let query = supabase
      .from('admin_service_reports_view')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (search) {
      query = query.or(`service_name.ilike.%${search}%,description.ilike.%${search}%,business_name.ilike.%${search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Transform data to match frontend interface
    const serviceReports = data?.map(service => ({
      id: service.id,
      service_name: service.service_name,
      category: service.category || 'Unknown',
      subcategory: service.subcategory || 'Unknown',
      business_name: service.business_name || 'Unknown Business',
      total_bookings: service.total_bookings || 0,
      total_revenue: service.total_revenue || 0,
      avg_rating: service.avg_rating || 0,
      is_featured: service.is_featured || false,
      is_popular: service.is_popular || false,
    })) || [];
    
    res.json({ success: true, data: serviceReports });
  } catch (error) {
    console.error('Error fetching service reports:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch service reports' 
    });
  }
}
