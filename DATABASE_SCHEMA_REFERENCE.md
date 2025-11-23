# 🗄️ ROAM Platform Database Schema Reference

*Live database schema from Supabase - Last updated: 2025-10-15*

**✅ VERIFIED VIA SUPABASE MCP** - All schemas below are confirmed against the live production database.

---

## 📊 Database Overview

- **Total Tables**: 71
- **Tables with RLS**: 21
- **Total Records**: ~600+
- **Project**: vssomyuyhicaxsgiaupo
- **Last Verified**: October 15, 2025

---

## 📑 Table of Contents

1. [Authentication & User Management](#-authentication--user-management) (6 tables)
2. [Customer Domain](#-customer-domain) (7 tables)
3. [Provider Domain](#-provider-domain) (9 tables)
4. [Business Domain](#-business-domain) (13 tables)
5. [Services](#%EF%B8%8F-services) (5 tables)
6. [Bookings](#-bookings) (3 tables)
7. [Financial & Payments](#-financial--payments) (9 tables)
8. [Reviews](#-reviews) (1 table)
9. [Messaging & Communication](#-messaging--communication) (6 tables)
10. [Platform Management](#-platform-management) (3 tables)
11. [System & Configuration](#%EF%B8%8F-system--configuration) (3 tables)
12. [Stripe & Banking Integration](#-stripe--banking-integration) (6 tables)

---

## 🔐 Authentication & User Management

### 📋 User Role Architecture

**IMPORTANT**: All users start in `auth.users`, then are mapped to role-specific tables:

- **🔐 auth.users** - Base authentication for ALL users
- **👤 customer_profiles** - Users with role `customer`
- **👨‍💼 admin_users** - Users with role `admin` 
- **🏢 providers** - Users with roles `Owner`, `Dispatcher`, or `Provider`

**Role Flow**:
1. User registers → `auth.users` (base authentication)
2. Role assigned → Corresponding profile table created
3. Role-specific data → Stored in respective domain table

---

### `admin_users`
**Rows**: 1 | **RLS**: ❌ Disabled

Admin user profiles and permissions.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `email` (varchar)
- `first_name`, `last_name` (text)
- `permissions` (jsonb, default: `[]`)
- `is_active` (boolean, default: true)
- `role` (user_role enum: `admin`, `manager`, `support`, `analyst`)
- `notification_email`, `notification_phone` (text)
- `image_url` (text)
- `created_at` (timestamp)

---

### `user_settings`
**Rows**: 3 | **RLS**: ✅ Enabled

User preferences and application settings.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, unique, FK → auth.users.id)
- `theme` (text, default: `system`, options: `light`, `dark`, `system`)
- `language` (text, default: `en`)
- `timezone` (text, default: `UTC`)
- `email_notifications` (boolean, default: true)
- `sms_notifications` (boolean)
- `push_notifications` (boolean, default: true)
- `sound_enabled` (boolean, default: true)
- `auto_logout_minutes` (integer, default: 60)
- `date_format` (text, default: `MM/DD/YYYY`)
- `time_format` (text, default: `12h`, options: `12h`, `24h`)
- `items_per_page` (integer, default: 25)
- `sidebar_collapsed` (boolean, default: false)
- `created_at`, `updated_at` (timestamptz)

---

### `mfa_settings`
**Rows**: 0 | **RLS**: ✅ Enabled

User MFA preferences and settings.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, unique, FK → auth.users.id)
- `mfa_enabled` (boolean, default: false)
- `mfa_required` (boolean, default: true)
- `remember_device_days` (integer, default: 30)
- `backup_codes_enabled` (boolean, default: true)
- `backup_codes_count` (integer, default: 10)
- `created_at`, `updated_at` (timestamptz)

---

### `mfa_factors`
**Rows**: 0 | **RLS**: ✅ Enabled

MFA authentication factors for users.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `factor_id` (uuid)
- `method` (mfa_method_type enum: `totp`, `sms`, `email`, `backup`)
- `friendly_name` (text)
- `secret` (text)
- `backup_codes` (text[])
- `is_primary` (boolean, default: false)
- `is_verified` (boolean, default: false)
- `verification_attempts` (integer, default: 0)
- `max_attempts` (integer, default: 5)
- `locked_until` (timestamptz)
- `last_used_at` (timestamptz)
- `created_at`, `updated_at` (timestamptz)

---

### `mfa_challenges`
**Rows**: 0 | **RLS**: ✅ Enabled

MFA verification challenges.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `challenge_id` (uuid)
- `factor_id` (uuid, FK → mfa_factors.id)
- `method` (mfa_method_type enum)
- `code` (text)
- `expires_at` (timestamptz)
- `verified_at` (timestamptz)
- `ip_address` (inet)
- `user_agent` (text)
- `created_at` (timestamptz)

---

### `mfa_sessions`
**Rows**: 0 | **RLS**: ✅ Enabled

MFA-completed sessions tracking.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `session_id` (uuid)
- `factor_id` (uuid, FK → mfa_factors.id)
- `mfa_completed_at` (timestamptz)
- `expires_at` (timestamptz)
- `ip_address` (inet)
- `user_agent` (text)
- `created_at` (timestamptz)

---

## 👥 Customer Domain

### `customer_profiles`
**Rows**: 7 | **RLS**: ❌ Disabled

Customer profile information and preferences.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, unique, FK → auth.users.id)
- `email`, `phone` (text)
- `first_name`, `last_name` (text)
- `date_of_birth` (date)
- `image_url` (text) - Avatar
- `bio` (text)
- `is_active` (boolean, default: true)
- `email_notifications` (boolean, default: true)
- `sms_notifications` (boolean, default: true)
- `push_notifications` (boolean, default: true)
- `marketing_emails` (boolean, default: false)
- `email_verified` (boolean, default: false)
- `phone_verified` (boolean, default: false)
- `created_at` (timestamptz)

---

### `customer_stripe_profiles`
**Rows**: 1 | **RLS**: ❌ Disabled

Customer Stripe payment integration.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → customer_profiles.user_id)
- `stripe_customer_id` (text, unique)
- `stripe_email` (text)
- `default_payment_method_id` (text)
- `billing_address` (jsonb)
- `payment_methods` (jsonb, default: `[]`)
- `subscription_status` (text)
- `created_at`, `updated_at` (timestamptz)

---

### `customer_subscriptions`
**Rows**: 0 | **RLS**: ❌ Disabled

Customer subscription management.

**Key Columns**:
- `id` (uuid, PK)
- `customer_id` (uuid, FK → customer_profiles.id)
- `device_type` (text)
- `transaction_data` (text)
- `start_date` (date)
- `end_date` (date)
- `is_active` (boolean, default: true)
- `stripe_subscription_id`, `stripe_customer_id`, `stripe_price_id` (text)
- `subscription_status` (text)
- `created_at`, `updated_at` (timestamptz)

---

### `customer_locations`
**Rows**: 4 | **RLS**: ✅ Enabled

Customer delivery addresses.

**Key Columns**:
- `id` (uuid, PK)
- `customer_id` (uuid, FK → auth.users.id)
- `location_name` (varchar)
- `street_address` (text) - ⚠️ NOT address_line1
- `unit_number` (varchar) - ⚠️ NOT address_line2
- `city` (varchar)
- `state` (varchar)
- `zip_code` (varchar) - ⚠️ NOT postal_code
- `latitude`, `longitude` (numeric)
- `is_primary` (boolean, default: false)
- `is_active` (boolean, default: true)
- `access_instructions` (text)
- `location_type` (customer_location_type enum: `Home`, `Condo`, `Hotel`, `Other`, `Null`)
- `created_at` (timestamp)

---

### `customer_favorite_services`
**Rows**: 3 | **RLS**: ✅ Enabled

Customer favorited services.

**Key Columns**:
- `id` (uuid, PK)
- `customer_id` (uuid, FK → customer_profiles.id)
- `service_id` (uuid, FK → services.id)
- `created_at` (timestamptz)

---

### `customer_favorite_providers`
**Rows**: 1 | **RLS**: ✅ Enabled

Customer favorited providers.

**Key Columns**:
- `id` (uuid, PK)
- `customer_id` (uuid, FK → customer_profiles.id)
- `provider_id` (uuid, FK → providers.id)
- `created_at` (timestamptz)

---

### `customer_favorite_businesses`
**Rows**: 2 | **RLS**: ✅ Enabled

Customer favorited businesses.

**Key Columns**:
- `id` (uuid, PK)
- `customer_id` (uuid, FK → customer_profiles.id)
- `business_id` (uuid, FK → business_profiles.id)
- `created_at` (timestamptz)

---

## 👨‍💼 Provider Domain

### `providers`
**Rows**: 44 | **RLS**: ❌ Disabled

Provider/staff profiles and information.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `business_id` (uuid, FK → business_profiles.id)
- `location_id` (uuid, FK → business_locations.id)
- `first_name`, `last_name` (text)
- `email`, `phone` (text)
- `bio` (text)
- `image_url` (text) - Avatar
- `cover_image_url` (text)
- `date_of_birth` (date)
- `experience_years` (integer)
- `verification_status` (provider_verification_status enum: `pending`, `documents_submitted`, `under_review`, `approved`, `rejected`, default: `pending`)
- `background_check_status` (background_check_status enum: `under_review`, `pending`, `approved`, `rejected`, `expired`, default: `under_review`)
- `identity_verification_status` (text, default: `pending`)
- `provider_role` (provider_role enum: `provider`, `owner`, `dispatcher`)
- `business_managed` (boolean)
- `is_active` (boolean, default: true)
- `active_for_bookings` (boolean) - Controls if bookable in customer app
- `total_bookings`, `completed_bookings` (integer, default: 0)
- `average_rating` (numeric, default: 0)
- `total_reviews` (integer, default: 0)
- `notification_email`, `notification_phone` (text)
- `created_at` (timestamptz)

---

### `provider_verifications`
**Rows**: 0 | **RLS**: ✅ Enabled

Stripe identity verification for providers.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `stripe_verification_session_id` (text, unique)
- `verification_status` (text, default: `requires_input`, options: `requires_input`, `processing`, `verified`, `canceled`)
- `verification_type` (text, default: `identity`, options: `identity`, `document`)
- `verified_data` (jsonb)
- `created_at`, `updated_at` (timestamptz)

---

### `provider_services`
**Rows**: 84 | **RLS**: ❌ Disabled

Services that providers can perform.

**Key Columns**:
- `id` (uuid, PK)
- `provider_id` (uuid, FK → providers.id)
- `service_id` (uuid, FK → services.id)
- `is_active` (boolean, default: true)
- `created_at` (timestamp)

---

### `provider_booking_preferences`
**Rows**: 5 | **RLS**: ✅ Enabled

Provider booking preferences and settings.

**Key Columns**:
- `id` (uuid, PK)
- `provider_id` (uuid, unique, FK → providers.id)
- `min_advance_hours` (integer, default: 2)
- `max_advance_days` (integer, default: 30)
- `auto_accept_bookings` (boolean, default: false)
- `auto_accept_within_hours` (integer, default: 24)
- `allow_cancellation` (boolean, default: true)
- `cancellation_window_hours` (integer, default: 24)
- `notify_new_booking`, `notify_cancellation` (boolean, default: true)
- `notify_reminder_hours` (integer, default: 2)
- `prefer_consecutive_bookings` (boolean, default: false)
- `min_break_between_bookings` (integer, default: 15)
- `max_bookings_per_day` (integer, default: 8)
- `updated_at` (timestamptz)

---

### `provider_bank_accounts`
**Rows**: 0 | **RLS**: ✅ Enabled

Provider bank account connections (deprecated - using Stripe Connect).

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `business_id` (uuid, unique, FK → business_profiles.id)
- `plaid_access_token`, `plaid_item_id` (text, unique) - Deprecated, using Stripe Connect
- `account_data`, `institution_data` (jsonb)
- `webhook_status` (text)
- `webhook_error` (jsonb)
- `last_webhook_at`, `connected_at` (timestamptz)
- `created_at`, `updated_at` (timestamptz)

---

### `provider_availability`
**Rows**: 25 | **RLS**: ✅ Enabled

Provider availability schedules.

**Key Columns**:
- `id` (uuid, PK)
- `provider_id` (uuid, FK → providers.id)
- `business_id` (uuid, FK → business_profiles.id)
- `schedule_type` (text, options: `weekly_recurring`, `specific_date`, `date_range`)
- `day_of_week` (integer, 0-6)
- `start_date`, `end_date` (date)
- `start_time`, `end_time` (time)
- `max_bookings_per_slot` (integer, default: 1)
- `slot_duration_minutes` (integer, default: 60)
- `buffer_time_minutes` (integer, default: 15)
- `is_active` (boolean, default: true)
- `is_blocked` (boolean, default: false)
- `block_reason` (text)
- `allowed_services` (uuid[])
- `location_type` (text, default: `both`, options: `mobile`, `business`, `both`)
- `service_location_id` (uuid, FK → business_locations.id)
- `override_price` (numeric)
- `notes` (text)
- `created_by` (uuid, FK → auth.users.id)
- `created_at`, `updated_at` (timestamptz)

---

### `provider_availability_exceptions`
**Rows**: 0 | **RLS**: ✅ Enabled

Provider availability exceptions and overrides.

**Key Columns**:
- `id` (uuid, PK)
- `provider_id` (uuid, FK → providers.id)
- `exception_date` (date)
- `exception_type` (text, default: `unavailable`, options: `unavailable`, `limited_hours`, `different_location`)
- `start_time`, `end_time` (time)
- `max_bookings` (integer)
- `service_location_id` (uuid, FK → business_locations.id)
- `reason` (text)
- `notes` (text)
- `created_by` (uuid, FK → auth.users.id)
- `created_at`, `updated_at` (timestamptz)

---

### `provider_applications`
**Rows**: 42 | **RLS**: ✅ Enabled

Provider onboarding applications.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `business_id` (uuid, FK → business_profiles.id)
- `application_status` (text, default: `submitted`)
- `review_status` (text, default: `pending`)
- `consents_given`, `submission_metadata` (jsonb)
- `submitted_at`, `reviewed_at` (timestamptz)
- `reviewed_by` (uuid)
- `approval_notes` (text)
- `created_at`, `updated_at` (timestamptz)

---

### `provider_addons`
**Rows**: 11 | **RLS**: ❌ Disabled

Provider addon capabilities.

**Key Columns**:
- `id` (uuid, PK)
- `provider_id` (uuid, FK → providers.id)
- `addon_id` (uuid, FK → service_addons.id)
- `is_active` (boolean, default: true)
- `created_at` (timestamp)

---

## 🏢 Business Domain

### `business_profiles`
**Rows**: 50 | **RLS**: ❌ Disabled

Business information and settings.

**Key Columns**:
- `id` (uuid, PK)
- `business_name` (text)
- `business_type` (business_type enum: `independent`, `small_business`, `franchise`, `enterprise`, `other`)
- `business_description` (text)
- `contact_email`, `phone` (text)
- `verification_status` (verification_status enum: `pending`, `approved`, `rejected`, `suspended`, default: `pending`)
- `verification_notes` (text)
- `stripe_connect_account_id` (text)
- `is_active` (boolean, default: true)
- `is_featured` (boolean)
- `image_url`, `logo_url`, `cover_image_url`, `website_url` (text)
- `business_hours`, `social_media` (jsonb, default: `{}`)
- `service_categories` (service_category_types[], enums: `beauty`, `fitness`, `therapy`, `healthcare`)
- `service_subcategories` (service_subcategory_types[])
- `setup_completed` (boolean)
- `setup_step` (numeric)
- `identity_verified` (boolean, default: false)
- `identity_verified_at` (timestamptz)
- `bank_connected` (boolean, default: false)
- `bank_connected_at` (timestamptz)
- `application_submitted_at`, `approved_at` (timestamptz)
- `approved_by` (uuid)
- `approval_notes` (text)
- `created_at` (timestamptz)

---

### `business_locations`
**Rows**: 51 | **RLS**: ❌ Disabled

Business physical locations.

**Key Columns**:
- `id` (uuid, PK)
- `business_id` (uuid, FK → business_profiles.id)
- `location_name` (varchar)
- `address_line1` (varchar) - ⚠️ Different from customer_locations
- `address_line2` (varchar) - ⚠️ Different from customer_locations
- `city`, `state` (varchar)
- `postal_code` (varchar) - ⚠️ NOT zip_code
- `country` (varchar)
- `latitude`, `longitude` (double precision)
- `is_active` (boolean, default: true)
- `is_primary` (boolean)
- `offers_mobile_services` (boolean)
- `mobile_service_radius` (integer)
- `created_at` (timestamp)

---

### `business_services`
**Rows**: 56 | **RLS**: ❌ Disabled

Services offered by businesses with pricing.

**Key Columns**:
- `id` (uuid, PK)
- `business_id` (uuid, FK → business_profiles.id)
- `service_id` (uuid, FK → services.id)
- `business_price` (numeric)
- `business_duration_minutes` (integer) - Custom duration for this business service
- `is_active` (boolean, default: true)
- `delivery_type` (delivery_type enum: `business_location`, `customer_location`, `virtual`, `both_locations`)
- `created_at` (timestamptz)

---

### `business_documents`
**Rows**: 41 | **RLS**: ❌ Disabled

Business verification documents.

**Key Columns**:
- `id` (uuid, PK)
- `business_id` (uuid, FK → business_profiles.id)
- `document_type` (business_document_type enum: `drivers_license`, `proof_of_address`, `liability_insurance`, `professional_license`, `professional_certificate`, `business_license`)
- `document_name` (varchar)
- `file_url` (text)
- `file_size_bytes` (integer)
- `verification_status` (business_document_status enum: `pending`, `verified`, `rejected`, `under_review`)
- `verified_by` (uuid, FK → admin_users.id)
- `verified_at` (timestamp)
- `rejection_reason` (text)
- `expiry_date` (date)
- `created_at` (timestamp)

---

### `business_service_categories`
**Rows**: 37 | **RLS**: ✅ Enabled

Business service category assignments.

**Key Columns**:
- `id` (uuid, PK)
- `business_id` (uuid, FK → business_profiles.id)
- `category_id` (uuid, FK → service_categories.id)
- `is_active` (boolean, default: true)
- `created_at`, `updated_at` (timestamptz)

---

### `business_service_subcategories`
**Rows**: 64 | **RLS**: ✅ Enabled

Business service subcategory assignments.

**Key Columns**:
- `id` (uuid, PK)
- `business_id` (uuid, FK → business_profiles.id)
- `category_id` (uuid, FK → service_categories.id)
- `subcategory_id` (uuid, FK → service_subcategories.id)
- `is_active` (boolean, default: true)
- `created_at`, `updated_at` (timestamptz)

---

### `business_addons`
**Rows**: 6 | **RLS**: ❌ Disabled

Business addon pricing.

**Key Columns**:
- `id` (uuid, PK)
- `business_id` (uuid, FK → business_profiles.id)
- `addon_id` (uuid, FK → service_addons.id)
- `custom_price` (numeric)
- `is_available` (boolean, default: true)
- `created_at` (timestamp)

---

### `business_stripe_tax_info`
**Rows**: 1 | **RLS**: ✅ Enabled

Business tax registration for Stripe Tax.

**Key Columns**:
- `id` (uuid, PK)
- `business_id` (uuid, unique, FK → business_profiles.id)
- `legal_business_name` (text)
- `tax_id`, `tax_id_type` (text/varchar, check: `EIN`, `SSN`)
- `tax_address_line1`, `tax_address_line2` (text)
- `tax_city` (text)
- `tax_state` (varchar)
- `tax_postal_code` (varchar)
- `tax_country` (varchar, default: `US`)
- `business_entity_type` (varchar, check: `sole_proprietorship`, `partnership`, `llc`, `corporation`, `non_profit`)
- `tax_contact_name`, `tax_contact_email`, `tax_contact_phone` (text)
- `stripe_tax_recipient_id` (text)
- `stripe_tax_registered` (boolean, default: false)
- `stripe_tax_registration_date` (timestamptz)
- `stripe_tax_registration_error` (text)
- `w9_status` (varchar, default: `not_collected`, check: `not_collected`, `requested`, `received`, `invalid`, `expired`)
- `w9_requested_date`, `w9_received_date` (timestamptz)
- `tax_setup_completed` (boolean, default: false)
- `tax_setup_completed_date` (timestamptz)
- `created_at`, `updated_at` (timestamptz)

---

### `business_setup_progress`
**Rows**: 8 | **RLS**: ✅ Enabled

Business onboarding progress tracking.

**Key Columns**:
- `id` (uuid, PK)
- `business_id` (uuid, unique, FK → business_profiles.id)
- `current_step` (integer, default: 1)
- `total_steps` (integer, default: 8)
- `welcome_completed` (boolean, default: false)
- `welcome_data` (jsonb, default: `{}`)
- `business_profile_completed` (boolean, default: false)
- `business_profile_data` (jsonb, default: `{}`)
- `personal_profile_completed` (boolean, default: false)
- `personal_profile_data` (jsonb, default: `{}`)
- `locations_completed` (boolean, default: false)
- `business_hours_completed` (boolean, default: false)
- `business_hours_data` (jsonb, default: `{}`)
- `services_pricing_completed` (boolean, default: false)
- `service_pricing_completed` (boolean, default: false)
- `service_pricing_data` (jsonb, default: `{}`)
- `staff_setup_completed` (boolean, default: false)
- `banking_payout_completed` (boolean, default: false)
- `banking_payout_data` (jsonb, default: `{}`)
- `stripe_connect_completed` (boolean, default: false)
- `plaid_connected` (boolean, default: false) - Deprecated, using `stripe_connect_completed` instead
- `integrations_completed` (boolean, default: false)
- `subscription_completed` (boolean, default: false)
- `final_review_completed` (boolean, default: false)
- `final_review_data` (jsonb, default: `{}`)
- `go_live_completed` (boolean, default: false)
- `phase_1_completed` (boolean, default: false)
- `phase_1_completed_at` (timestamptz)
- `phase_2_completed` (boolean, default: false)
- `phase_2_completed_at` (timestamptz)
- `created_at`, `updated_at` (timestamptz)

---

### `business_payment_transactions`
**Rows**: 0 | **RLS**: ❌ Disabled

Platform payments to businesses for tax reporting.

**Key Columns**:
- `id` (uuid, PK)
- `booking_id` (uuid, unique, FK → bookings.id)
- `business_id` (uuid, FK → business_profiles.id)
- `payment_date` (date)
- `gross_payment_amount` (numeric)
- `platform_fee` (numeric, default: 0)
- `net_payment_amount` (numeric)
- `tax_year` (integer)
- `stripe_transfer_id`, `stripe_payment_intent_id` (text)
- `stripe_connect_account_id` (text)
- `stripe_tax_transaction_id` (text)
- `stripe_tax_reported` (boolean, default: false)
- `stripe_tax_report_date` (timestamptz)
- `stripe_tax_report_error` (text)
- `transaction_description` (text, default: `Platform service payment`)
- `booking_reference` (text)
- `created_at` (timestamptz)

---

### `business_annual_tax_tracking`
**Rows**: 0 | **RLS**: ❌ Disabled

Annual tax tracking per business for 1099 eligibility.

**Key Columns**:
- `id` (uuid, PK)
- `business_id` (uuid, FK → business_profiles.id)
- `tax_year` (integer)
- `total_payments_received` (numeric, default: 0)
- `payment_count` (integer, default: 0)
- `first_payment_date`, `last_payment_date` (date)
- `requires_1099` (boolean, default: false)
- `threshold_reached_date` (date)
- `stripe_tax_form_id` (text)
- `tax_form_generated` (boolean, default: false)
- `tax_form_generated_date` (timestamptz)
- `tax_form_sent` (boolean, default: false)
- `tax_form_sent_date` (timestamptz)
- `tax_form_status` (varchar, default: `pending`, check: `pending`, `generated`, `sent`, `delivered`, `failed`)
- `compliance_status` (varchar, default: `pending`, check: `pending`, `in_progress`, `completed`, `failed`)
- `compliance_notes` (text)
- `created_at`, `updated_at` (timestamptz)

---

### `business_verifications`
**Rows**: 2 | **RLS**: ❌ Disabled

Business verification tracking.

**Key Columns**:
- `id` (uuid, PK)
- `business_id` (uuid, FK → business_profiles.id)
- `is_verified` (boolean)
- `submitted_at`, `reviewed_at` (timestamp)
- `reviewed_by` (uuid, FK → admin_users.id)
- `notes` (text)

---

### `business_subscriptions`
**Rows**: 0 | **RLS**: ❌ Disabled

Business subscription management.

**Key Columns**:
- `id` (uuid, PK)
- `business_id` (uuid, FK → providers.id)
- `device_type` (text)
- `transaction_data` (text)
- `start_date`, `end_date` (date)
- `is_active` (boolean, default: true)
- `stripe_subscription_id`, `stripe_customer_id`, `stripe_price_id` (text)
- `subscription_status` (text)
- `created_at`, `updated_at` (timestamptz)

---

## 🛍️ Services

### `services`
**Rows**: 35 | **RLS**: ❌ Disabled

Service catalog.

**Key Columns**:
- `id` (uuid, PK)
- `subcategory_id` (uuid, FK → service_subcategories.id)
- `name` (text) - ⚠️ NOT service_name
- `description` (text)
- `min_price` (numeric)
- `duration_minutes` (integer)
- `image_url` (text)
- `is_active` (boolean, default: true)
- `is_featured` (boolean, default: false)
- `is_popular` (boolean, default: false)
- `created_at` (timestamptz)

---

### `service_categories`
**Rows**: 4 | **RLS**: ❌ Disabled

Service category hierarchy.

**Key Columns**:
- `id` (uuid, PK)
- `service_category_type` (service_category_types enum: `beauty`, `fitness`, `therapy`, `healthcare`)
- `description` (text)
- `image_url` (text)
- `sort_order` (integer)
- `is_active` (boolean, default: true)
- `created_at` (timestamp)

---

### `service_subcategories`
**Rows**: 12 | **RLS**: ❌ Disabled

Service subcategory hierarchy.

**Key Columns**:
- `id` (uuid, PK)
- `category_id` (uuid, FK → service_categories.id)
- `service_subcategory_type` (service_subcategory_types enum: `hair_and_makeup`, `spray_tan`, `esthetician`, `massage_therapy`, `iv_therapy`, `physical_therapy`, `nurse_practitioner`, `physician`, `chiropractor`, `yoga_instructor`, `pilates_instructor`, `personal_trainer`, `injectables`, `health_coach`)
- `description` (text)
- `image_url` (text)
- `is_active` (boolean, default: true)
- `created_at` (timestamp)

---

### `service_addons`
**Rows**: 5 | **RLS**: ❌ Disabled

Service enhancement addons.

**Key Columns**:
- `id` (uuid, PK)
- `name` (varchar)
- `description` (text)
- `image_url` (text)
- `is_active` (boolean, default: true)
- `created_at`, `updated_at` (timestamp)

---

### `service_addon_eligibility`
**Rows**: 20 | **RLS**: ❌ Disabled

Service-addon relationships.

**Key Columns**:
- `id` (uuid, PK)
- `service_id` (uuid, FK → services.id)
- `addon_id` (uuid, FK → service_addons.id)
- `is_recommended` (boolean, default: false)
- `created_at` (timestamp)

---

## 📅 Bookings

### `bookings`
**Rows**: 67 | **RLS**: ❌ Disabled

All service bookings.

**Key Columns**:
- `id` (uuid, PK)
- `booking_reference` (text, unique)
- `customer_id` (uuid, FK → customer_profiles.id)
- `provider_id` (uuid, FK → providers.id)
- `service_id` (uuid, FK → services.id)
- `business_id` (uuid, FK → business_profiles.id)
- `booking_date` (date)
- `start_time` (time)
- `total_amount` (numeric)
- `booking_status` (booking_status enum: `pending`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`, `declined`, default: `pending`)
- `payment_status` (payment_status enum: `pending`, `partial`, `paid`, `refunded`, `failed`, default: `pending`)
- `delivery_type` (delivery_type enum: `business_location`, `customer_location`, `virtual`, `both_locations`, default: `business_location`)
- `customer_location_id` (uuid, FK → customer_locations.id)
- `business_location_id` (uuid, FK → business_locations.id)
- `guest_name`, `guest_email`, `guest_phone` (text)
- `special_instructions` (text)
- `admin_notes` (text)
- `decline_reason` (text)
- `service_fee` (numeric, default: 0)
- `service_fee_charged` (boolean, default: false)
- `service_fee_charged_at` (timestamptz)
- `remaining_balance` (numeric, default: 0)
- `remaining_balance_charged` (boolean, default: false)
- `remaining_balance_charged_at` (timestamptz)
- `cancellation_fee`, `refund_amount` (numeric, default: 0)
- `cancelled_at` (timestamptz)
- `cancelled_by` (uuid)
- `cancellation_reason` (text)
- `rescheduled_at` (timestamptz)
- `rescheduled_by` (uuid, FK → auth.users.id)
- `reschedule_reason` (text)
- `original_booking_date` (date)
- `original_start_time` (time)
- `reschedule_count` (integer, default: 0)
- `tip_eligible` (boolean, default: false)
- `tip_amount` (numeric, default: 0)
- `tip_status` (text, default: `none`)
- `tip_requested_at`, `tip_deadline` (timestamptz)
- `stripe_checkout_session_id` (text)
- `created_at` (timestamptz)

---

### `booking_addons`
**Rows**: 1 | **RLS**: ❌ Disabled

Booking enhancement addons.

**Key Columns**:
- `id` (uuid, PK)
- `booking_id` (uuid, FK → bookings.id)
- `addon_id` (uuid, FK → service_addons.id)
- `added_at` (timestamp)

---

### `booking_changes`
**Rows**: 0 | **RLS**: ❌ Disabled

Booking modification tracking.

**Key Columns**:
- `id` (uuid, PK)
- `booking_id` (uuid, FK → bookings.id)
- `change_type` (varchar, check: `addon_added`, `addon_removed`, `rescheduled`, `cancelled`)
- `old_value`, `new_value` (jsonb)
- `additional_cost`, `refund_amount` (numeric, default: 0)
- `changed_by` (uuid, FK → auth.users.id)
- `change_reason` (text)
- `stripe_charge_id`, `stripe_refund_id` (varchar)
- `created_at` (timestamp)

---

## 💰 Financial & Payments

### `financial_transactions`
**Rows**: 0 | **RLS**: ❌ Disabled

Transaction history.

**Key Columns**:
- `id` (uuid, PK)
- `booking_id` (uuid, FK → bookings.id)
- `amount` (numeric)
- `currency` (varchar, default: `USD`)
- `transaction_type` (transaction_type enum: `booking_payment`, `plarform_fee`, `provider_payout`, `refund`, `adjustment`, `tip`)
- `status` (status enum: `pending`, `completed`, `failed`, `cancelled`)
- `stripe_transaction_id` (varchar)
- `payment_method` (varchar)
- `description` (text)
- `metadata` (jsonb, default: `{}`)
- `created_at`, `processed_at` (timestamp)

---

### `payment_transactions`
**Rows**: 0 | **RLS**: ❌ Disabled

Payment processing.

**Key Columns**:
- `id` (uuid, PK)
- `booking_id` (uuid, FK → bookings.id)
- `transaction_type` (transaction_type enum)
- `amount` (numeric)
- `stripe_payment_intent_id`, `stripe_charge_id`, `stripe_refund_id` (varchar)
- `destination_account` (varchar, check: `roam_platform`, `provider_connected`)
- `status` (varchar, default: `pending`)
- `processed_at` (timestamp)
- `created_at` (timestamp)

---

### `booking_payment_schedules`
**Rows**: 0 | **RLS**: ❌ Disabled

Scheduled payment processing for bookings.

**Key Columns**:
- `id` (uuid, PK)
- `booking_id` (uuid, FK → bookings.id)
- `payment_type` (varchar, check: `service_fee`, `remaining_balance`)
- `scheduled_at` (timestamp)
- `amount` (numeric)
- `status` (varchar, default: `scheduled`, check: `scheduled`, `processed`, `failed`, `cancelled`)
- `stripe_payment_intent_id` (varchar)
- `processed_at` (timestamp)
- `failure_reason` (text)
- `retry_count` (integer, default: 0)
- `created_at` (timestamp)

---

### `tips`
**Rows**: 0 | **RLS**: ❌ Disabled

Tipping system.

**Key Columns**:
- `id` (uuid, PK)
- `booking_id` (uuid, FK → bookings.id)
- `customer_id` (uuid)
- `provider_id` (uuid)
- `business_id` (uuid)
- `tip_amount` (numeric, check: > 0)
- `tip_percentage` (numeric)
- `stripe_payment_intent_id` (text)
- `payment_status` (text, default: `pending`)
- `platform_fee_amount` (numeric, default: 0)
- `provider_net_amount` (numeric)
- `customer_message`, `provider_response` (text)
- `provider_responded_at` (timestamptz)
- `tip_given_at`, `payment_processed_at` (timestamptz)
- `payout_status` (text, default: `pending`)
- `payout_batch_id` (uuid)
- `payout_date` (date)
- `created_at`, `updated_at` (timestamptz)

---

### `tip_presets`
**Rows**: 0 | **RLS**: ❌ Disabled

Tip configuration by service category.

**Key Columns**:
- `id` (uuid, PK)
- `service_category_id` (uuid, FK → service_categories.id)
- `preset_type` (varchar, check: `percentage`, `fixed_amount`)
- `preset_values` (jsonb)
- `is_active` (boolean, default: true)
- `default_selection` (integer)
- `allow_custom_amount` (boolean, default: true)
- `minimum_tip_amount`, `maximum_tip_amount` (numeric, defaults: 1.00, 500.00)
- `tip_window_hours` (integer, default: 72)
- `created_at`, `updated_at` (timestamp)

---

### `tip_analytics_daily`
**Rows**: 0 | **RLS**: ❌ Disabled

Daily tip reporting and analytics.

**Key Columns**:
- `id` (uuid, PK)
- `date` (date, unique)
- `total_tips_count` (integer, default: 0)
- `total_tips_amount`, `average_tip_amount`, `average_tip_percentage` (numeric, default: 0)
- `tips_by_category` (jsonb, default: `{}`)
- `unique_tipping_customers`, `repeat_tippers` (integer, default: 0)
- `tip_conversion_rate` (numeric, default: 0)
- `providers_receiving_tips` (integer, default: 0)
- `platform_fee_from_tips` (numeric, default: 0)
- `created_at` (timestamp)

---

### `promotions`
**Rows**: 4 | **RLS**: ❌ Disabled

Marketing campaigns.

**Key Columns**:
- `id` (uuid, PK)
- `title` (varchar)
- `description` (text)
- `promo_code` (text)
- `savings_type` (promotion_savings_type enum: `percentage_off`, `fixed_amount`)
- `savings_amount`, `savings_max_amount` (numeric)
- `service_id` (uuid, FK → services.id)
- `business_id` (uuid, FK → business_profiles.id)
- `image_url` (text)
- `start_date`, `end_date` (date)
- `is_active` (boolean, default: true)
- `created_at` (timestamp)

---

### `promotion_usage`
**Rows**: 1 | **RLS**: ❌ Disabled

Promotion tracking.

**Key Columns**:
- `id` (uuid, PK)
- `promotion_id` (uuid, FK → promotions.id)
- `booking_id` (uuid, FK → bookings.id)
- `discount_applied` (numeric, check: >= 0)
- `original_amount`, `final_amount` (numeric)
- `created_at`, `used_at` (timestamptz)

---

## ⭐ Reviews

### `reviews`
**Rows**: 2 | **RLS**: ✅ Enabled

Customer reviews and ratings.

**Key Columns**:
- `id` (uuid, PK)
- `booking_id` (uuid, unique, FK → bookings.id)
- `business_id` (uuid, FK → business_profiles.id) - Direct reference to business being reviewed
- `provider_id` (uuid, FK → providers.id) - Direct reference to provider being reviewed
- `overall_rating` (integer, check: 1-5)
- `service_rating` (integer, check: 1-5)
- `communication_rating` (integer, check: 1-5)
- `punctuality_rating` (integer, check: 1-5)
- `review_text` (text)
- `is_approved` (boolean, default: false)
- `is_featured` (boolean, default: false)
- `moderated_by` (uuid, FK → admin_users.id)
- `moderated_at` (timestamptz)
- `moderation_notes` (text)
- `created_at` (timestamptz)

**Indexes**:
- `idx_reviews_booking_id` on `booking_id`
- `idx_reviews_business_id` on `business_id`
- `idx_reviews_provider_id` on `provider_id`
- `idx_reviews_overall_rating` on `overall_rating`
- `idx_reviews_is_approved` on `is_approved`
- `idx_reviews_is_featured` on `is_featured`
- `idx_reviews_created_at` on `created_at`

---

## 💬 Messaging & Communication

### `conversation_metadata`
**Rows**: 0 | **RLS**: ✅ Enabled

Twilio Conversations metadata for bookings.

**Key Columns**:
- `id` (uuid, PK)
- `booking_id` (uuid, FK → bookings.id)
- `twilio_conversation_sid` (text, unique)
- `conversation_type` (text, default: `booking_chat`, check: `booking_chat`, `support_chat`, `general`)
- `participant_count` (integer, default: 2)
- `is_active` (boolean, default: true)
- `last_message_at` (timestamp)
- `created_at`, `updated_at` (timestamp)

---

### `conversation_participants`
**Rows**: 0 | **RLS**: ✅ Enabled

Twilio Conversations participants.

**Key Columns**:
- `id` (uuid, PK)
- `conversation_id` (uuid, FK → conversation_metadata.id)
- `user_id` (uuid, FK → auth.users.id)
- `user_type` (text, check: `provider`, `customer`, `owner`, `dispatcher`)
- `twilio_participant_sid` (text)
- `is_active` (boolean, default: true)
- `joined_at`, `left_at`, `last_read_at` (timestamp)

---

### `message_notifications`
**Rows**: 0 | **RLS**: ✅ Enabled

Message notifications for users.

**Key Columns**:
- `id` (uuid, PK)
- `conversation_id` (uuid, FK → conversation_metadata.id)
- `user_id` (uuid, FK → auth.users.id)
- `message_sid` (text)
- `notification_type` (text, default: `message`, check: `message`, `mention`, `system`)
- `is_read` (boolean, default: false)
- `read_at` (timestamp)
- `created_at` (timestamp)

---

### `message_analytics`
**Rows**: 0 | **RLS**: ✅ Enabled

Communication analytics.

**Key Columns**:
- `id` (uuid, PK)
- `conversation_id` (uuid, FK → conversation_metadata.id)
- `booking_id` (uuid, FK → bookings.id)
- `message_count`, `participant_count` (integer, default: 0)
- `first_message_at`, `last_message_at` (timestamp)
- `average_response_time_minutes` (numeric)
- `total_conversation_duration_minutes` (integer)
- `created_at`, `updated_at` (timestamp)

---

### `contact_submissions`
**Rows**: 2 | **RLS**: ✅ Enabled

Customer support submissions.

**Key Columns**:
- `id` (uuid, PK)
- `full_name` (text)
- `from_email`, `to_email` (text)
- `subject`, `message` (text)
- `category` (text)
- `status` (text, default: `received`, check: `received`, `in_progress`, `responded`, `closed`)
- `responded_at` (timestamptz)
- `responded_by` (uuid, FK → auth.users.id)
- `notes` (text)
- `created_at`, `updated_at` (timestamptz)

---

### `email_logs`
**Rows**: 0 | **RLS**: ✅ Enabled

Email tracking logs.

**Key Columns**:
- `id` (uuid, PK)
- `recipient_email` (text)
- `email_type`, `subject` (text)
- `sent_at` (timestamptz)
- `business_id` (uuid, FK → business_profiles.id)
- `customer_id` (uuid, FK → customer_profiles.id)
- `provider_id` (uuid, FK → providers.id)
- `created_at` (timestamptz)

---

## 📊 Platform Management

### `announcements`
**Rows**: 3 | **RLS**: ❌ Disabled

Platform announcements.

**Key Columns**:
- `id` (uuid, PK)
- `title`, `content` (text)
- `announcement_audience` (announcement_audience enum: `all`, `customer`, `provider`, `business`, `staff`)
- `announcement_type` (announcement_type enum: `general`, `promotional`, `maintenance`, `feature`, `alert`, `news`, `update`)
- `start_date`, `end_date` (date)
- `is_active` (boolean, default: true)
- `created_at` (timestamp)

---

### `platform_analytics`
**Rows**: 0 | **RLS**: ❌ Disabled

Platform dashboard analytics.

**Key Columns**:
- `id` (uuid, PK)
- `date` (date, unique)
- `total_bookings`, `completed_bookings`, `cancelled_bookings`, `no_show_bookings` (integer, default: 0)
- `gross_revenue`, `platform_fees`, `provider_payouts`, `refunds_issued` (numeric, default: 0)
- `new_customers`, `new_businesses`, `new_providers` (integer, default: 0)
- `active_customers`, `active_providers` (integer, default: 0)
- `average_rating` (numeric, default: 0)
- `total_reviews` (integer, default: 0)
- `new_tickets`, `resolved_tickets` (integer, default: 0)
- `average_resolution_hours` (numeric, default: 0)
- `created_at` (timestamp)

---

### `platform_annual_tax_summary`
**Rows**: 0 | **RLS**: ❌ Disabled

Platform-wide annual tax summary.

**Key Columns**:
- `id` (uuid, PK)
- `tax_year` (integer, unique)
- `total_businesses_paid` (integer, default: 0)
- `total_payments_made` (numeric, default: 0)
- `businesses_requiring_1099` (integer, default: 0)
- `total_1099_eligible_payments` (numeric, default: 0)
- `forms_1099_generated`, `forms_1099_sent`, `forms_1099_delivered` (integer, default: 0)
- `irs_filing_completed` (boolean, default: false)
- `irs_filing_completed_date` (timestamptz)
- `processing_status` (varchar, default: `pending`, check: `pending`, `in_progress`, `completed`, `failed`)
- `processing_notes` (text)
- `created_at`, `updated_at` (timestamptz)

---

## ⚙️ System & Configuration

### `system_config`
**Rows**: 16 | **RLS**: ✅ Enabled

System configuration settings.

**Key Columns**:
- `id` (uuid, PK)
- `config_key` (varchar, unique)
- `config_value` (text)
- `description` (text)
- `data_type` (varchar, default: `string`)
- `is_public` (boolean, default: false)
- `is_encrypted` (boolean, default: false)
- `config_group` (text)
- `created_at`, `updated_at` (timestamptz)

---

### `admin_notifications`
**Rows**: 0 | **RLS**: ❌ Disabled

Admin notification system.

**Key Columns**:
- `id` (uuid, PK)
- `title` (varchar)
- `message` (text)
- `notification_type` (varchar)
- `priority` (varchar, default: `normal`, check: `low`, `normal`, `high`, `urgent`)
- `recipient_id` (uuid, FK → admin_users.id)
- `recipient_role` (varchar)
- `related_entity_type`, `related_entity_id` (varchar/uuid)
- `is_read` (boolean, default: false)
- `read_at` (timestamp)
- `action_url`, `action_text` (varchar)
- `created_at` (timestamp)

---

### `admin_activity_logs`
**Rows**: 0 | **RLS**: ❌ Disabled

Admin action audit logs.

**Key Columns**:
- `id` (uuid, PK)
- `admin_user_id` (uuid, FK → admin_users.id)
- `action` (varchar)
- `entity_type` (varchar)
- `entity_id` (uuid)
- `details` (jsonb, default: `{}`)
- `ip_address` (inet)
- `user_agent` (text)
- `created_at` (timestamp)

---

## 💳 Stripe & Banking Integration

### `stripe_connect_accounts`
**Rows**: 0 | **RLS**: ✅ Enabled

Stripe Connect accounts.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `business_id` (uuid, unique, FK → business_profiles.id)
- `account_id` (text, unique)
- `account_type`, `country`, `default_currency`, `business_type` (text)
- `details_submitted`, `charges_enabled`, `payouts_enabled` (boolean, default: false)
- `capabilities`, `requirements` (jsonb)
- `created_at`, `updated_at` (timestamptz)

---

### `stripe_identity_verifications`
**Rows**: 0 | **RLS**: ✅ Enabled

Stripe identity verifications.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `business_id` (uuid, FK → business_profiles.id)
- `session_id` (text, unique)
- `status`, `type` (text)
- `client_secret` (text)
- `verification_report` (jsonb)
- `verified_at`, `failed_at` (timestamptz)
- `created_at`, `updated_at` (timestamptz)

---

### `stripe_tax_webhook_events`
**Rows**: 0 | **RLS**: ❌ Disabled

Stripe tax webhook processing.

**Key Columns**:
- `id` (uuid, PK)
- `business_id` (uuid, FK → business_profiles.id)
- `stripe_event_id` (text, unique)
- `stripe_event_type` (varchar)
- `stripe_object_id`, `stripe_object_type` (text/varchar)
- `event_data` (jsonb)
- `processed` (boolean, default: false)
- `processed_at` (timestamptz)
- `processing_error` (text)
- `webhook_received_at` (timestamptz)
- `api_version` (text)
- `created_at` (timestamptz)

---

### `business_manual_bank_accounts`
**Rows**: 0 | **RLS**: ✅ Enabled

Manual bank account management for businesses.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `business_id` (uuid, FK → business_profiles.id)
- `account_name`, `bank_name` (text)
- `account_type` (text, check: `checking`, `savings`)
- `account_number`, `routing_number` (text)
- `is_verified` (boolean, default: false)
- `is_default` (boolean, default: false)
- `stripe_account_id` (text)
- `verification_status` (text, default: `pending`, check: `pending`, `verified`, `failed`)
- `created_at`, `updated_at` (timestamptz)

---

<!-- Plaid tables removed: plaid_bank_connections, plaid_link_sessions -->

---
**Rows**: 0 | **RLS**: ✅ Enabled

Plaid integration.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `business_id` (uuid, unique, FK → business_profiles.id)
- `plaid_access_token`, `plaid_item_id`, `plaid_account_id` (text)
- `institution_id`, `institution_name` (text)
- `account_name`, `account_mask`, `account_type`, `account_subtype` (text)
- `verification_status` (text, default: `verified`)
- `routing_numbers` (text[])
- `account_number_mask` (text)
- `connected_at` (timestamptz)
- `is_active` (boolean, default: true)

---

### `plaid_link_sessions`
**Rows**: 0 | **RLS**: ✅ Enabled

Plaid Link flow sessions.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `business_id` (uuid, FK → business_profiles.id)
- `link_token` (text)
- `expiration` (timestamptz)
- `request_id` (text)
- `status` (text, default: `created`)
- `created_at` (timestamptz)

---

### `application_approvals`
**Rows**: 0 | **RLS**: ✅ Enabled

Provider application approvals.

**Key Columns**:
- `id` (uuid, PK)
- `business_id` (uuid, FK → business_profiles.id)
- `application_id` (uuid, FK → provider_applications.id)
- `approved_by` (uuid, FK → auth.users.id)
- `approval_token` (text)
- `token_expires_at` (timestamptz)
- `approval_notes` (text)
- `created_at` (timestamptz)

---

## 📊 Enum Types Reference

### Service Category Types
**Enum**: `service_category_types`

Values:
- `beauty` - Beauty and personal care services
- `fitness` - Fitness and training services
- `therapy` - Therapy and massage services
- `healthcare` - Healthcare and medical services

---

### Service Subcategory Types
**Enum**: `service_subcategory_types`

Values:
- `hair_and_makeup` - Hair styling and makeup
- `spray_tan` - Spray tanning
- `esthetician` - Skincare and esthetician services
- `massage_therapy` - Massage therapy
- `iv_therapy` - IV therapy and hydration
- `physical_therapy` - Physical therapy
- `nurse_practitioner` - Nurse practitioner services
- `physician` - Physician services
- `chiropractor` - Chiropractic services
- `yoga_instructor` - Yoga instruction
- `pilates_instructor` - Pilates instruction
- `personal_trainer` - Personal training
- `injectables` - Injectable treatments
- `health_coach` - Health coaching

---

### Booking & Payment Status Types

**Booking Status** (`booking_status`):
- `pending`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`, `declined`

**Payment Status** (`payment_status`):
- `pending`, `partial`, `paid`, `refunded`, `failed`

**Delivery Type** (`delivery_type`):
- `business_location`, `customer_location`, `virtual`, `both_locations`

---

### Verification & Document Types

**Verification Status** (`verification_status`):
- `pending`, `approved`, `rejected`, `suspended`

**Provider Verification Status** (`provider_verification_status`):
- `pending`, `documents_submitted`, `under_review`, `approved`, `rejected`

**Background Check Status** (`background_check_status`):
- `under_review`, `pending`, `approved`, `rejected`, `expired`

**Business Document Type** (`business_document_type`):
- `drivers_license`, `proof_of_address`, `liability_insurance`, `professional_license`, `professional_certificate`, `business_license`

**Business Document Status** (`business_document_status`):
- `pending`, `verified`, `rejected`, `under_review`

---

### User & Role Types

**User Role** (`user_role`):
- `admin`, `manager`, `support`, `analyst`

**Provider Role** (`provider_role`):
- `provider`, `owner`, `dispatcher`

**MFA Method Type** (`mfa_method_type`):
- `totp`, `sms`, `email`, `backup`

---

### Business & Transaction Types

**Business Type** (`business_type`):
- `independent`, `small_business`, `franchise`, `enterprise`, `other`

**Transaction Type** (`transaction_type`):
- `booking_payment`, `plarform_fee`, `provider_payout`, `refund`, `adjustment`, `tip`

**Status** (`status`):
- `pending`, `completed`, `failed`, `cancelled`

---

### Announcement & Promotion Types

**Announcement Audience** (`announcement_audience`):
- `all`, `customer`, `provider`, `business`, `staff`

**Announcement Type** (`announcement_type`):
- `general`, `promotional`, `maintenance`, `feature`, `alert`, `news`, `update`

**Promotion Savings Type** (`promotion_savings_type`):
- `percentage_off`, `fixed_amount`

**Customer Location Type** (`customer_location_type`):
- `Home`, `Condo`, `Hotel`, `Other`, `Null`

---

## 🔧 Important Query Notes

### Address Field Differences

**Customer Locations** vs **Business Locations**:

```typescript
// ❌ WRONG - Don't mix naming
customer_locations.address_line1  // Field doesn't exist
business_locations.street_address // Field doesn't exist

// ✅ CORRECT
customer_locations.street_address  // Use this
customer_locations.unit_number     // Use this
customer_locations.zip_code        // Use this

business_locations.address_line1   // Use this
business_locations.address_line2   // Use this
business_locations.postal_code     // Use this
```

---

### Service Field Names

```typescript
// ❌ WRONG
services.service_name  // Field doesn't exist

// ✅ CORRECT
services.name          // Use this
```

---

### Enum Query Warning

When querying enum fields in Supabase/PostgREST, use client-side filtering:

```typescript
// ❌ INCORRECT - Causes 406 errors
.eq("service_category_type", "beauty")
.eq("service_category_type::text", "beauty")

// ✅ CORRECT - Fetch and filter client-side
const { data } = await supabase
  .from("service_categories")
  .select("*");
  
const filtered = data?.filter(cat => cat.service_category_type === "beauty");
```

---

## 📝 Database Statistics

**Most Populated Tables**:
1. `provider_services` - 84 rows
2. `bookings` - 67 rows
3. `business_service_subcategories` - 64 rows
4. `business_services` - 56 rows
5. `business_locations` - 51 rows
6. `business_profiles` - 50 rows
7. `providers` - 44 rows
8. `provider_applications` - 42 rows
9. `business_documents` - 41 rows
10. `business_service_categories` - 37 rows

**Tables with RLS Enabled**: 21 tables
- All customer favorite tables
- User settings & MFA tables
- Conversation & messaging tables
- Contact submissions
- Email logs
- Reviews
- Provider & business management tables

---

## 📅 Last Updated

**Date**: October 15, 2025  
**Method**: Supabase MCP Direct Query  
**Project**: vssomyuyhicaxsgiaupo  
**Verification**: ✅ All 71 tables confirmed via live database query

---

*This document is auto-generated from the live database and should be the single source of truth for all database queries.*
