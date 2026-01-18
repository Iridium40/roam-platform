import { logger } from '@/utils/logger';
import type { Business } from '../types';

/**
 * Get delivery types from a business, with fallback
 */
export const getDeliveryTypes = (business: Business): string[] => {
  if (business.delivery_types && Array.isArray(business.delivery_types) && business.delivery_types.length > 0) {
    return business.delivery_types;
  }

  logger.warn('No delivery_types set for business, using defaults:', business.business_name);
  return ['business_location'];
};

/**
 * Sort and filter businesses based on criteria
 */
export const sortAndFilterBusinesses = (
  businesses: Business[], 
  sortBy: string, 
  sortOrder: string
): Business[] => {
  try {
    logger.debug('Sorting businesses:', { count: businesses.length, sortBy, sortOrder });

    const sorted = [...businesses].sort((a, b) => {
      try {
        switch (sortBy) {
          case 'price':
            const priceA = a.service_price || 0;
            const priceB = b.service_price || 0;
            return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;

          case 'rating':
            return sortOrder === 'asc' ? a.rating - b.rating : b.rating - a.rating;

          case 'delivery_type':
            const deliveryPriority = { 
              customer_location: 1, 
              business_location: 2, 
              virtual: 3, 
              both_locations: 4 
            };
            const primaryDeliveryA = getDeliveryTypes(a)[0] || 'business_location';
            const primaryDeliveryB = getDeliveryTypes(b)[0] || 'business_location';
            const priorityA = deliveryPriority[primaryDeliveryA as keyof typeof deliveryPriority] || 999;
            const priorityB = deliveryPriority[primaryDeliveryB as keyof typeof deliveryPriority] || 999;
            return sortOrder === 'asc' ? priorityA - priorityB : priorityB - priorityA;

          default:
            return 0;
        }
      } catch (sortError) {
        logger.error('Error in individual sort comparison:', sortError);
        return 0;
      }
    });

    logger.debug('Sorting completed successfully');
    return sorted;
  } catch (error) {
    logger.error('Error in sortAndFilterBusinesses:', error);
    return businesses;
  }
};

/**
 * Format price for display
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price / 100);
};

/**
 * Format duration for display
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
};
