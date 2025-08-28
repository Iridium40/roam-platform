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

        // Use the Edge Function to get bookings with all related data
        const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-customer-bookings`;
        const response = await fetch(`${edgeFunctionUrl}?customerId=${currentUser.id}&limit=50&page=0`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        console.log("Edge Function response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Edge Function error:", errorText);
          throw new Error(`Edge Function failed: ${response.status} ${errorText}`);
        }

        const { data, error } = await response.json();

        console.log("Edge Function response:", { data, error });

        if (error) {
          throw new Error(error);
        }

        // Transform the data to match the expected format
        // Edge Function returns flat structure with prefixed columns
        const transformedBookings: BookingWithDetails[] = (data || []).map((booking) => ({
          ...booking,
          service_name: booking.service_name || "Service",
          service: booking.service_name || "Service",
          serviceId: booking.service_id,
          provider: {
            id: booking.provider_id,
            name: `${booking.provider_first_name || ""} ${booking.provider_last_name || ""}`.trim(),
            firstName: booking.provider_first_name,
            lastName: booking.provider_last_name,
            email: booking.provider_email,
            phone: booking.provider_phone,
            image: booking.provider_image_url,
            rating: booking.provider_average_rating || 0,
          },
          providers: {
            id: booking.provider_id,
            first_name: booking.provider_first_name,
            last_name: booking.provider_last_name,
            email: booking.provider_email,
            phone: booking.provider_phone,
            image_url: booking.provider_image_url,
            business_id: booking.provider_business_id,
            average_rating: booking.provider_average_rating,
          },
          customer_profiles: {
            id: booking.customer_id,
            first_name: booking.customer_first_name,
            last_name: booking.customer_last_name,
            email: booking.customer_email,
            phone: booking.customer_phone,
          },
          date: booking.booking_date,
          time: booking.start_time,
          status: booking.booking_status,
          deliveryType: booking.delivery_type,
          location: "Location TBD", // Simplified since location data isn't in bookings table
          locationDetails: null,
          price: booking.total_amount ? `$${booking.total_amount}` : "Price TBD",
          duration: booking.service_duration ? `${booking.service_duration} min` : "60 min",
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
