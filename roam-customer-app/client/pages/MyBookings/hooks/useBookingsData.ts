import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";
import type { BookingWithDetails } from "@/types/index";
import useRealtimeBookings from "@/hooks/useRealtimeBookings";
import { PAGINATION_CONFIG, getDateRange } from "../config/pagination.config";

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
      
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          providers!left (
            id,
            user_id,
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
            duration_minutes,
            image_url
          ),
          customer_profiles!left (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          business_locations!left (
            id,
            business_id,
            location_name,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
            country,
            is_primary,
            offers_mobile_services
          ),
          business_profiles!left (
            id,
            business_name,
            business_type,
            business_description,
            image_url,
            logo_url
          ),
          customer_locations!left (
            id,
            customer_id,
            location_name,
            street_address,
            unit_number,
            city,
            state,
            zip_code,
            is_primary,
            access_instructions
          ),
          reviews!left (
            id,
            overall_rating,
            service_rating,
            communication_rating,
            punctuality_rating,
            review_text,
            created_at
          ),
          tips!left (
            id,
            tip_amount,
            tip_percentage,
            customer_message,
            payment_status,
            created_at
          )
        `)
        .eq("customer_id", currentUser.id)
        .gte("booking_date", dateStartStr)
        .lte("booking_date", dateEndStr)
        .order("booking_date", { ascending: false })
        .limit(PAGINATION_CONFIG.databaseQueryLimit);

      if (error) {
        logger.error("Error refreshing bookings:", error);
        throw error;
      }

      // Transform the data to match the expected format
      const transformedBookings: BookingWithDetails[] = (data || []).map((booking) => ({
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
      }));
      
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
      logger.debug("No currentUser, skipping bookings fetch");
      setLoading(false);
      return;
    }

    const fetchBookings = async (retryCount = 0) => {
      try {
        setLoading(true);
        setError(null);

        logger.debug("Fetching bookings for user:", { customer_id: currentUser.id });
        
        // Calculate date range for initial load
        const { start: dateStart, end: dateEnd } = getDateRange(PAGINATION_CONFIG.defaultDateRange);
        const dateStartStr = dateStart.toISOString().split('T')[0];
        const dateEndStr = dateEnd.toISOString().split('T')[0];
        
        // First, try a simple query to just get bookings without joins
        // Apply date range filter and limit to prevent excessive data loading
        const { data: simpleData, error: simpleError } = await supabase
          .from("bookings")
          .select("*")
          .eq("customer_id", currentUser.id)
          .gte("booking_date", dateStartStr)
          .lte("booking_date", dateEndStr)
          .order("booking_date", { ascending: false })
          .limit(PAGINATION_CONFIG.databaseQueryLimit);

        logger.debug("Simple query result:", { count: simpleData?.length || 0 });

        if (simpleError) {
          logger.error("Error fetching bookings:", simpleError);
          throw simpleError;
        }

        if (!simpleData || simpleData.length === 0) {
          logger.debug("No bookings found for customer:", currentUser.id);
          setBookings([]);
          return;
        }

        // Use a simpler Supabase query approach that should work
        // Apply date range filter and limit for performance
        const { data, error } = await supabase
          .from("bookings")
          .select(`
            *,
            providers!left (
              id,
              user_id,
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
              duration_minutes,
              image_url
            ),
            customer_profiles!left (
              id,
              first_name,
              last_name,
              email,
              phone
            ),
            business_locations!left (
              id,
              business_id,
              location_name,
              address_line1,
              address_line2,
              city,
              state,
              postal_code,
              country,
              is_primary,
              offers_mobile_services
            ),
            business_profiles!left (
              id,
              business_name,
              business_type,
              business_description,
              image_url,
              logo_url
            ),
            customer_locations!left (
              id,
              customer_id,
              location_name,
              street_address,
              unit_number,
              city,
              state,
              zip_code,
              is_primary,
              access_instructions
            ),
            reviews!left (
              id,
              overall_rating,
              service_rating,
              communication_rating,
              punctuality_rating,
              review_text,
              created_at
            ),
            tips!left (
              id,
              tip_amount,
              tip_percentage,
              customer_message,
              payment_status,
              created_at
            )
          `)
          .eq("customer_id", currentUser.id)
          .gte("booking_date", dateStartStr)
          .lte("booking_date", dateEndStr)
          .order("booking_date", { ascending: false })
          .limit(PAGINATION_CONFIG.databaseQueryLimit);

        logger.debug("Full query with joins result:", { count: data?.length || 0 });

        if (error) {
          logger.error("Error in full query:", { message: error.message, code: error.code });
          throw error;
        }

        // Transform the data to match the expected format
        const transformedBookings: BookingWithDetails[] = (data || []).map((booking) => ({
          ...booking,
          // Ensure all required fields are present with fallbacks
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
          location: "Location TBD", // Simplified since location data isn't in bookings table
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
          // Add missing fields that might be expected
          booking_time: booking.start_time || '', // For backward compatibility
          updated_at: booking.created_at || new Date().toISOString(), // Use created_at as fallback since updated_at doesn't exist
        }));
        
        logger.debug("Successfully transformed bookings:", { count: transformedBookings.length });
        setBookings(transformedBookings);
      } catch (err: any) {
        logger.error("Error fetching bookings:", err);
        
        // Retry logic for network errors
        if (retryCount < 3 && (err.code === "NETWORK_ERROR" || err.message?.includes("fetch"))) {
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
