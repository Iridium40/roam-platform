// Admin app specific service interfaces
import {
  UnifiedServiceBase,
  ServiceSubcategory,
  ServiceStats
} from './base';

// Admin service interface with comprehensive data
export interface AdminService extends UnifiedServiceBase {
  subcategory_id: string;
  
  // Admin-specific metadata
  business_assignments_count: number;
  total_bookings: number;
  total_revenue: number;
  avg_rating: number;
  
  // Performance metrics
  monthly_bookings: number;
  monthly_revenue: number;
  conversion_rate: number;
  customer_satisfaction: number;
  
  // Category and classification
  service_subcategories?: ServiceSubcategory;
  
  // Admin flags
  requires_approval: boolean;
  is_system_service: boolean;
  compliance_status: 'compliant' | 'warning' | 'violation';
  last_reviewed_at: string | null;
  reviewed_by: string | null;
  
  // Business assignments
  business_assignments?: {
    business_id: string;
    business_name: string;
    is_active: boolean;
    business_price: number;
    assigned_at: string;
  }[];
}

// Service category management for admin
export interface AdminServiceCategory {
  id: string;
  service_category_type: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number | null;
  image_url: string | null;
  created_at: string;
  
  // Admin metadata
  subcategories_count: number;
  services_count: number;
  businesses_count: number;
  total_bookings: number;
  total_revenue: number;
  
  // Compliance
  requires_verification: boolean;
  compliance_rules: string | null;
  last_updated_by: string | null;
}

// Service subcategory management for admin
export interface AdminServiceSubcategory {
  id: string;
  category_id: string;
  service_subcategory_type: string;
  name: string;
  description: string | null;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  
  // Relations
  service_categories?: AdminServiceCategory;
  
  // Admin metrics
  services_count: number;
  businesses_count: number;
  total_bookings: number;
  avg_service_price: number;
  popularity_rank: number;
}

// Platform-wide service statistics for admin
export interface AdminServiceStats extends ServiceStats {
  // Category breakdown
  categories_breakdown: {
    category: string;
    count: number;
    revenue: number;
    percentage: number;
  }[];
  
  // Performance trends
  monthly_trends: {
    month: string;
    total_services: number;
    total_bookings: number;
    total_revenue: number;
    new_services: number;
  }[];
  
  // Top performing services
  top_services: {
    id: string;
    name: string;
    category: string;
    bookings: number;
    revenue: number;
    businesses_offering: number;
  }[];
  
  // Compliance overview
  compliance_stats: {
    compliant: number;
    warning: number;
    violation: number;
    pending_review: number;
  };
}

// Admin service filters
export interface AdminServiceFilters {
  searchQuery: string;
  status: 'all' | 'active' | 'inactive' | 'draft';
  category: string;
  subcategory: string;
  compliance_status: 'all' | 'compliant' | 'warning' | 'violation';
  business_assignments: 'all' | 'assigned' | 'unassigned';
  featured: 'all' | 'featured' | 'not_featured';
  date_range: {
    start?: string;
    end?: string;
  };
  revenue_range: {
    min?: number;
    max?: number;
  };
}

// Service approval workflow
export interface ServiceApproval {
  id: string;
  service_id: string;
  business_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'requires_changes';
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer_notes: string | null;
  changes_requested: string | null;
  compliance_checklist: {
    item: string;
    status: 'pass' | 'fail' | 'pending';
    notes?: string;
  }[];
}

// Admin actions on services
export interface AdminServiceAction {
  id: string;
  service_id: string;
  action_type: 'approve' | 'reject' | 'suspend' | 'feature' | 'unfeature' | 'edit';
  performed_by: string;
  performed_at: string;
  reason: string;
  notes?: string;
  previous_state: Record<string, any>;
  new_state: Record<string, any>;
}