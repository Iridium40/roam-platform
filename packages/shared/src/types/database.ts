export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Business Types
export type BusinessType = 'sole_proprietorship' | 'llc' | 'corporation' | 'partnership';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'under_review';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due';

// Booking Types
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type TipStatus = 'pending' | 'requested' | 'paid' | 'declined';
export type DeliveryType = 'pickup' | 'delivery' | 'on_site';

// User Types
export type UserRole = 'admin' | 'owner' | 'dispatcher' | 'provider' | 'customer';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

// Service Types
export type ServiceCategory = 'health' | 'fitness' | 'beauty' | 'wellness' | 'education' | 'other';
export type ServiceStatus = 'active' | 'inactive' | 'draft';

// Notification Types
export type NotificationType = 'booking_update' | 'payment' | 'system' | 'marketing';
export type NotificationStatus = 'sent' | 'delivered' | 'failed' | 'pending';

export type Database = {
  public: {
    Tables: {
      // Enhanced business profiles table
      business_profiles: {
        Row: {
          id: string;
          business_name: string;
          business_type: BusinessType;
          contact_email: string | null;
          phone: string | null;
          verification_status: VerificationStatus;
          stripe_connect_account_id: string | null;
          is_active: boolean;
          created_at: string;
          image_url: string | null;
          website_url: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          business_hours: Json;
          social_media: Json;
          verification_notes: string | null;
          rejection_reason: string | null;
          years_in_business: number | null;
          business_description: string | null;
          subscription_plan_id: string | null;
          subscription_status: SubscriptionStatus;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          setup_completed: boolean;
          setup_step: number;
          approved_at: string | null;
        };
        Insert: {
          id?: string;
          business_name: string;
          business_type: BusinessType;
          contact_email?: string | null;
          phone?: string | null;
          verification_status?: VerificationStatus;
          stripe_connect_account_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          image_url?: string | null;
          website_url?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          business_hours?: Json;
          social_media?: Json;
          verification_notes?: string | null;
          rejection_reason?: string | null;
          years_in_business?: number | null;
          business_description?: string | null;
          subscription_plan_id?: string | null;
          subscription_status?: SubscriptionStatus;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          setup_completed?: boolean;
          setup_step?: number;
          approved_at?: string | null;
        };
        Update: {
          id?: string;
          business_name?: string;
          business_type?: BusinessType;
          contact_email?: string | null;
          phone?: string | null;
          verification_status?: VerificationStatus;
          stripe_connect_account_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          image_url?: string | null;
          website_url?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          business_hours?: Json;
          social_media?: Json;
          verification_notes?: string | null;
          rejection_reason?: string | null;
          years_in_business?: number | null;
          business_description?: string | null;
          subscription_plan_id?: string | null;
          subscription_status?: SubscriptionStatus;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          setup_completed?: boolean;
          setup_step?: number;
          approved_at?: string | null;
        };
      };

      // Comprehensive booking system
      bookings: {
        Row: {
          id: string;
          customer_id: string | null;
          provider_id: string;
          service_id: string;
          booking_date: string;
          start_time: string;
          total_amount: number;
          created_at: string;
          service_fee: number;
          service_fee_charged: boolean;
          service_fee_charged_at: string | null;
          remaining_balance: number;
          remaining_balance_charged: boolean;
          remaining_balance_charged_at: string | null;
          cancellation_fee: number;
          refund_amount: number;
          cancelled_at: string | null;
          cancelled_by: string | null;
          cancellation_reason: string | null;
          guest_name: string | null;
          guest_email: string | null;
          guest_phone: string | null;
          customer_location_id: string | null;
          business_location_id: string | null;
          delivery_type: DeliveryType;
          payment_status: PaymentStatus;
          booking_status: BookingStatus;
          admin_notes: string | null;
          tip_eligible: boolean;
          tip_amount: number;
          tip_status: TipStatus;
          tip_requested_at: string | null;
          tip_deadline: string | null;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          provider_id: string;
          service_id: string;
          booking_date: string;
          start_time: string;
          total_amount: number;
          created_at?: string;
          service_fee?: number;
          service_fee_charged?: boolean;
          service_fee_charged_at?: string | null;
          remaining_balance?: number;
          remaining_balance_charged?: boolean;
          remaining_balance_charged_at?: string | null;
          cancellation_fee?: number;
          refund_amount?: number;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          guest_name?: string | null;
          guest_email?: string | null;
          guest_phone?: string | null;
          customer_location_id?: string | null;
          business_location_id?: string | null;
          delivery_type?: DeliveryType;
          payment_status?: PaymentStatus;
          booking_status?: BookingStatus;
          admin_notes?: string | null;
          tip_eligible?: boolean;
          tip_amount?: number;
          tip_status?: TipStatus;
          tip_requested_at?: string | null;
          tip_deadline?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          provider_id?: string;
          service_id?: string;
          booking_date?: string;
          start_time?: string;
          total_amount?: number;
          created_at?: string;
          service_fee?: number;
          service_fee_charged?: boolean;
          service_fee_charged_at?: string | null;
          remaining_balance?: number;
          remaining_balance_charged?: boolean;
          remaining_balance_charged_at?: string | null;
          cancellation_fee?: number;
          refund_amount?: number;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          guest_name?: string | null;
          guest_email?: string | null;
          guest_phone?: string | null;
          customer_location_id?: string | null;
          business_location_id?: string | null;
          delivery_type?: DeliveryType;
          payment_status?: PaymentStatus;
          booking_status?: BookingStatus;
          admin_notes?: string | null;
          tip_eligible?: boolean;
          tip_amount?: number;
          tip_status?: TipStatus;
          tip_requested_at?: string | null;
          tip_deadline?: string | null;
        };
      };

      // User roles table
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: UserRole;
          business_id: string | null;
          location_id: string | null;
          granted_by: string | null;
          granted_at: string;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: UserRole;
          business_id?: string | null;
          location_id?: string | null;
          granted_by?: string | null;
          granted_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: UserRole;
          business_id?: string | null;
          location_id?: string | null;
          granted_by?: string | null;
          granted_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Services table
      services: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string | null;
          category: ServiceCategory;
          price: number;
          duration: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          status: ServiceStatus;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          description?: string | null;
          category: ServiceCategory;
          price: number;
          duration: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          status?: ServiceStatus;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          description?: string | null;
          category?: ServiceCategory;
          price?: number;
          duration?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          status?: ServiceStatus;
        };
      };

      // Notifications table
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          data: Json | null;
          read: boolean;
          sent_at: string | null;
          delivered_at: string | null;
          created_at: string;
          status: NotificationStatus;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          data?: Json | null;
          read?: boolean;
          sent_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          status?: NotificationStatus;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          message?: string;
          data?: Json | null;
          read?: boolean;
          sent_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          status?: NotificationStatus;
        };
      };

      // Twilio conversations metadata
      conversation_metadata: {
        Row: {
          id: string;
          booking_id: string;
          twilio_conversation_sid: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          twilio_conversation_sid: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          twilio_conversation_sid?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
