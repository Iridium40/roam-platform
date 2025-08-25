import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { FeaturedService, PopularService } from "@/types/index";
import { logger } from '@/utils/logger';

export const useServiceData = () => {
  const [featuredServices, setFeaturedServices] = useState<FeaturedService[]>([]);
  const [popularServices, setPopularServices] = useState<PopularService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServiceData = async (retryCount = 0) => {
      try {
        setLoading(true);

        // Fetch featured services
        const featuredServicesResponse = await supabase
          .from("services")
          .select(
            `
            id,
            name,
            description,
            category,
            min_price,
            max_price,
            duration,
            location_type,
            image_url,
            is_featured,
            business_profiles (
              id,
              business_name,
              logo_url
            )
          `,
          )
          .eq("is_featured", true)
          .limit(8);

        const { data: featuredData, error: featuredError } = featuredServicesResponse;

        if (!featuredError && featuredData) {
          const transformedFeaturedServices = featuredData.map((service: any) => ({
            id: service.id,
            name: service.name,
            category: service.category,
            description: service.description,
            price_min: service.min_price,
            price_max: service.max_price,
            duration: service.duration,
            location_type: service.location_type,
            image_url: service.image_url,
            provider_name: service.business_profiles?.business_name,
            provider_id: service.business_profiles?.id,
          }));
          setFeaturedServices(transformedFeaturedServices);
        }

        // Fetch popular services
        const popularServicesResponse = await supabase
          .from("services")
          .select(
            `
            id,
            name,
            description,
            category,
            min_price,
            max_price,
            duration,
            location_type,
            image_url,
            business_profiles (
              id,
              business_name,
              logo_url
            )
          `,
          )
          .order("created_at", { ascending: false })
          .limit(12);

        const { data: popularData, error: popularError } = popularServicesResponse;

        if (!popularError && popularData) {
          const transformedPopularServices = popularData.map((service: any) => ({
            id: service.id,
            name: service.name,
            category: service.category,
            description: service.description,
            price_min: service.min_price,
            price_max: service.max_price,
            duration: service.duration,
            location_type: service.location_type,
            image_url: service.image_url,
            provider_name: service.business_profiles?.business_name,
            provider_id: service.business_profiles?.id,
            popularity_score: Math.random() * 100, // Mock popularity score
          }));
          setPopularServices(transformedPopularServices);
        }

        // Handle authentication errors
        const authErrors = [featuredServicesResponse, popularServicesResponse]
          .filter((response) => response.status === 401);

        if (authErrors.length > 0 && retryCount === 0) {
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();

          if (!refreshError && refreshData?.session) {
            return await fetchServiceData(1);
          }
        }
      } catch (error: unknown) {
        logger.error("Error fetching service data:", error);

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
              return await fetchServiceData(1);
            }
          } catch (refreshError) {
            logger.error("Token refresh failed:", refreshError);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchServiceData();
  }, []);

  return {
    featuredServices,
    popularServices,
    loading,
  };
};
