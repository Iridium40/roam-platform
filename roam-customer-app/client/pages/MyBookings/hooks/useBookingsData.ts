import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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

// Helper function to fetch bookings via API (uses service role key on server)
const fetchBookingsFromAPI = async (customerId: string, dateStart: string, dateEnd: string): Promise<any[]> => {
  // Get auth token with timeout
  const sessionPromise = supabase.auth.getSession();
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Session check timed out")), 5000)
  );
  
  const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
  
  if (!session?.access_token) {
    throw new Error("Not authenticated. Please sign in again.");
  }

  const params = new URLSearchParams({
    customer_id: customerId,
    date_start: dateStart,
    date_end: dateEnd,
  });

  // Add timeout to fetch
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`/api/bookings/list?${params}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(fetchTimeout);

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(json?.error || `Failed to load bookings (${response.status})`);
    }

    return json.data || [];
  } catch (err: any) {
    clearTimeout(fetchTimeout);
    if (err.name === 'AbortError') {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
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
      
      // Calculate date range for refresh
      const { start: dateStart, end: dateEnd } = getDateRange(PAGINATION_CONFIG.defaultDateRange);
      const dateStartStr = dateStart.toISOString().split('T')[0];
      const dateEndStr = dateEnd.toISOString().split('T')[0];
      
      const data = await fetchBookingsFromAPI(currentUser.id, dateStartStr, dateEndStr);
      const transformedBookings = (data || []).map(transformBooking);
      setBookings(transformedBookings);
    } catch (err: any) {
      setError(
        err.message || 
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

    let isMounted = true;

    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Calculate date range for initial load
        const { start: dateStart, end: dateEnd } = getDateRange(PAGINATION_CONFIG.defaultDateRange);
        const dateStartStr = dateStart.toISOString().split('T')[0];
        const dateEndStr = dateEnd.toISOString().split('T')[0];
        
        const data = await fetchBookingsFromAPI(currentUser.id, dateStartStr, dateEndStr);

        if (!isMounted) return;

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
        
        setError(
          err.message || 
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
