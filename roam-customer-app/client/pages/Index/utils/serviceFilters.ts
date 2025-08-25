import type { FeaturedService } from "@/types/index";
import { categoryMapping } from "./categoryMapping";

// Filter services based on selected category, search query, and delivery type
export const getFilteredServices = (
  services: FeaturedService[],
  selectedCategory: string,
  searchQuery: string,
  selectedDelivery: string
) => {
  return services.filter((service: FeaturedService) => {
    // Category filter
    let categoryMatch = true;
    if (selectedCategory !== "all") {
      const categoryKeywords =
        categoryMapping[selectedCategory as keyof typeof categoryMapping] ||
        [];
      const serviceCategory = service.category?.toLowerCase() || "";
      const serviceTitle = service.name?.toLowerCase() || "";

      categoryMatch = categoryKeywords.some(
        (keyword) =>
          serviceCategory.includes(keyword.toLowerCase()) ||
          serviceTitle.includes(keyword.toLowerCase()),
      );
    }

    // Search query filter
    let searchMatch = true;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const serviceTitle = service.name?.toLowerCase() || "";
      const serviceCategory = service.category?.toLowerCase() || "";
      const serviceDescription = service.description?.toLowerCase() || "";

      searchMatch =
        serviceTitle.includes(query) ||
        serviceCategory.includes(query) ||
        serviceDescription.includes(query);
    }

    // Delivery type filter (services don't have delivery type data in current structure)
    // This would need to be added to service data structure to work properly
    let deliveryMatch = true;
    if (selectedDelivery !== "all") {
      // For now, we'll assume all services support all delivery types
      // In a real implementation, this would check service.deliveryTypes array
      deliveryMatch = true;
    }

    return categoryMatch && searchMatch && deliveryMatch;
  });
};

// Format service description for display
export const getDisplayDescription = (description: string, serviceId: string, expandedDescriptions: Set<string>) => {
  const isExpanded = expandedDescriptions.has(serviceId);
  if (description.length <= 200 || isExpanded) {
    return description;
  }
  return description.substring(0, 200) + "...";
};

// Format savings for promotions
export const formatSavings = (promotion: any) => {
  if (!promotion.savingsType || !promotion.savingsAmount) return null;

  if (promotion.savingsType === "percentage") {
    const maxAmount = promotion.savingsMaxAmount
      ? ` (max $${promotion.savingsMaxAmount})`
      : "";
    return `${promotion.savingsAmount}% off${maxAmount}`;
  } else if (promotion.savingsType === "fixed_amount") {
    return `$${promotion.savingsAmount} off`;
  } else if (promotion.savingsType === "free_service") {
    return "Free service";
  }

  return null;
};
