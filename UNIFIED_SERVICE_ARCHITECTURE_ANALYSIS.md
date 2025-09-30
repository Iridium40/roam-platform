# ROAM Platform - Unified Data Architecture Analysis

## Current State Analysis

### 🔍 **Data Patterns Identified Across Apps**

#### **1. Provider App (Services Management)**
```typescript
// Current structure in useServices hook
interface BusinessService {
  id: string;
  business_id: string;
  service_id: string;
  business_price: number;
  is_active: boolean;
  delivery_type: 'customer_location' | 'business_location' | 'mobile' | null;
  services?: {
    id: string;
    name: string;
    description: string;
    min_price: number;
    duration_minutes: number;
    image_url?: string;
    service_subcategories?: {
      service_subcategory_type: string;
      service_categories?: {
        service_category_type: string;
      };
    };
  };
}

// API Endpoints:
// - /api/business-services?business_id=${businessId}
// - /api/eligible-services?business_id=${businessId}
```

#### **2. Admin App (Service Management)**
```typescript
// Current structure in AdminServices
interface Service {
  id: string;
  subcategory_id: string;
  name: string;
  description: string | null;
  min_price: number;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  is_featured: boolean;
  is_popular: boolean;
  service_subcategories?: {
    service_subcategory_type: ServiceSubcategoryType;
    service_categories?: {
      service_category_type: ServiceCategoryType;
    };
  };
}

// Direct Supabase queries with complex joins
```

#### **3. Customer App (Service Discovery)**
```typescript
// Current structure in useServiceData
interface FeaturedService {
  id: string;
  name: string;
  category: string;
  description: string;
  price_min: number;
  price_max: number;
  duration: number;
  location_type: string;
  image_url: string;
  provider_name: string;
  provider_id: string;
}

// API calls:
// - /rest/v1/services?is_featured=eq.true&select=*,business_profiles(...)
// - Complex Supabase joins for business and provider data
```

### 🚨 **Problems Identified**

1. **Data Schema Inconsistencies**
   - Different field names across apps (min_price vs price_min)
   - Inconsistent join patterns and relationships
   - Varying levels of data nesting

2. **Duplicate API Logic**
   - Similar service fetching logic in all three apps
   - Repeated business profile joins
   - Multiple implementations of the same data transformations

3. **JSON Parsing Issues**
   - Unsafe JSON parsing causing Vercel deployment failures
   - Inconsistent error handling across endpoints
   - No standardized response format

4. **Maintenance Overhead**
   - Changes require updates in multiple places
   - Inconsistent type definitions
   - Complex debugging across apps

## 🎯 **Proposed Unified Architecture**

### **1. Shared Service Data Types** (`packages/shared/src/types/`)

```typescript
// Core service types that work across all apps
export interface UnifiedServiceBase {
  id: string;
  name: string;
  description: string | null;
  min_price: number;
  max_price?: number;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_popular: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  service_category_type: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number | null;
  image_url: string | null;
}

export interface ServiceSubcategory {
  id: string;
  category_id: string;
  service_subcategory_type: string;
  name: string;
  description: string | null;
  is_active: boolean;
  image_url: string | null;
  service_categories?: ServiceCategory;
}

export interface BusinessProfile {
  id: string;
  business_name: string;
  business_type: string;
  logo_url: string | null;
  image_url: string | null;
  verification_status: string;
  is_active: boolean;
}

// App-specific extensions
export interface ProviderService extends UnifiedServiceBase {
  business_id: string;
  service_id: string;
  business_price: number;
  delivery_type: 'customer_location' | 'business_location' | 'mobile' | null;
  custom_duration?: number;
  is_available: boolean;
}

export interface CustomerService extends UnifiedServiceBase {
  business_profiles: BusinessProfile;
  location_type: string;
  popularity_score?: number;
  available_providers?: Provider[];
}

export interface AdminService extends UnifiedServiceBase {
  subcategory_id: string;
  business_assignments_count?: number;
  total_bookings?: number;
  total_revenue?: number;
  service_subcategories?: ServiceSubcategory;
}
```

### **2. Unified Service API Layer** (`packages/shared/src/api/`)

```typescript
export class UnifiedServiceAPI {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor(config: { baseURL: string; apiKey: string; role?: 'admin' | 'provider' | 'customer' }) {
    this.baseURL = config.baseURL;
    this.headers = {
      'apikey': config.apiKey,
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  // Safe JSON parsing utility
  private async safeJsonParse<T>(response: Response, context: string): Promise<T> {
    try {
      const text = await response.text();
      if (!text.trim()) {
        throw new Error(`Empty response from ${context}`);
      }
      return JSON.parse(text);
    } catch (parseError) {
      console.error(`JSON parsing error in ${context}:`, parseError);
      throw new Error(
        `Invalid JSON response from ${context}: ${
          parseError instanceof Error ? parseError.message : 'Unknown error'
        }`
      );
    }
  }

  // Unified service fetching with app-specific transforms
  async getServices<T = UnifiedServiceBase>(options: {
    businessId?: string;
    featured?: boolean;
    popular?: boolean;
    category?: string;
    subcategory?: string;
    active?: boolean;
    includeBusinessProfile?: boolean;
    includeProviders?: boolean;
    transform?: (data: any) => T;
    limit?: number;
    offset?: number;
  }): Promise<{ data: T[]; total: number; error?: string }> {
    try {
      const params = new URLSearchParams();
      
      // Build query based on options
      if (options.businessId) params.set('business_id', options.businessId);
      if (options.featured !== undefined) params.set('is_featured', options.featured.toString());
      if (options.popular !== undefined) params.set('is_popular', options.popular.toString());
      if (options.category) params.set('category', options.category);
      if (options.active !== undefined) params.set('is_active', options.active.toString());
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.offset) params.set('offset', options.offset.toString());

      // Build select clause based on includes
      let selectClause = '*';
      if (options.includeBusinessProfile) {
        selectClause += ',business_profiles(id,business_name,logo_url,image_url,verification_status)';
      }
      if (options.includeProviders) {
        selectClause += ',providers(id,first_name,last_name,image_url)';
      }
      
      params.set('select', selectClause);

      const response = await fetch(`${this.baseURL}/services?${params}`, {
        headers: this.headers,
      });

      if (!response.ok) {
        const errorData = await this.safeJsonParse(response, 'services fetch');
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await this.safeJsonParse<T[]>(response, 'services data');
      
      // Apply transformation if provided
      const transformedData = options.transform ? data.map(options.transform) : data;

      return {
        data: transformedData,
        total: data.length, // TODO: Add count header support
      };
    } catch (error) {
      console.error('Error fetching services:', error);
      return {
        data: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Business-specific service management
  async getBusinessServices(businessId: string): Promise<ProviderService[]> {
    const result = await this.getServices({
      businessId,
      includeBusinessProfile: false,
      transform: (data: any) => ({
        ...data,
        business_price: data.business_price || data.min_price,
        delivery_type: data.delivery_type || 'customer_location',
        is_available: data.is_active,
      }),
    });
    return result.data as ProviderService[];
  }

  // Customer service discovery
  async getFeaturedServices(): Promise<CustomerService[]> {
    const result = await this.getServices({
      featured: true,
      active: true,
      includeBusinessProfile: true,
      limit: 8,
      transform: (data: any) => ({
        ...data,
        location_type: data.delivery_type || 'customer_location',
        popularity_score: Math.random() * 100, // TODO: Implement real scoring
      }),
    });
    return result.data as CustomerService[];
  }

  // Admin service management
  async getAllServicesWithStats(): Promise<AdminService[]> {
    const result = await this.getServices({
      includeBusinessProfile: false,
      transform: (data: any) => ({
        ...data,
        business_assignments_count: 0, // TODO: Add aggregated data
        total_bookings: 0,
        total_revenue: 0,
      }),
    });
    return result.data as AdminService[];
  }
}
```

### **3. App-Specific Service Hooks**

```typescript
// Provider App - useServices.ts
export function useServices() {
  const api = new UnifiedServiceAPI({
    baseURL: process.env.VITE_SUPABASE_URL + '/rest/v1',
    apiKey: process.env.VITE_SUPABASE_ANON_KEY,
    role: 'provider',
  });

  const [services, setServices] = useState<ProviderService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadServices = async (businessId: string) => {
    setLoading(true);
    const result = await api.getBusinessServices(businessId);
    if (result.error) {
      setError(result.error);
    } else {
      setServices(result.data);
    }
    setLoading(false);
  };

  return { services, loading, error, loadServices };
}

// Customer App - useServiceData.ts
export function useServiceData() {
  const api = new UnifiedServiceAPI({
    baseURL: process.env.VITE_SUPABASE_URL + '/rest/v1',
    apiKey: process.env.VITE_SUPABASE_ANON_KEY,
    role: 'customer',
  });

  const [featuredServices, setFeaturedServices] = useState<CustomerService[]>([]);

  const loadFeaturedServices = async () => {
    const services = await api.getFeaturedServices();
    setFeaturedServices(services);
  };

  return { featuredServices, loadFeaturedServices };
}

// Admin App - useAdminServices.ts
export function useAdminServices() {
  const api = new UnifiedServiceAPI({
    baseURL: process.env.VITE_SUPABASE_URL + '/rest/v1',
    apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    role: 'admin',
  });

  const [services, setServices] = useState<AdminService[]>([]);

  const loadAllServices = async () => {
    const services = await api.getAllServicesWithStats();
    setServices(services);
  };

  return { services, loadAllServices };
}
```

## 🚀 **Implementation Strategy**

### **Phase 1: Shared Foundation**
1. Create unified types in `packages/shared/src/types/services/`
2. Build `UnifiedServiceAPI` class with safe JSON parsing
3. Add comprehensive error handling and logging

### **Phase 2: Provider App Migration**
1. Replace existing `useServices` hook with unified API
2. Update components to use new data structure
3. Test thoroughly to ensure no functionality loss

### **Phase 3: Admin App Integration**
1. Refactor admin service management to use unified API
2. Update admin components with consistent data patterns
3. Implement unified filtering and search

### **Phase 4: Customer App Alignment**
1. Migrate customer service discovery to unified API
2. Ensure booking flow uses consistent data structure
3. Optimize performance with proper caching

### **Phase 5: Advanced Features**
1. Add real-time updates across all apps
2. Implement advanced caching strategies
3. Add comprehensive analytics and metrics

## 📈 **Expected Benefits**

### **Developer Experience**
- ✅ Single source of truth for service data
- ✅ Consistent API patterns across all apps
- ✅ Easier debugging and maintenance
- ✅ Reduced code duplication

### **Performance**
- ✅ Optimized data fetching patterns
- ✅ Consistent caching strategies
- ✅ Reduced bundle sizes through shared code

### **Reliability**
- ✅ Unified error handling and recovery
- ✅ Safe JSON parsing preventing deployment issues
- ✅ Consistent data validation

### **Scalability**
- ✅ Easy to add new apps or features
- ✅ Centralized business logic
- ✅ Standardized data transformations

## 🎯 **Next Steps**

1. **Immediate**: Create unified types and API foundation
2. **Short-term**: Migrate provider app to use unified architecture
3. **Medium-term**: Align admin and customer apps
4. **Long-term**: Add advanced features and optimizations

This unified architecture will eliminate the current inconsistencies and create a maintainable, scalable foundation for all service-related functionality across the ROAM platform.