import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { FeaturedService, PopularService } from "@/types/index";
import { logger } from '@/utils/logger';

interface ServiceQueryResult {
  id: string;
  name: string;
  description: string | null;
  min_price: number | null;
  max_price: number | null;
  duration: string | null;
  duration_minutes: number | null;
  location_type: string | null;
  image_url: string | null;
  is_featured: boolean;
  subcategory_id: string | null;
  business_profiles?: {
    id: string;
    business_name: string;
    logo_url: string | null;
  } | null;
  service_subcategories?: {
    id: string;
    service_subcategory_type: string;
    service_categories?: {
      id: string;
      service_category_type: string;
    } | null;
  } | null;
}

// Fetch featured services
const fetchFeaturedServices = async (): Promise<FeaturedService[]> => {
  const { data, error } = await supabase
    .from("services")
    .select(`
      id,
      name,
      description,
      min_price,
      duration_minutes,
      image_url,
      is_active,
      is_featured,
      subcategory_id,
      service_subcategories!subcategory_id (
        id,
        service_subcategory_type,
        service_categories (
          id,
          service_category_type
        )
      )
    `)
    .eq("is_active", true)
    .eq("is_featured", true);

  if (error) {
    logger.error("Error fetching featured services:", error);
    throw error;
  }

  return (data as ServiceQueryResult[]).map((service) => {
    const category = service.service_subcategories?.service_categories?.service_category_type || 'general';
    return {
      id: service.id,
      title: service.name,
      category: category,
      image: service.image_url || "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&h=300&fit=crop",
      description: service.description || "Professional featured service",
      price: `$${service.min_price || 50}`,
      rating: 4.8,
      duration: `${service.duration_minutes || 60} min`,
    };
  });
};

// Fetch popular services
const fetchPopularServices = async (): Promise<PopularService[]> => {
  const { data, error } = await supabase
    .from("services")
    .select(`
      id,
      name,
      description,
      min_price,
      duration_minutes,
      image_url,
      is_active,
      is_popular,
      subcategory_id,
      service_subcategories!subcategory_id (
        id,
        service_subcategory_type,
        service_categories (
          id,
          service_category_type
        )
      )
    `)
    .eq("is_active", true)
    .eq("is_popular", true)
    .limit(6);

  if (error) {
    logger.error("Error fetching popular services:", error);
    throw error;
  }

  return (data as ServiceQueryResult[]).map((service) => {
    const category = service.service_subcategories?.service_categories?.service_category_type || 'general';
    return {
      id: service.id,
      title: service.name,
      category: category,
      image: service.image_url || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=300&fit=crop",
      description: service.description || "Popular professional service",
      price: `$${service.min_price || 50}`,
      rating: 4.9,
      duration: `${service.duration_minutes || 60} min`,
      bookings: `${Math.floor(Math.random() * 50) + 10} bookings this month`,
      availability: `${Math.floor(Math.random() * 8) + 1} slots available`,
    };
  });
};

export const useServiceData = () => {
  const {
    data: featuredServices = [],
    isLoading: featuredLoading,
    error: featuredError,
  } = useQuery({
    queryKey: ['featuredServices'],
    queryFn: fetchFeaturedServices,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });

  const {
    data: popularServices = [],
    isLoading: popularLoading,
    error: popularError,
  } = useQuery({
    queryKey: ['popularServices'],
    queryFn: fetchPopularServices,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  return {
    featuredServices,
    popularServices,
    loading: featuredLoading || popularLoading,
    error: featuredError || popularError,
  };
};
