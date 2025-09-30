// Provider app specific booking interfaces
// Provider/business booking management and operations

import {
  UnifiedBookingBase,
  BookingCustomerProfile,
  BookingProviderProfile,
  BookingBusinessProfile,
  BookingServiceProfile,
  BookingLocation,
  BookingStats
} from './base';

// Provider view of their assigned bookings
export interface ProviderBooking extends UnifiedBookingBase {
  // Enhanced provider context
  customer_profiles?: BookingCustomerProfile;
  providers?: BookingProviderProfile;
  services?: BookingServiceProfile;
  business_profiles?: BookingBusinessProfile;
  customer_locations?: BookingLocation;
  business_locations?: BookingLocation;
  
  // Provider-specific computed fields
  customer_display_name: string; // Customer name or "Guest"
  service_name: string;
  business_name: string;
  formatted_date: string;
  formatted_time: string;
  formatted_duration: string;
  provider_earnings: number; // After platform fees
  estimated_earnings: number;
  time_until_booking?: string;
  travel_time?: string;
  distance_to_customer?: string;
  
  // Provider UI states
  is_assigned_to_me: boolean;
  is_upcoming: boolean;
  is_today: boolean;
  is_overdue: boolean;
  requires_action: boolean;
  can_start: boolean;
  can_complete: boolean;
  can_cancel: boolean;
  can_reschedule: boolean;
  
  // Provider actions available
  available_actions: ('accept' | 'decline' | 'start' | 'complete' | 'cancel' | 'reschedule' | 'contact_customer' | 'navigate')[];
  
  // Communication
  unread_messages: number;
  last_customer_message?: string;
  
  // Service requirements
  equipment_needed?: string[];
  preparation_notes?: string;
  customer_preferences?: string;
}

// Provider booking with earnings breakdown
export interface ProviderBookingWithEarnings extends ProviderBooking {
  earnings_breakdown: {
    base_service_fee: number;
    tip_amount: number;
    bonus_amount: number;
    platform_fee: number;
    processing_fee: number;
    net_earnings: number;
    payout_date?: string;
    payout_status: 'pending' | 'processing' | 'paid' | 'failed';
  };
}

// Provider booking statistics
export interface ProviderBookingStats extends BookingStats {
  today_bookings: number;
  this_week_bookings: number;
  accepted_bookings: number;
  declined_bookings: number;
  no_show_rate: number;
  on_time_rate: number;
  customer_rating: number;
  repeat_customer_rate: number;
  earnings_today: number;
  earnings_this_week: number;
  earnings_this_month: number;
  tips_received: number;
  average_job_duration: number;
  utilization_rate: number;
}

// Provider daily schedule
export interface ProviderDailySchedule {
  date: string;
  total_bookings: number;
  confirmed_bookings: number;
  pending_bookings: number;
  total_earnings: number;
  estimated_earnings: number;
  working_hours: {
    start: string;
    end: string;
  };
  bookings: ProviderBooking[];
  available_slots: {
    start_time: string;
    end_time: string;
    duration_minutes: number;
  }[];
  conflicts: {
    booking_id: string;
    issue: 'overlapping' | 'no_travel_time' | 'outside_hours';
  }[];
}

// Provider booking assignment
export interface ProviderBookingAssignment {
  booking_id: string;
  assigned_at: string;
  assigned_by: 'system' | 'business_owner' | 'dispatcher';
  assignment_reason: 'availability' | 'skills_match' | 'customer_preference' | 'manual_assignment';
  must_accept_by: string;
  auto_accept: boolean;
  priority_level: 'low' | 'medium' | 'high' | 'urgent';
  estimated_travel_time: number;
  estimated_earnings: number;
  customer_notes?: string;
  special_requirements?: string[];
}

// Provider availability settings
export interface ProviderAvailability {
  provider_id: string;
  is_accepting_bookings: boolean;
  current_location?: {
    latitude: number;
    longitude: number;
    last_updated: string;
  };
  working_radius_miles: number;
  preferred_service_types: string[];
  minimum_booking_notice_hours: number;
  maximum_daily_bookings: number;
  
  // Weekly schedule
  weekly_schedule: {
    [day: string]: {
      is_available: boolean;
      start_time: string;
      end_time: string;
      break_periods?: {
        start: string;
        end: string;
        reason: string;
      }[];
    };
  };
  
  // Time off requests
  time_off: {
    start_date: string;
    end_date: string;
    reason: string;
    approved: boolean;
  }[];
  
  // Booking preferences
  preferences: {
    auto_accept_regular_customers: boolean;
    auto_accept_within_radius: number;
    require_approval_for_new_customers: boolean;
    preferred_booking_types: ('regular' | 'recurring' | 'one_time')[];
  };
}

// Provider performance metrics
export interface ProviderPerformanceMetrics {
  provider_id: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  date_range: {
    start: string;
    end: string;
  };
  
  metrics: {
    total_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    no_shows: number;
    acceptance_rate: number;
    completion_rate: number;
    on_time_rate: number;
    customer_satisfaction: number;
    average_rating: number;
    repeat_customer_rate: number;
    revenue_generated: number;
    tips_earned: number;
    average_service_duration: number;
    efficiency_score: number;
  };
  
  rankings: {
    business_rank?: number;
    platform_rank?: number;
    category_rank?: number;
  };
  
  goals: {
    bookings_target: number;
    revenue_target: number;
    rating_target: number;
    completion_rate_target: number;
  };
  
  achievements: {
    badges_earned: string[];
    milestones_reached: string[];
    awards_received: string[];
  };
}

// Provider booking workflow states
export interface ProviderBookingWorkflow {
  booking_id: string;
  current_step: 'assigned' | 'accepted' | 'preparing' | 'traveling' | 'arrived' | 'in_progress' | 'completed' | 'follow_up';
  
  workflow_steps: {
    step: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    started_at?: string;
    completed_at?: string;
    notes?: string;
    required_photos?: string[];
    customer_confirmation?: boolean;
  }[];
  
  checklist: {
    item: string;
    completed: boolean;
    required: boolean;
    notes?: string;
  }[];
  
  customer_interactions: {
    type: 'message' | 'call' | 'photo' | 'location_share';
    timestamp: string;
    content: string;
    initiated_by: 'provider' | 'customer';
  }[];
}

// Provider booking preferences
export interface ProviderBookingPreferences {
  notification_settings: {
    new_booking_assignments: 'push' | 'sms' | 'email' | 'all';
    booking_updates: 'push' | 'sms' | 'email' | 'all';
    customer_messages: 'push' | 'sms' | 'email' | 'all';
    payment_notifications: 'push' | 'sms' | 'email' | 'all';
    reminder_before_booking_hours: number[];
  };
  
  assignment_preferences: {
    auto_accept_conditions: {
      regular_customers: boolean;
      within_radius_miles: number;
      minimum_rating: number;
      minimum_earnings: number;
    };
    decline_conditions: {
      outside_radius: boolean;
      conflicting_bookings: boolean;
      low_earnings: boolean;
      new_customers: boolean;
    };
  };
  
  communication_preferences: {
    allow_customer_calls: boolean;
    allow_customer_messages: boolean;
    share_location_with_customer: boolean;
    send_arrival_notifications: boolean;
    send_completion_photos: boolean;
  };
}

// Provider business booking view (for business owners managing multiple providers)
export interface BusinessProviderBooking extends ProviderBooking {
  assigned_provider: BookingProviderProfile;
  assignment_history: {
    provider_id: string;
    provider_name: string;
    assigned_at: string;
    status: 'accepted' | 'declined' | 'reassigned' | 'completed';
    reason?: string;
  }[];
  business_metrics: {
    profit_margin: number;
    customer_acquisition_cost: number;
    customer_lifetime_value: number;
    repeat_booking_probability: number;
  };
}