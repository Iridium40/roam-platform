export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Business Types
export type BusinessType = 'independent' | 'small_business' | 'franchise' | 'enterprise' | 'other';
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due';

// Booking Types
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'declined';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type TipStatus = 'pending' | 'requested' | 'paid' | 'declined';
export type DeliveryType = 'business_location' | 'customer_location' | 'virtual' | 'both_locations';

// User Types
export type UserRole = 'admin' | 'owner' | 'dispatcher' | 'provider' | 'customer';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

// Service Types
export type ServiceStatus = 'active' | 'inactive' | 'draft';
export type ServiceCategoryType = "beauty" | "fitness" | "therapy" | "healthcare";
export type ServiceSubcategoryType = "hair_and_makeup" | "spray_tan" | "esthetician" | "massage_therapy" | "iv_therapy" | "physical_therapy" | "nurse_practitioner" | "physician" | "chiropractor" | "yoga_instructor" | "pilates_instructor" | "personal_trainer" | "injectables" | "health_coach";
export type CustomerLocationType = "home" | "condo" | "hotel" | "oatasse popnops ther" | null;

// Notification Types
  export type NotificationType = 'booking_status_update' | 'new_message' | 'booking_reminder' | 'system_alert' | 'payment_received';
export type NotificationStatus = 'sent' | 'delivered' | 'failed' | 'pending';
  export type MessageNotificationType = 'message' | 'mention' | 'system';

  // Transaction Types
  export type TransactionType = 'payment' | 'payout' | 'refund' | 'fee' | 'adjustment';
  export type Status = 'pending' | 'completed' | 'failed' | 'cancelled' | 'processing';

// Promotion Types
export type PromotionSavingsType = 'percentage' | 'fixed_amount';

// Document Types
export type BusinessDocumentType = 'drivers_license' | 'proof_of_address' | 'liability_insurance' | 'professional_license' | 'professional_certificate' | 'business_license';
export type BusinessDocumentStatus = 'pending' | 'verified' | 'rejected' | 'under_review';

  // Announcement Types
  export type AnnouncementAudience = 'all' | 'customer' | 'provider' | 'business' | 'staff';
  export type AnnouncementType = 'general' | 'promotional' | 'maintenance' | 'feature' | 'alert' | 'news' | 'update';



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
          booking_reference: string | null;
          business_id: string;
          decline_reason: string | null;
          rescheduled_at: string | null;
          rescheduled_by: string | null;
          reschedule_reason: string | null;
          original_booking_date: string | null;
          original_start_time: string | null;
          reschedule_count: number;
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
          booking_reference?: string | null;
          business_id: string;
          decline_reason?: string | null;
          rescheduled_at?: string | null;
          rescheduled_by?: string | null;
          reschedule_reason?: string | null;
          original_booking_date?: string | null;
          original_start_time?: string | null;
          reschedule_count?: number;
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
          booking_reference?: string | null;
          business_id?: string;
          decline_reason?: string | null;
          rescheduled_at?: string | null;
          rescheduled_by?: string | null;
          reschedule_reason?: string | null;
          original_booking_date?: string | null;
          original_start_time?: string | null;
          reschedule_count?: number;
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
          subcategory_id: string;
          name: string;
          description: string | null;
          min_price: number;
          duration_minutes: number;
          image_url: string | null;
          is_active: boolean | null;
          created_at: string | null;
          is_featured: boolean | null;
          is_popular: boolean | null;
        };
        Insert: {
          id?: string;
          subcategory_id: string;
          name: string;
          description?: string | null;
          min_price: number;
          duration_minutes: number;
          image_url?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          is_featured?: boolean | null;
          is_popular?: boolean | null;
        };
        Update: {
          id?: string;
          subcategory_id?: string;
          name?: string;
          description?: string | null;
          min_price?: number;
          duration_minutes?: number;
          image_url?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          is_featured?: boolean | null;
          is_popular?: boolean | null;
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

      // User preferences table
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          notification_preferences: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          notification_preferences?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          notification_preferences?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };

      // Provider bank accounts table
      provider_bank_accounts: {
        Row: {
          id: string;
          user_id: string;
          business_id: string | null;
          plaid_access_token: string;
          plaid_item_id: string;
          account_data: Json;
          institution_data: Json | null;
          webhook_status: string | null;
          webhook_error: Json | null;
          last_webhook_at: string | null;
          connected_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_id?: string | null;
          plaid_access_token: string;
          plaid_item_id: string;
          account_data: Json;
          institution_data?: Json | null;
          webhook_status?: string | null;
          webhook_error?: Json | null;
          last_webhook_at?: string | null;
          connected_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_id?: string | null;
          plaid_access_token?: string;
          plaid_item_id?: string;
          account_data?: Json;
          institution_data?: Json | null;
          webhook_status?: string | null;
          webhook_error?: Json | null;
          last_webhook_at?: string | null;
          connected_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };



             // Financial transactions table
       financial_transactions: {
         Row: {
           id: string;
           booking_id: string;
           amount: number;
           currency: string | null;
           stripe_transaction_id: string | null;
           payment_method: string | null;
           description: string | null;
           metadata: Json | null;
           created_at: string | null;
           processed_at: string | null;
           transaction_type: TransactionType | null;
           status: Status | null;
         };
         Insert: {
           id?: string;
           booking_id: string;
           amount: number;
           currency?: string | null;
           stripe_transaction_id?: string | null;
           payment_method?: string | null;
           description?: string | null;
           metadata?: Json | null;
           created_at?: string | null;
           processed_at?: string | null;
           transaction_type?: TransactionType | null;
           status?: Status | null;
         };
         Update: {
           id?: string;
           booking_id?: string;
           amount?: number;
           currency?: string | null;
           stripe_transaction_id?: string | null;
           payment_method?: string | null;
           description?: string | null;
           metadata?: Json | null;
           created_at?: string | null;
           processed_at?: string | null;
           transaction_type?: TransactionType | null;
           status?: Status | null;
         };
       };

       // Plaid bank connections table
       plaid_bank_connections: {
         Row: {
           id: string;
           user_id: string | null;
           business_id: string | null;
           plaid_access_token: string | null;
           plaid_item_id: string | null;
           plaid_account_id: string | null;
           institution_id: string | null;
           institution_name: string | null;
           account_name: string | null;
           account_mask: string | null;
           account_type: string | null;
           account_subtype: string | null;
           verification_status: string | null;
           routing_numbers: string[] | null;
           account_number_mask: string | null;
           connected_at: string | null;
           is_active: boolean | null;
           created_at: string | null;
           updated_at: string | null;
         };
         Insert: {
           id?: string;
           user_id?: string | null;
           business_id?: string | null;
           plaid_access_token?: string | null;
           plaid_item_id?: string | null;
           plaid_account_id?: string | null;
           institution_id?: string | null;
           institution_name?: string | null;
           account_name?: string | null;
           account_mask?: string | null;
           account_type?: string | null;
           account_subtype?: string | null;
           verification_status?: string | null;
           routing_numbers?: string[] | null;
           account_number_mask?: string | null;
           connected_at?: string | null;
           is_active?: boolean | null;
           created_at?: string | null;
           updated_at?: string | null;
         };
         Update: {
           id?: string;
           user_id?: string | null;
           business_id?: string | null;
           plaid_access_token?: string | null;
           plaid_item_id?: string | null;
           plaid_account_id?: string | null;
           institution_id?: string | null;
           institution_name?: string | null;
           account_name?: string | null;
           account_mask?: string | null;
           account_type?: string | null;
           account_subtype?: string | null;
           verification_status?: string | null;
           routing_numbers?: string[] | null;
           account_number_mask?: string | null;
           connected_at?: string | null;
           is_active?: boolean | null;
           created_at?: string | null;
           updated_at?: string | null;
         };
       };

       // Manual bank accounts table
       manual_bank_accounts: {
         Row: {
           id: string;
           user_id: string;
           business_id: string | null;
           account_name: string;
           account_type: string;
           account_number: string;
           routing_number: string;
           bank_name: string;
           is_verified: boolean;
           is_default: boolean;
           stripe_account_id: string | null;
           verification_status: string;
           created_at: string | null;
           updated_at: string | null;
         };
         Insert: {
           id?: string;
           user_id: string;
           business_id?: string | null;
           account_name: string;
           account_type: string;
           account_number: string;
           routing_number: string;
           bank_name: string;
           is_verified?: boolean;
           is_default?: boolean;
           stripe_account_id?: string | null;
           verification_status?: string;
           created_at?: string | null;
           updated_at?: string | null;
         };
         Update: {
           id?: string;
           user_id?: string;
           business_id?: string | null;
           account_name?: string;
           account_type?: string;
           account_number?: string;
           routing_number?: string;
           bank_name?: string;
           is_verified?: boolean;
           is_default?: boolean;
           stripe_account_id?: string | null;
           verification_status?: string;
           created_at?: string | null;
           updated_at?: string | null;
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
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          is_active: boolean | null;
          created_at: string | null;
          business_id: string | null;
          image_url: string | null;
          promo_code: string;
          savings_type: PromotionSavingsType | null;
          savings_amount: number | null;
          savings_max_amount: number | null;
          service_id: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          business_id?: string | null;
          image_url?: string | null;
          promo_code: string;
          savings_type?: PromotionSavingsType | null;
          savings_amount?: number | null;
          savings_max_amount?: number | null;
          service_id?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          business_id?: string | null;
          image_url?: string | null;
          promo_code?: string;
          savings_type?: PromotionSavingsType | null;
          savings_amount?: number | null;
          savings_max_amount?: number | null;
          service_id?: string | null;
        };
      };
      // Promotion usage
      promotion_usage: {
        Row: {
          id: string;
          promotion_id: string;
          booking_id: string;
          discount_applied: number;
          original_amount: number;
          final_amount: number;
          created_at: string | null;
          used_at: string | null;
        };
        Insert: {
          id?: string;
          promotion_id: string;
          booking_id: string;
          discount_applied: number;
          original_amount: number;
          final_amount: number;
          created_at?: string | null;
          used_at?: string | null;
        };
        Update: {
          id?: string;
          promotion_id?: string;
          booking_id?: string;
          discount_applied?: number;
          original_amount?: number;
          final_amount?: number;
          created_at?: string | null;
          used_at?: string | null;
        };
      };
      // Reviews
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          overall_rating: number;
          service_rating: number | null;
          communication_rating: number | null;
          punctuality_rating: number | null;
          review_text: string | null;
          is_approved: boolean | null;
          is_featured: boolean | null;
          moderated_by: string | null;
          moderated_at: string | null;
          moderation_notes: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          overall_rating: number;
          service_rating?: number | null;
          communication_rating?: number | null;
          punctuality_rating?: number | null;
          review_text?: string | null;
          is_approved?: boolean | null;
          is_featured?: boolean | null;
          moderated_by?: string | null;
          moderated_at?: string | null;
          moderation_notes?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          booking_id?: string;
          overall_rating?: number;
          service_rating?: number | null;
          communication_rating?: number | null;
          punctuality_rating?: number | null;
          review_text?: string | null;
          is_approved?: boolean | null;
          is_featured?: boolean | null;
          moderated_by?: string | null;
          moderated_at?: string | null;
          moderation_notes?: string | null;
          created_at?: string | null;
        };
      };
      // Addons table
      addons: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string;
          min_price: number;
          image_url: string | null;
          is_available: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category: string;
          min_price: number;
          image_url?: string | null;
          is_available?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: string;
          min_price?: number;
          image_url?: string | null;
          is_available?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      // Service addons
      service_addons: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      // Service addon eligibility
      service_addon_eligibility: {
        Row: {
          id: string;
          service_id: string;
          addon_id: string;
          is_recommended: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          service_id: string;
          addon_id: string;
          is_recommended?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          service_id?: string;
          addon_id?: string;
          is_recommended?: boolean | null;
          created_at?: string | null;
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
        announcement_audience: AnnouncementAudience | null;
        announcement_type: AnnouncementType | null;
      };
      Insert: {
        id?: string;
        title: string;
        content: string;
        is_active?: boolean | null;
        created_at?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        announcement_audience?: AnnouncementAudience | null;
        announcement_type?: AnnouncementType | null;
      };
      Update: {
        id?: string;
        title?: string;
        content?: string;
        is_active?: boolean | null;
        created_at?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        announcement_audience?: AnnouncementAudience | null;
        announcement_type?: AnnouncementType | null;
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
          location_name: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string | null;
          latitude: number | null;
          longitude: number | null;
          is_active: boolean | null;
          created_at: string | null;
          is_primary: boolean | null;
          offers_mobile_services: boolean | null;
          mobile_service_radius: number | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_name?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
          is_primary?: boolean | null;
          offers_mobile_services?: boolean | null;
          mobile_service_radius?: number | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          location_name?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
          is_primary?: boolean | null;
          offers_mobile_services?: boolean | null;
          mobile_service_radius?: number | null;
        };
      };
      // Business services
      business_services: {
        Row: {
          id: string;
          business_id: string;
          service_id: string;
          business_price: number;
          is_active: boolean | null;
          created_at: string | null;
          delivery_type: DeliveryType | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          service_id: string;
          business_price: number;
          is_active?: boolean | null;
          created_at?: string | null;
          delivery_type?: DeliveryType | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          service_id?: string;
          business_price?: number;
          is_active?: boolean | null;
          created_at?: string | null;
          delivery_type?: DeliveryType | null;
        };
      };
      // Business addons
      business_addons: {
        Row: {
          id: string;
          business_id: string;
          addon_id: string;
          business_price: number;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          addon_id: string;
          business_price: number;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          addon_id?: string;
          business_price?: number;
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
          document_type: BusinessDocumentType;
          document_name: string;
          file_url: string;
          file_size_bytes: number | null;
          verified_by: string | null;
          verified_at: string | null;
          rejection_reason: string | null;
          expiry_date: string | null;
          created_at: string | null;
          verification_status: BusinessDocumentStatus | null;
          business_id: string;
        };
        Insert: {
          id?: string;
          document_type: BusinessDocumentType;
          document_name: string;
          file_url: string;
          file_size_bytes?: number | null;
          verified_by?: string | null;
          verified_at?: string | null;
          rejection_reason?: string | null;
          expiry_date?: string | null;
          created_at?: string | null;
          verification_status?: BusinessDocumentStatus | null;
          business_id: string;
        };
        Update: {
          id?: string;
          document_type?: BusinessDocumentType;
          document_name?: string;
          file_url?: string;
          file_size_bytes?: number | null;
          verified_by?: string | null;
          verified_at?: string | null;
          rejection_reason?: string | null;
          expiry_date?: string | null;
          created_at?: string | null;
          verification_status?: BusinessDocumentStatus | null;
          business_id?: string;
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
      // Business Setup Progress
      business_setup_progress: {
        Row: {
          id: string;
          business_id: string | null;
          current_step: number | null;
          total_steps: number | null;
          business_profile_completed: boolean | null;
          locations_completed: boolean | null;
          services_pricing_completed: boolean | null;
          staff_setup_completed: boolean | null;
          integrations_completed: boolean | null;
          stripe_connect_completed: boolean | null;
          subscription_completed: boolean | null;
          go_live_completed: boolean | null;
          phase_1_completed: boolean | null;
          phase_1_completed_at: string | null;
          phase_2_completed: boolean | null;
          phase_2_completed_at: string | null;
          plaid_connected: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          current_step?: number | null;
          total_steps?: number | null;
          business_profile_completed?: boolean | null;
          locations_completed?: boolean | null;
          services_pricing_completed?: boolean | null;
          staff_setup_completed?: boolean | null;
          integrations_completed?: boolean | null;
          stripe_connect_completed?: boolean | null;
          subscription_completed?: boolean | null;
          go_live_completed?: boolean | null;
          phase_1_completed?: boolean | null;
          phase_1_completed_at?: string | null;
          phase_2_completed?: boolean | null;
          phase_2_completed_at?: string | null;
          plaid_connected?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string | null;
          current_step?: number | null;
          total_steps?: number | null;
          business_profile_completed?: boolean | null;
          locations_completed?: boolean | null;
          services_pricing_completed?: boolean | null;
          staff_setup_completed?: boolean | null;
          integrations_completed?: boolean | null;
          stripe_connect_completed?: boolean | null;
          subscription_completed?: boolean | null;
          go_live_completed?: boolean | null;
          phase_1_completed?: boolean | null;
          phase_1_completed_at?: string | null;
          phase_2_completed?: boolean | null;
          phase_2_completed_at?: string | null;
          plaid_connected?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      // Application Approvals
      application_approvals: {
        Row: {
          id: string;
          business_id: string | null;
          application_id: string | null;
          approved_by: string | null;
          approval_token: string | null;
          token_expires_at: string | null;
          approval_notes: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          application_id?: string | null;
          approved_by?: string | null;
          approval_token?: string | null;
          token_expires_at?: string | null;
          approval_notes?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string | null;
          application_id?: string | null;
          approved_by?: string | null;
          approval_token?: string | null;
          token_expires_at?: string | null;
          approval_notes?: string | null;
          created_at?: string | null;
        };
      };
      // Business Verifications
      business_verifications: {
        Row: {
          id: string;
          business_id: string;
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          notes: string | null;
          is_verified: boolean | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          notes?: string | null;
          is_verified?: boolean | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          notes?: string | null;
          is_verified?: boolean | null;
        };
      };
      // Business Subscriptions
      business_subscriptions: {
        Row: {
          id: string;
          business_id: string;
          device_type: string;
          transaction_data: string | null;
          start_date: string;
          end_date: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          stripe_price_id: string | null;
          subscription_status: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          device_type: string;
          transaction_data?: string | null;
          start_date: string;
          end_date?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          subscription_status?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          device_type?: string;
          transaction_data?: string | null;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          subscription_status?: string | null;
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
      // Provider availability
      provider_availability: {
        Row: {
          id: string;
          provider_id: string | null;
          business_id: string | null;
          schedule_type: string | null;
          day_of_week: number | null;
          start_date: string | null;
          end_date: string | null;
          start_time: string;
          end_time: string;
          max_bookings_per_slot: number | null;
          slot_duration_minutes: number | null;
          buffer_time_minutes: number | null;
          is_active: boolean | null;
          is_blocked: boolean | null;
          block_reason: string | null;
          allowed_services: string[] | null;
          location_type: string | null;
          service_location_id: string | null;
          override_price: number | null;
          notes: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          provider_id?: string | null;
          business_id?: string | null;
          schedule_type?: string | null;
          day_of_week?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          start_time: string;
          end_time: string;
          max_bookings_per_slot?: number | null;
          slot_duration_minutes?: number | null;
          buffer_time_minutes?: number | null;
          is_active?: boolean | null;
          is_blocked?: boolean | null;
          block_reason?: string | null;
          allowed_services?: string[] | null;
          location_type?: string | null;
          service_location_id?: string | null;
          override_price?: number | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          provider_id?: string | null;
          business_id?: string | null;
          schedule_type?: string | null;
          day_of_week?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          start_time?: string;
          end_time?: string;
          max_bookings_per_slot?: number | null;
          slot_duration_minutes?: number | null;
          buffer_time_minutes?: number | null;
          is_active?: boolean | null;
          is_blocked?: boolean | null;
          block_reason?: string | null;
          allowed_services?: string[] | null;
          location_type?: string | null;
          service_location_id?: string | null;
          override_price?: number | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      // Provider availability exceptions
      provider_availability_exceptions: {
        Row: {
          id: string;
          provider_id: string | null;
          exception_date: string;
          exception_type: string | null;
          start_time: string | null;
          end_time: string | null;
          max_bookings: number | null;
          service_location_id: string | null;
          reason: string;
          notes: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          provider_id?: string | null;
          exception_date: string;
          exception_type?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          max_bookings?: number | null;
          service_location_id?: string | null;
          reason: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          provider_id?: string | null;
          exception_date?: string;
          exception_type?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          max_bookings?: number | null;
          service_location_id?: string | null;
          reason?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
  };
};

// Type exports for convenience
export type Provider = Database['public']['Tables']['providers']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type BusinessProfile = Database['public']['Tables']['business_profiles']['Row'];
export type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row'];
export type Promotion = Database['public']['Tables']['promotions']['Row'];
export type PromotionUsage = Database['public']['Tables']['promotion_usage']['Row'];

// Review and Tip Types
export interface Review {
  id: string;
  booking_id: string;
  overall_rating: number;
  service_rating?: number;
  communication_rating?: number;
  punctuality_rating?: number;
  review_text?: string;
  is_approved?: boolean;
  is_featured?: boolean;
  moderated_by?: string;
  moderated_at?: string;
  moderation_notes?: string;
  created_at: string;
}

export interface Tip {
  id: string;
  booking_id: string;
  customer_id?: string;
  provider_id: string;
  business_id: string;
  tip_amount: number;
  tip_percentage?: number;
  stripe_payment_intent_id?: string;
  payment_status?: string;
  platform_fee_amount?: number;
  provider_net_amount: number;
  customer_message?: string;
  provider_response?: string;
  provider_responded_at?: string;
  tip_given_at: string;
  payment_processed_at?: string;
  payout_status?: string;
  payout_batch_id?: string;
  payout_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewFormData {
  overall_rating: number;
  service_rating?: number;
  communication_rating?: number;
  punctuality_rating?: number;
  review_text?: string;
}

export interface TipFormData {
  tip_amount: number;
  tip_percentage?: number;
  customer_message?: string;
}
