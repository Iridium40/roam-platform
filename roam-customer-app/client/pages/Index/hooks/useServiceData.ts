import { useQuery } from "@tanstack/react-query";
import type { FeaturedService, PopularService } from "@/types/index";
import { logger } from '@/utils/logger';

interface ServiceAPIResult {
  id: string;
  name: string;
  description: string | null;
  min_price: number | null;
  duration_minutes: number | null;
  image_url: string | null;
  is_featured: boolean;
  is_popular?: boolean;
  category: string;
}

// Fetch featured services via API
const fetchFeaturedServices = async (): Promise<FeaturedService[]> => {
  logger.debug("useServiceData: Fetching featured services via API...");
  
  const response = await fetch("/api/services/featured?type=featured");
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = json?.error || "Failed to fetch featured services";
    logger.error("useServiceData: Error fetching featured services:", error);
    throw new Error(error);
  }

  const data = json?.data || [];
  logger.debug("useServiceData: Featured services fetched:", data.length);

  return (data as ServiceAPIResult[]).map((service) => ({
    id: service.id,
    title: service.name,
    category: service.category || 'general',
    image: service.image_url || "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&h=300&fit=crop",
    description: service.description || "Professional featured service",
    price: `$${service.min_price || 50}`,
    rating: 4.8,
    duration: `${service.duration_minutes || 60} min`,
  }));
};

// Fetch popular services via API
const fetchPopularServices = async (): Promise<PopularService[]> => {
  logger.debug("useServiceData: Fetching popular services via API...");
  
  const response = await fetch("/api/services/featured?type=popular");
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = json?.error || "Failed to fetch popular services";
    logger.error("useServiceData: Error fetching popular services:", error);
    throw new Error(error);
  }

  const data = json?.data || [];
  logger.debug("useServiceData: Popular services fetched:", data.length);

  return (data as ServiceAPIResult[]).map((service) => ({
    id: service.id,
    title: service.name,
    category: service.category || 'general',
    image: service.image_url || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=300&fit=crop",
    description: service.description || "Popular professional service",
    price: `$${service.min_price || 50}`,
    rating: 4.9,
    duration: `${service.duration_minutes || 60} min`,
    bookings: `${Math.floor(Math.random() * 50) + 10} bookings this month`,
    availability: `${Math.floor(Math.random() * 8) + 1} slots available`,
  }));
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
