export interface BusinessService {
  id: string;
  business_id: string;
  service_id: string;
  business_price: number;
  is_active: boolean;
  delivery_type: 'customer_location' | 'business_location' | 'mobile' | null;
  created_at: string;
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

export interface EligibleService {
  id: string;
  name: string;
  description: string;
  min_price: number;
  duration_minutes: number;
  image_url?: string;
  is_active: boolean;
  subcategory_id: string;
  service_subcategories?: {
    service_subcategory_type: string;
    service_categories?: {
      service_category_type: string;
    };
  };
}

export interface ServiceStats {
  total_services: number;
  active_services: number;
  total_revenue: number;
  avg_price: number;
}

export interface ServiceFormData {
  service_id: string;
  business_price: string;
  delivery_type: 'customer_location' | 'business_location' | 'mobile';
  is_active: boolean;
}

export interface ServiceFilters {
  searchQuery: string;
  filterStatus: 'all' | 'active' | 'inactive';
  page: number;
  itemsPerPage: number;
}