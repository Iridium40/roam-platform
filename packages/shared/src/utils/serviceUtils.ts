// Service utilities for safe operations and transformations
// Common helper functions used across all ROAM applications

import { UnifiedServiceBase } from '../types/services';

/**
 * Safe JSON parsing with detailed error context
 * Prevents Vercel deployment failures from malformed JSON responses
 */
export async function safeJsonParse<T>(
  response: Response, 
  context: string,
  fallback?: T
): Promise<T> {
  try {
    const text = await response.text();
    
    if (!text.trim()) {
      if (fallback !== undefined) return fallback;
      throw new Error(`Empty response from ${context}`);
    }
    
    return JSON.parse(text);
  } catch (parseError) {
    console.error(`JSON parsing error in ${context}:`, {
      error: parseError,
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });
    
    if (fallback !== undefined) return fallback;
    
    throw new Error(
      `Invalid JSON response from ${context}: ${
        parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }`
    );
  }
}

/**
 * Safe JSON parsing for strings with fallback
 */
export function safeJsonParseString<T>(
  jsonString: string, 
  context: string, 
  fallback?: T
): T {
  try {
    if (!jsonString?.trim()) {
      if (fallback !== undefined) return fallback;
      throw new Error(`Empty JSON string in ${context}`);
    }
    
    return JSON.parse(jsonString);
  } catch (parseError) {
    console.error(`JSON string parsing error in ${context}:`, {
      error: parseError,
      jsonString: jsonString?.substring(0, 100) + '...'
    });
    
    if (fallback !== undefined) return fallback;
    
    throw new Error(
      `Invalid JSON string in ${context}: ${
        parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }`
    );
  }
}

/**
 * Transform raw Supabase service data to unified format
 * Handles data inconsistencies across different app schemas
 */
export function transformToUnifiedService(
  rawData: any
): UnifiedServiceBase {
  return {
    id: rawData.id,
    name: rawData.service_name || rawData.name,
    description: rawData.service_description || rawData.description,
    min_price: rawData.min_price || rawData.business_price || rawData.price || 0,
    max_price: rawData.max_price || rawData.min_price || rawData.business_price || rawData.price,
    duration_minutes: rawData.duration_minutes || rawData.duration || 60,
    is_active: rawData.is_active ?? true,
    is_featured: rawData.is_featured ?? false,
    is_popular: rawData.is_popular ?? false,
    image_url: rawData.service_image_url || rawData.image_url || null,
    created_at: rawData.created_at,
    updated_at: rawData.updated_at,
  };
}

/**
 * Validate service data before API operations
 */
export function validateServiceData(
  data: Partial<UnifiedServiceBase>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push('Service name is required');
  }

  if (!data.description?.trim()) {
    errors.push('Service description is required');
  }

  if (data.min_price !== undefined && data.min_price < 0) {
    errors.push('Minimum price must be non-negative');
  }

  if (data.max_price !== undefined && data.min_price !== undefined && data.max_price !== null && data.max_price < data.min_price) {
    errors.push('Maximum price must be greater than or equal to minimum price');
  }

  if (data.duration_minutes !== undefined && data.duration_minutes <= 0) {
    errors.push('Duration must be positive');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format price for display with proper currency formatting
 */
export function formatPrice(price: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  } catch (error) {
    console.error('Error formatting price:', error);
    return `$${price.toFixed(2)}`;
  }
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  
  return `${hours} hr${hours > 1 ? 's' : ''} ${remainingMinutes} min`;
}

/**
 * Calculate price range display
 */
export function formatPriceRange(minPrice: number, maxPrice?: number): string {
  if (!maxPrice || maxPrice === minPrice) {
    return formatPrice(minPrice);
  }
  
  return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
}

/**
 * Generate service availability status
 */
export function getServiceAvailabilityStatus(service: UnifiedServiceBase): {
  status: 'available' | 'unavailable' | 'limited';
  message: string;
} {
  if (!service.is_active) {
    return {
      status: 'unavailable',
      message: 'Service is currently inactive'
    };
  }

  // Add more complex availability logic here based on business rules
  return {
    status: 'available',
    message: 'Available for booking'
  };
}

/**
 * Filter services by search query
 */
export function filterServicesBySearch(
  services: UnifiedServiceBase[],
  searchQuery: string
): UnifiedServiceBase[] {
  if (!searchQuery?.trim()) return services;

  const query = searchQuery.toLowerCase().trim();
  
  return services.filter(service => 
    service.name.toLowerCase().includes(query) ||
    (service.description && service.description.toLowerCase().includes(query))
  );
}

/**
 * Sort services by specified criteria
 */
export function sortServices(
  services: UnifiedServiceBase[],
  sortBy: 'name' | 'price' | 'duration' | 'created_at' | 'popularity' = 'name',
  sortOrder: 'asc' | 'desc' = 'asc'
): UnifiedServiceBase[] {
  return [...services].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'price':
        comparison = a.min_price - b.min_price;
        break;
      case 'duration':
        comparison = a.duration_minutes - b.duration_minutes;
        break;
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'popularity':
        // Prioritize featured and popular services
        const aScore = (a.is_featured ? 2 : 0) + (a.is_popular ? 1 : 0);
        const bScore = (b.is_featured ? 2 : 0) + (b.is_popular ? 1 : 0);
        comparison = bScore - aScore; // Higher scores first
        break;
      default:
        comparison = 0;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });
}

/**
 * Group services by category
 */
export function groupServicesByCategory(
  services: (UnifiedServiceBase & { 
    category?: string;
    subcategory?: string;
  })[]
): Record<string, UnifiedServiceBase[]> {
  return services.reduce((groups, service) => {
    const category = service.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(service);
    return groups;
  }, {} as Record<string, UnifiedServiceBase[]>);
}

/**
 * Create error response with consistent structure
 */
export function createErrorResponse<T>(
  error: string | Error,
  context?: string
): {
  data: T[];
  total: 0;
  success: false;
  error: string;
} {
  const errorMessage = error instanceof Error ? error.message : error;
  const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
  
  console.error('Service API Error:', {
    context,
    error: errorMessage,
    timestamp: new Date().toISOString()
  });

  return {
    data: [],
    total: 0,
    success: false,
    error: fullMessage,
  };
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}