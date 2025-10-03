# 🗄️ ROAM Platform Database Schema Reference

*Confirmed working database schemas - Always check this file before implementing queries*

---

## ✅ CONFIRMED TABLE SCHEMAS

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

### `auth.users`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Core authentication system (Supabase Auth)

```sql
create table auth.users (
  instance_id uuid null,
  id uuid not null,
  aud character varying(255) null,
  role character varying(255) null,
  email character varying(255) null,
  encrypted_password character varying(255) null,
  email_confirmed_at timestamp with time zone null,
  invited_at timestamp with time zone null,
  confirmation_token character varying(255) null,
  confirmation_sent_at timestamp with time zone null,
  recovery_token character varying(255) null,
  recovery_sent_at timestamp with time zone null,
  email_change_token_new character varying(255) null,
  email_change character varying(255) null,
  email_change_sent_at timestamp with time zone null,
  last_sign_in_at timestamp with time zone null,
  raw_app_meta_data jsonb null,
  raw_user_meta_data jsonb null,
  is_super_admin boolean null,
  created_at timestamp with time zone null,
  updated_at timestamp with time zone null,
  phone text null default null::character varying,
  phone_confirmed_at timestamp with time zone null,
  phone_change text null default ''::character varying,
  phone_change_token character varying(255) null default ''::character varying,
  phone_change_sent_at timestamp with time zone null,
  confirmed_at timestamp with time zone GENERATED ALWAYS as (LEAST(email_confirmed_at, phone_confirmed_at)) STORED null,
  email_change_token_current character varying(255) null default ''::character varying,
  email_change_confirm_status smallint null default 0,
  banned_until timestamp with time zone null,
  reauthentication_token character varying(255) null default ''::character varying,
  reauthentication_sent_at timestamp with time zone null,
  is_sso_user boolean not null default false,
  deleted_at timestamp with time zone null,
  is_anonymous boolean not null default false,
  constraint users_pkey primary key (id),
  constraint users_phone_key unique (phone),
  constraint users_email_change_confirm_status_check check (
    (
      (email_change_confirm_status >= 0)
      and (email_change_confirm_status <= 2)
    )
  )
);
```

### `admin_users`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Admin panel authentication and permissions

```sql
create table public.admin_users (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  email character varying(255) not null,
  permissions jsonb null default '[]'::jsonb,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  image_url text null,
  first_name text null,
  last_name text null,
  role public.user_role not null,
  constraint admin_users_pkey primary key (id),
  constraint admin_users_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
);
```

### `user_roles`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Role-based access control across the platform

```sql
create table public.user_roles (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  role public.user_role_type not null,
  business_id uuid null,
  location_id uuid null,
  granted_by uuid null,
  granted_at timestamp with time zone null default now(),
  expires_at timestamp with time zone null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_roles_pkey primary key (id),
  constraint user_roles_user_id_role_business_id_key unique (user_id, role, business_id),
  constraint user_roles_granted_by_fkey foreign KEY (granted_by) references auth.users (id),
  constraint user_roles_location_id_fkey foreign KEY (location_id) references business_locations (id) on delete CASCADE,
  constraint user_roles_business_id_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE,
  constraint user_roles_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint check_customer_no_business check (
    (
      (
        (role = 'customer'::user_role_type)
        and (business_id is null)
        and (location_id is null)
      )
      or (role <> 'customer'::user_role_type)
    )
  ),
  constraint check_admin_no_business check (
    (
      (
        (role = 'admin'::user_role_type)
        and (business_id is null)
      )
      or (role <> 'admin'::user_role_type)
    )
  )
);
```

### `user_settings`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: User preferences and application settings

```sql
create table public.user_settings (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  theme text null default 'system'::text,
  language text null default 'en'::text,
  timezone text null default 'UTC'::text,
  email_notifications boolean null default true,
  push_notifications boolean null default true,
  sound_enabled boolean null default true,
  auto_logout_minutes integer null default 60,
  date_format text null default 'MM/DD/YYYY'::text,
  time_format text null default '12h'::text,
  items_per_page integer null default 25,
  sidebar_collapsed boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_settings_pkey primary key (id),
  constraint user_settings_user_id_key unique (user_id),
  constraint user_settings_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint user_settings_theme_check check (
    (
      theme = any (
        array['light'::text, 'dark'::text, 'system'::text]
      )
    )
  ),
  constraint user_settings_time_format_check check (
    (
      time_format = any (array['12h'::text, '24h'::text])
    )
  )
);
```

---

## 👥 Customer Domain

### `customer_profiles`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Customer authentication, Profile management

```sql
create table public.customer_profiles (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  phone text null,
  email text null,
  first_name text null,
  last_name text null,
  date_of_birth date null,
  image_url text null,
  bio text null,
  is_active boolean null default true,
  email_notifications boolean null default true,
  sms_notifications boolean null default true,
  push_notifications boolean null default true,
  marketing_emails boolean null default false,
  email_verified boolean null default false,
  phone_verified boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint customer_profiles_pkey primary key (id),
  constraint customer_profiles_user_id_key unique (user_id),
  constraint customer_profiles_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
);
```

### `customer_stripe_profiles`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Payment processing, Stripe integration

```sql
create table public.customer_stripe_profiles (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  stripe_customer_id text not null,
  stripe_email text not null,
  default_payment_method_id text null,
  billing_address jsonb null,
  payment_methods jsonb null default '[]'::jsonb,
  subscription_status text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint customer_stripe_profiles_pkey primary key (id),
  constraint customer_stripe_profiles_stripe_customer_id_key unique (stripe_customer_id),
  constraint customer_stripe_profiles_user_id_fkey foreign KEY (user_id) references customer_profiles (user_id) on delete CASCADE
);
```

### `customer_subscriptions`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Subscription management, Billing

```sql
create table public.customer_subscriptions (
  id uuid not null default gen_random_uuid (),
  customer_id uuid not null,
  device_type text not null,
  transaction_data text null,
  start_date date not null,
  end_date date null,
  is_active boolean null default true,
  stripe_subscription_id text null,
  stripe_customer_id text null,
  stripe_price_id text null,
  subscription_status text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint customer_subscriptions_pkey primary key (id),
  constraint customer_subscriptions_customer_id_fkey foreign KEY (customer_id) references customer_profiles (id) on delete CASCADE
);
```

### `customer_locations`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Provider app bookings, Customer locations management

```sql
create table public.customer_locations (
  id uuid not null default gen_random_uuid (),
  customer_id uuid not null,
  location_name character varying(255) not null,
  street_address text not null,              -- ⚠️ NOT address_line1
  unit_number character varying(50) null,    -- ⚠️ NOT address_line2  
  city character varying(100) not null,
  state character varying(50) not null,
  zip_code character varying(10) not null,   -- ⚠️ NOT postal_code
  latitude numeric(10, 8) null,
  longitude numeric(11, 8) null,
  is_primary boolean null default false,
  is_active boolean null default true,
  access_instructions text null,
  created_at timestamp without time zone null default now(),
  location_type public.customer_location_type not null,
  constraint customer_locations_pkey primary key (id),
  constraint customer_locations_customer_id_fkey foreign KEY (customer_id) references auth.users (id) on delete set null
);
```

### `customer_favorite_services`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Customer preferences, Service recommendations

```sql
create table public.customer_favorite_services (
  id uuid not null default gen_random_uuid (),
  customer_id uuid not null,
  service_id uuid not null,
  created_at timestamp with time zone null default now(),
  constraint customer_favorite_services_pkey primary key (id),
  constraint customer_favorite_services_customer_id_service_id_key unique (customer_id, service_id),
  constraint customer_favorite_services_customer_id_fkey foreign KEY (customer_id) references customer_profiles (id) on delete CASCADE,
  constraint customer_favorite_services_service_id_fkey foreign KEY (service_id) references services (id) on delete CASCADE
);
```

### `customer_favorite_providers`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Customer preferences, Provider recommendations

```sql
create table public.customer_favorite_providers (
  id uuid not null default gen_random_uuid (),
  customer_id uuid not null,
  provider_id uuid not null,
  created_at timestamp with time zone null default now(),
  constraint customer_favorite_providers_pkey primary key (id),
  constraint customer_favorite_providers_customer_id_provider_id_key unique (customer_id, provider_id),
  constraint customer_favorite_providers_customer_id_fkey foreign KEY (customer_id) references customer_profiles (id) on delete CASCADE,
  constraint customer_favorite_providers_provider_id_fkey foreign KEY (provider_id) references providers (id) on delete CASCADE
);
```

### `customer_favorite_businesses`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Customer preferences, Business recommendations

```sql
create table public.customer_favorite_businesses (
  id uuid not null default gen_random_uuid (),
  customer_id uuid not null,
  business_id uuid not null,
  created_at timestamp with time zone null default now(),
  constraint customer_favorite_businesses_pkey primary key (id),
  constraint customer_favorite_businesses_customer_id_business_id_key unique (customer_id, business_id),
  constraint customer_favorite_businesses_customer_id_fkey foreign KEY (customer_id) references customer_profiles (id) on delete CASCADE,
  constraint customer_favorite_businesses_business_id_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE
);
```

### `financial_transactions`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Financial tracking, Transaction history

```sql
create table public.financial_transactions (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  amount numeric(10, 2) not null,
  currency character varying(3) null default 'USD',
  stripe_transaction_id character varying(255) null,
  payment_method character varying(50) null,
  description text null,
  metadata jsonb null default '{}',
  transaction_type public.transaction_type null,
  status public.status null,
  created_at timestamp without time zone null default now(),
  processed_at timestamp without time zone null,
  constraint financial_transactions_pkey primary key (id),
  constraint financial_transactions_booking_id_fkey foreign KEY (booking_id) references bookings (id)
);
```

### `payment_transactions`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Payment processing, Stripe transactions

```sql
create table public.payment_transactions (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  transaction_type public.transaction_type not null,
  amount numeric(10, 2) not null,
  stripe_payment_intent_id character varying(255) null,
  stripe_charge_id character varying(255) null,
  stripe_refund_id character varying(255) null,
  destination_account character varying(50) null,
  status character varying(50) null default 'pending',
  processed_at timestamp without time zone null,
  created_at timestamp without time zone null default now(),
  constraint payment_transactions_pkey primary key (id),
  constraint payment_transactions_booking_id_fkey foreign KEY (booking_id) references bookings (id)
);
```

### `reviews`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Customer feedback, Rating system, Quality assurance

```sql
create table public.reviews (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  overall_rating integer not null,
  service_rating integer null,
  communication_rating integer null,
  punctuality_rating integer null,
  review_text text null,
  is_approved boolean null default false,
  is_featured boolean null default false,
  moderated_by uuid null,
  moderated_at timestamp with time zone null,
  moderation_notes text null,
  created_at timestamp with time zone null default now(),
  constraint reviews_pkey primary key (id),
  constraint reviews_booking_id_unique unique (booking_id),
  constraint reviews_moderated_by_fkey foreign KEY (moderated_by) references admin_users (id),
  constraint reviews_booking_id_fkey foreign KEY (booking_id) references bookings (id) on delete CASCADE,
  constraint reviews_service_rating_check check (
    (
      (service_rating >= 1)
      and (service_rating <= 5)
    )
  ),
  constraint reviews_communication_rating_check check (
    (
      (communication_rating >= 1)
      and (communication_rating <= 5)
    )
  ),
  constraint reviews_overall_rating_check check (
    (
      (overall_rating >= 1)
      and (overall_rating <= 5)
    )
  ),
  constraint reviews_punctuality_rating_check check (
    (
      (punctuality_rating >= 1)
      and (punctuality_rating <= 5)
    )
  )
);
```

---

## 👥 Provider Domain

### `providers`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Provider management, Staff assignments, Bookings

```sql
create table public.providers (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  business_id uuid null,
  location_id uuid null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  bio text null,
  image_url text null,
  cover_image_url text null,
  date_of_birth date null,
  experience_years integer null,
  verification_status public.provider_verification_status null default 'pending',
  background_check_status public.background_check_status null default 'under_review',
  identity_verification_status text null default 'pending',
  provider_role public.provider_role null,
  business_managed boolean not null,
  is_active boolean null default true,
  total_bookings integer null default 0,
  completed_bookings integer null default 0,
  average_rating numeric null default 0,
  total_reviews integer null default 0,
  notification_email text null,
  notification_phone text null,
  created_at timestamp with time zone null default now(),
  constraint providers_pkey primary key (id),
  constraint providers_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint providers_business_id_fkey foreign KEY (business_id) references business_profiles (id),
  constraint providers_location_id_fkey foreign KEY (location_id) references business_locations (id)
);
```

### `provider_verifications`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Identity verification, Compliance

```sql
create table public.provider_verifications (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  stripe_verification_session_id text not null,
  verification_status text not null default 'requires_input',
  verification_type text null default 'identity',
  verified_data jsonb null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint provider_verifications_pkey primary key (id),
  constraint provider_verifications_stripe_verification_session_id_key unique (stripe_verification_session_id),
  constraint provider_verifications_user_id_verification_type_key unique (user_id, verification_type),
  constraint provider_verifications_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
);
```

### `provider_services`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Provider service capabilities

```sql
create table public.provider_services (
  id uuid not null default gen_random_uuid (),
  provider_id uuid not null,
  service_id uuid not null,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  constraint provider_services_pkey primary key (id),
  constraint provider_services_provider_id_service_id_key unique (provider_id, service_id),
  constraint provider_services_provider_id_fkey foreign KEY (provider_id) references providers (id) on delete CASCADE,
  constraint provider_services_service_id_fkey foreign KEY (service_id) references services (id)
);
```

### `provider_booking_preferences`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Booking settings, Availability management

```sql
create table public.provider_booking_preferences (
  id uuid not null default gen_random_uuid (),
  provider_id uuid null,
  min_advance_hours integer null default 2,
  max_advance_days integer null default 30,
  auto_accept_bookings boolean null default false,
  auto_accept_within_hours integer null default 24,
  allow_cancellation boolean null default true,
  cancellation_window_hours integer null default 24,
  notify_new_booking boolean null default true,
  notify_cancellation boolean null default true,
  notify_reminder_hours integer null default 2,
  prefer_consecutive_bookings boolean null default false,
  min_break_between_bookings integer null default 15,
  max_bookings_per_day integer null default 8,
  updated_at timestamp with time zone null default now(),
  constraint provider_booking_preferences_pkey primary key (id),
  constraint provider_booking_preferences_provider_id_key unique (provider_id),
  constraint provider_booking_preferences_provider_id_fkey foreign KEY (provider_id) references providers (id) on delete CASCADE
);
```

### `provider_bank_accounts`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Financial integration, Plaid banking

```sql
create table public.provider_bank_accounts (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  business_id uuid null,
  plaid_access_token text not null,
  plaid_item_id text not null,
  account_data jsonb not null,
  institution_data jsonb null,
  webhook_status text null,
  webhook_error jsonb null,
  last_webhook_at timestamp with time zone null,
  connected_at timestamp with time zone null default now(),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint provider_bank_accounts_pkey primary key (id),
  constraint provider_bank_accounts_business_id_key unique (business_id),
  constraint provider_bank_accounts_plaid_item_id_key unique (plaid_item_id),
  constraint provider_bank_accounts_business_id_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE,
  constraint provider_bank_accounts_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
);
```

### `provider_availability`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Scheduling, Availability management

```sql
create table public.provider_availability (
  id uuid not null default gen_random_uuid (),
  provider_id uuid null,
  business_id uuid null,
  schedule_type text null,                  -- 'weekly_recurring', 'specific_date', 'date_range'
  day_of_week integer null,                 -- 0-6 for weekly recurring
  start_date date null,
  end_date date null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  max_bookings_per_slot integer null default 1,
  slot_duration_minutes integer null default 60,
  buffer_time_minutes integer null default 15,
  is_active boolean null default true,
  is_blocked boolean null default false,
  block_reason text null,
  allowed_services uuid[] null,
  location_type text null default 'both',   -- 'mobile', 'business', 'both'
  service_location_id uuid null,
  override_price numeric(10, 2) null,
  notes text null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint provider_availability_pkey primary key (id),
  constraint provider_availability_provider_id_fkey foreign KEY (provider_id) references providers (id) on delete CASCADE,
  constraint provider_availability_business_id_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE
);
```

### `provider_applications`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Provider onboarding, Application management

```sql
create table public.provider_applications (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  business_id uuid null,
  application_status text null default 'submitted',
  review_status text null default 'pending',
  consents_given jsonb null,
  submission_metadata jsonb null,
  submitted_at timestamp with time zone null default now(),
  reviewed_at timestamp with time zone null,
  reviewed_by uuid null,
  approval_notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint provider_applications_pkey primary key (id),
  constraint provider_applications_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint provider_applications_business_id_fkey foreign KEY (business_id) references business_profiles (id)
);
```

### `provider_addons`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Provider addon capabilities

```sql
create table public.provider_addons (
  id uuid not null default gen_random_uuid (),
  provider_id uuid not null,
  addon_id uuid not null,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  constraint provider_addons_pkey primary key (id),
  constraint provider_addons_provider_addon_key unique (provider_id, addon_id),
  constraint provider_addons_provider_fkey foreign KEY (provider_id) references providers (id) on delete CASCADE,
  constraint provider_addons_addon_fkey foreign KEY (addon_id) references service_addons (id) on delete CASCADE
);
```

### `business_locations`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Provider app bookings, Business settings

```sql
-- Key fields (different naming from customer_locations):
address_line1 text not null,      -- Different from customer_locations.street_address
address_line2 text null,          -- Different from customer_locations.unit_number
postal_code varchar(10) not null, -- Different from customer_locations.zip_code
location_name varchar(255) not null,
city varchar(100) not null,
state varchar(50) not null,
-- ... other fields
```

### `services`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Business services, Bookings, Service management

```sql
create table public.services (
  id uuid not null default gen_random_uuid (),
  subcategory_id uuid not null,
  name text not null,                    -- ⚠️ NOT service_name
  description text null,
  min_price numeric not null,
  duration_minutes integer not null,
  image_url text null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  is_featured boolean null default false,
  is_popular boolean null default false,
  constraint services_pkey primary key (id),
  constraint services_subcategory_id_fkey foreign KEY (subcategory_id) references service_subcategories (id)
);
```

### `service_categories`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Service organization, Categories management

```sql
create table public.service_categories (
  id uuid not null default gen_random_uuid (),
  description text null,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  image_url text null,
  sort_order integer null,
  service_category_type public.service_category_types not null,
  constraint service_categories_pkey primary key (id)
);
```

### `service_subcategories`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Service organization, Subcategories management

```sql
create table public.service_subcategories (
  id uuid not null default gen_random_uuid (),
  category_id uuid not null,
  description text null,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  image_url text null,
  service_subcategory_type public.service_subcategory_types not null,
  constraint service_subcategories_pkey primary key (id),
  constraint service_subcategories_category_id_fkey foreign KEY (category_id) references service_categories (id) on delete CASCADE
);
```

### `service_addons`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Service enhancements, Addon management

```sql
create table public.service_addons (
  id uuid not null default gen_random_uuid (),
  name character varying(255) not null,
  description text null,
  image_url text null,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint service_addons_pkey primary key (id)
);
```

### `service_addon_eligibility`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Service-addon relationships, Eligibility management

```sql
create table public.service_addon_eligibility (
  id uuid not null default gen_random_uuid (),
  service_id uuid not null,
  addon_id uuid not null,
  is_recommended boolean null default false,
  created_at timestamp without time zone null default now(),
  constraint service_addon_eligibility_pkey primary key (id),
  constraint service_addon_eligibility_service_id_addon_id_key unique (service_id, addon_id),
  constraint service_addon_eligibility_addon_id_fkey foreign KEY (addon_id) references service_addons (id) on delete CASCADE,
  constraint service_addon_eligibility_service_id_fkey foreign KEY (service_id) references services (id)
);
```

### `tips`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Tipping system, provider payments

```sql
create table public.tips (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  customer_id uuid null,
  provider_id uuid not null,
  business_id uuid not null,
  tip_amount numeric not null,
  tip_percentage numeric null,
  stripe_payment_intent_id text null,
  payment_status text null default 'pending'::text,
  platform_fee_amount numeric null default 0,
  provider_net_amount numeric not null,
  customer_message text null,
  provider_response text null,
  provider_responded_at timestamp with time zone null,
  tip_given_at timestamp with time zone null default now(),
  payment_processed_at timestamp with time zone null,
  payout_status text null default 'pending'::text,
  payout_batch_id uuid null,
  payout_date date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint tips_pkey primary key (id),
  constraint tips_booking_id_fkey foreign KEY (booking_id) references bookings (id) on delete CASCADE,
  constraint tips_tip_amount_check check ((tip_amount > (0)::numeric))
);
```

### `tip_presets`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Tip configuration by service category

```sql
create table public.tip_presets (
  id uuid not null default gen_random_uuid (),
  service_category_id uuid null,
  preset_type character varying(20) not null,
  preset_values jsonb not null,
  is_active boolean null default true,
  default_selection integer null,
  allow_custom_amount boolean null default true,
  minimum_tip_amount numeric(8, 2) null default 1.00,
  maximum_tip_amount numeric(8, 2) null default 500.00,
  tip_window_hours integer null default 72,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint tip_presets_pkey primary key (id),
  constraint tip_presets_service_category_id_fkey foreign KEY (service_category_id) references service_categories (id) on delete CASCADE,
  constraint tip_presets_preset_type_check check (
    (
      (preset_type)::text = any (
        array[
          ('percentage'::character varying)::text,
          ('fixed_amount'::character varying)::text
        ]
      )
    )
  )
);
```

### `tip_analytics_daily`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Daily tip reporting and analytics

```sql
create table public.tip_analytics_daily (
  id uuid not null default gen_random_uuid (),
  date date not null,
  total_tips_count integer null default 0,
  total_tips_amount numeric(12, 2) null default 0,
  average_tip_amount numeric(8, 2) null default 0,
  average_tip_percentage numeric(5, 2) null default 0,
  tips_by_category jsonb null default '{}'::jsonb,
  unique_tipping_customers integer null default 0,
  repeat_tippers integer null default 0,
  tip_conversion_rate numeric(5, 2) null default 0,
  providers_receiving_tips integer null default 0,
  platform_fee_from_tips numeric(10, 2) null default 0,
  created_at timestamp without time zone null default now(),
  constraint tip_analytics_daily_pkey primary key (id),
  constraint tip_analytics_daily_date_key unique (date)
);
```

---

## 💬 Messaging & Communication

### `message_notifications`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Message notification system, User alerts

```sql
create table public.message_notifications (
  id uuid not null default gen_random_uuid (),
  conversation_id uuid not null,
  user_id uuid not null,
  message_sid text not null,
  is_read boolean null default false,
  read_at timestamp without time zone null,
  created_at timestamp without time zone null default now(),
  notification_type text null default 'message'::text,
  constraint message_notifications_pkey primary key (id),
  constraint message_notifications_conversation_id_fkey foreign KEY (conversation_id) references conversation_metadata (id) on delete CASCADE,
  constraint message_notifications_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint message_notifications_notification_type_check check (
    (
      notification_type = any (
        array['message'::text, 'mention'::text, 'system'::text]
      )
    )
  )
);
```

### `message_analytics`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Communication analytics, Response time tracking

```sql
create table public.message_analytics (
  id uuid not null default gen_random_uuid (),
  conversation_id uuid not null,
  booking_id uuid not null,
  message_count integer null default 0,
  participant_count integer null default 0,
  first_message_at timestamp without time zone null,
  last_message_at timestamp without time zone null,
  average_response_time_minutes numeric(10, 2) null,
  total_conversation_duration_minutes integer null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint message_analytics_pkey primary key (id),
  constraint message_analytics_booking_id_fkey foreign KEY (booking_id) references bookings (id) on delete CASCADE,
  constraint message_analytics_conversation_id_fkey foreign KEY (conversation_id) references conversation_metadata (id) on delete CASCADE
);
```

### `contact_submissions`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Customer support, Contact form submissions

```sql
create table public.contact_submissions (
  id uuid not null default gen_random_uuid (),
  from_email text not null,
  to_email text not null,
  subject text not null,
  message text not null,
  status text null default 'received'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  responded_at timestamp with time zone null,
  responded_by uuid null,
  notes text null,
  category text null,
  full_name text null,
  constraint contact_submissions_pkey primary key (id),
  constraint contact_submissions_responded_by_fkey foreign KEY (responded_by) references auth.users (id),
  constraint contact_submissions_status_check check (
    (
      status = any (
        array[
          'received'::text,
          'in_progress'::text,
          'responded'::text,
          'closed'::text
        ]
      )
    )
  )
);
```

### `announcements`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Platform announcements, System notifications

```sql
create table public.announcements (
  id uuid not null default gen_random_uuid (),
  title text not null,
  content text not null,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  start_date date null,
  end_date date null,
  announcement_audience public.announcement_audience null,
  announcement_type public.announcement_type null,
  constraint announcements_pkey primary key (id)
);
```

---

## 📊 Core System Tables

### `bookings`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Provider app bookings, Customer bookings

```sql
create table public.bookings (
  id uuid not null default gen_random_uuid (),
  customer_id uuid not null,
  provider_id uuid null,
  service_id uuid not null,
  business_id uuid not null,
  booking_date date not null,
  start_time time without time zone not null,
  total_amount numeric not null,
  booking_status public.booking_status null default 'pending'::booking_status,
  payment_status public.payment_status null default 'pending'::payment_status,
  delivery_type public.delivery_type null default 'business_location'::delivery_type,
  customer_location_id uuid null,
  business_location_id uuid null,
  booking_reference text null,
  guest_name text null,
  guest_email text null,
  guest_phone text null,
  admin_notes text null,
  created_at timestamp with time zone null default now(),
  -- ... many other fields for payments, tips, rescheduling, etc.
  constraint bookings_pkey primary key (id),
  constraint bookings_customer_id_fkey foreign KEY (customer_id) references customer_profiles (id),
  constraint bookings_service_id_fkey foreign KEY (service_id) references services (id),
  constraint bookings_business_id_fkey foreign KEY (business_id) references business_profiles (id)
);
```

### `business_profiles`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Business management, Provider onboarding, Verification

```sql
create table public.business_profiles (
  id uuid not null default gen_random_uuid (),
  business_name text not null,
  business_type public.business_type not null,
  contact_email text null,
  phone text null,
  business_description text null,
  verification_status public.verification_status null default 'pending'::verification_status,
  stripe_connect_account_id text null,
  is_active boolean null default true,
  is_featured boolean null,
  image_url text null,
  logo_url text null,
  cover_image_url text null,
  website_url text null,
  business_hours jsonb null default '{}'::jsonb,
  social_media jsonb null default '{}'::jsonb,
  service_categories service_category_types[] null,
  service_subcategories service_subcategory_types[] null,
  setup_completed boolean null,
  setup_step numeric null,
  identity_verified boolean null default false,
  bank_connected boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint business_profiles_pkey primary key (id)
);
```

### `business_locations`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Provider app bookings, Business settings

```sql
create table public.business_locations (
  id uuid not null default gen_random_uuid (),
  business_id uuid not null,
  location_name character varying(255) null,
  address_line1 character varying(255) null,    -- ⚠️ Different from customer_locations.street_address
  address_line2 character varying(255) null,    -- ⚠️ Different from customer_locations.unit_number
  city character varying(100) null,
  state character varying(100) null,
  postal_code character varying(20) null,       -- ⚠️ Different from customer_locations.zip_code
  country character varying(100) null,
  latitude double precision null,
  longitude double precision null,
  is_active boolean null default true,
  is_primary boolean null,
  offers_mobile_services boolean null,
  mobile_service_radius integer null,
  created_at timestamp without time zone null default now(),
  constraint business_locations_pkey primary key (id),
  constraint business_locations_business_id_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE
);
```

### `business_services`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Provider services management, Business pricing

```sql
create table public.business_services (
  id uuid not null default gen_random_uuid (),
  business_id uuid not null,
  service_id uuid not null,
  business_price numeric(10, 2) not null,
  is_active boolean null default true,
  delivery_type public.delivery_type null,
  created_at timestamp with time zone null default now(),
  constraint business_services_pkey primary key (id),
  constraint business_services_unique unique (business_id, service_id),
  constraint business_services_business_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE,
  constraint business_services_service_fkey foreign KEY (service_id) references services (id) on delete CASCADE
);
```

### `business_documents`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Business verification, Document management

```sql
create table public.business_documents (
  id uuid not null default gen_random_uuid (),
  business_id uuid not null,
  document_type public.business_document_type not null,
  document_name character varying(255) not null,
  file_url text not null,
  file_size_bytes integer null,
  verification_status public.business_document_status null,
  verified_by uuid null,
  verified_at timestamp without time zone null,
  rejection_reason text null,
  expiry_date date null,
  created_at timestamp without time zone null default now(),
  constraint provider_documents_pkey primary key (id),
  constraint business_documents_business_id_fkey foreign KEY (business_id) references business_profiles (id)
);
```

### `business_service_categories`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Business service organization

```sql
create table public.business_service_categories (
  id uuid not null default gen_random_uuid (),
  business_id uuid not null,
  category_id uuid null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint business_service_categories_pkey primary key (id),
  constraint business_service_categories_business_id_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE,
  constraint business_service_categories_category_id_fkey foreign KEY (category_id) references service_categories (id)
);
```

### `business_service_subcategories`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Business service organization

```sql
create table public.business_service_subcategories (
  id uuid not null default gen_random_uuid (),
  business_id uuid not null,
  category_id uuid null,
  subcategory_id uuid null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint business_service_subcategories_pkey primary key (id),
  constraint business_service_subcategories_business_id_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE,
  constraint business_service_subcategories_category_id_fkey foreign KEY (category_id) references service_categories (id),
  constraint business_service_subcategories_subcategory_id_fkey foreign KEY (subcategory_id) references service_subcategories (id)
);
```

### `business_addons`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Business addon pricing management

```sql
create table public.business_addons (
  id uuid not null default gen_random_uuid (),
  business_id uuid not null,
  addon_id uuid not null,
  custom_price numeric(10, 2) null,
  is_available boolean null default true,
  created_at timestamp without time zone null default now(),
  constraint business_addon_pricing_pkey primary key (id),
  constraint business_addon_pricing_business_id_addon_id_key unique (business_id, addon_id),
  constraint business_addon_pricing_business_id_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE,
  constraint business_addon_pricing_addon_id_fkey foreign KEY (addon_id) references service_addons (id) on delete CASCADE
);
```

### `business_stripe_tax_info`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Tax compliance, Stripe integration

```sql
create table public.business_stripe_tax_info (
  id uuid not null default gen_random_uuid (),
  business_id uuid not null,
  legal_business_name text not null,
  tax_id text not null,
  tax_id_type character varying(3) not null,
  tax_address_line1 text not null,
  tax_address_line2 text null,
  tax_city text not null,
  tax_state character varying(2) not null,
  tax_postal_code character varying(10) not null,
  tax_country character varying(2) not null default 'US',
  business_entity_type character varying(50) not null,
  stripe_tax_recipient_id text null,
  stripe_tax_registered boolean null default false,
  w9_status character varying(20) null default 'not_collected',
  tax_setup_completed boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint business_stripe_tax_info_pkey primary key (id),
  constraint business_stripe_tax_info_business_id_key unique (business_id),
  constraint business_stripe_tax_info_business_id_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE
);
```

### `stripe_connect_accounts`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Business Stripe Connect integration

```sql
create table public.stripe_connect_accounts (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  business_id uuid null,
  account_id text not null,
  account_type text null,
  country text null,
  default_currency text null,
  business_type text null,
  details_submitted boolean null default false,
  charges_enabled boolean null default false,
  payouts_enabled boolean null default false,
  capabilities jsonb null,
  requirements jsonb null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint stripe_connect_accounts_pkey primary key (id),
  constraint stripe_connect_accounts_account_id_key unique (account_id),
  constraint stripe_connect_accounts_business_id_key unique (business_id),
  constraint stripe_connect_accounts_business_id_fkey foreign KEY (business_id) references business_profiles (id),
  constraint stripe_connect_accounts_user_id_fkey foreign KEY (user_id) references auth.users (id)
);
```

### `stripe_identity_verifications`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Identity verification for businesses

```sql
create table public.stripe_identity_verifications (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  business_id uuid null,
  session_id text not null,
  status text null,
  type text null,
  client_secret text null,
  verification_report jsonb null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  verified_at timestamp with time zone null,
  failed_at timestamp with time zone null,
  constraint stripe_identity_verifications_pkey primary key (id),
  constraint stripe_identity_verifications_session_id_key unique (session_id),
  constraint stripe_identity_verifications_business_id_fkey foreign KEY (business_id) references business_profiles (id),
  constraint stripe_identity_verifications_user_id_fkey foreign KEY (user_id) references auth.users (id)
);
```

### `stripe_tax_webhook_events`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Stripe tax webhook processing

```sql
create table public.stripe_tax_webhook_events (
  id uuid not null default gen_random_uuid (),
  business_id uuid null,
  stripe_event_id text not null,
  stripe_event_type character varying(50) not null,
  stripe_object_id text null,
  stripe_object_type character varying(30) null,
  event_data jsonb null,
  processed boolean null default false,
  processed_at timestamp with time zone null,
  processing_error text null,
  webhook_received_at timestamp with time zone null default now(),
  api_version text null,
  created_at timestamp with time zone null default now(),
  constraint stripe_tax_webhook_events_pkey primary key (id),
  constraint stripe_tax_webhook_events_stripe_event_id_key unique (stripe_event_id),
  constraint stripe_tax_webhook_events_business_id_fkey foreign KEY (business_id) references business_profiles (id)
);
```

### `manual_bank_accounts`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Manual bank account management, Payment setup

```sql
create table public.manual_bank_accounts (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  business_id uuid null,
  account_name text not null,
  account_type text not null,
  account_number text not null,
  routing_number text not null,
  bank_name text not null,
  is_verified boolean null default false,
  is_default boolean null default false,
  stripe_account_id text null,
  verification_status text null default 'pending'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint manual_bank_accounts_pkey primary key (id),
  constraint manual_bank_accounts_business_id_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE,
  constraint manual_bank_accounts_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint manual_bank_accounts_account_type_check check (
    (
      account_type = any (array['checking'::text, 'savings'::text])
    )
  ),
  constraint manual_bank_accounts_verification_status_check check (
    (
      verification_status = any (
        array['pending'::text, 'verified'::text, 'failed'::text]
      )
    )
  )
);
```

### `plaid_bank_connections`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Plaid banking integration, Automated bank verification

```sql
create table public.plaid_bank_connections (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  business_id uuid null,
  plaid_access_token text null,
  plaid_item_id text null,
  plaid_account_id text null,
  institution_id text null,
  institution_name text null,
  account_name text null,
  account_mask text null,
  account_type text null,
  account_subtype text null,
  verification_status text null default 'verified'::text,
  routing_numbers text[] null,
  account_number_mask text null,
  connected_at timestamp with time zone null default now(),
  is_active boolean null default true,
  constraint plaid_bank_connections_pkey primary key (id),
  constraint plaid_bank_connections_business_id_key unique (business_id),
  constraint plaid_bank_connections_business_id_fkey foreign KEY (business_id) references business_profiles (id),
  constraint plaid_bank_connections_user_id_fkey foreign KEY (user_id) references auth.users (id)
);
```

### `plaid_link_sessions`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Plaid Link flow management, Bank connection sessions

```sql
create table public.plaid_link_sessions (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  business_id uuid null,
  link_token text null,
  expiration timestamp with time zone null,
  request_id text null,
  status text null default 'created'::text,
  created_at timestamp with time zone null default now(),
  constraint plaid_link_sessions_pkey primary key (id),
  constraint plaid_link_sessions_business_id_fkey foreign KEY (business_id) references business_profiles (id),
  constraint plaid_link_sessions_user_id_fkey foreign KEY (user_id) references auth.users (id)
);
```

### `business_setup_progress`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Provider onboarding, Setup tracking

```sql
create table public.business_setup_progress (
  id uuid not null default gen_random_uuid (),
  business_id uuid null,
  current_step integer null default 1,
  total_steps integer null default 8,
  business_profile_completed boolean null default false,
  locations_completed boolean null default false,
  services_pricing_completed boolean null default false,
  staff_setup_completed boolean null default false,
  integrations_completed boolean null default false,
  stripe_connect_completed boolean null default false,
  subscription_completed boolean null default false,
  go_live_completed boolean null default false,
  phase_1_completed boolean null default false,
  phase_2_completed boolean null default false,
  plaid_connected boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint business_setup_progress_pkey primary key (id),
  constraint business_setup_progress_business_id_key unique (business_id),
  constraint business_setup_progress_business_id_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE
);
```

### `business_payment_transactions`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Financial tracking, Tax reporting, Stripe payments

```sql
create table public.business_payment_transactions (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  business_id uuid not null,
  payment_date date not null,
  gross_payment_amount numeric(10, 2) not null,
  platform_fee numeric(10, 2) not null default 0,
  net_payment_amount numeric(10, 2) not null,
  tax_year integer not null,
  stripe_transfer_id text null,
  stripe_payment_intent_id text null,
  stripe_connect_account_id text null,
  stripe_tax_transaction_id text null,
  stripe_tax_reported boolean null default false,
  booking_reference text null,
  created_at timestamp with time zone null default now(),
  constraint business_payment_transactions_pkey primary key (id),
  constraint business_payment_transactions_booking_id_key unique (booking_id),
  constraint business_payment_transactions_booking_id_fkey foreign KEY (booking_id) references bookings (id) on delete CASCADE,
  constraint business_payment_transactions_business_id_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE
);
```

### `promotions`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Marketing campaigns, Discount management

```sql
create table public.promotions (
  id uuid not null default gen_random_uuid (),
  title character varying(255) not null,
  description text null,
  start_date date null,
  end_date date null,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  business_id uuid null,
  image_url text null,
  promo_code text not null,
  savings_type public.promotion_savings_type null,
  savings_amount numeric null,
  savings_max_amount numeric null,
  service_id uuid null,
  constraint promotions_pkey primary key (id),
  constraint promotions_business_id_fkey foreign KEY (business_id) references business_profiles (id),
  constraint promotions_service_id_fkey foreign KEY (service_id) references services (id)
);
```

### `promotion_usage`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Promotion tracking, Discount application

```sql
create table public.promotion_usage (
  id uuid not null default extensions.uuid_generate_v4 (),
  promotion_id uuid not null,
  booking_id uuid not null,
  discount_applied numeric(10, 2) not null,
  original_amount numeric(10, 2) not null,
  final_amount numeric(10, 2) not null,
  created_at timestamp with time zone null default now(),
  used_at timestamp with time zone null default now(),
  constraint promotion_usage_pkey primary key (id),
  constraint promotion_usage_promotion_id_booking_id_key unique (promotion_id, booking_id),
  constraint promotion_usage_booking_id_fkey foreign KEY (booking_id) references bookings (id) on delete CASCADE,
  constraint promotion_usage_promotion_id_fkey foreign KEY (promotion_id) references promotions (id) on delete CASCADE,
  constraint valid_amounts check (
    (
      final_amount = (original_amount - discount_applied)
    )
  ),
  constraint valid_discount_applied check ((discount_applied >= (0)::numeric))
);
```

### `booking_addons`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Booking enhancements, Addon tracking

```sql
create table public.booking_addons (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  addon_id uuid not null,
  added_at timestamp without time zone null default now(),
  constraint booking_addons_pkey primary key (id),
  constraint booking_addons_booking_id_fkey foreign KEY (booking_id) references bookings (id) on delete CASCADE,
  constraint booking_addons_addon_id_fkey foreign KEY (addon_id) references service_addons (id)
);
```

### `booking_changes`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Booking modification tracking, Audit trail

```sql
create table public.booking_changes (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  change_type character varying(50) not null,
  old_value jsonb null,
  new_value jsonb null,
  additional_cost numeric(10, 2) null default 0,
  refund_amount numeric(10, 2) null default 0,
  changed_by uuid not null,
  change_reason text null,
  stripe_charge_id character varying(255) null,
  stripe_refund_id character varying(255) null,
  created_at timestamp without time zone null default now(),
  constraint booking_changes_pkey primary key (id),
  constraint booking_changes_booking_id_fkey foreign KEY (booking_id) references bookings (id) on delete CASCADE,
  constraint booking_changes_changed_by_fkey foreign KEY (changed_by) references auth.users (id)
);
```

---

## 📈 Platform Analytics & Reporting

### `platform_analytics`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Platform dashboard, Business intelligence

```sql
create table public.platform_analytics (
  id uuid not null default gen_random_uuid (),
  date date not null,
  total_bookings integer null default 0,
  completed_bookings integer null default 0,
  cancelled_bookings integer null default 0,
  no_show_bookings integer null default 0,
  gross_revenue numeric(12, 2) null default 0,
  platform_fees numeric(12, 2) null default 0,
  provider_payouts numeric(12, 2) null default 0,
  refunds_issued numeric(12, 2) null default 0,
  new_customers integer null default 0,
  new_businesses integer null default 0,
  new_providers integer null default 0,
  active_customers integer null default 0,
  active_providers integer null default 0,
  average_rating numeric(3, 2) null default 0,
  total_reviews integer null default 0,
  new_tickets integer null default 0,
  resolved_tickets integer null default 0,
  average_resolution_hours numeric(5, 2) null default 0,
  created_at timestamp without time zone null default now(),
  constraint platform_analytics_pkey primary key (id),
  constraint platform_analytics_date_key unique (date)
);
```

### `platform_annual_tax_summary`
**Status**: ✅ CONFIRMED WORKING (2025-10-01)
**Used in**: Annual tax reporting, 1099 generation

```sql
create table public.platform_annual_tax_summary (
  id uuid not null default gen_random_uuid (),
  tax_year integer not null,
  total_businesses_paid integer null default 0,
  total_payments_made numeric(15, 2) null default 0,
  businesses_requiring_1099 integer null default 0,
  total_1099_eligible_payments numeric(15, 2) null default 0,
  forms_1099_generated integer null default 0,
  forms_1099_sent integer null default 0,
  forms_1099_delivered integer null default 0,
  irs_filing_completed boolean null default false,
  irs_filing_completed_date timestamp with time zone null,
  processing_status character varying(20) null default 'pending'::character varying,
  processing_notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint platform_annual_tax_summary_pkey primary key (id),
  constraint platform_annual_tax_summary_tax_year_key unique (tax_year),
  constraint platform_annual_tax_summary_processing_status_check check (
    (
      (processing_status)::text = any (
        (
          array[
            'pending'::character varying,
            'in_progress'::character varying,
            'completed'::character varying,
            'failed'::character varying
          ]
        )::text[]
      )
    )
  )
);
```

---

## 🔍 QUICK FIELD REFERENCE

### Address Fields by Table
| Table | Primary Address | Secondary Address | Postal Code |
|-------|----------------|-------------------|-------------|
| `customer_locations` | `street_address` | `unit_number` | `zip_code` |
| `business_locations` | `address_line1` | `address_line2` | `postal_code` |
| `business_stripe_tax_info` | `tax_address_line1` | `tax_address_line2` | `tax_postal_code` |

### Business Fields
| Table | Name Field | Type Field | Status Field |
|-------|------------|------------|--------------|
| `business_profiles` | `business_name` | `business_type` | `verification_status` |
| `business_documents` | `document_name` | `document_type` | `verification_status` |
| `business_services` | N/A | `delivery_type` | `is_active` |
| `business_setup_progress` | N/A | N/A | Multiple boolean fields |

### Service Fields
| Table | Name Field | Price Field | Duration Field | Type Field |
|-------|------------|-------------|----------------|------------|
| `services` | `name` (NOT `service_name`) | `min_price` | `duration_minutes` | N/A |
| `service_categories` | N/A | N/A | N/A | `service_category_type` |
| `service_subcategories` | N/A | N/A | N/A | `service_subcategory_type` |
| `service_addons` | `name` | N/A | N/A | N/A |

### Common Joins for Bookings
```sql
-- ✅ CONFIRMED WORKING BOOKINGS QUERY
SELECT 
  *,
  customer_profiles (id, first_name, last_name, email, phone),
  customer_locations (
    id, location_name, street_address, unit_number, 
    city, state, zip_code, latitude, longitude, 
    is_primary, is_active, access_instructions, location_type
  ),
  business_locations (
    id, location_name, address_line1, address_line2,
    city, state, postal_code
  ),
  services (id, name, description, duration_minutes, min_price, max_price),
  providers (id, first_name, last_name)
FROM bookings
WHERE business_id = $1;
```

### Service Hierarchy Joins
```sql
-- ✅ SERVICE WITH CATEGORIES AND SUBCATEGORIES
SELECT 
  s.*,
  service_subcategories (
    id, service_subcategory_type, description,
    service_categories (
      id, service_category_type, description, sort_order
    )
  )
FROM services s
WHERE s.is_active = true;

-- ✅ SERVICE WITH ELIGIBLE ADDONS
SELECT 
  s.*,
  service_addon_eligibility (
    is_recommended,
    service_addons (
      id, name, description, image_url
    )
  )
FROM services s
WHERE s.id = $1;
```

### Business Joins
```sql
-- ✅ BUSINESS WITH LOCATIONS AND SERVICES
SELECT 
  bp.*,
  business_locations (
    id, location_name, address_line1, address_line2,
    city, state, postal_code, is_primary, offers_mobile_services
  ),
  business_services (
    id, business_price, is_active, delivery_type,
    services (id, name, description, min_price, duration_minutes)
  )
FROM business_profiles bp
WHERE bp.id = $1;

-- ✅ BUSINESS SETUP PROGRESS
SELECT 
  bp.business_name,
  bsp.current_step, bsp.total_steps,
  bsp.business_profile_completed,
  bsp.locations_completed,
  bsp.services_pricing_completed,
  bsp.stripe_connect_completed
FROM business_profiles bp
LEFT JOIN business_setup_progress bsp ON bp.id = bsp.business_id
WHERE bp.id = $1;

-- ✅ BOOKING WITH ALL RELATIONSHIPS
SELECT 
  b.*,
  customer_profiles (id, first_name, last_name, email, phone),
  business_profiles (id, business_name, business_type),
  services (id, name, description, duration_minutes),
  providers (id, first_name, last_name),
  booking_addons (
    addon_id,
    service_addons (id, name, description)
  )
FROM bookings b
WHERE b.business_id = $1;
```

### Customer Joins
```sql
-- ✅ CUSTOMER WITH PROFILE AND LOCATIONS
SELECT 
  cp.*,
  customer_locations (
    id, location_name, street_address, unit_number,
    city, state, zip_code, is_primary, access_instructions
  ),
  customer_stripe_profiles (
    stripe_customer_id, default_payment_method_id, subscription_status
  )
FROM customer_profiles cp
WHERE cp.user_id = $1;

-- ✅ CUSTOMER FAVORITES
SELECT 
  cp.first_name, cp.last_name,
  customer_favorite_services (
    service_id,
    services (id, name, description, min_price)
  ),
  customer_favorite_providers (
    provider_id,
    providers (id, first_name, last_name)
  ),
  customer_favorite_businesses (
    business_id,
    business_profiles (id, business_name, business_type)
  )
FROM customer_profiles cp
WHERE cp.id = $1;

-- ✅ BOOKING WITH FINANCIAL TRANSACTIONS
SELECT 
  b.*,
  financial_transactions (
    id, amount, transaction_type, status, stripe_transaction_id
  ),
  payment_transactions (
    id, amount, transaction_type, status, stripe_payment_intent_id
  )
FROM bookings b
WHERE b.customer_id = $1;
```

---

## ⚠️ CRITICAL NAMING DIFFERENCES

### Customer vs Business Locations
```typescript
// ❌ WRONG - Don't mix naming conventions
customer_locations.address_line1  // Field doesn't exist
business_locations.street_address // Field doesn't exist

// ✅ CORRECT - Use proper field names
customer_locations.street_address  // Correct field name
customer_locations.unit_number     // Correct field name
customer_locations.zip_code        // Correct field name

business_locations.address_line1   // Correct field name  
business_locations.address_line2   // Correct field name
business_locations.postal_code     // Correct field name
```

### Services Table
```typescript
// ❌ WRONG
services.service_name  // Field doesn't exist

// ✅ CORRECT  
services.name          // Correct field name
```

### Service Categories & Types
```typescript
// ✅ CORRECT - Categories use type fields
service_categories.service_category_type
service_subcategories.service_subcategory_type

// ✅ CORRECT - Addons use name field
service_addons.name
```

### Business Profiles & Settings
```typescript
// ✅ CORRECT - Business profile fields
business_profiles.business_name
business_profiles.business_type
business_profiles.verification_status

// ❌ WRONG - Don't confuse address fields
business_locations.street_address  // Field doesn't exist

// ✅ CORRECT - Business locations use different naming
business_locations.address_line1   // Correct field name
business_locations.postal_code     // Not zip_code
```

### Tax Information
```typescript
// ✅ CORRECT - Tax info has its own address fields
business_stripe_tax_info.tax_address_line1
business_stripe_tax_info.tax_postal_code
business_stripe_tax_info.legal_business_name  // Not business_name
```

### Customer Profiles
```typescript
// ✅ CORRECT - Customer profile fields
customer_profiles.first_name
customer_profiles.last_name
customer_profiles.email

// ✅ CORRECT - Customer Stripe integration
customer_stripe_profiles.stripe_customer_id
customer_stripe_profiles.stripe_email         // Different from customer_profiles.email

// ❌ WRONG - Don't mix customer and business address fields
customer_locations.address_line1              // Field doesn't exist
customer_stripe_profiles.customer_email       // Field doesn't exist

// ✅ CORRECT - Customer locations use different naming
customer_locations.street_address             // Correct field name
customer_locations.zip_code                   // Not postal_code
```

### Financial Transactions
```typescript
// ✅ CORRECT - Transaction amount and type fields
financial_transactions.amount
financial_transactions.transaction_type
payment_transactions.stripe_payment_intent_id

// ✅ CORRECT - Customer favorites relationships
customer_favorite_services.service_id
customer_favorite_providers.provider_id
customer_favorite_businesses.business_id
```

---

## 🔧 WORKING QUERY PATTERNS

### Supabase Client Queries
```typescript
// 🔑 USER ROLE ARCHITECTURE QUERIES

// ✅ Get customer profile (role: customer)
const { data } = await supabase
  .from('customer_profiles')
  .select('id, user_id, email, first_name, last_name, phone')
  .eq('user_id', userId)
  .single();

// ✅ Get admin user (role: admin)
const { data } = await supabase
  .from('admin_users')
  .select('id, user_id, email, permissions, role, first_name, last_name')
  .eq('user_id', userId)
  .single();

// ✅ Get provider profile (roles: Owner, Dispatcher, Provider)
const { data } = await supabase
  .from('providers')
  .select('id, user_id, first_name, last_name, email, role, business_id, is_active')
  .eq('user_id', userId)
  .single();

// ✅ Auth user lookup (base authentication)
const { data } = await supabase
  .from('auth.users')
  .select('id, email, phone, email_confirmed_at, phone_confirmed_at, last_sign_in_at')
  .eq('id', userId)
  .single();

// ✅ Admin user with permissions
const { data } = await supabase
  .from('admin_users')
  .select('id, email, permissions, is_active, role, first_name, last_name')
  .eq('user_id', userId)
  .eq('is_active', true)
  .single();

// ✅ User roles for business
const { data } = await supabase
  .from('user_roles')
  .select('role, business_id, location_id, granted_at, expires_at')
  .eq('user_id', userId)
  .eq('is_active', true)
  .order('granted_at', { ascending: false });

// ✅ User settings
const { data } = await supabase
  .from('user_settings')
  .select('theme, language, timezone, email_notifications, push_notifications, date_format, time_format')
  .eq('user_id', userId)
  .single();

// ✅ Reviews for booking
const { data } = await supabase
  .from('reviews')
  .select('overall_rating, service_rating, communication_rating, punctuality_rating, review_text, is_approved')
  .eq('booking_id', bookingId)
  .single();

// ✅ Approved reviews for provider/business
const { data } = await supabase
  .from('reviews')
  .select(`
    overall_rating, service_rating, review_text, created_at,
    bookings (provider_id, business_id, service_id)
  `)
  .eq('is_approved', true)
  .eq('bookings.business_id', businessId)
  .order('created_at', { ascending: false });

// ✅ Featured reviews
const { data } = await supabase
  .from('reviews')
  .select('overall_rating, review_text, created_at, bookings (service_id)')
  .eq('is_featured', true)
  .eq('is_approved', true)
  .order('created_at', { ascending: false })
  .limit(5);

// ✅ Reviews pending moderation
const { data } = await supabase
  .from('reviews')
  .select('id, overall_rating, review_text, created_at, booking_id')
  .eq('is_approved', false)
  .is('moderated_by', null)
  .order('created_at', { ascending: true });

// ✅ Average ratings for business/provider
const { data } = await supabase
  .from('reviews')
  .select(`
    overall_rating, service_rating, communication_rating, punctuality_rating,
    bookings (business_id, provider_id)
  `)
  .eq('is_approved', true)
  .eq('bookings.business_id', businessId);

// ✅ Review moderation update
const { data } = await supabase
  .from('reviews')
  .update({
    is_approved: true,
    moderated_by: adminUserId,
    moderated_at: new Date().toISOString(),
    moderation_notes: 'Approved - meets content guidelines'
  })
  .eq('id', reviewId);

// ✅ Active business users by role
const { data } = await supabase
  .from('user_roles')
  .select(`
    role, user_id,
    auth.users (email, phone),
    admin_users (first_name, last_name)
  `)
  .eq('business_id', businessId)
  .eq('is_active', true)
  .in('role', ['business_owner', 'business_manager', 'provider']);

// ✅ Customer locations query
const { data } = await supabase
  .from('customer_locations')
  .select('id, location_name, street_address, unit_number, city, state, zip_code')
  .eq('customer_id', customerId);

// ✅ Business locations query
const { data } = await supabase
  .from('business_locations')  
  .select('id, location_name, address_line1, address_line2, city, state, postal_code')
  .eq('business_id', businessId);

// ✅ Services query
const { data } = await supabase
  .from('services')
  .select('id, name, description, min_price, duration_minutes, image_url')
  .eq('is_active', true);

// ✅ Service categories query
const { data } = await supabase
  .from('service_categories')
  .select('id, service_category_type, description, image_url, sort_order')
  .eq('is_active', true)
  .order('sort_order');

// ✅ Service with subcategories and categories
const { data } = await supabase
  .from('services')
  .select(`
    id, name, description, min_price, duration_minutes,
    service_subcategories (
      id, service_subcategory_type,
      service_categories (
        id, service_category_type, description
      )
    )
  `)
  .eq('is_active', true);

// ✅ Service with eligible addons
const { data } = await supabase
  .from('service_addon_eligibility')
  .select(`
    is_recommended,
    services (id, name),
    service_addons (id, name, description, image_url)
  `)
  .eq('service_id', serviceId);

// ✅ Business profiles query
const { data } = await supabase
  .from('business_profiles')
  .select('id, business_name, business_type, verification_status, is_active')
  .eq('is_active', true);

// ✅ Business with locations and services
const { data } = await supabase
  .from('business_profiles')
  .select(`
    id, business_name, business_type,
    business_locations (
      id, location_name, address_line1, address_line2,
      city, state, postal_code, is_primary
    ),
    business_services (
      id, business_price, is_active,
      services (id, name, min_price, duration_minutes)
    )
  `)
  .eq('id', businessId);

// ✅ Business setup progress
const { data } = await supabase
  .from('business_setup_progress')
  .select(`
    current_step, total_steps,
    business_profile_completed,
    locations_completed,
    services_pricing_completed,
    stripe_connect_completed
  `)
  .eq('business_id', businessId)
  .single();

// ✅ Business tax information
const { data } = await supabase
  .from('business_stripe_tax_info')
  .select('legal_business_name, tax_id_type, tax_setup_completed')
  .eq('business_id', businessId)
  .single();

// ✅ Customer profiles query
const { data } = await supabase
  .from('customer_profiles')
  .select('id, user_id, first_name, last_name, email, phone, is_active')
  .eq('user_id', userId)
  .single();

// ✅ Customer with locations and favorites
const { data } = await supabase
  .from('customer_profiles')
  .select(`
    id, first_name, last_name, email, phone,
    customer_locations (
      id, location_name, street_address, unit_number,
      city, state, zip_code, is_primary
    ),
    customer_favorite_services (
      service_id,
      services (id, name, min_price)
    )
  `)
  .eq('id', customerId);

// ✅ Customer Stripe profile
const { data } = await supabase
  .from('customer_stripe_profiles')
  .select('stripe_customer_id, default_payment_method_id, subscription_status')
  .eq('user_id', userId)
  .single();

// ✅ Financial transactions for booking
const { data } = await supabase
  .from('financial_transactions')
  .select('id, amount, transaction_type, status, stripe_transaction_id, description')
  .eq('booking_id', bookingId)
  .order('created_at', { ascending: false });

// ✅ Payment transactions for booking
const { data } = await supabase
  .from('payment_transactions')
  .select('id, amount, transaction_type, status, stripe_payment_intent_id')
  .eq('booking_id', bookingId)
  .order('created_at', { ascending: false });

// ✅ Tips for a booking
const { data } = await supabase
  .from('tips')
  .select('id, tip_amount, tip_percentage, payment_status, customer_message, provider_response, tip_given_at')
  .eq('booking_id', bookingId)
  .order('tip_given_at', { ascending: false });

// ✅ Provider tips summary
const { data } = await supabase
  .from('tips')
  .select('id, tip_amount, payment_status, payout_status, tip_given_at')
  .eq('provider_id', providerId)
  .eq('payment_status', 'completed')
  .order('tip_given_at', { ascending: false });

// ✅ Tip presets for service category
const { data } = await supabase
  .from('tip_presets')
  .select('preset_type, preset_values, minimum_tip_amount, maximum_tip_amount, allow_custom_amount')
  .eq('service_category_id', categoryId)
  .eq('is_active', true)
  .single();

// ✅ Daily tip analytics
const { data } = await supabase
  .from('tip_analytics_daily')
  .select('total_tips_count, total_tips_amount, average_tip_amount, tip_conversion_rate')
  .eq('date', targetDate)
  .single();

// ✅ Stripe Connect account for business
const { data } = await supabase
  .from('stripe_connect_accounts')
  .select('account_id, charges_enabled, payouts_enabled, details_submitted, capabilities, requirements')
  .eq('business_id', businessId)
  .single();

// ✅ Stripe identity verification status
const { data } = await supabase
  .from('stripe_identity_verifications')
  .select('session_id, status, type, verified_at, failed_at')
  .eq('business_id', businessId)
  .order('created_at', { ascending: false });

// ✅ Unprocessed Stripe tax webhook events
const { data } = await supabase
  .from('stripe_tax_webhook_events')
  .select('id, stripe_event_type, stripe_object_id, event_data, processing_error')
  .eq('processed', false)
  .order('webhook_received_at', { ascending: true });

// ✅ Stripe webhook events for business
const { data } = await supabase
  .from('stripe_tax_webhook_events')
  .select('stripe_event_type, processed, processed_at, processing_error')
  .eq('business_id', businessId)
  .order('webhook_received_at', { ascending: false });

// ✅ Manual bank accounts for business
const { data } = await supabase
  .from('manual_bank_accounts')
  .select('id, account_name, account_type, bank_name, is_verified, is_default, verification_status')
  .eq('business_id', businessId)
  .eq('is_active', true)
  .order('created_at', { ascending: false });

// ✅ Default bank account for business
const { data } = await supabase
  .from('manual_bank_accounts')
  .select('account_name, account_type, bank_name, account_number, routing_number')
  .eq('business_id', businessId)
  .eq('is_default', true)
  .eq('is_verified', true)
  .single();

// ✅ Plaid bank connection for business
const { data } = await supabase
  .from('plaid_bank_connections')
  .select('institution_name, account_name, account_mask, account_type, verification_status, connected_at')
  .eq('business_id', businessId)
  .eq('is_active', true)
  .single();

// ✅ Active Plaid link sessions
const { data } = await supabase
  .from('plaid_link_sessions')
  .select('link_token, expiration, status, created_at')
  .eq('business_id', businessId)
  .eq('status', 'created')
  .gt('expiration', new Date().toISOString())
  .order('created_at', { ascending: false });

// ✅ Bank account verification status
const { data } = await supabase
  .from('manual_bank_accounts')
  .select('account_name, verification_status, created_at, updated_at')
  .eq('user_id', userId)
  .in('verification_status', ['pending', 'failed'])
  .order('updated_at', { ascending: false });

// ✅ Active promotions for business
const { data } = await supabase
  .from('promotions')
  .select('id, title, description, promo_code, savings_type, savings_amount, start_date, end_date')
  .eq('business_id', businessId)
  .eq('is_active', true)
  .gte('end_date', new Date().toISOString())
  .order('created_at', { ascending: false });

// ✅ Promotion by promo code
const { data } = await supabase
  .from('promotions')
  .select('id, title, savings_type, savings_amount, savings_max_amount, service_id, start_date, end_date')
  .eq('promo_code', promoCode)
  .eq('is_active', true)
  .gte('end_date', new Date().toISOString())
  .lte('start_date', new Date().toISOString())
  .single();

// ✅ Promotion usage analytics
const { data } = await supabase
  .from('promotion_usage')
  .select('promotion_id, discount_applied, original_amount, final_amount, used_at')
  .eq('promotion_id', promotionId)
  .order('used_at', { ascending: false });

// ✅ Booking promotion details
const { data } = await supabase
  .from('promotion_usage')
  .select(`
    discount_applied, original_amount, final_amount,
    promotions (title, promo_code, savings_type)
  `)
  .eq('booking_id', bookingId)
  .single();

// ✅ Service-specific promotions
const { data } = await supabase
  .from('promotions')
  .select('id, title, description, promo_code, savings_amount, image_url')
  .eq('service_id', serviceId)
  .eq('is_active', true)
  .gte('end_date', new Date().toISOString())
  .order('savings_amount', { ascending: false });

// ✅ Promotion performance summary
const { data } = await supabase
  .from('promotion_usage')
  .select('promotion_id, discount_applied, used_at')
  .gte('used_at', startDate)
  .lte('used_at', endDate)
  .order('used_at', { ascending: false });

// ✅ Unread message notifications for user
const { data } = await supabase
  .from('message_notifications')
  .select('id, conversation_id, message_sid, notification_type, created_at')
  .eq('user_id', userId)
  .eq('is_read', false)
  .order('created_at', { ascending: false });

// ✅ Mark message notifications as read
const { data } = await supabase
  .from('message_notifications')
  .update({ is_read: true, read_at: new Date().toISOString() })
  .eq('user_id', userId)
  .eq('conversation_id', conversationId);

// ✅ Message analytics for booking
const { data } = await supabase
  .from('message_analytics')
  .select('message_count, participant_count, average_response_time_minutes, total_conversation_duration_minutes')
  .eq('booking_id', bookingId)
  .single();

// ✅ Conversation analytics summary
const { data } = await supabase
  .from('message_analytics')
  .select('conversation_id, message_count, average_response_time_minutes, first_message_at, last_message_at')
  .eq('conversation_id', conversationId)
  .single();

// ✅ Contact submissions by status
const { data } = await supabase
  .from('contact_submissions')
  .select('id, from_email, subject, status, created_at, category, full_name')
  .eq('status', 'received')
  .order('created_at', { ascending: false });

// ✅ Update contact submission status
const { data } = await supabase
  .from('contact_submissions')
  .update({ 
    status: 'responded', 
    responded_at: new Date().toISOString(),
    responded_by: userId,
    notes: 'Customer inquiry resolved'
  })
  .eq('id', submissionId);

// ✅ Contact submissions by email
const { data } = await supabase
  .from('contact_submissions')
  .select('id, subject, message, status, created_at, responded_at')
  .eq('from_email', customerEmail)
  .order('created_at', { ascending: false });

// ✅ Support team dashboard - pending submissions
const { data } = await supabase
  .from('contact_submissions')
  .select('id, from_email, subject, category, created_at, full_name')
  .in('status', ['received', 'in_progress'])
  .order('created_at', { ascending: true });

// ✅ Active announcements for audience
const { data } = await supabase
  .from('announcements')
  .select('id, title, content, announcement_type, start_date, end_date')
  .eq('is_active', true)
  .eq('announcement_audience', audience)
  .lte('start_date', new Date().toISOString())
  .gte('end_date', new Date().toISOString())
  .order('created_at', { ascending: false });

// ✅ All active announcements
const { data } = await supabase
  .from('announcements')
  .select('id, title, content, announcement_type, announcement_audience, created_at')
  .eq('is_active', true)
  .or(`start_date.is.null,start_date.lte.${new Date().toISOString()}`)
  .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
  .order('created_at', { ascending: false });

// ✅ Announcements by type
const { data } = await supabase
  .from('announcements')
  .select('id, title, content, start_date, end_date, created_at')
  .eq('announcement_type', announcementType)
  .eq('is_active', true)
  .order('created_at', { ascending: false });

// ✅ Create new announcement
const { data } = await supabase
  .from('announcements')
  .insert({
    title: 'Platform Maintenance Notice',
    content: 'Scheduled maintenance will occur on...',
    announcement_audience: 'all_users',
    announcement_type: 'maintenance',
    start_date: startDate,
    end_date: endDate
  })
  .select();

// ✅ Platform analytics for date range
const { data } = await supabase
  .from('platform_analytics')
  .select('date, total_bookings, completed_bookings, gross_revenue, platform_fees, new_customers')
  .gte('date', startDate)
  .lte('date', endDate)
  .order('date', { ascending: true });

// ✅ Daily platform summary
const { data } = await supabase
  .from('platform_analytics')
  .select('total_bookings, completed_bookings, cancelled_bookings, gross_revenue, new_customers, new_businesses')
  .eq('date', today)
  .single();

// ✅ Platform performance metrics
const { data } = await supabase
  .from('platform_analytics')
  .select('average_rating, total_reviews, active_customers, active_providers, average_resolution_hours')
  .order('date', { ascending: false })
  .limit(30);

// ✅ Annual tax summary by year
const { data } = await supabase
  .from('platform_annual_tax_summary')
  .select('tax_year, total_businesses_paid, total_payments_made, businesses_requiring_1099, forms_1099_generated')
  .eq('tax_year', taxYear)
  .single();

// ✅ Tax filing status
const { data } = await supabase
  .from('platform_annual_tax_summary')
  .select('tax_year, processing_status, irs_filing_completed, forms_1099_sent, forms_1099_delivered')
  .in('processing_status', ['pending', 'in_progress'])
  .order('tax_year', { ascending: false });

// ✅ Tax compliance overview
const { data } = await supabase
  .from('platform_annual_tax_summary')
  .select('tax_year, total_1099_eligible_payments, forms_1099_generated, irs_filing_completed_date')
  .eq('irs_filing_completed', true)
  .order('tax_year', { ascending: false });
```

---

## Quick Reference: Authentication & User Fields

### Auth Core Fields
- **auth.users**: `id`, `email`, `encrypted_password`, `email_confirmed_at`, `phone`, `phone_confirmed_at`, `last_sign_in_at`, `raw_app_meta_data`, `raw_user_meta_data`, `is_super_admin`, `created_at`, `updated_at`, `confirmed_at`, `banned_until`, `is_sso_user`, `deleted_at`, `is_anonymous`

### Admin User Fields
- **admin_users**: `id`, `user_id`, `email`, `permissions`, `is_active`, `created_at`, `image_url`, `first_name`, `last_name`, `role`

### User Role Fields
- **user_roles**: `id`, `user_id`, `role`, `business_id`, `location_id`, `granted_by`, `granted_at`, `expires_at`, `is_active`, `created_at`, `updated_at`

### User Settings Fields
- **user_settings**: `id`, `user_id`, `theme`, `language`, `timezone`, `email_notifications`, `push_notifications`, `sound_enabled`, `auto_logout_minutes`, `date_format`, `time_format`, `items_per_page`, `sidebar_collapsed`, `created_at`, `updated_at`

### Review & Rating Fields
- **reviews**: `id`, `booking_id`, `overall_rating`, `service_rating`, `communication_rating`, `punctuality_rating`, `review_text`, `is_approved`, `is_featured`, `moderated_by`, `moderated_at`, `moderation_notes`, `created_at`

---

## Quick Reference: Provider Fields

### Provider Core Fields
- **providers**: `id`, `user_id`, `first_name`, `last_name`, `email`, `phone`, `avatar_url`, `business_id`, `role`, `bio`, `specialties`, `years_experience`, `is_active`, `verification_status`, `rating`, `total_reviews`, `total_earnings`, `commission_rate`, `created_at`, `updated_at`

### Provider Verification Fields  
- **provider_verifications**: `id`, `provider_id`, `verification_type`, `document_url`, `status`, `verified_at`, `verified_by`, `notes`, `created_at`, `updated_at`

### Provider Service Fields
- **provider_services**: `id`, `provider_id`, `service_id`, `is_active`, `custom_price`, `custom_duration`, `custom_description`, `created_at`, `updated_at`

### Provider Booking Fields
- **provider_booking_preferences**: `id`, `provider_id`, `advance_booking_days`, `buffer_time_minutes`, `auto_accept_bookings`, `require_deposit`, `deposit_amount`, `cancellation_policy`, `created_at`, `updated_at`

### Provider Financial Fields
- **provider_bank_accounts**: `id`, `provider_id`, `bank_name`, `account_holder_name`, `account_number_last4`, `routing_number`, `account_type`, `stripe_account_id`, `is_verified`, `is_default`, `created_at`, `updated_at`

### Provider Availability Fields
- **provider_availability**: `id`, `provider_id`, `day_of_week`, `start_time`, `end_time`, `is_available`, `break_start_time`, `break_end_time`, `created_at`, `updated_at`

### Provider Application Fields
- **provider_applications**: `id`, `user_id`, `business_id`, `application_data`, `status`, `submitted_at`, `reviewed_at`, `reviewed_by`, `notes`, `created_at`, `updated_at`

### Provider Addon Fields
- **provider_addons**: `id`, `provider_id`, `addon_id`, `is_active`, `custom_price`, `created_at`, `updated_at`

### Tip System Fields
- **tips**: `id`, `booking_id`, `customer_id`, `provider_id`, `business_id`, `tip_amount`, `tip_percentage`, `stripe_payment_intent_id`, `payment_status`, `platform_fee_amount`, `provider_net_amount`, `customer_message`, `provider_response`, `provider_responded_at`, `tip_given_at`, `payment_processed_at`, `payout_status`, `payout_batch_id`, `payout_date`, `created_at`, `updated_at`

### Tip Configuration Fields
- **tip_presets**: `id`, `service_category_id`, `preset_type`, `preset_values`, `is_active`, `default_selection`, `allow_custom_amount`, `minimum_tip_amount`, `maximum_tip_amount`, `tip_window_hours`, `created_at`, `updated_at`

### Tip Analytics Fields
- **tip_analytics_daily**: `id`, `date`, `total_tips_count`, `total_tips_amount`, `average_tip_amount`, `average_tip_percentage`, `tips_by_category`, `unique_tipping_customers`, `repeat_tippers`, `tip_conversion_rate`, `providers_receiving_tips`, `platform_fee_from_tips`, `created_at`

### Stripe Integration Fields
- **stripe_connect_accounts**: `id`, `user_id`, `business_id`, `account_id`, `account_type`, `country`, `default_currency`, `business_type`, `details_submitted`, `charges_enabled`, `payouts_enabled`, `capabilities`, `requirements`, `created_at`, `updated_at`

### Stripe Identity Fields
- **stripe_identity_verifications**: `id`, `user_id`, `business_id`, `session_id`, `status`, `type`, `client_secret`, `verification_report`, `created_at`, `updated_at`, `verified_at`, `failed_at`

### Stripe Webhook Fields
- **stripe_tax_webhook_events**: `id`, `business_id`, `stripe_event_id`, `stripe_event_type`, `stripe_object_id`, `stripe_object_type`, `event_data`, `processed`, `processed_at`, `processing_error`, `webhook_received_at`, `api_version`, `created_at`

### Banking Integration Fields
- **manual_bank_accounts**: `id`, `user_id`, `business_id`, `account_name`, `account_type`, `account_number`, `routing_number`, `bank_name`, `is_verified`, `is_default`, `stripe_account_id`, `verification_status`, `created_at`, `updated_at`

### Plaid Integration Fields
- **plaid_bank_connections**: `id`, `user_id`, `business_id`, `plaid_access_token`, `plaid_item_id`, `plaid_account_id`, `institution_id`, `institution_name`, `account_name`, `account_mask`, `account_type`, `account_subtype`, `verification_status`, `routing_numbers`, `account_number_mask`, `connected_at`, `is_active`

### Plaid Session Fields
- **plaid_link_sessions**: `id`, `user_id`, `business_id`, `link_token`, `expiration`, `request_id`, `status`, `created_at`

### Promotion & Marketing Fields
- **promotions**: `id`, `title`, `description`, `start_date`, `end_date`, `is_active`, `created_at`, `business_id`, `image_url`, `promo_code`, `savings_type`, `savings_amount`, `savings_max_amount`, `service_id`

### Promotion Usage Fields
- **promotion_usage**: `id`, `promotion_id`, `booking_id`, `discount_applied`, `original_amount`, `final_amount`, `created_at`, `used_at`

### Messaging & Communication Fields
- **message_notifications**: `id`, `conversation_id`, `user_id`, `message_sid`, `is_read`, `read_at`, `created_at`, `notification_type`

### Message Analytics Fields
- **message_analytics**: `id`, `conversation_id`, `booking_id`, `message_count`, `participant_count`, `first_message_at`, `last_message_at`, `average_response_time_minutes`, `total_conversation_duration_minutes`, `created_at`, `updated_at`

### Contact Support Fields
- **contact_submissions**: `id`, `from_email`, `to_email`, `subject`, `message`, `status`, `created_at`, `updated_at`, `responded_at`, `responded_by`, `notes`, `category`, `full_name`

### Platform Announcements Fields
- **announcements**: `id`, `title`, `content`, `is_active`, `created_at`, `start_date`, `end_date`, `announcement_audience`, `announcement_type`

### Platform Analytics Fields
- **platform_analytics**: `id`, `date`, `total_bookings`, `completed_bookings`, `cancelled_bookings`, `no_show_bookings`, `gross_revenue`, `platform_fees`, `provider_payouts`, `refunds_issued`, `new_customers`, `new_businesses`, `new_providers`, `active_customers`, `active_providers`, `average_rating`, `total_reviews`, `new_tickets`, `resolved_tickets`, `average_resolution_hours`, `created_at`

### Platform Tax Reporting Fields
- **platform_annual_tax_summary**: `id`, `tax_year`, `total_businesses_paid`, `total_payments_made`, `businesses_requiring_1099`, `total_1099_eligible_payments`, `forms_1099_generated`, `forms_1099_sent`, `forms_1099_delivered`, `irs_filing_completed`, `irs_filing_completed_date`, `processing_status`, `processing_notes`, `created_at`, `updated_at`

---

## � PostgreSQL Enum Types

### Service Category Types
**Enum Name**: `service_category_types`  
**Status**: ✅ CONFIRMED WORKING (2025-10-03)  
**Used in**: `service_categories` table

**Values**:
- `beauty` - Beauty and personal care services
- `fitness` - Fitness and training services  
- `therapy` - Therapy and massage services
- `healthcare` - Healthcare and medical services

**Important**: When querying enum fields in Supabase/PostgREST, cast to text for equality comparisons:
```typescript
// ❌ INCORRECT - Will cause 406 error
.eq("service_category_type", "beauty")

// ✅ CORRECT - Cast enum to text
.eq("service_category_type::text", "beauty")
```

### Service Subcategory Types
**Enum Name**: `service_subcategory_types`  
**Status**: ✅ CONFIRMED WORKING (2025-10-03)  
**Used in**: `service_subcategories` table

**Values**:
- `hair_and_makeup` - Hair styling and makeup services
- `spray_tan` - Spray tanning services
- `esthetician` - Skincare and esthetician services
- `massage_therapy` - Massage therapy services
- `iv_therapy` - IV therapy and hydration services
- `physical_therapy` - Physical therapy services
- `nurse_practitioner` - Nurse practitioner services
- `physician` - Physician services
- `chiropractor` - Chiropractic services
- `yoga_instructor` - Yoga instruction services
- `pilates_instructor` - Pilates instruction services
- `personal_trainer` - Personal training services
- `injectables` - Injectable treatments (Botox, fillers, etc.)
- `health_coach` - Health coaching services

**Important**: When querying enum fields in Supabase/PostgREST, cast to text for equality comparisons:
```typescript
// ❌ INCORRECT - Will cause 406 error
.eq("service_subcategory_type", "esthetician")

// ✅ CORRECT - Cast enum to text
.eq("service_subcategory_type::text", "esthetician")
```

**Category Mapping**:
- **beauty**: hair_and_makeup, spray_tan, esthetician, injectables
- **fitness**: yoga_instructor, pilates_instructor, personal_trainer
- **therapy**: massage_therapy, physical_therapy, chiropractor
- **healthcare**: iv_therapy, nurse_practitioner, physician, health_coach

### Other Enum Types
**Note**: Additional enum types exist in the database. Document them here as they are confirmed.

---

## �📝 IMPLEMENTATION NOTES

### 🔑 User Role Architecture Rules
**CRITICAL**: Always query the correct table based on user role:
- **Customer users** → Query `customer_profiles` (NOT `user_roles`)
- **Admin users** → Query `admin_users` (NOT `user_roles`) 
- **Business users** → Query `providers` for Owner/Dispatcher/Provider roles
- **Base auth** → Query `auth.users` for authentication only

### Confirmed Working Files
- ✅ `roam-provider-app/client/pages/dashboard/components/bookings/hooks/useBookings.ts`
- ✅ `roam-provider-app/api/business/services.ts`
- ✅ `roam-provider-app/client/pages/dashboard/components/BookingsTab.tsx`

### Last Updated
**2025-10-01**: Confirmed auth.users, admin_users, user_roles, user_settings, customer_profiles, customer_stripe_profiles, customer_subscriptions, customer_locations, customer_favorite_services, customer_favorite_providers, customer_favorite_businesses, financial_transactions, payment_transactions, reviews, business_locations, services, bookings, service_categories, service_subcategories, service_addons, service_addon_eligibility, business_profiles, business_services, business_documents, business_service_categories, business_service_subcategories, business_addons, business_stripe_tax_info, business_setup_progress, business_payment_transactions, promotions, promotion_usage, booking_addons, booking_changes, providers, provider_verifications, provider_services, provider_booking_preferences, provider_bank_accounts, provider_availability, provider_applications, provider_addons, tips, tip_presets, tip_analytics_daily, stripe_connect_accounts, stripe_identity_verifications, stripe_tax_webhook_events, manual_bank_accounts, plaid_bank_connections, plaid_link_sessions, message_notifications, message_analytics, contact_submissions, announcements, platform_analytics, and platform_annual_tax_summary schemas

---

## 🚨 BEFORE IMPLEMENTING NEW QUERIES

1. **Check this file first** for confirmed field names
2. **Never assume** field names match between tables
3. **Test with a simple query** before complex joins
4. **Update this file** when you confirm new schemas

---

*Keep this file updated whenever you confirm working database schemas!*