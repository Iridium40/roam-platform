# Unified Service API Usage Guide

The ROAM platform now features a unified service architecture that provides consistent data access across all applications (Provider, Admin, Customer). This eliminates data inconsistencies and reduces code duplication.

## Quick Start

```typescript
import { UnifiedServiceAPI, UnifiedServiceAPIConfig } from '@roam/shared';

// Configure the API
const config: UnifiedServiceAPIConfig = {
  baseURL: process.env.SUPABASE_URL + '/rest/v1',
  apiKey: process.env.SUPABASE_ANON_KEY,
  role: 'provider', // or 'admin', 'customer'
  timeout: 30000,
  retries: 3
};

const serviceAPI = new UnifiedServiceAPI(config);
```

## Provider App Usage

### Get Business Services
```typescript
// Get all services for a business
const response = await serviceAPI.getBusinessServices('business-id-123', {
  active: true,
  sortBy: 'name',
  limit: 20
});

if (response.success) {
  console.log(`Found ${response.total} services:`, response.data);
} else {
  console.error('Error:', response.error);
}
```

### Get Eligible Services
```typescript
// Get services a business can add
const eligibleServices = await serviceAPI.getEligibleServices('business-id-123');
```

## Customer App Usage

### Get Featured Services
```typescript
// Get featured services for homepage
const featuredServices = await serviceAPI.getFeaturedServices(8);
```

### Get Popular Services
```typescript
// Get popular services with business profiles
const popularServices = await serviceAPI.getPopularServices(12);
```

## Admin App Usage

### Get All Services with Analytics
```typescript
// Get comprehensive service data for admin dashboard
const allServices = await serviceAPI.getAllServicesWithStats({
  page: 1,
  limit: 50,
  sortBy: 'created_at',
  sortOrder: 'desc'
});
```

### Create/Update/Delete Services
```typescript
// Create a new service
const newService = await serviceAPI.createService({
  name: 'House Cleaning',
  description: 'Professional house cleaning service',
  min_price: 50,
  max_price: 150,
  duration_minutes: 120,
  is_active: true
});

// Update a service
const updated = await serviceAPI.updateService('service-id-123', {
  min_price: 60,
  is_featured: true
});

// Delete a service
const deleted = await serviceAPI.deleteService('service-id-123');
```

## Common Patterns

### Safe Error Handling
```typescript
import { safeJsonParse, createErrorResponse } from '@roam/shared';

try {
  const response = await fetch('/api/services');
  const data = await safeJsonParse(response, 'service fetch');
  // Use data safely
} catch (error) {
  const errorResponse = createErrorResponse(error, 'fetching services');
  // Handle error response
}
```

### Data Validation
```typescript
import { validateServiceData } from '@roam/shared';

const serviceData = {
  name: 'New Service',
  description: 'Service description',
  min_price: 50
};

const validation = validateServiceData(serviceData);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

### Data Transformation
```typescript
import { transformToUnifiedService, formatPrice, formatDuration } from '@roam/shared';

// Transform raw Supabase data to unified format
const unifiedService = transformToUnifiedService(rawSupabaseData);

// Format for display
const price = formatPrice(unifiedService.min_price);
const duration = formatDuration(unifiedService.duration_minutes);
```

### Filtering and Sorting
```typescript
import { filterServicesBySearch, sortServices } from '@roam/shared';

// Filter services by search query
const filteredServices = filterServicesBySearch(services, 'cleaning');

// Sort services by various criteria
const sortedServices = sortServices(services, 'price', 'asc');
```

## Type Safety

All service data is strongly typed with TypeScript interfaces:

```typescript
import type {
  UnifiedServiceBase,
  ProviderService,
  CustomerService,
  AdminService,
  ServiceQueryOptions,
  ServiceApiResponse
} from '@roam/shared';

// Type-safe service handling
function handleProviderServices(services: ProviderService[]) {
  services.forEach(service => {
    console.log(service.business_price); // Type-safe access
    console.log(service.delivery_type);
    console.log(service.is_available);
  });
}
```

## Migration Strategy

### Phase 1: Provider App (Current)
- ✅ Refactored ServicesTab to use modular components
- ✅ Implemented safe JSON parsing for Vercel compatibility
- 🔄 **Next**: Migrate to unified service API

### Phase 2: Admin App
- Analyze existing service management patterns
- Migrate to unified data structures
- Implement comprehensive analytics

### Phase 3: Customer App
- Migrate service discovery components
- Implement unified search and filtering
- Optimize for customer-facing features

## Benefits

1. **Consistency**: Unified data structures across all apps
2. **Safety**: Built-in JSON parsing error handling
3. **Performance**: Optimized query patterns and caching
4. **Maintainability**: Single source of truth for service logic
5. **Type Safety**: Full TypeScript support with comprehensive interfaces
6. **Error Handling**: Robust error handling with detailed context
7. **Flexibility**: App-specific transformations while maintaining core consistency

## Environment Configuration

Make sure to set the following environment variables:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key

# Optional: Role-specific configurations
VITE_CLIENT_ROLE=provider # or admin, customer
```

## Error Handling Best Practices

1. Always check `response.success` before using data
2. Use safe JSON parsing for external API calls
3. Provide meaningful error contexts
4. Implement retry logic for network failures
5. Log errors with proper context for debugging

This unified architecture provides a solid foundation for scaling the ROAM platform while maintaining consistency and reliability across all applications.