import { Request, Response } from "express";
import { supabase } from "../lib/supabase";

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
      .from('users')
      .select(`
        id,
        email,
        created_at,
        last_sign_in_at,
        user_metadata,
        customer_profiles(id, first_name, last_name, phone, is_active, date_of_birth, email_notifications, sms_notifications, push_notifications, marketing_emails, email_verified, phone_verified),
        provider_profiles(id, first_name, last_name, phone, is_active, date_of_birth, email_notifications, sms_notifications, push_notifications, marketing_emails, email_verified, phone_verified),
        business_profiles(id, business_name, business_type, is_active, subscription_status)
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (search) {
      query = query.or(`email.ilike.%${search}%,customer_profiles.first_name.ilike.%${search}%,customer_profiles.last_name.ilike.%${search}%,provider_profiles.first_name.ilike.%${search}%,provider_profiles.last_name.ilike.%${search}%,business_profiles.business_name.ilike.%${search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Transform data to match frontend interface
    const userReports = data?.map(user => {
      let userType: 'customer' | 'provider' | 'business' = 'customer';
      let status: 'active' | 'inactive' | 'suspended' = 'active';
      let firstName = '';
      let lastName = '';
      let phone = '';
      let isActive = true;
      let dateOfBirth = '';
      let emailNotifications = true;
      let smsNotifications = true;
      let pushNotifications = true;
      let marketingEmails = false;
      let emailVerified = false;
      let phoneVerified = false;
      let location = 'Unknown';
      
      if (user.customer_profiles && user.customer_profiles.length > 0) {
        const profile = user.customer_profiles[0];
        userType = 'customer';
        firstName = profile.first_name || '';
        lastName = profile.last_name || '';
        phone = profile.phone || '';
        isActive = profile.is_active || false;
        dateOfBirth = profile.date_of_birth || '';
        emailNotifications = profile.email_notifications || false;
        smsNotifications = profile.sms_notifications || false;
        pushNotifications = profile.push_notifications || false;
        marketingEmails = profile.marketing_emails || false;
        emailVerified = profile.email_verified || false;
        phoneVerified = profile.phone_verified || false;
      } else if (user.provider_profiles && user.provider_profiles.length > 0) {
        const profile = user.provider_profiles[0];
        userType = 'provider';
        firstName = profile.first_name || '';
        lastName = profile.last_name || '';
        phone = profile.phone || '';
        isActive = profile.is_active || false;
        dateOfBirth = profile.date_of_birth || '';
        emailNotifications = profile.email_notifications || false;
        smsNotifications = profile.sms_notifications || false;
        pushNotifications = profile.push_notifications || false;
        marketingEmails = profile.marketing_emails || false;
        emailVerified = profile.email_verified || false;
        phoneVerified = profile.phone_verified || false;
      } else if (user.business_profiles && user.business_profiles.length > 0) {
        const profile = user.business_profiles[0];
        userType = 'business';
        firstName = profile.business_name || '';
        lastName = '';
        isActive = profile.is_active || false;
      }
      
      status = isActive ? 'active' : 'inactive';
      
      return {
        id: user.id,
        user_type: userType,
        status,
        registration_date: user.created_at,
        last_activity: user.last_sign_in_at || user.created_at,
        total_bookings: 0, // TODO: Calculate from bookings table
        total_spent: 0, // TODO: Calculate from bookings table
        avg_rating: 0, // TODO: Calculate from reviews table
        location,
      };
    }) || [];
    
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
      .from('bookings')
      .select(`
        id,
        total_amount,
        created_at,
        booking_status,
        services!inner(name),
        business_profiles!inner(business_name),
        customer_profiles!inner(first_name, last_name)
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (search) {
      query = query.or(`services.name.ilike.%${search}%,business_profiles.business_name.ilike.%${search}%,customer_profiles.first_name.ilike.%${search}%,customer_profiles.last_name.ilike.%${search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Transform data to match frontend interface
    const bookingReports = data?.map(booking => ({
      id: booking.id,
      service_name: booking.services?.name || 'Unknown Service',
      business_name: booking.business_profiles?.business_name || 'Unknown Business',
      customer_name: `${booking.customer_profiles?.first_name || ''} ${booking.customer_profiles?.last_name || ''}`.trim(),
      booking_date: booking.created_at,
      status: booking.booking_status,
      amount: booking.total_amount || 0,
      rating: undefined, // TODO: Fetch from reviews table
      review: undefined, // TODO: Fetch from reviews table
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
      .from('business_profiles')
      .select(`
        id,
        business_name,
        business_type,
        verification_status,
        is_active,
        created_at,
        location
      `)
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
      total_providers: 0, // TODO: Calculate from provider_profiles table
      total_services: 0, // TODO: Calculate from services table
      total_bookings: 0, // TODO: Calculate from bookings table
      total_revenue: 0, // TODO: Calculate from bookings table
      avg_rating: 0, // TODO: Calculate from reviews table
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
      .from('services')
      .select(`
        id,
        name,
        description,
        min_price,
        duration_minutes,
        is_active,
        is_featured,
        is_popular,
        created_at,
        service_subcategories!inner(service_subcategory_type, service_categories!inner(service_category_type)),
        business_profiles!inner(business_name)
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Transform data to match frontend interface
    const serviceReports = data?.map(service => ({
      id: service.id,
      service_name: service.name,
      category: service.service_subcategories?.service_categories?.service_category_type || 'Unknown',
      subcategory: service.service_subcategories?.service_subcategory_type || 'Unknown',
      business_name: service.business_profiles?.business_name || 'Unknown Business',
      total_bookings: 0, // TODO: Calculate from bookings table
      total_revenue: 0, // TODO: Calculate from bookings table
      avg_rating: 0, // TODO: Calculate from reviews table
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
