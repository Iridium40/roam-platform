import { useQuery } from "@tanstack/react-query";
import type { FeaturedBusiness } from "@/types/index";
import { logger } from '@/utils/logger';
import { formatSpecialty } from '@/utils/formatSpecialty';

interface BusinessQueryResult {
  id: string;
  business_name: string;
  business_type: string;
  logo_url: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  verification_status: string;
  is_featured: boolean;
  business_locations?: {
    city: string;
    state: string;
  } | null;
  business_services?: Array<{
    is_active: boolean;
    services?: {
      service_subcategories?: {
        service_subcategory_type: string;
      } | null;
    } | null;
  }>;
}

// Fetch featured businesses via server API
const fetchFeaturedBusinesses = async (): Promise<FeaturedBusiness[]> => {
  const response = await fetch("/api/businesses/featured");
  const json = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    const error = json?.error || "Failed to fetch featured businesses";
    logger.error("Error fetching featured businesses:", error);
    throw new Error(error);
  }

  const businessesData = json?.data || [];

  return (businessesData as BusinessQueryResult[]).map((business) => {
    // Extract unique subcategories from business_services (only active services)
    const subcategoriesSet = new Set<string>();
    if (business.business_services && Array.isArray(business.business_services)) {
      business.business_services
        .filter((bs) => bs.is_active === true)
        .forEach((bs) => {
          if (bs.services?.service_subcategories?.service_subcategory_type) {
            subcategoriesSet.add(bs.services.service_subcategories.service_subcategory_type);
          }
        });
    }
    const specialties = Array.from(subcategoriesSet).slice(0, 4);

    return {
      id: business.id,
      name: business.business_name,
      description: `Professional ${business.business_type.replace("_", " ")} services`,
      type: business.business_type,
      deliveryTypes: ["mobile", "business_location", "virtual"],
      price: "Starting at $100",
      image: business.logo_url || business.image_url || "/api/placeholder/80/80",
      cover_image_url: business.cover_image_url,
      specialties: specialties.length > 0 ? specialties : ["Professional Service"],
      location: business.business_locations?.city
        ? `${business.business_locations.city}, ${business.business_locations.state}`
        : "Florida",
      verification_status: business.verification_status,
      is_verified: business.verification_status === 'approved',
      is_featured: business.is_featured,
      years_in_business: 5,
    };
  });
};

export const useBusinessData = () => {
  const {
    data: featuredBusinesses = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['featuredBusinesses'],
    queryFn: fetchFeaturedBusinesses,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });

  return {
    featuredBusinesses,
    loading,
    error,
  };
};
