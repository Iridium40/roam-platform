import type {
  UserRole as UserRoleEnum,
  CustomerLocationType,
} from '../enums';

// Customer Profiles Table
export interface CustomerProfilesTable {
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
}

// Providers Table
export interface ProvidersTable {
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
}

// User Roles Table
export interface UserRolesTable {
  Row: {
    id: string;
    user_id: string;
    role: UserRoleEnum;
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
    role: UserRoleEnum;
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
    role?: UserRoleEnum;
    business_id?: string | null;
    location_id?: string | null;
    granted_by?: string | null;
    granted_at?: string;
    expires_at?: string | null;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };
}

// Customer Locations Table
export interface CustomerLocationsTable {
  Row: {
    id: string;
    customer_id: string;
    location_name: string | null;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    location_type: CustomerLocationType;
    special_instructions: string | null;
    is_default: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    customer_id: string;
    location_name?: string | null;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    state: string;
    postal_code: string;
    country?: string;
    latitude?: number | null;
    longitude?: number | null;
    location_type?: CustomerLocationType;
    special_instructions?: string | null;
    is_default?: boolean;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    customer_id?: string;
    location_name?: string | null;
    address_line1?: string;
    address_line2?: string | null;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    latitude?: number | null;
    longitude?: number | null;
    location_type?: CustomerLocationType;
    special_instructions?: string | null;
    is_default?: boolean;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };
}

// Provider Availability Table
export interface ProviderAvailabilityTable {
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
}

// Admin Users Table
export interface AdminUsersTable {
  Row: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    role?: string;
    is_active?: boolean;
    last_login_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
    is_active?: boolean;
    last_login_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
}

// Type exports for convenience
export type CustomerProfile = CustomerProfilesTable['Row'];
export type Provider = ProvidersTable['Row'];
export type UserRole = UserRolesTable['Row'];
export type CustomerLocation = CustomerLocationsTable['Row'];
export type ProviderAvailability = ProviderAvailabilityTable['Row'];
export type AdminUser = AdminUsersTable['Row'];