import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Promotion } from "@/types/index";
import { logger } from '@/utils/logger';

export const usePromotions = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromotions = async (retryCount = 0) => {
      try {
        setLoading(true);

        // Fetch active promotions with business and service information
        const promotionsResponse = await supabase
          .from("promotions")
          .select(
            `
            id,
            title,
            description,
            start_date,
            end_date,
            is_active,
            created_at,
            business_id,
            image_url,
            promo_code,
            savings_type,
            savings_amount,
            savings_max_amount,
            service_id,
            business_profiles (
              id,
              business_name,
              logo_url,
              business_type
            ),
            services (
              id,
              name,
              min_price
            )
          `,
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(6);

        const { data: promotionsData, error: promotionsError } = promotionsResponse;

        if (!promotionsError && promotionsData) {
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

          const transformedPromotions = promotionsData
            .filter((promotion: any) => {
              // Filter out promotions with expired end dates
              if (promotion.end_date) {
                const endDate = new Date(promotion.end_date);
                endDate.setHours(23, 59, 59, 999); // Set to end of day
                return endDate >= currentDate;
              }
              // Keep promotions without end dates (ongoing promotions)
              return true;
            })
            .map((promotion: any) => ({
              id: promotion.id,
              title: promotion.title,
              description: promotion.description || "Limited time offer",
              discount_type: promotion.savings_type,
              discount_value: promotion.savings_amount,
              valid_from: promotion.start_date,
              valid_until: promotion.end_date,
              image_url: promotion.image_url,
              provider_name: promotion.business_profiles?.business_name,
              provider_id: promotion.business_profiles?.id,
            }));
          setPromotions(transformedPromotions);
        }

        // Handle authentication errors
        if (promotionsResponse.status === 401 && retryCount === 0) {
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();

          if (!refreshError && refreshData?.session) {
            return await fetchPromotions(1);
          }
        }
      } catch (error: unknown) {
        logger.error("Error fetching promotions:", error);

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
              return await fetchPromotions(1);
            }
          } catch (refreshError) {
            logger.error("Token refresh failed:", refreshError);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  return {
    promotions,
    loading,
  };
};
