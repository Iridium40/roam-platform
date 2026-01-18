import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TransformedPromotion } from "@/types/index";
import { logger } from '@/utils/logger';

interface PromotionQueryResult {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  business_id: string | null;
  image_url: string | null;
  promo_code: string | null;
  savings_type: string | null;
  savings_amount: number | null;
  savings_max_amount: number | null;
  service_id: string | null;
  business_profiles?: {
    id: string;
    business_name: string;
    logo_url: string | null;
    business_type: string;
  } | null;
  services?: {
    id: string;
    name: string;
    min_price: number | null;
  } | null;
}

// Fetch active promotions
const fetchPromotions = async (): Promise<TransformedPromotion[]> => {
  logger.debug("usePromotions: Fetching promotions...");
  
  const { data, error } = await supabase
    .from("promotions")
    .select(`
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
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    logger.error("Error fetching promotions:", error);
    throw error;
  }

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  return (data as PromotionQueryResult[])
    .filter((promotion) => {
      // Filter out promotions with expired end dates
      if (promotion.end_date) {
        const endDate = new Date(promotion.end_date);
        endDate.setHours(23, 59, 59, 999);
        return endDate >= currentDate;
      }
      return true;
    })
    .map((promotion) => ({
      id: promotion.id,
      title: promotion.title,
      description: promotion.description || "Limited time offer",
      startDate: promotion.start_date,
      endDate: promotion.end_date,
      isActive: promotion.is_active,
      createdAt: promotion.created_at,
      businessId: promotion.business_id,
      imageUrl: promotion.image_url,
      promoCode: promotion.promo_code,
      savingsType: promotion.savings_type,
      savingsAmount: promotion.savings_amount,
      savingsMaxAmount: promotion.savings_max_amount,
      serviceId: promotion.service_id,
      business: promotion.business_profiles
        ? {
            id: promotion.business_profiles.id,
            name: promotion.business_profiles.business_name,
            logo: promotion.business_profiles.logo_url,
            type: promotion.business_profiles.business_type,
          }
        : null,
      service: promotion.services
        ? {
            id: promotion.services.id,
            name: promotion.services.name,
            minPrice: promotion.services.min_price,
          }
        : null,
    }));
};

export const usePromotions = () => {
  const {
    data: promotions = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['promotions'],
    queryFn: fetchPromotions,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });

  return {
    promotions,
    loading,
    error,
  };
};
