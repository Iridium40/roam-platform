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
export type ServiceCategoryType = "cleaning" | "maintenance" | "repair" | "installation" | "inspection" | "other";
export type ServiceSubcategoryType = "residential" | "commercial" | "industrial" | "emergency" | "scheduled" | "other";
export type CustomerLocationType = "home" | "work" | "other";

// Notification Types
export type NotificationType = 'booking_update' | 'payment' | 'system' | 'marketing';
export type NotificationStatus = 'sent' | 'delivered' | 'failed' | 'pending';
export type MessageNotificationType = 'message' | 'mention' | 'system';

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
          created_at: string | null;
          updated_at: string | null;
          last_message_at: string | null;
          participant_count: number | null;
          is_active: boolean | null;
          conversation_type: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          twilio_conversation_sid: string;
          created_at?: string | null;
          updated_at?: string | null;
          last_message_at?: string | null;
          participant_count?: number | null;
          is_active?: boolean | null;
          conversation_type?: string | null;
        };
        Update: {
          id?: string;
          booking_id?: string;
          twilio_conversation_sid?: string;
          created_at?: string | null;
          updated_at?: string | null;
          last_message_at?: string | null;
          participant_count?: number | null;
          is_active?: boolean | null;
          conversation_type?: string | null;
        };
      };
      // Customer profiles table
      customer_profiles: {
        Row: {
          id: string;
          user_id: string;
          phone: string | null;
          email: string | null;
          is_active: boolean | null;
          created_at: string | null;
          first_name: string | null;
          last_name: string | null;
          date_of_birth: string | null;
          image_url: string | null;
          bio: string | null;
          email_notifications: boolean | null;
          sms_notifications: boolean | null;
          push_notifications: boolean | null;
          marketing_emails: boolean | null;
          email_verified: boolean | null;
          phone_verified: boolean | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          phone?: string | null;
          email?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          date_of_birth?: string | null;
          image_url?: string | null;
          bio?: string | null;
          email_notifications?: boolean | null;
          sms_notifications?: boolean | null;
          push_notifications?: boolean | null;
          marketing_emails?: boolean | null;
          email_verified?: boolean | null;
          phone_verified?: boolean | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          phone?: string | null;
          email?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          date_of_birth?: string | null;
          image_url?: string | null;
          bio?: string | null;
          email_notifications?: boolean | null;
          sms_notifications?: boolean | null;
          push_notifications?: boolean | null;
          marketing_emails?: boolean | null;
          email_verified?: boolean | null;
          phone_verified?: boolean | null;
        };
      };
      // Customer favorite providers
      customer_favorite_providers: {
        Row: {
          id: string;
          customer_id: string;
          provider_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          provider_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string;
          provider_id?: string;
          created_at?: string | null;
        };
      };
      // Customer favorite businesses
      customer_favorite_businesses: {
        Row: {
          id: string;
          customer_id: string;
          business_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          business_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string;
          business_id?: string;
          created_at?: string | null;
        };
      };
      // Customer favorite services
      customer_favorite_services: {
        Row: {
          id: string;
          customer_id: string;
          service_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          service_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string;
          service_id?: string;
          created_at?: string | null;
        };
      };
      // Customer locations
      customer_locations: {
        Row: {
          id: string;
          customer_id: string;
          location_name: string;
          street_address: string;
          unit_number: string | null;
          city: string;
          state: string;
          zip_code: string;
          latitude: number | null;
          longitude: number | null;
          is_primary: boolean | null;
          is_active: boolean | null;
          access_instructions: string | null;
          created_at: string | null;
          location_type: CustomerLocationType;
        };
        Insert: {
          id?: string;
          customer_id: string;
          location_name: string;
          street_address: string;
          unit_number?: string | null;
          city: string;
          state: string;
          zip_code: string;
          latitude?: number | null;
          longitude?: number | null;
          is_primary?: boolean | null;
          is_active?: boolean | null;
          access_instructions?: string | null;
          created_at?: string | null;
          location_type: CustomerLocationType;
        };
        Update: {
          id?: string;
          customer_id?: string;
          location_name?: string;
          street_address?: string;
          unit_number?: string | null;
          city?: string;
          state?: string;
          zip_code?: string;
          latitude?: number | null;
          longitude?: number | null;
          is_primary?: boolean | null;
          is_active?: boolean | null;
          access_instructions?: string | null;
          created_at?: string | null;
          location_type?: CustomerLocationType;
        };
      };
      // Conversation participants
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string | null;
          user_type: string;
          twilio_participant_sid: string;
          joined_at: string | null;
          left_at: string | null;
          is_active: boolean | null;
          last_read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id?: string | null;
          user_type: string;
          twilio_participant_sid: string;
          joined_at?: string | null;
          left_at?: string | null;
          is_active?: boolean | null;
          last_read_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string | null;
          user_type?: string;
          twilio_participant_sid?: string;
          joined_at?: string | null;
          left_at?: string | null;
          is_active?: boolean | null;
          last_read_at?: string | null;
        };
      };
      // Contact submissions
      contact_submissions: {
        Row: {
          id: string;
          from_email: string;
          to_email: string;
          subject: string;
          message: string;
          status: string | null;
          created_at: string | null;
          updated_at: string | null;
          responded_at: string | null;
          responded_by: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          from_email: string;
          to_email: string;
          subject: string;
          message: string;
          status?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          responded_at?: string | null;
          responsed_by?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          from_email?: string;
          to_email?: string;
          subject?: string;
          message?: string;
          status?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          responded_at?: string | null;
          responded_by?: string | null;
          notes?: string | null;
        };
      };
      // Payment schedules
      payment_schedules: {
        Row: {
          id: string;
          booking_id: string;
          payment_type: string;
          scheduled_at: string;
          amount: number;
          status: string | null;
          stripe_payment_intent_id: string | null;
          processed_at: string | null;
          failure_reason: string | null;
          retry_count: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          payment_type: string;
          scheduled_at: string;
          amount: number;
          status?: string | null;
          stripe_payment_intent_id?: string | null;
          processed_at?: string | null;
          failure_reason?: string | null;
          retry_count?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          booking_id?: string;
          payment_type?: string;
          scheduled_at?: string;
          amount?: number;
          status?: string | null;
          stripe_payment_intent_id?: string | null;
          processed_at?: string | null;
          failure_reason?: string | null;
          retry_count?: number | null;
          created_at?: string | null;
        };
      };
      // Business service categories
      business_service_categories: {
        Row: {
          id: string;
          business_id: string;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          category_id: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          category_id?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          category_id?: string | null;
        };
      };
      // Business service subcategories
      business_service_subcategories: {
        Row: {
          id: string;
          business_id: string;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          subcategory_id: string | null;
          category_id: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          subcategory_id?: string | null;
          category_id?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          subcategory_id?: string | null;
          category_id?: string | null;
        };
      };
      // Message notifications
      message_notifications: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          message_sid: string;
          is_read: boolean | null;
          read_at: string | null;
          created_at: string | null;
          notification_type: MessageNotificationType;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          message_sid: string;
          is_read?: boolean | null;
          read_at?: string | null;
          created_at?: string | null;
          notification_type?: MessageNotificationType;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          message_sid?: string;
          is_read?: boolean | null;
          read_at?: string | null;
          created_at?: string | null;
          notification_type?: MessageNotificationType;
        };
      };
      // MFA sessions
      mfa_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          factor_id: string;
          mfa_completed_at: string;
          expires_at: string;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          factor_id: string;
          mfa_completed_at: string;
          expires_at: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          factor_id?: string;
          mfa_completed_at?: string;
          expires_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string | null;
        };
      };
      // MFA settings
      mfa_settings: {
        Row: {
          id: string;
          user_id: string;
          factor_type: string;
          factor_id: string;
          is_enabled: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          last_used_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          factor_type: string;
          factor_id: string;
          is_enabled?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          last_used_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          factor_type?: string;
          factor_id?: string;
          is_enabled?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          last_used_at?: string | null;
        };
      };
      // Promotions
      promotions: {
        Row: {
          id: string;
          title: string;
          description: string;
          discount_type: string;
          discount_value: number;
          valid_from: string;
          valid_until: string;
          is_active: boolean | null;
          created_at: string | null;
          business_id: string;
          service_id: string | null;
          max_uses: number | null;
          current_uses: number | null;
          min_order_amount: number | null;
          promo_code: string | null;
          image_url: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          discount_type: string;
          discount_value: number;
          valid_from: string;
          valid_until: string;
          is_active?: boolean | null;
          created_at?: string | null;
          business_id: string;
          service_id?: string | null;
          max_uses?: number | null;
          current_uses?: number | null;
          min_order_amount?: number | null;
          promo_code?: string | null;
          image_url?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          discount_type?: string;
          discount_value?: number;
          valid_from?: string;
          valid_until?: string;
          is_active?: boolean | null;
          created_at?: string | null;
          business_id?: string;
          service_id?: string | null;
          max_uses?: number | null;
          current_uses?: number | null;
          min_order_amount?: number | null;
          promo_code?: string | null;
          image_url?: string | null;
        };
      };
      // Promotion usage
      promotion_usage: {
        Row: {
          id: string;
          promotion_id: string;
          customer_id: string;
          booking_id: string;
          used_at: string | null;
          discount_amount: number | null;
        };
        Insert: {
          id?: string;
          promotion_id: string;
          customer_id: string;
          booking_id: string;
          used_at?: string | null;
          discount_amount?: number | null;
        };
        Update: {
          id?: string;
          promotion_id?: string;
          customer_id?: string;
          booking_id?: string;
          used_at?: string | null;
          discount_amount?: number | null;
        };
      };
      // Reviews
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          customer_id: string;
          provider_id: string | null;
          business_id: string;
          rating: number;
          review_text: string | null;
          is_verified: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          moderated: boolean | null;
          moderated_by: string | null;
          moderated_at: string | null;
          moderation_notes: string | null;
          is_public: boolean | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          customer_id: string;
          provider_id?: string | null;
          business_id: string;
          rating: number;
          review_text?: string | null;
          is_verified?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          moderated?: boolean | null;
          moderated_by?: string | null;
          moderated_at?: string | null;
          moderation_notes?: string | null;
          is_public?: boolean | null;
        };
        Update: {
          id?: string;
          booking_id?: string;
          customer_id?: string;
          provider_id?: string | null;
          business_id?: string;
          rating?: number;
          review_text?: string | null;
          is_verified?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          moderated?: boolean | null;
          moderated_by?: string | null;
          moderated_at?: string | null;
          moderation_notes?: string | null;
          is_public?: boolean | null;
        };
      };
      // Provider addons
      provider_addons: {
        Row: {
          id: string;
          provider_id: string;
          addon_id: string;
          provider_price: number;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          provider_id: string;
          addon_id: string;
          provider_price: number;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          provider_id?: string;
          addon_id?: string;
          provider_price?: number;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      // Service categories
      service_categories: {
        Row: {
          id: string;
          description: string | null;
          is_active: boolean | null;
          created_at: string | null;
          image_url: string | null;
          sort_order: number | null;
          service_category_type: ServiceCategoryType;
        };
        Insert: {
          id?: string;
          description?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          image_url?: string | null;
          sort_order?: number | null;
          service_category_type: ServiceCategoryType;
        };
        Update: {
          id?: string;
          description?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          image_url?: string | null;
          sort_order?: number | null;
          service_category_type?: ServiceCategoryType;
        };
      };
      // Service subcategories
      service_subcategories: {
        Row: {
          id: string;
          category_id: string;
          description: string | null;
          is_active: boolean | null;
          created_at: string | null;
          image_url: string | null;
          service_subcategory_type: ServiceSubcategoryType;
        };
        Insert: {
          id?: string;
          category_id: string;
          description?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          image_url?: string | null;
          service_subcategory_type: ServiceSubcategoryType;
        };
        Update: {
          id?: string;
          category_id?: string;
          description?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          image_url?: string | null;
          service_subcategory_type?: ServiceSubcategoryType;
        };
      };
      // Announcements
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          is_active: boolean | null;
          created_at: string | null;
          start_date: string | null;
          end_date: string | null;
          announcement_audience: string | null;
          announcement_type: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          is_active?: boolean | null;
          created_at?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          announcement_audience?: string | null;
          announcement_type?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          is_active?: boolean | null;
          created_at?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          announcement_audience?: string | null;
          announcement_type?: string | null;
        };
      };
      // Customers table
      customers: {
        Row: {
          id: string;
          user_id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          date_of_birth: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          image_url: string | null;
          bio: string | null;
          email_notifications: boolean | null;
          sms_notifications: boolean | null;
          push_notifications: boolean | null;
          marketing_emails: boolean | null;
          email_verified: boolean | null;
          phone_verified: boolean | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          image_url?: string | null;
          bio?: string | null;
          email_notifications?: boolean | null;
          sms_notifications?: boolean | null;
          push_notifications?: boolean | null;
          marketing_emails?: boolean | null;
          email_verified?: boolean | null;
          phone_verified?: boolean | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          image_url?: string | null;
          bio?: string | null;
          email_notifications?: boolean | null;
          sms_notifications?: boolean | null;
          push_notifications?: boolean | null;
          marketing_emails?: boolean | null;
          email_verified?: boolean | null;
          phone_verified?: boolean | null;
        };
      };
      // Business locations
      business_locations: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          address: string;
          city: string;
          state: string;
          zip_code: string;
          country: string;
          latitude: number | null;
          longitude: number | null;
          is_primary: boolean | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          address: string;
          city: string;
          state: string;
          zip_code: string;
          country: string;
          latitude?: number | null;
          longitude?: number | null;
          is_primary?: boolean | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          address?: string;
          city?: string;
          state?: string;
          zip_code?: string;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          is_primary?: boolean | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      // Business services
      business_services: {
        Row: {
          id: string;
          business_id: string;
          service_id: string;
          price: number;
          duration: number;
          is_active: boolean | null;
          is_featured: boolean | null;
          is_popular: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          description: string | null;
          image_url: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          service_id: string;
          price: number;
          duration: number;
          is_active?: boolean | null;
          is_featured?: boolean | null;
          is_popular?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          description?: string | null;
          image_url?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          service_id?: string;
          price?: number;
          duration?: number;
          is_active?: boolean | null;
          is_featured?: boolean | null;
          is_popular?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          description?: string | null;
          image_url?: string | null;
        };
      };
      // Business addons
      business_addons: {
        Row: {
          id: string;
          business_id: string;
          addon_id: string;
          price: number;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          addon_id: string;
          price: number;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          addon_id?: string;
          price?: number;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      // Booking actions
      booking_actions: {
        Row: {
          id: string;
          booking_id: string;
          action_type: string;
          performed_by: string;
          performed_at: string;
          details: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          action_type: string;
          performed_by: string;
          performed_at: string;
          details?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          booking_id?: string;
          action_type?: string;
          performed_by?: string;
          performed_at?: string;
          details?: Json | null;
          created_at?: string | null;
        };
      };
      // Business documents
      business_documents: {
        Row: {
          id: string;
          business_id: string;
          document_type: string;
          file_url: string;
          file_name: string;
          file_size: number | null;
          is_verified: boolean | null;
          verified_at: string | null;
          verified_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          document_type: string;
          file_url: string;
          file_name: string;
          file_size?: number | null;
          is_verified?: boolean | null;
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          document_type?: string;
          file_url?: string;
          file_name?: string;
          file_size?: number | null;
          is_verified?: boolean | null;
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      // Provider calendar connections
      provider_calendar_connections: {
        Row: {
          id: string;
          provider_id: string;
          calendar_type: string;
          calendar_id: string;
          access_token: string;
          refresh_token: string;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          provider_id: string;
          calendar_type: string;
          calendar_id: string;
          access_token: string;
          refresh_token: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          provider_id?: string;
          calendar_type?: string;
          calendar_id?: string;
          access_token?: string;
          refresh_token?: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      // Push subscriptions
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      // User communication preferences
      user_communication_preferences: {
        Row: {
          id: string;
          user_id: string;
          email_notifications: boolean | null;
          sms_notifications: boolean | null;
          push_notifications: boolean | null;
          marketing_emails: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_notifications?: boolean | null;
          sms_notifications?: boolean | null;
          push_notifications?: boolean | null;
          marketing_emails?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          email_notifications?: boolean | null;
          sms_notifications?: boolean | null;
          push_notifications?: boolean | null;
          marketing_emails?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      // Business setup progress
      business_setup_progress: {
        Row: {
          id: string;
          business_id: string;
          step: number;
          is_completed: boolean | null;
          completed_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          step: number;
          is_completed?: boolean | null;
          completed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          step?: number;
          is_completed?: boolean | null;
          completed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      // Service addons
      service_addons: {
        Row: {
          id: string;
          service_id: string;
          name: string;
          description: string | null;
          price: number;
          duration: number | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          service_id: string;
          name: string;
          description?: string | null;
          price: number;
          duration?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          service_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          duration?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      // Service addon eligibility
      service_addon_eligibility: {
        Row: {
          id: string;
          addon_id: string;
          service_id: string;
          is_eligible: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          addon_id: string;
          service_id: string;
          is_eligible?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          addon_id?: string;
          service_id?: string;
          is_eligible?: boolean | null;
          created_at?: string | null;
        };
      };
      // Providers table
      providers: {
        Row: {
          id: string;
          user_id: string;
          business_id: string | null;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          date_of_birth: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          image_url: string | null;
          bio: string | null;
          verification_status: string | null;
          business_managed: boolean | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_id?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          image_url?: string | null;
          bio?: string | null;
          verification_status?: string | null;
          business_managed?: boolean | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_id?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          image_url?: string | null;
          bio?: string | null;
          verification_status?: string | null;
          business_managed?: boolean | null;
        };
      };
    };
  };
};
