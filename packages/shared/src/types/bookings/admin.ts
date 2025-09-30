// Admin app specific booking interfaces
// Comprehensive booking management and analytics for platform administrators

import {
  UnifiedBookingBase,
  BookingCustomerProfile,
  BookingProviderProfile,
  BookingBusinessProfile,
  BookingServiceProfile,
  BookingLocation,
  BookingStats,
  BookingChange
} from './base';

// Admin comprehensive booking view
export interface AdminBooking extends UnifiedBookingBase {
  // Full context for admin oversight
  customer_profiles?: BookingCustomerProfile;
  providers?: BookingProviderProfile & {
    business_profiles?: BookingBusinessProfile;
  };
  services?: BookingServiceProfile;
  business_profiles?: BookingBusinessProfile;
  customer_locations?: BookingLocation;
  business_locations?: BookingLocation;
  
  // Admin-specific computed fields
  customer_display_name: string;
  provider_display_name: string;
  business_display_name: string;
  service_display_name: string;
  platform_revenue: number;
  provider_payout: number;
  business_commission: number;
  
  // Financial breakdown
  fee_breakdown: {
    service_amount: number;
    platform_fee: number;
    payment_processing_fee: number;
    business_commission: number;
    provider_payout: number;
    tip_amount: number;
    total_platform_revenue: number;
  };
  
  // Risk and compliance
  risk_score: number;
  compliance_flags: string[];
  requires_review: boolean;
  flagged_at?: string;
  flagged_by?: string;
  flag_reason?: string;
  
  // Admin actions available
  admin_actions: ('approve' | 'flag' | 'refund' | 'reassign' | 'cancel' | 'investigate' | 'contact_customer' | 'contact_provider')[];
  
  // Platform metrics
  customer_booking_count: number;
  provider_booking_count: number;
  business_booking_count: number;
  repeat_booking: boolean;
  customer_lifetime_value: number;
  acquisition_channel: string;
}

// Admin booking with full audit trail
export interface AdminBookingWithAudit extends AdminBooking {
  audit_trail: BookingChange[];
  payment_history: {
    id: string;
    amount: number;
    type: 'charge' | 'refund' | 'partial_refund' | 'tip' | 'fee';
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    processed_at: string;
    processor: 'stripe' | 'manual' | 'system';
    reference_id: string;
    notes?: string;
  }[];
  dispute_history?: {
    id: string;
    type: 'chargeback' | 'complaint' | 'quality_issue' | 'no_show';
    status: 'open' | 'investigating' | 'resolved' | 'escalated';
    filed_by: 'customer' | 'provider' | 'business' | 'platform';
    filed_at: string;
    resolved_at?: string;
    resolution?: string;
    amount_disputed: number;
  }[];
}

// Admin booking analytics
export interface AdminBookingAnalytics extends BookingStats {
  // Platform-wide metrics
  platform_total_bookings: number;
  platform_total_revenue: number;
  platform_commission_earned: number;
  
  // Growth metrics
  booking_growth_rate: number;
  revenue_growth_rate: number;
  customer_growth_rate: number;
  provider_growth_rate: number;
  business_growth_rate: number;
  
  // Operational metrics
  average_booking_processing_time: number;
  dispute_rate: number;
  refund_rate: number;
  chargeback_rate: number;
  customer_support_ticket_rate: number;
  
  // Quality metrics
  overall_customer_satisfaction: number;
  overall_provider_satisfaction: number;
  overall_business_satisfaction: number;
  platform_nps_score: number;
  
  // Geographic distribution
  top_cities: {
    city: string;
    state: string;
    booking_count: number;
    revenue: number;
  }[];
  
  // Service category performance
  top_service_categories: {
    category: string;
    booking_count: number;
    revenue: number;
    growth_rate: number;
  }[];
  
  // Time-based patterns
  peak_booking_hours: number[];
  peak_booking_days: string[];
  seasonal_trends: {
    month: string;
    booking_count: number;
    revenue: number;
    growth_percentage: number;
  }[];
}

// Admin booking management filters
export interface AdminBookingFilters {
  // Status filters
  booking_statuses: string[];
  payment_statuses: string[];
  
  // Entity filters
  customer_ids: string[];
  provider_ids: string[];
  business_ids: string[];
  service_ids: string[];
  
  // Financial filters
  revenue_range: {
    min: number;
    max: number;
  } | null;
  commission_range: {
    min: number;
    max: number;
  } | null;
  
  // Risk and compliance
  risk_score_range: {
    min: number;
    max: number;
  } | null;
  flagged_only: boolean;
  requires_review_only: boolean;
  compliance_flags: string[];
  
  // Geographic filters
  cities: string[];
  states: string[];
  countries: string[];
  
  // Time filters
  date_range: {
    start: string;
    end: string;
  } | null;
  created_range: {
    start: string;
    end: string;
  } | null;
  
  // Advanced filters
  first_time_customers: boolean | null;
  repeat_customers: boolean | null;
  has_disputes: boolean | null;
  has_refunds: boolean | null;
  high_value_bookings: boolean | null;
}

// Admin booking actions and workflows
export interface AdminBookingAction {
  id: string;
  booking_id: string;
  action_type: 'approve' | 'flag' | 'refund' | 'investigate' | 'reassign' | 'cancel' | 'escalate';
  performed_by: string;
  performed_at: string;
  reason: string;
  details?: string;
  amount_affected?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
}

// Admin booking investigation
export interface AdminBookingInvestigation {
  booking_id: string;
  investigation_id: string;
  opened_by: string;
  opened_at: string;
  investigation_type: 'fraud' | 'quality' | 'dispute' | 'technical' | 'policy_violation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'pending_review' | 'resolved' | 'escalated';
  
  evidence_collected: {
    type: 'message' | 'photo' | 'document' | 'payment_record' | 'user_history';
    description: string;
    source: string;
    collected_at: string;
    file_url?: string;
  }[];
  
  interviews_conducted: {
    interviewee: 'customer' | 'provider' | 'business_owner';
    interviewer: string;
    conducted_at: string;
    summary: string;
    recording_url?: string;
  }[];
  
  timeline: {
    event: string;
    timestamp: string;
    details: string;
    impact: 'low' | 'medium' | 'high';
  }[];
  
  resolution: {
    decision: string;
    rationale: string;
    actions_taken: string[];
    compensation_provided?: {
      recipient: 'customer' | 'provider' | 'business';
      amount: number;
      type: 'refund' | 'credit' | 'voucher' | 'cash';
    }[];
    policy_updates?: string[];
  } | null;
}

// Admin booking reporting
export interface AdminBookingReport {
  report_id: string;
  report_type: 'financial' | 'operational' | 'quality' | 'compliance' | 'growth';
  generated_by: string;
  generated_at: string;
  date_range: {
    start: string;
    end: string;
  };
  
  summary: {
    total_bookings: number;
    total_revenue: number;
    total_commission: number;
    key_metrics: {
      [metric: string]: number;
    };
    notable_trends: string[];
    action_items: string[];
  };
  
  detailed_data: {
    sections: {
      title: string;
      data: any[];
      charts: {
        type: 'line' | 'bar' | 'pie' | 'scatter';
        data: any[];
        config: any;
      }[];
    }[];
  };
  
  export_formats: ('pdf' | 'excel' | 'csv' | 'json')[];
  scheduled_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

// Admin booking quality assurance
export interface AdminBookingQualityCheck {
  booking_id: string;
  check_id: string;
  check_type: 'random_audit' | 'complaint_triggered' | 'algorithm_flagged' | 'scheduled_review';
  performed_by: string;
  performed_at: string;
  
  checklist: {
    item: string;
    status: 'pass' | 'fail' | 'n/a';
    notes?: string;
    score?: number;
  }[];
  
  overall_score: number;
  quality_rating: 'excellent' | 'good' | 'fair' | 'poor' | 'unacceptable';
  
  findings: {
    positive_aspects: string[];
    areas_for_improvement: string[];
    policy_violations?: string[];
    training_needs?: string[];
  };
  
  actions_required: {
    action: string;
    assignee: string;
    due_date: string;
    priority: 'low' | 'medium' | 'high';
  }[];
  
  follow_up_required: boolean;
  follow_up_date?: string;
}

// Admin booking system health
export interface AdminBookingSystemHealth {
  timestamp: string;
  system_status: 'healthy' | 'warning' | 'critical' | 'maintenance';
  
  performance_metrics: {
    booking_creation_response_time: number;
    booking_update_response_time: number;
    search_response_time: number;
    payment_processing_time: number;
    notification_delivery_time: number;
  };
  
  error_rates: {
    booking_creation_errors: number;
    payment_failures: number;
    notification_failures: number;
    api_errors: number;
    database_errors: number;
  };
  
  capacity_metrics: {
    concurrent_bookings: number;
    database_connections: number;
    api_requests_per_minute: number;
    storage_usage_percentage: number;
  };
  
  alerts: {
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    component: string;
    timestamp: string;
    acknowledged: boolean;
  }[];
}