export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      business_profiles: {
        Row: {
          id: string
          business_name: string
          business_type: string
          contact_email: string
          phone: string
          website_url: string | null
          verification_status: string
          is_active: boolean
          setup_step: number
          setup_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_name: string
          business_type: string
          contact_email: string
          phone: string
          website_url?: string | null
          verification_status?: string
          is_active?: boolean
          setup_step?: number
          setup_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_name?: string
          business_type?: string
          contact_email?: string
          phone?: string
          website_url?: string | null
          verification_status?: string
          is_active?: boolean
          setup_step?: number
          setup_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      customer_profiles: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          date_of_birth: string | null
          bio: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          date_of_birth?: string | null
          bio?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          date_of_birth?: string | null
          bio?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      providers: {
        Row: {
          id: string
          user_id: string
          business_id: string
          location_id: string | null
          first_name: string
          last_name: string
          email: string
          phone: string
          bio: string | null
          date_of_birth: string | null
          experience_years: number | null
          verification_status: string
          background_check_status: string
          is_active: boolean
          business_managed: boolean
          provider_role: string
          image_url: string | null
          cover_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_id: string
          location_id?: string | null
          first_name: string
          last_name: string
          email: string
          phone: string
          bio?: string | null
          date_of_birth?: string | null
          experience_years?: number | null
          verification_status?: string
          background_check_status?: string
          is_active?: boolean
          business_managed?: boolean
          provider_role?: string
          image_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_id?: string
          location_id?: string | null
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          bio?: string | null
          date_of_birth?: string | null
          experience_years?: number | null
          verification_status?: string
          background_check_status?: string
          is_active?: boolean
          business_managed?: boolean
          provider_role?: string
          image_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          customer_id: string
          provider_id: string
          service_id: string
          booking_date: string
          start_time: string
          total_amount: number
          created_at: string
          service_fee: number
          service_fee_charged: boolean
          booking_status: string
          payment_status: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          rescheduled_at: string | null
          rescheduled_by: string | null
          reschedule_reason: string | null
          original_booking_date: string | null
          original_start_time: string | null
          reschedule_count: number
          reference_number: string | null
          service_location: string | null
          duration: number | null
          assigned_provider: string | null
          booking_reference: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          provider_id: string
          service_id: string
          booking_date: string
          start_time: string
          total_amount: number
          created_at?: string
          service_fee?: number
          service_fee_charged?: boolean
          booking_status?: string
          payment_status?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          rescheduled_at?: string | null
          rescheduled_by?: string | null
          reschedule_reason?: string | null
          original_booking_date?: string | null
          original_start_time?: string | null
          reschedule_count?: number
          reference_number?: string | null
          service_location?: string | null
          duration?: number | null
          assigned_provider?: string | null
          booking_reference?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          provider_id?: string
          service_id?: string
          booking_date?: string
          start_time?: string
          total_amount?: number
          created_at?: string
          service_fee?: number
          service_fee_charged?: boolean
          booking_status?: string
          payment_status?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          rescheduled_at?: string | null
          rescheduled_by?: string | null
          reschedule_reason?: string | null
          original_booking_date?: string | null
          original_start_time?: string | null
          reschedule_count?: number
          reference_number?: string | null
          service_location?: string | null
          duration?: number | null
          assigned_provider?: string | null
          booking_reference?: string | null
        }
      }
      services: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          min_price: number
          max_price: number | null
          duration_minutes: number
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category: string
          min_price: number
          max_price?: number | null
          duration_minutes: number
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          min_price?: number
          max_price?: number | null
          duration_minutes?: number
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      business_services: {
        Row: {
          id: string
          business_id: string
          service_id: string
          business_price: number
          business_duration_minutes: number
          delivery_type: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          service_id: string
          business_price: number
          business_duration_minutes: number
          delivery_type: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          service_id?: string
          business_price?: number
          business_duration_minutes?: number
          delivery_type?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      business_locations: {
        Row: {
          id: string
          business_id: string
          location_name: string
          address_line1: string
          address_line2: string | null
          city: string
          state: string
          postal_code: string
          country: string
          mobile_service_radius: number | null
          is_primary: boolean
          offers_mobile_services: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          location_name: string
          address_line1: string
          address_line2?: string | null
          city: string
          state: string
          postal_code: string
          country: string
          mobile_service_radius?: number | null
          is_primary?: boolean
          offers_mobile_services?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          location_name?: string
          address_line1?: string
          address_line2?: string | null
          city?: string
          state?: string
          postal_code?: string
          country?: string
          mobile_service_radius?: number | null
          is_primary?: boolean
          offers_mobile_services?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      provider_availability: {
        Row: {
          id: string
          provider_id: string
          day_of_week: string
          schedule_type: string
          start_time: string
          end_time: string
          start_date: string | null
          end_date: string | null
          max_bookings_per_slot: number | null
          slot_duration_minutes: number | null
          buffer_time_minutes: number | null
          location_type: string | null
          is_blocked: boolean
          block_reason: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          day_of_week: string
          schedule_type: string
          start_time: string
          end_time: string
          start_date?: string | null
          end_date?: string | null
          max_bookings_per_slot?: number | null
          slot_duration_minutes?: number | null
          buffer_time_minutes?: number | null
          location_type?: string | null
          is_blocked?: boolean
          block_reason?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          day_of_week?: string
          schedule_type?: string
          start_time?: string
          end_time?: string
          start_date?: string | null
          end_date?: string | null
          max_bookings_per_slot?: number | null
          slot_duration_minutes?: number | null
          buffer_time_minutes?: number | null
          location_type?: string | null
          is_blocked?: boolean
          block_reason?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      provider_booking_preferences: {
        Row: {
          id: string
          provider_id: string
          min_advance_hours: number
          max_advance_days: number
          auto_accept_bookings: boolean
          auto_accept_within_hours: number
          allow_cancellation: boolean
          cancellation_window_hours: number
          max_bookings_per_day: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          min_advance_hours: number
          max_advance_days: number
          auto_accept_bookings: boolean
          auto_accept_within_hours: number
          allow_cancellation: boolean
          cancellation_window_hours: number
          max_bookings_per_day?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          min_advance_hours?: number
          max_advance_days?: number
          auto_accept_bookings?: boolean
          auto_accept_within_hours?: number
          allow_cancellation?: boolean
          cancellation_window_hours?: number
          max_bookings_per_day?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      business_hours: {
        Row: {
          id: string
          business_id: string
          monday: Json
          tuesday: Json
          wednesday: Json
          thursday: Json
          friday: Json
          saturday: Json
          sunday: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          monday: Json
          tuesday: Json
          wednesday: Json
          thursday: Json
          friday: Json
          saturday: Json
          sunday: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          monday?: Json
          tuesday?: Json
          wednesday?: Json
          thursday?: Json
          friday?: Json
          saturday?: Json
          sunday?: Json
          created_at?: string
          updated_at?: string
        }
      }
      system_config: {
        Row: {
          id: string
          config_key: string
          config_value: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          config_key: string
          config_value: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          config_key?: string
          config_value?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
