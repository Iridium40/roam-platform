import { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

export async function handleReportMetrics(req: Request, res: Response) {
  try {
    const { dateRange = "30" } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange as string));
    
    // Calculate previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - parseInt(dateRange as string));
    
    // Run all queries in parallel for maximum performance
    const [
      customerCount,
      providerCount,
      bookingsData,
      reviewsData,
      prevCustomerCount,
      prevProviderCount,
      prevBookingsData,
      prevReviewsData
    ] = await Promise.all([
      // Current period counts
      supabase
        .from('customer_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString()),
      
      supabase
        .from('providers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString()),
      
      // Current period bookings - using enriched view for better performance
      supabase
        .from('admin_bookings_enriched')
        .select('total_amount, booking_status')
        .gte('created_at', startDate.toISOString()),
      
      // Current period reviews - just need overall_rating for average
      supabase
        .from('reviews')
        .select('overall_rating')
        .gte('created_at', startDate.toISOString()),
      
      // Previous period counts
      supabase
        .from('customer_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString()),
      
      supabase
        .from('providers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString()),
      
      // Previous period bookings
      supabase
        .from('admin_bookings_enriched')
        .select('total_amount, booking_status')
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString()),
      
      // Previous period reviews
      supabase
        .from('reviews')
        .select('overall_rating')
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString())
    ]);
    
    // Calculate metrics using database-returned data
    const totalUsers = (customerCount.count || 0) + (providerCount.count || 0);
    const prevTotalUsers = (prevCustomerCount.count || 0) + (prevProviderCount.count || 0);
    const userChange = prevTotalUsers > 0 ? ((totalUsers - prevTotalUsers) / prevTotalUsers) * 100 : 0;
    
    const totalBookings = bookingsData.data?.length || 0;
    const prevTotalBookings = prevBookingsData.data?.length || 0;
    const bookingChange = prevTotalBookings > 0 ? ((totalBookings - prevTotalBookings) / prevTotalBookings) * 100 : 0;
    
    // Calculate revenue - only client-side aggregation we still need (could be moved to view)
    const totalRevenue = bookingsData.data?.reduce((sum, booking: any) => 
      sum + (booking.total_amount || 0), 0) || 0;
    const prevRevenue = prevBookingsData.data?.reduce((sum, booking: any) => 
      sum + (booking.total_amount || 0), 0) || 0;
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    
    // Calculate average rating - only client-side aggregation we still need
    const avgRating = reviewsData.data && reviewsData.data.length > 0 
      ? reviewsData.data.reduce((sum: number, review: any) => sum + (review.overall_rating || 0), 0) / reviewsData.data.length 
      : 0;
    
    const prevAvgRating = prevReviewsData.data && prevReviewsData.data.length > 0 
      ? prevReviewsData.data.reduce((sum: number, review: any) => sum + (review.overall_rating || 0), 0) / prevReviewsData.data.length 
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

export async function handleBusinessBookabilityReports(req: Request, res: Response) {
  try {
    const { search = "" } = req.query;

    // Pull baseline business list (small payload) and enrich via in-memory aggregation.
    // This avoids requiring a DB view/migration, and keeps the report logic aligned with
    // provider "Booking Readiness" checks.
    let businessQuery = supabase
      .from("business_profiles")
      .select("id, business_name, business_type, verification_status, is_active, contact_email, phone, created_at")
      .order("created_at", { ascending: false });

    if (search) {
      businessQuery = businessQuery.or(
        `business_name.ilike.%${search}%,contact_email.ilike.%${search}%,phone.ilike.%${search}%`,
      );
    }

    const { data: businesses, error: bizError } = await businessQuery;
    if (bizError) throw bizError;

    const businessIds = (businesses || []).map((b: any) => b.id).filter(Boolean);

    // Helper: chunk arrays for PostgREST IN() limits
    const chunk = <T,>(arr: T[], size: number) => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    // Load staff (owner + provider roles) for all businesses in scope
    // Note: This intentionally mirrors provider dashboard readiness logic (no is_active filter).
    const staffByBusiness = new Map<string, Array<{ id: string; location_id: string | null }>>();
    const providerIds: string[] = [];
    if (businessIds.length > 0) {
      const staffChunks = chunk(businessIds, 500);
      for (const ids of staffChunks) {
        const { data: staffRows, error: staffError } = await supabase
          .from("providers")
          .select("id, business_id, location_id, provider_role")
          .in("business_id", ids)
          .in("provider_role", ["owner", "provider"]);

        if (staffError) throw staffError;

        for (const row of staffRows || []) {
          if (!row?.business_id || !row?.id) continue;
          const list = staffByBusiness.get(row.business_id) || [];
          list.push({ id: row.id, location_id: row.location_id || null });
          staffByBusiness.set(row.business_id, list);
          providerIds.push(row.id);
        }
      }
    }

    // Load active provider_services counts for the staff set
    const activeServicesByProvider = new Map<string, number>();
    const uniqueProviderIds = Array.from(new Set(providerIds));
    if (uniqueProviderIds.length > 0) {
      const providerChunks = chunk(uniqueProviderIds, 500);
      for (const ids of providerChunks) {
        const { data: psRows, error: psError } = await supabase
          .from("provider_services")
          .select("provider_id")
          .in("provider_id", ids)
          .eq("is_active", true);

        if (psError) throw psError;

        for (const row of psRows || []) {
          const pid = row?.provider_id;
          if (!pid) continue;
          activeServicesByProvider.set(pid, (activeServicesByProvider.get(pid) || 0) + 1);
        }
      }
    }

    // Load active business services counts
    const activeBusinessServicesByBusiness = new Map<string, number>();
    if (businessIds.length > 0) {
      const bsChunks = chunk(businessIds, 500);
      for (const ids of bsChunks) {
        const { data: bsRows, error: bsError } = await supabase
          .from("business_services")
          .select("business_id")
          .in("business_id", ids)
          .eq("is_active", true);

        if (bsError) throw bsError;

        for (const row of bsRows || []) {
          const bid = row?.business_id;
          if (!bid) continue;
          activeBusinessServicesByBusiness.set(
            bid,
            (activeBusinessServicesByBusiness.get(bid) || 0) + 1,
          );
        }
      }
    }

    // Load Stripe connect status per business
    const stripeByBusiness = new Map<
      string,
      {
        account_id: string | null;
        charges_enabled: boolean | null;
        payouts_enabled: boolean | null;
        requirements_due: number;
      }
    >();

    if (businessIds.length > 0) {
      const stripeChunks = chunk(businessIds, 500);
      for (const ids of stripeChunks) {
        const { data: stripeRows, error: stripeError } = await supabase
          .from("stripe_connect_accounts")
          .select("business_id, account_id, charges_enabled, payouts_enabled, requirements")
          .in("business_id", ids);

        if (stripeError) throw stripeError;

        for (const row of stripeRows || []) {
          if (!row?.business_id) continue;
          const currentlyDue = (row.requirements as any)?.currently_due;
          const requirementsDue = Array.isArray(currentlyDue) ? currentlyDue.length : 0;
          stripeByBusiness.set(row.business_id, {
            account_id: row.account_id || null,
            charges_enabled: row.charges_enabled ?? null,
            payouts_enabled: row.payouts_enabled ?? null,
            requirements_due: requirementsDue,
          });
        }
      }
    }

    const formatToTitleCase = (str: string | null): string => {
      if (!str) return "Unknown";
      return str
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    };

    const reports =
      (businesses || []).map((b: any) => {
        const staff = staffByBusiness.get(b.id) || [];
        const totalStaff = staff.length;
        const staffMissingLocation = staff.filter((p) => !p.location_id).length;
        const staffMissingServices = staff.filter(
          (p) => (activeServicesByProvider.get(p.id) || 0) === 0,
        ).length;

        const activeServicesCount = activeBusinessServicesByBusiness.get(b.id) || 0;

        const stripe = stripeByBusiness.get(b.id);
        const stripeStatus = !stripe?.account_id
          ? "not_connected"
          : stripe.charges_enabled && stripe.payouts_enabled && (stripe.requirements_due || 0) === 0
            ? "ready"
            : "action_needed";

        const issues: Array<{ code: string; label: string }> = [];

        if (stripeStatus !== "ready") {
          issues.push({
            code: "stripe",
            label:
              stripeStatus === "not_connected"
                ? "Stripe not connected"
                : `Stripe setup incomplete${(stripe?.requirements_due || 0) > 0 ? ` (${stripe?.requirements_due} due)` : ""}`,
          });
        }

        if (activeServicesCount === 0) {
          issues.push({ code: "services", label: "No active business services" });
        }

        if (totalStaff === 0) {
          issues.push({ code: "staff", label: "No staff providers (owner/provider) found" });
        } else {
          if (staffMissingServices > 0) {
            issues.push({
              code: "staff_services",
              label: `${staffMissingServices} staff missing assigned services`,
            });
          }
          if (staffMissingLocation > 0) {
            issues.push({
              code: "staff_location",
              label: `${staffMissingLocation} staff missing location`,
            });
          }
        }

        return {
          id: b.id,
          business_name: b.business_name,
          business_type: formatToTitleCase(b.business_type),
          verification_status: formatToTitleCase(b.verification_status),
          is_active: b.is_active ?? true,
          contact_email: b.contact_email || null,
          phone: b.phone || null,
          created_at: b.created_at,
          active_services: activeServicesCount,
          total_staff: totalStaff,
          staff_missing_services: staffMissingServices,
          staff_missing_location: staffMissingLocation,
          stripe_status: stripeStatus,
          stripe_requirements_due: stripe?.requirements_due || 0,
          issues,
          issue_count: issues.length,
        };
      }) || [];

    const withIssues = reports
      .filter((r) => (r.issue_count || 0) > 0)
      .sort((a, c) => (c.issue_count || 0) - (a.issue_count || 0));

    return res.json({ success: true, data: withIssues });
  } catch (error) {
    console.error("Error fetching business bookability reports:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch business bookability reports",
    });
  }
}
