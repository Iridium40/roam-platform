import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { BookingWithDetails } from "@/types/index";

export const useBookingsDataFixed = (currentUser: any) => {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bookings data on component mount
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      setBookings([]);
      return;
    }

    const fetchBookings = async (retryCount = 0) => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching bookings for user:", currentUser.id);
        
        // Use correct schema from DATABASE_SCHEMA_REFERENCE.md
        // First get basic bookings data
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select(`
            *
          `)
          .eq("customer_id", currentUser.id)
          .order("booking_date", { ascending: false });

        console.log("Basic bookings query result:", { bookingsData, bookingsError });

        if (bookingsError) {
          throw new Error(`Bookings query failed: ${bookingsError.message}`);
        }

        if (!bookingsData || bookingsData.length === 0) {
          console.log("No bookings found for user");
          setBookings([]);
          return;
        }

        // Get related data separately to avoid complex join failures
        const bookingIds = bookingsData.map((b: any) => b.id);
        const serviceIds = [...new Set(bookingsData.map((b: any) => b.service_id).filter(Boolean))];
        const providerIds = [...new Set(bookingsData.map((b: any) => b.provider_id).filter(Boolean))];

        // Fetch services data (using correct field name: 'name' not 'service_name')
        let servicesData = [];
        if (serviceIds.length > 0) {
          const { data: services, error: servicesError } = await supabase
            .from("services")
            .select(`
              id,
              name,
              description,
              min_price,
              duration_minutes,
              image_url
            `)
            .in("id", serviceIds);
          
          if (servicesError) {
            console.warn("Services query failed:", servicesError);
          } else {
            servicesData = services || [];
          }
        }

        // Fetch providers data
        let providersData = [];
        if (providerIds.length > 0) {
          const { data: providers, error: providersError } = await supabase
            .from("providers")
            .select(`
              id,
              first_name,
              last_name,
              email,
              phone,
              image_url,
              business_id,
              average_rating
            `)
            .in("id", providerIds);
          
          if (providersError) {
            console.warn("Providers query failed:", providersError);
          } else {
            providersData = providers || [];
          }
        }

        // Fetch customer profile
        let customerProfile = null;
        const { data: profile, error: profileError } = await supabase
          .from("customer_profiles")
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone
          `)
          .eq("user_id", currentUser.id)
          .single();
        
        if (profileError) {
          console.warn("Customer profile query failed:", profileError);
        } else {
          customerProfile = profile;
        }

        // Create lookup maps for efficient data merging
        const servicesMap = new Map(servicesData.map(s => [s.id, s]));
        const providersMap = new Map(providersData.map(p => [p.id, p]));

        // Transform the data to match the expected format with proper error handling
        const transformedBookings: BookingWithDetails[] = bookingsData.map((booking: any) => {
          const service = servicesMap.get(booking.service_id);
          const provider = providersMap.get(booking.provider_id);

          return {
            // Core booking data
            id: booking.id,
            customer_id: booking.customer_id,
            provider_id: booking.provider_id,
            service_id: booking.service_id,
            business_id: booking.business_id,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time,
            booking_status: booking.booking_status,
            total_amount: booking.total_amount || 0,
            created_at: booking.created_at,
            updated_at: booking.updated_at || booking.created_at,

            // Required fields for BookingWithDetails type
            service_fee: booking.service_fee || 0,
            service_fee_charged: booking.service_fee_charged || false,
            service_fee_charged_at: booking.service_fee_charged_at,
            remaining_balance: booking.remaining_balance || 0,
            remaining_balance_charged: booking.remaining_balance_charged || false,
            remaining_balance_charged_at: booking.remaining_balance_charged_at,
            payment_status: booking.payment_status || 'pending',
            customer_location_id: booking.customer_location_id,
            business_location_id: booking.business_location_id,
            delivery_type: booking.delivery_type || 'in_person',
            booking_reference: booking.booking_reference,
            admin_notes: booking.admin_notes,
            customer_notes: booking.customer_notes,
            provider_notes: booking.provider_notes,
            estimated_duration: booking.estimated_duration,
            actual_start_time: booking.actual_start_time,
            actual_end_time: booking.actual_end_time,
            cancellation_reason: booking.cancellation_reason,
            cancellation_policy: booking.cancellation_policy,
            cancellation_fee: booking.cancellation_fee || 0,
            refund_amount: booking.refund_amount || 0,
            refund_processed: booking.refund_processed || false,
            refund_processed_at: booking.refund_processed_at,
            no_show_fee: booking.no_show_fee || 0,
            no_show_fee_charged: booking.no_show_fee_charged || false,
            no_show_fee_charged_at: booking.no_show_fee_charged_at,
            reschedule_count: booking.reschedule_count || 0,
            original_booking_date: booking.original_booking_date,
            original_start_time: booking.original_start_time,
            reschedule_reason: booking.reschedule_reason,

            // Service information
            service_name: service?.name || "Unknown Service",
            service: service?.name || "Unknown Service",
            serviceId: booking.service_id,

            // Provider information
            provider_name: provider ? `${provider.first_name} ${provider.last_name}`.trim() : "Unknown Provider",
            provider: {
              id: provider?.id,
              name: provider ? `${provider.first_name} ${provider.last_name}`.trim() : "Unknown Provider",
              firstName: provider?.first_name,
              lastName: provider?.last_name,
              email: provider?.email,
              phone: provider?.phone,
              image: provider?.image_url,
              rating: provider?.average_rating || 0,
            },

            // Related data objects (for compatibility)
            providers: provider,
            customer_profiles: customerProfile,
            services: service,

            // Calculated fields
            date: booking.booking_date,
            time: booking.start_time,
            status: booking.booking_status,
            deliveryType: booking.delivery_type,
            location: "Service Location", // Simplified since location data requires separate query
            locationDetails: null,
            price: booking.total_amount ? `$${booking.total_amount.toFixed(2)}` : "Price TBD",
            duration: service?.duration_minutes ? `${service.duration_minutes} min` : "60 min",
            notes: booking.admin_notes,
            bookingReference: booking.booking_reference,

            // Compatibility fields
            booking_time: booking.start_time,
            customer_name: customerProfile ? `${customerProfile.first_name} ${customerProfile.last_name}`.trim() : "Customer",
            customer_email: customerProfile?.email || "",
            customer_phone: customerProfile?.phone || "",
          } as BookingWithDetails;
        });
        
        console.log("Successfully transformed bookings:", transformedBookings);
        setBookings(transformedBookings);

      } catch (err: any) {
        console.error("Error fetching bookings:", err);
        
        // Retry logic for network errors
        if (retryCount < 2 && (err.code === "NETWORK_ERROR" || err.message?.includes("fetch"))) {
          console.log(`Retrying fetch attempt ${retryCount + 1}/2`);
          setTimeout(() => fetchBookings(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }

        // Set user-friendly error message
        let errorMessage = "Failed to load bookings. Please try again.";
        if (err.message?.includes("JWT") || err.message?.includes("auth")) {
          errorMessage = "Authentication expired. Please sign in again.";
        } else if (err.message?.includes("network") || err.message?.includes("fetch")) {
          errorMessage = "Network error. Please check your connection.";
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [currentUser]);

  const refreshBookings = () => {
    if (currentUser) {
      setError(null);
      // Re-trigger the effect by calling fetchBookings function
      const fetchBookings = async () => {
        try {
          setLoading(true);
          setError(null);
          // Re-run the main fetch logic
          const { data: bookingsData, error: bookingsError } = await supabase
            .from("bookings")
            .select("*")
            .eq("customer_id", currentUser.id)
            .order("booking_date", { ascending: false });

          if (bookingsError) {
            throw new Error(`Bookings query failed: ${bookingsError.message}`);
          }

          setBookings(bookingsData || []);
        } catch (err: any) {
          setError("Failed to refresh bookings");
        } finally {
          setLoading(false);
        }
      };
      
      fetchBookings();
    }
  };

  return {
    bookings,
    setBookings,
    loading,
    error,
    refreshBookings,
    isConnected: true, // Simplified for now
  };
};