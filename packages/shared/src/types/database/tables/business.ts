import type {
  Json,
  BusinessType,
  VerificationStatus,
  SubscriptionStatus,
  ServiceStatus,
  ServiceCategoryType,
  ServiceSubcategoryType,
  BusinessDocumentType,
  BusinessDocumentStatus,
} from '../enums';

// Business Profiles Table
export interface BusinessProfilesTable {
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
}

// Business Locations Table
export interface BusinessLocationsTable {
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
}

// Services Table
export interface ServicesTable {
  Row: {
    id: string;
    business_id: string;
    service_name: string;
    description: string | null;
    min_price: number | null;
    max_price: number | null;
    duration_minutes: number | null;
    is_active: ServiceStatus;
    created_at: string | null;
    updated_at: string | null;
    service_category: ServiceCategoryType | null;
    service_subcategory: ServiceSubcategoryType | null;
    image_url: string | null;
  };
  Insert: {
    id?: string;
    business_id: string;
    service_name: string;
    description?: string | null;
    min_price?: number | null;
    max_price?: number | null;
    duration_minutes?: number | null;
    is_active?: ServiceStatus;
    created_at?: string | null;
    updated_at?: string | null;
    service_category?: ServiceCategoryType | null;
    service_subcategory?: ServiceSubcategoryType | null;
    image_url?: string | null;
  };
  Update: {
    id?: string;
    business_id?: string;
    service_name?: string;
    description?: string | null;
    min_price?: number | null;
    max_price?: number | null;
    duration_minutes?: number | null;
    is_active?: ServiceStatus;
    created_at?: string | null;
    updated_at?: string | null;
    service_category?: ServiceCategoryType | null;
    service_subcategory?: ServiceSubcategoryType | null;
    image_url?: string | null;
  };
}

// Business Service Categories Table
export interface BusinessServiceCategoriesTable {
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
}

// Business Service Subcategories Table
export interface BusinessServiceSubcategoriesTable {
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
}

// Business Documents Table
export interface BusinessDocumentsTable {
  Row: {
    id: string;
    business_id: string;
    document_type: BusinessDocumentType;
    document_url: string;
    original_filename: string | null;
    file_size: number | null;
    mime_type: string | null;
    upload_status: BusinessDocumentStatus;
    uploaded_at: string;
    verified_at: string | null;
    verified_by: string | null;
    rejection_reason: string | null;
    expiry_date: string | null;
    is_required: boolean;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    business_id: string;
    document_type: BusinessDocumentType;
    document_url: string;
    original_filename?: string | null;
    file_size?: number | null;
    mime_type?: string | null;
    upload_status?: BusinessDocumentStatus;
    uploaded_at?: string;
    verified_at?: string | null;
    verified_by?: string | null;
    rejection_reason?: string | null;
    expiry_date?: string | null;
    is_required?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    business_id?: string;
    document_type?: BusinessDocumentType;
    document_url?: string;
    original_filename?: string | null;
    file_size?: number | null;
    mime_type?: string | null;
    upload_status?: BusinessDocumentStatus;
    uploaded_at?: string;
    verified_at?: string | null;
    verified_by?: string | null;
    rejection_reason?: string | null;
    expiry_date?: string | null;
    is_required?: boolean;
    created_at?: string;
    updated_at?: string;
  };
}

// Type exports for convenience
export type BusinessProfile = BusinessProfilesTable['Row'];
export type BusinessLocation = BusinessLocationsTable['Row'];
export type Service = ServicesTable['Row'];
export type BusinessDocument = BusinessDocumentsTable['Row'];