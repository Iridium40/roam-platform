import { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

export async function handleReportMetrics(req: Request, res: Response) {
  try {
    const { dateRange = "30" } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange as string));
    
    // Fetch customer metrics (customer_profiles table instead of auth.users)
    const { data: customers, error: customersError } = await supabase
      .from('customer_profiles')
      .select('created_at')
      .gte('created_at', startDate.toISOString());
    
    if (customersError) {
      console.error('Error fetching customer metrics:', customersError);
      // Don't throw - continue with empty data
    }
    
    // Fetch provider metrics
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('created_at')
      .gte('created_at', startDate.toISOString());
    
    if (providersError) {
      console.error('Error fetching provider metrics:', providersError);
      // Don't throw - continue with empty data
    }
    
    // Combine customers and providers for total user count
    const users = [...(customers || []), ...(providers || [])];
    
    // Fetch booking metrics
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('total_amount, created_at, booking_status')
      .gte('created_at', startDate.toISOString());
    
    if (bookingsError) throw bookingsError;
    
    // Fetch previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - parseInt(dateRange as string));
    
    // Fetch previous period customers
    const { data: prevCustomers, error: prevCustomersError } = await supabase
      .from('customer_profiles')
      .select('created_at')
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', startDate.toISOString());
    
    if (prevCustomersError) {
      console.error('Error fetching previous customer metrics:', prevCustomersError);
    }
    
    // Fetch previous period providers
    const { data: prevProviders, error: prevProvidersError } = await supabase
      .from('providers')
      .select('created_at')
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', startDate.toISOString());
    
    if (prevProvidersError) {
      console.error('Error fetching previous provider metrics:', prevProvidersError);
    }
    
    // Combine for previous period total
    const prevUsers = [...(prevCustomers || []), ...(prevProviders || [])];
    
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
      .select('overall_rating, created_at')
      .gte('created_at', startDate.toISOString());
    
    if (reviewsError) throw reviewsError;
    
    const avgRating = reviews && reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + (review.overall_rating || 0), 0) / reviews.length 
      : 0;
    
    const { data: prevReviews, error: prevReviewsError } = await supabase
      .from('reviews')
      .select('overall_rating, created_at')
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', startDate.toISOString());
    
    if (prevReviewsError) throw prevReviewsError;
    
    const prevAvgRating = prevReviews && prevReviews.length > 0 
      ? prevReviews.reduce((sum, review) => sum + (review.overall_rating || 0), 0) / prevReviews.length 
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
    const userReports = data?.map(user => {
      // Format dates
      const formatDate = (dateStr: string | null): string => {
        if (!dateStr) return 'Never';
        try {
          const date = new Date(dateStr);
          return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        } catch {
          return dateStr;
        }
      };

      // Get name based on user type
      const getName = () => {
        if (user.user_type === 'customer') {
          return user.customer_first_name || user.customer_last_name
            ? `${user.customer_first_name || ''} ${user.customer_last_name || ''}`.trim()
            : 'N/A';
        } else if (user.user_type === 'provider' || user.user_type === 'business') {
          if (user.provider_first_name || user.provider_last_name) {
            return `${user.provider_first_name || ''} ${user.provider_last_name || ''}`.trim();
          }
          return user.business_name || 'N/A';
        }
        return 'N/A';
      };

      // Get phone based on user type
      const getPhone = () => {
        if (user.user_type === 'customer') {
          return user.customer_phone || null;
        } else if (user.user_type === 'provider' || user.user_type === 'business') {
          return user.provider_phone || null;
        }
        return null;
      };

      // Get bookings/spending based on user type
      const getBookings = () => {
        if (user.user_type === 'customer') {
          return user.total_bookings || 0;
        } else if (user.user_type === 'provider' || user.user_type === 'business') {
          return user.provider_total_bookings || 0;
        }
        return 0;
      };

      const getSpendingEarning = () => {
        if (user.user_type === 'customer') {
          return user.total_spent || 0;
        } else if (user.user_type === 'provider' || user.user_type === 'business') {
          return user.total_earned || 0;
        }
        return 0;
      };

      return {
        id: user.id,
        email: user.email || 'N/A',
        name: getName(),
        phone: getPhone(),
        user_type: user.user_type as 'customer' | 'provider' | 'business',
        provider_role: user.provider_role || null,
        business_name: user.business_name || null,
        status: user.status as 'active' | 'inactive' | 'suspended',
        registration_date: user.registration_date,
        registration_date_formatted: formatDate(user.registration_date),
        last_activity: user.last_activity || user.registration_date,
        last_activity_formatted: formatDate(user.last_activity || user.registration_date),
        total_bookings: getBookings(),
        total_spent: getSpendingEarning(),
        total_earned: user.user_type === 'provider' || user.user_type === 'business' 
          ? (user.total_earned || 0) 
          : null,
        avg_rating: user.avg_rating || 0,
        total_reviews: user.total_reviews || 0,
        location: user.location || 'Unknown',
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
    const bookingReports = data?.map(booking => {
      // Format booking date with time
      const formatBookingDate = (dateStr: string | null, timeStr: string | null): string => {
        if (!dateStr) return 'Not scheduled';
        try {
          const date = new Date(dateStr);
          const dateFormatted = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          
          if (timeStr) {
            try {
              const time = new Date(`2000-01-01T${timeStr}`);
              const timeFormatted = time.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              });
              return `${dateFormatted} at ${timeFormatted}`;
            } catch {
              return dateFormatted;
            }
          }
          return dateFormatted;
        } catch {
          return dateStr;
        }
      };

      return {
        id: booking.id,
        booking_reference: booking.booking_reference || `#${booking.id.slice(0, 8)}`,
        service_name: booking.service_name || 'Unknown Service',
        business_name: booking.business_name || 'Unknown Business',
        customer_name: booking.customer_name || 'Guest',
        provider_name: booking.provider_name || 'Not assigned',
        booking_date: booking.booking_date || booking.created_at,
        booking_date_formatted: formatBookingDate(booking.booking_date, booking.start_time),
        start_time: booking.start_time || null,
        status: booking.booking_status,
        payment_status: booking.payment_status || 'unknown',
        amount: booking.amount || 0,
        rating: booking.rating || undefined,
        review: booking.review || undefined,
      };
    }) || [];
    
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
    
    // Helper to format snake_case to Title Case
    const formatToTitleCase = (str: string | null): string => {
      if (!str) return 'Unknown';
      return str
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };
    
    // Helper to format date
    const formatDate = (dateStr: string | null): string => {
      if (!dateStr) return 'N/A';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric'
        });
      } catch {
        return dateStr;
      }
    };
    
    // Transform data to match frontend interface
    const businessReports = data?.map(business => ({
      id: business.id,
      business_name: business.business_name,
      business_type: formatToTitleCase(business.business_type),
      contact_email: business.contact_email || null,
      phone: business.phone || null,
      verification_status: formatToTitleCase(business.verification_status),
      is_active: business.is_active ?? true,
      onboarded_date: business.created_at,
      onboarded_date_formatted: formatDate(business.created_at),
      total_providers: business.total_providers || 0,
      active_providers: business.active_providers || 0,
      total_services: business.total_services || 0,
      active_services: business.active_services || 0,
      total_bookings: business.total_bookings || 0,
      completed_bookings: business.completed_bookings || 0,
      cancelled_bookings: business.cancelled_bookings || 0,
      total_revenue: business.total_revenue || 0,
      completed_revenue: business.completed_revenue || 0,
      avg_rating: business.avg_rating || 0,
      total_reviews: business.total_reviews || 0,
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
    
    // Helper to format snake_case to Title Case with special handling
    const formatToTitleCase = (str: string | null): string => {
      if (!str) return 'Unknown';
      return str
        .split('_')
        .map(word => {
          // Handle special cases like "iv" -> "IV"
          if (word.toLowerCase() === 'iv') return 'IV';
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    };
    
    // Transform data to match frontend interface
    const serviceReports = data?.map(service => ({
      id: service.id,
      service_name: service.service_name,
      category: formatToTitleCase(service.category),
      subcategory: formatToTitleCase(service.subcategory),
      business_name: service.business_name || 'Unknown Business',
      price: service.business_price || service.min_price || 0,
      duration_minutes: service.business_duration_minutes || service.duration_minutes || 0,
      delivery_type: formatToTitleCase(service.delivery_type),
      total_bookings: service.total_bookings || 0,
      completed_bookings: service.completed_bookings || 0,
      total_revenue: service.total_revenue || 0,
      completed_revenue: service.completed_revenue || 0,
      avg_booking_amount: service.avg_booking_amount || 0,
      avg_rating: service.avg_rating || 0,
      total_reviews: service.total_reviews || 0,
      is_active: service.business_service_active ?? service.is_active ?? true,
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
