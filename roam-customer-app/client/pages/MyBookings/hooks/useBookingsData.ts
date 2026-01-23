import { useState, useEffect, useCallback } from "react";
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
  reviews: booking.reviews || [],
  tips: booking.tips || [],
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

// Get auth headers - use cached token from localStorage, but validate it first
const getAuthHeaders = async (): Promise<HeadersInit> => {
  let token = localStorage.getItem('roam_access_token');
  
  // If no cached token, try to get from Supabase
  if (!token) {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || '';
    if (token) {
      localStorage.setItem('roam_access_token', token);
    }
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
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

  // Load bookings (same pattern as provider app)
  const loadBookings = useCallback(async () => {
    console.log("[useBookingsData] loadBookings called, currentUser:", currentUser?.id);
    if (!currentUser?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Calculate date range
      const { start, end } = getDateRange(PAGINATION_CONFIG.defaultDateRange);
      const startDateStr = start.toISOString().split('T')[0];
      const endDateStr = end.toISOString().split('T')[0];

      // Get auth headers (async - validates and refreshes token if needed)
      const headers = await getAuthHeaders();

      // Build query params
      const queryParams = new URLSearchParams({
        customer_id: currentUser.id,
        date_start: startDateStr,
        date_end: endDateStr,
      });

      console.log("[useBookingsData] Fetching bookings:", { 
        url: `/api/bookings/list?${queryParams}`,
        dateRange: { startDateStr, endDateStr }
      });

      // Fetch from API (same pattern as provider app)
      const response = await fetch(`/api/bookings/list?${queryParams}`, {
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load bookings: ${response.status}`);
      }

      const data = await response.json();
      const bookingsData = data.data || [];
      
      console.log("[useBookingsData] API response:", { 
        bookingsCount: bookingsData.length,
        rawData: bookingsData.slice(0, 2) // Log first 2 for debugging
      });
      
      // Transform bookings
      const transformedBookings = bookingsData.map(transformBooking);
      setBookings(transformedBookings);

    } catch (err: any) {
      console.error("Error loading bookings:", err);
      setError(err?.message || "Failed to load bookings. Please try again.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  // Load on mount and when user changes
  useEffect(() => {
    if (currentUser?.id) {
      loadBookings();
    } else {
      setLoading(false);
    }
  }, [currentUser?.id, loadBookings]);

  return {
    bookings,
    setBookings,
    loading,
    error,
    isConnected,
    refreshBookings: loadBookings,
  };
};
