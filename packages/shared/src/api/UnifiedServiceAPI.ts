// Unified Service API for ROAM platform
// Provides consistent service data access across all applications

import {
  UnifiedServiceBase,
  ServiceQueryOptions,
  ServiceApiResponse,
  ServiceError,
  ProviderService,
  CustomerService,
  AdminService,
  EligibleService,
  ServiceCategory,
  ServiceSubcategory
} from '../types/services';

export interface UnifiedServiceAPIConfig {
  baseURL: string;
  apiKey: string;
  role?: 'admin' | 'provider' | 'customer';
  timeout?: number;
  retries?: number;
}

export class UnifiedServiceAPI {
  private baseURL: string;
  private headers: Record<string, string>;
  private timeout: number;
  private retries: number;

  constructor(config: UnifiedServiceAPIConfig) {
    this.baseURL = config.baseURL;
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
    
    this.headers = {
      'apikey': config.apiKey,
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add role-specific headers if needed
    if (config.role) {
      this.headers['X-Client-Role'] = config.role;
    }
  }

  // Safe JSON parsing utility with detailed error context
  private async safeJsonParse<T>(response: Response, context: string): Promise<T> {
    try {
      const text = await response.text();
      
      if (!text.trim()) {
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
      
      throw new Error(
        `Invalid JSON response from ${context}: ${
          parseError instanceof Error ? parseError.message : 'Unknown parsing error'
        }`
      );
    }
  }

  // Enhanced fetch with retry logic and timeout
  private async fetchWithRetry(url: string, options: RequestInit = {}, attempt = 1): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...this.headers, ...options.headers },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (attempt < this.retries && error instanceof Error && error.name !== 'AbortError') {
        console.warn(`Request failed, retrying (${attempt}/${this.retries}):`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      
      throw error;
    }
  }

  // Build query parameters from options
  private buildQueryParams(options: ServiceQueryOptions): URLSearchParams {
    const params = new URLSearchParams();
    
    // Filtering parameters
    if (options.businessId) params.set('business_id', options.businessId);
    if (options.categoryId) params.set('category_id', options.categoryId);
    if (options.subcategoryId) params.set('subcategory_id', options.subcategoryId);
    if (options.featured !== undefined) params.set('is_featured', options.featured.toString());
    if (options.popular !== undefined) params.set('is_popular', options.popular.toString());
    if (options.active !== undefined) params.set('is_active', options.active.toString());
    if (options.deliveryType) params.set('delivery_type', options.deliveryType);
    
    // Search
    if (options.searchQuery) params.set('search', options.searchQuery);
    
    // Pagination
    if (options.page) params.set('page', options.page.toString());
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    
    // Sorting
    if (options.sortBy) params.set('sort_by', options.sortBy);
    if (options.sortOrder) params.set('sort_order', options.sortOrder);
    
    // Build select clause based on includes
    const selectParts = ['*'];
    if (options.includeBusinessProfile) {
      selectParts.push('business_profiles(id,business_name,logo_url,image_url,verification_status,is_active,contact_email,phone,website_url)');
    }
    if (options.includeProviders) {
      selectParts.push('providers(id,first_name,last_name,image_url,bio,is_active,provider_role)');
    }
    if (options.includeCategories) {
      selectParts.push('service_subcategories(id,service_subcategory_type,name,service_categories(id,service_category_type,name))');
    }
    
    params.set('select', selectParts.join(','));
    
    return params;
  }

  // Core service fetching method with app-specific transforms
  async getServices<T = UnifiedServiceBase>(
    options: ServiceQueryOptions & {
      endpoint?: string;
      transform?: (data: any) => T;
    } = {}
  ): Promise<ServiceApiResponse<T>> {
    try {
      const endpoint = options.endpoint || 'services';
      const params = this.buildQueryParams(options);
      const url = `${this.baseURL}/${endpoint}?${params}`;

      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        const errorData = await this.safeJsonParse<ServiceError>(response, `${endpoint} fetch`);
        return {
          data: [],
          total: 0,
          success: false,
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const rawData = await this.safeJsonParse<any[]>(response, `${endpoint} data`);
      
      // Apply transformation if provided
      const transformedData = options.transform 
        ? rawData.map(options.transform) 
        : rawData as T[];

      // Extract total count from response headers if available
      const totalHeader = response.headers.get('X-Total-Count');
      const total = totalHeader ? parseInt(totalHeader, 10) : transformedData.length;

      return {
        data: transformedData,
        total,
        page: options.page,
        limit: options.limit,
        success: true,
      };
    } catch (error) {
      console.error(`Error fetching ${options.endpoint || 'services'}:`, error);
      return {
        data: [],
        total: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Provider App: Get business services
  async getBusinessServices(businessId: string, options: Partial<ServiceQueryOptions> = {}): Promise<ServiceApiResponse<ProviderService>> {
    return this.getServices<ProviderService>({
      ...options,
      businessId,
      endpoint: 'business-services',
      includeCategories: true,
      transform: (data: any) => ({
        ...data,
        business_price: data.business_price || data.min_price,
        is_available: data.is_active && data.is_available !== false,
        delivery_type: data.delivery_type || 'customer_location',
      }),
    });
  }

  // Provider App: Get eligible services for a business
  async getEligibleServices(businessId: string): Promise<ServiceApiResponse<EligibleService>> {
    return this.getServices<EligibleService>({
      businessId,
      endpoint: 'eligible-services',
      includeCategories: true,
      active: true,
      transform: (data: any) => ({
        ...data,
        is_already_offered: false,
        recommended_price: data.min_price,
      }),
    });
  }

  // Customer App: Get featured services
  async getFeaturedServices(limit = 8): Promise<ServiceApiResponse<CustomerService>> {
    return this.getServices<CustomerService>({
      featured: true,
      active: true,
      limit,
      includeBusinessProfile: true,
      sortBy: 'created_at',
      sortOrder: 'desc',
      transform: (data: any) => ({
        ...data,
        location_type: data.delivery_type || 'customer_location',
        delivery_types: [data.delivery_type || 'customer_location'],
        price_range: {
          min: data.min_price,
          max: data.max_price || data.min_price,
        },
        is_available: data.is_active,
        category: data.service_subcategories?.service_categories?.service_category_type || 'general',
        subcategory: data.service_subcategories?.service_subcategory_type || 'general',
      }),
    });
  }

  // Customer App: Get popular services
  async getPopularServices(limit = 12): Promise<ServiceApiResponse<CustomerService>> {
    return this.getServices<CustomerService>({
      popular: true,
      active: true,
      limit,
      includeBusinessProfile: true,
      sortBy: 'created_at',
      sortOrder: 'desc',
      transform: (data: any) => ({
        ...data,
        location_type: data.delivery_type || 'customer_location',
        delivery_types: [data.delivery_type || 'customer_location'],
        price_range: {
          min: data.min_price,
          max: data.max_price || data.min_price,
        },
        is_available: data.is_active,
        category: data.service_subcategories?.service_categories?.service_category_type || 'general',
        subcategory: data.service_subcategories?.service_subcategory_type || 'general',
        popularity_score: Math.random() * 100, // TODO: Implement real popularity scoring
      }),
    });
  }

  // Admin App: Get all services with comprehensive data
  async getAllServicesWithStats(options: Partial<ServiceQueryOptions> = {}): Promise<ServiceApiResponse<AdminService>> {
    return this.getServices<AdminService>({
      ...options,
      includeCategories: true,
      includeBusinessProfile: false,
      transform: (data: any) => ({
        ...data,
        business_assignments_count: 0, // TODO: Add aggregated data from API
        total_bookings: 0,
        total_revenue: 0,
        avg_rating: 0,
        monthly_bookings: 0,
        monthly_revenue: 0,
        conversion_rate: 0,
        customer_satisfaction: 0,
        requires_approval: false,
        is_system_service: false,
        compliance_status: 'compliant' as const,
        last_reviewed_at: null,
        reviewed_by: null,
      }),
    });
  }

  // Get service categories
  async getServiceCategories(options: Partial<ServiceQueryOptions> = {}): Promise<ServiceApiResponse<ServiceCategory>> {
    return this.getServices<ServiceCategory>({
      ...options,
      endpoint: 'service_categories',
      sortBy: 'sort_order',
      sortOrder: 'asc',
    });
  }

  // Get service subcategories
  async getServiceSubcategories(categoryId?: string): Promise<ServiceApiResponse<ServiceSubcategory>> {
    return this.getServices<ServiceSubcategory>({
      categoryId,
      endpoint: 'service_subcategories',
      includeCategories: true,
      sortBy: 'name',
      sortOrder: 'asc',
    });
  }

  // Create a new service (admin only)
  async createService(serviceData: any): Promise<ServiceApiResponse<UnifiedServiceBase>> {
    try {
      const response = await this.fetchWithRetry(`${this.baseURL}/services`, {
        method: 'POST',
        body: JSON.stringify(serviceData),
      });

      if (!response.ok) {
        const errorData = await this.safeJsonParse<ServiceError>(response, 'create service');
        return {
          data: [],
          total: 0,
          success: false,
          error: errorData.message || `Failed to create service`,
        };
      }

      const service = await this.safeJsonParse<UnifiedServiceBase>(response, 'created service');
      return {
        data: [service],
        total: 1,
        success: true,
        message: 'Service created successfully',
      };
    } catch (error) {
      console.error('Error creating service:', error);
      return {
        data: [],
        total: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create service',
      };
    }
  }

  // Update a service
  async updateService(serviceId: string, updates: Partial<UnifiedServiceBase>): Promise<ServiceApiResponse<UnifiedServiceBase>> {
    try {
      const response = await this.fetchWithRetry(`${this.baseURL}/services/${serviceId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await this.safeJsonParse<ServiceError>(response, 'update service');
        return {
          data: [],
          total: 0,
          success: false,
          error: errorData.message || `Failed to update service`,
        };
      }

      const service = await this.safeJsonParse<UnifiedServiceBase>(response, 'updated service');
      return {
        data: [service],
        total: 1,
        success: true,
        message: 'Service updated successfully',
      };
    } catch (error) {
      console.error('Error updating service:', error);
      return {
        data: [],
        total: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update service',
      };
    }
  }

  // Delete a service
  async deleteService(serviceId: string): Promise<ServiceApiResponse<never>> {
    try {
      const response = await this.fetchWithRetry(`${this.baseURL}/services/${serviceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await this.safeJsonParse<ServiceError>(response, 'delete service');
        return {
          data: [],
          total: 0,
          success: false,
          error: errorData.message || `Failed to delete service`,
        };
      }

      return {
        data: [],
        total: 0,
        success: true,
        message: 'Service deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting service:', error);
      return {
        data: [],
        total: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete service',
      };
    }
  }
}