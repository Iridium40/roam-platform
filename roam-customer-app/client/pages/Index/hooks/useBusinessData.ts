import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { FeaturedBusiness } from "@/types/index";
import { logger } from '@/utils/logger';

export const useBusinessData = () => {
  const [featuredBusinesses, setFeaturedBusinesses] = useState<FeaturedBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBusinessData = async (retryCount = 0) => {
      try {
        setLoading(true);

        // Fetch featured businesses
        const businessesResponse = await supabase
          .from("business_profiles")
          .select(
            `
            id,
            business_name,
            business_type,
            business_description,
            logo_url,
            image_url,
            cover_image_url,
            verification_status,
            is_featured,
            business_locations (
              location_name,
              city,
              state
            )
          `,
          )
          .eq("is_featured", true)
          .limit(12);

        const { data: businessesData, error: businessesError } = businessesResponse;

        // Check for authentication errors
        if (businessesResponse.status === 401 && retryCount === 0) {
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();

          if (!refreshError && refreshData?.session) {
            return await fetchBusinessData(1);
          }
        }

        if (!businessesError && businessesData) {
          const transformedBusinesses = businessesData.map((business: any) => ({
            id: business.id,
            name: business.business_name,
            description: `Professional ${business.business_type.replace("_", " ")} services`,
            type: business.business_type,
            rating: 4.8, // Default rating
            reviews_count: Math.floor(Math.random() * 200) + 50, // Random review count
            services_count: Math.floor(Math.random() * 20) + 5, // Random service count
            image_url: business.logo_url || business.image_url || "/api/placeholder/80/80",
            cover_image_url: business.cover_image_url,
            is_verified: business.verification_status === "verified",
            location: business.business_locations?.city
              ? `${business.business_locations.city}, ${business.business_locations.state}`
              : "Florida",
          }));
          setFeaturedBusinesses(transformedBusinesses);
        }
      } catch (error: unknown) {
        logger.error("Error fetching business data:", error);

        // Handle JWT expiration
        if (
          (error.message?.includes("JWT") ||
            error.message?.includes("401") ||
            error.status === 401) &&
          retryCount === 0
        ) {
          try {
            const { data: refreshData, error: refreshError } =
              await supabase.auth.refreshSession();

            if (!refreshError && refreshData?.session) {
              return await fetchBusinessData(1);
            }
          } catch (refreshError) {
            logger.error("Token refresh failed:", refreshError);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, []);

  return {
    featuredBusinesses,
    loading,
  };
};
