import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { BookingWithDetails } from "@/types/index";
import useRealtimeBookings from "@/hooks/useRealtimeBookings";

export const useBookingsData = (currentUser: any) => {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time booking updates
  const { isConnected, refreshBookings } = useRealtimeBookings({
    userId: currentUser?.id,
    userType: "customer",
    onStatusChange: (bookingUpdate) => {
      // Update the specific booking in our local state
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingUpdate.id
            ? {
                ...booking,
                status: bookingUpdate.status,
                updated_at: bookingUpdate.updated_at,
              }
            : booking,
        ),
      );
    },
  });

  // Fetch bookings data on component mount
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchBookings = async (retryCount = 0) => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching bookings for customer:", currentUser.id);
        
        // First, try a simple query to just get bookings without joins
        console.log("Trying simple bookings query first...");
        const { data: simpleData, error: simpleError } = await supabase
          .from("bookings")
          .select("*")
          .eq("customer_id", currentUser.id)
          .order("booking_date", { ascending: false });

        console.log("Simple bookings query result:", { simpleData, simpleError });

        if (simpleError) {
          throw simpleError;
        }

        if (!simpleData || simpleData.length === 0) {
          console.log("No bookings found for customer:", currentUser.id);
          setBookings([]);
          return;
        }

        console.log("Found", simpleData.length, "bookings, now fetching related data...");

        // Use the working SQL query structure with Supabase client
        const { data, error } = await supabase
          .from("bookings")
          .select(`
            *,
            providers!left (
              id,
              first_name,
              last_name,
              email,
              phone,
              image_url,
              business_id,
              average_rating
            ),
            services!left (
              id,
              name,
              description,
              min_price,
              duration_minutes
            ),
            customer_profiles!left (
              id,
              first_name,
              last_name,
              email,
              phone
            )
          `)
          .eq("customer_id", currentUser.id)
          .order("booking_date", { ascending: false });

        console.log("Supabase response:", { data, error });

        if (error) {
          throw error;
        }

        // Transform the data to match the expected format
        const transformedBookings: BookingWithDetails[] = (data || []).map((booking) => ({
          ...booking,
          service_name: booking.services?.name || "Service",
          service: booking.services?.name || "Service",
          serviceId: booking.service_id,
          provider: {
            id: booking.providers?.id,
            name: `${booking.providers?.first_name || ""} ${booking.providers?.last_name || ""}`.trim(),
            firstName: booking.providers?.first_name,
            lastName: booking.providers?.last_name,
            email: booking.providers?.email,
            phone: booking.providers?.phone,
            image: booking.providers?.image_url,
            rating: booking.providers?.average_rating || 0,
          },
          providers: booking.providers,
          customer_profiles: booking.customer_profiles,
          date: booking.booking_date,
          time: booking.start_time,
          status: booking.booking_status,
          deliveryType: booking.delivery_type,
          location: "Location TBD", // Simplified since location data isn't in bookings table
          locationDetails: null,
          price: booking.total_amount ? `$${booking.total_amount}` : "Price TBD",
          duration: booking.services?.duration_minutes ? `${booking.services.duration_minutes} min` : "60 min",
          notes: booking.admin_notes,
          bookingReference: booking.booking_reference,
          reschedule_count: booking.reschedule_count || 0,
          original_booking_date: booking.original_booking_date,
          original_start_time: booking.original_start_time,
          reschedule_reason: booking.reschedule_reason,
        }));

        console.log("Transformed bookings:", transformedBookings);
        console.log("Number of bookings found:", transformedBookings.length);
        setBookings(transformedBookings);
      } catch (err: any) {
        console.error("Error fetching bookings:", err);
        
        // Retry logic for network errors
        if (retryCount < 3 && (err.code === "NETWORK_ERROR" || err.message?.includes("fetch"))) {
          console.log(`Retrying fetch (attempt ${retryCount + 1})...`);
          setTimeout(() => fetchBookings(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }

        setError(
          err.message || 
          err.details || 
          err.hint || 
          "Failed to load bookings. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
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
