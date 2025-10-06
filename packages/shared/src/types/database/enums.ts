// Core JSON type
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
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
export type TipStatus = 'pending' | 'requested' | 'paid' | 'declined';
export type DeliveryType = 'business_location' | 'customer_location' | 'virtual' | 'both_locations';

// User Types
export type UserRole = 'admin' | 'owner' | 'dispatcher' | 'provider' | 'customer';
export type UserRoleType = 'admin' | 'owner' | 'dispatcher' | 'provider' | 'customer';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';
export type ProviderRole = 'provider' | 'owner' | 'dispatcher';

// Provider Verification Types
export type ProviderVerificationStatus = 'pending' | 'documents_submitted' | 'under_review' | 'approved' | 'rejected';
export type BackgroundCheckStatus = 'under_review' | 'pending' | 'approved' | 'rejected' | 'expired';

// Service Types
export type ServiceStatus = 'active' | 'inactive' | 'draft';
export type ServiceCategoryType = "beauty" | "fitness" | "therapy" | "healthcare";
export type ServiceSubcategoryType = "hair_and_makeup" | "spray_tan" | "esthetician" | "massage_therapy" | "iv_therapy" | "physical_therapy" | "nurse_practitioner" | "physician" | "chiropractor" | "yoga_instructor" | "pilates_instructor" | "personal_trainer" | "injectables" | "health_coach";
export type CustomerLocationType = "Home" | "Condo" | "Hotel" | "Other" | null;

// Notification Types
export type NotificationType = 'booking_status_update' | 'new_message' | 'booking_reminder' | 'system_alert' | 'payment_received';
export type NotificationStatus = 'sent' | 'delivered' | 'failed' | 'pending';
export type MessageNotificationType = 'message' | 'mention' | 'system';

// Transaction Types
export type TransactionType = 'booking_payment' | 'platform_fee' | 'provider_payout' | 'refund' | 'adjustment' | 'tip';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type Status = 'pending' | 'completed' | 'failed' | 'cancelled';

// Promotion Types
export type PromotionSavingsType = 'percentage_off' | 'fixed_amount';

// Document Types
export type BusinessDocumentType = 'drivers_license' | 'proof_of_address' | 'liability_insurance' | 'professional_license' | 'professional_certificate' | 'business_license';
export type BusinessDocumentStatus = 'pending' | 'verified' | 'rejected' | 'under_review';

// Announcement Types
export type AnnouncementAudience = 'all' | 'customer' | 'provider' | 'business' | 'staff';
export type AnnouncementType = 'general' | 'promotional' | 'maintenance' | 'feature' | 'alert' | 'news' | 'update';

// MFA Types
export type MfaMethodType = 'totp' | 'sms' | 'email' | 'backup';
export type MfaStatusType = 'pending' | 'active' | 'disabled' | 'locked';

// Device Types
export type DeviceType = 'ios' | 'android' | 'web' | 'desktop';
export type DeviceStatus = 'active' | 'inactive' | 'blocked';

// Audit Types
export type AuditEventType = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'password_change' | 'permission_change' | 'data_export' | 'data_import';