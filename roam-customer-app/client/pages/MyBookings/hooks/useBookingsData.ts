import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";
import type { BookingWithDetails } from "@/types/index";
import useRealtimeBookings from "@/hooks/useRealtimeBookings";
import { PAGINATION_CONFIG, getDateRange } from "../config/pagination.config";

// Helper function to transform booking data
const transformBooking = (booking: any): BookingWithDetails => ({
  ...booking,
  id: booking.id || '',
  booking_status: booking.booking_status || 'pending',
  booking_date: booking.booking_date || '',
  start_time: booking.start_time || '',
  total_amount: booking.total_amount || 0,
  service_name: booking.services?.name || "Service",
  service: booking.services?.name || "Service",
  service_image: booking.services?.image_url,
  serviceId: booking.service_id,
  provider: {
    id: booking.providers?.id || '',
    name: `${booking.providers?.first_name || ""} ${booking.providers?.last_name || ""}`.trim() || 'Provider TBD',
    firstName: booking.providers?.first_name || '',
    lastName: booking.providers?.last_name || '',
    email: booking.providers?.email || '',
    phone: booking.providers?.phone || '',
    image: booking.providers?.image_url,
    rating: booking.providers?.average_rating || 0,
  },
  providers: booking.providers,
  customer_profiles: booking.customer_profiles,
  date: booking.booking_date || '',
  time: booking.start_time || '',
  status: booking.booking_status || 'pending',
  deliveryType: booking.delivery_type || 'customer_location',
  location: "Location TBD",
  locationDetails: null,
  price: booking.total_amount ? `$${booking.total_amount}` : "Price TBD",
  duration: booking.services?.duration_minutes 
    ? `${booking.services.duration_minutes} min` 
    : "60 min",
  notes: booking.admin_notes || '',
  bookingReference: booking.booking_reference || '',
  reschedule_count: booking.reschedule_count || 0,
  original_booking_date: booking.original_booking_date,
  original_start_time: booking.original_start_time,
  reschedule_reason: booking.reschedule_reason,
  booking_time: booking.start_time || '',
  updated_at: booking.created_at || new Date().toISOString(),
});

// Helper function to fetch bookings via direct Supabase query
// Uses a simplified query to avoid RLS timeout issues
const fetchBookingsDirectly = async (customerId: string, dateStart: string, dateEnd: string): Promise<any[]> => {
  // First, fetch just the bookings with minimal joins
  const { data: bookingsData, error: bookingsError } = await supabase
    .from("bookings")
    .select(`
      *,
      providers (
        id,
        first_name,
        last_name,
        image_url,
        average_rating
      ),
      services (
        id,
        name,
        duration_minutes,
        image_url
      )
    `)
    .eq("customer_id", customerId)
    .gte("booking_date", dateStart)
    .lte("booking_date", dateEnd)
    .order("booking_date", { ascending: false })
    .limit(100);

  if (bookingsError) {
    throw bookingsError;
  }

  return bookingsData || [];
};

// Helper function to fetch bookings via API with fallback to direct query
const fetchBookingsFromAPI = async (customerId: string, dateStart: string, dateEnd: string): Promise<any[]> => {
  // Get auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  try {
    // Try API first
    const params = new URLSearchParams({
      customer_id: customerId,
      date_start: dateStart,
      date_end: dateEnd,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`/api/bookings/list?${params}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(json?.error || 'API returned error');
    }

    return json.data || [];
  } catch (apiError: any) {
    // If API fails (not deployed, timeout, etc.), fall back to direct query
    logger.warn("API fetch failed, falling back to direct query:", apiError.message);
    return fetchBookingsDirectly(customerId, dateStart, dateEnd);
  }
};

export const useBookingsData = (currentUser: any) => {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time booking updates
  const { isConnected } = useRealtimeBookings({
    userId: currentUser?.id,
    userType: "customer",
    onStatusChange: (bookingUpdate) => {
      // Update the specific booking in our local state
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingUpdate.id
            ? {
                ...booking,
                booking_status: bookingUpdate.status,
                updated_at: bookingUpdate.updated_at,
              }
            : booking,
        ),
      );
    },
  });

  // Manual refresh function that re-fetches all bookings
  const refreshBookings = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);

      logger.debug("Refreshing bookings for user:", currentUser.id);
      
      // Calculate date range for refresh
      const { start: dateStart, end: dateEnd } = getDateRange(PAGINATION_CONFIG.defaultDateRange);
      const dateStartStr = dateStart.toISOString().split('T')[0];
      const dateEndStr = dateEnd.toISOString().split('T')[0];
      
      const data = await fetchBookingsFromAPI(currentUser.id, dateStartStr, dateEndStr);
      
      const transformedBookings = (data || []).map(transformBooking);
      
      logger.debug("Successfully refreshed bookings:", { count: transformedBookings.length });
      
      setBookings(transformedBookings);
    } catch (err: any) {
      logger.error("Error refreshing bookings:", err);
      setError(
        err.message || 
        err.details || 
        err.hint || 
        "Failed to refresh bookings. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch bookings data on component mount
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);

        // Set a global timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (isMounted) {
            setLoading(false);
            setError("Loading took too long. Please refresh the page.");
          }
        }, 20000); // 20 second global timeout
        
        // Calculate date range for initial load
        const { start: dateStart, end: dateEnd } = getDateRange(PAGINATION_CONFIG.defaultDateRange);
        const dateStartStr = dateStart.toISOString().split('T')[0];
        const dateEndStr = dateEnd.toISOString().split('T')[0];
        
        const data = await fetchBookingsFromAPI(currentUser.id, dateStartStr, dateEndStr);

        if (!isMounted) return;
        clearTimeout(timeoutId);

        // Handle empty bookings
        if (!data || data.length === 0) {
          setBookings([]);
          return;
        }

        // Transform the data to match the expected format
        const transformedBookings = (data || []).map(transformBooking);
        setBookings(transformedBookings);
      } catch (err: any) {
        if (!isMounted) return;
        clearTimeout(timeoutId);
        
        setError(
          err.message || 
          err.details || 
          err.hint || 
          "Failed to load bookings. Please try again."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBookings();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentUser]);

  return {
    bookings,
    setBookings,
    loading,
    error,
    isConnected,
    refreshBookings,
  };
};
