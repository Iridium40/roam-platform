# Complete Supabase Schema Documentation

## 🗄️ **Database Overview**

The ROAM Platform uses a comprehensive Supabase database with the following structure:

## 📋 **Table Structure**

### **1. Core Business Tables**

#### **business_profiles**
```sql
CREATE TABLE business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  business_type business_type_enum NOT NULL,
  contact_email TEXT,
  phone TEXT,
  verification_status verification_status_enum DEFAULT 'pending',
  stripe_connect_account_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  image_url TEXT,
  website_url TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  business_hours JSONB,
  social_media JSONB,
  verification_notes TEXT,
  rejection_reason TEXT,
  years_in_business INTEGER,
  business_description TEXT,
  subscription_plan_id TEXT,
  subscription_status subscription_status_enum DEFAULT 'inactive',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  setup_completed BOOLEAN DEFAULT false,
  setup_step INTEGER DEFAULT 1,
  approved_at TIMESTAMP WITH TIME ZONE
);
```

#### **business_locations**
```sql
CREATE TABLE business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  mobile_service_radius INTEGER,
  is_primary BOOLEAN DEFAULT false,
  offers_mobile_services BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **business_services**
```sql
CREATE TABLE business_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  business_price DECIMAL(10,2) NOT NULL,
  delivery_type delivery_type_enum DEFAULT 'pickup',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **business_addons**
```sql
CREATE TABLE business_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  addon_id UUID REFERENCES addons(id) ON DELETE CASCADE,
  custom_price DECIMAL(10,2),
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **2. User Management Tables**

#### **user_roles**
```sql
CREATE TYPE user_role_type AS ENUM (
  'admin',
  'owner', 
  'dispatcher',
  'provider',
  'customer'
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  location_id UUID REFERENCES business_locations(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, role, business_id),
  
  CONSTRAINT check_admin_no_business CHECK (
    (role = 'admin' AND business_id IS NULL) OR 
    (role != 'admin')
  ),
  
  CONSTRAINT check_customer_no_business CHECK (
    (role = 'customer' AND business_id IS NULL AND location_id IS NULL) OR 
    (role != 'customer')
  )
);
```

#### **providers**
```sql
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  location_id UUID REFERENCES business_locations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  provider_role provider_role_enum DEFAULT 'provider',
  verification_status verification_status_enum DEFAULT 'pending',
  background_check_status background_check_status_enum DEFAULT 'under_review',
  is_active BOOLEAN DEFAULT true,
  business_managed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **customers**
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **3. Service Management Tables**

#### **services**
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category service_category_enum NOT NULL,
  min_price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **addons**
```sql
CREATE TABLE addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category addon_category_enum DEFAULT 'general',
  min_price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **4. Booking System Tables**

#### **bookings**
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  service_fee DECIMAL(10,2) DEFAULT 0,
  service_fee_charged BOOLEAN DEFAULT false,
  service_fee_charged_at TIMESTAMP WITH TIME ZONE,
  remaining_balance DECIMAL(10,2) DEFAULT 0,
  remaining_balance_charged BOOLEAN DEFAULT false,
  remaining_balance_charged_at TIMESTAMP WITH TIME ZONE,
  cancellation_fee DECIMAL(10,2) DEFAULT 0,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES auth.users(id),
  cancellation_reason TEXT,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  customer_location_id UUID REFERENCES customer_locations(id) ON DELETE SET NULL,
  business_location_id UUID REFERENCES business_locations(id) ON DELETE SET NULL,
  delivery_type delivery_type_enum DEFAULT 'pickup',
  payment_status payment_status_enum DEFAULT 'pending',
  booking_status booking_status_enum DEFAULT 'pending',
  admin_notes TEXT,
  tip_eligible BOOLEAN DEFAULT true,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  tip_status tip_status_enum DEFAULT 'pending',
  tip_requested_at TIMESTAMP WITH TIME ZONE,
  tip_deadline TIMESTAMP WITH TIME ZONE
);
```

#### **customer_locations**
```sql
CREATE TABLE customer_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **5. Provider Verification Tables**

#### **provider_verifications**
```sql
CREATE TABLE provider_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_verification_session_id TEXT UNIQUE NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'requires_input' 
    CHECK (verification_status IN ('requires_input', 'processing', 'verified', 'canceled')),
  verified_data JSONB,
  verification_type TEXT DEFAULT 'identity' 
    CHECK (verification_type IN ('identity', 'document')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, verification_type)
);
```

#### **provider_bank_accounts**
```sql
CREATE TABLE provider_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  plaid_access_token TEXT NOT NULL,
  plaid_item_id TEXT UNIQUE NOT NULL,
  account_data JSONB NOT NULL,
  institution_data JSONB,
  webhook_status TEXT,
  webhook_error JSONB,
  last_webhook_at TIMESTAMP WITH TIME ZONE,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(business_id)
);
```

#### **business_documents**
```sql
CREATE TYPE business_document_type AS ENUM (
  'drivers_license',
  'proof_of_address',
  'liability_insurance',
  'professional_license',
  'professional_certificate',
  'business_license'
);

CREATE TYPE business_document_status AS ENUM (
  'pending',
  'verified',
  'rejected',
  'under_review'
);

CREATE TABLE business_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type business_document_type NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  verified_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITHOUT TIME ZONE,
  rejection_reason TEXT,
  expiry_date DATE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  verification_status business_document_status DEFAULT 'pending',
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE
);
```

### **6. Communication Tables**

#### **conversation_metadata**
```sql
CREATE TABLE conversation_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  twilio_conversation_sid TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **notifications**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type_enum NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status notification_status_enum DEFAULT 'pending'
);
```

### **7. Scheduling Tables**

#### **provider_availability**
```sql
CREATE TABLE provider_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  schedule_type schedule_type_enum DEFAULT 'regular',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  start_date DATE,
  end_date DATE,
  max_bookings_per_slot INTEGER DEFAULT 1,
  slot_duration_minutes INTEGER DEFAULT 60,
  buffer_time_minutes INTEGER DEFAULT 0,
  location_type location_type_enum DEFAULT 'business',
  is_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **business_hours**
```sql
CREATE TABLE business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(business_id, day_of_week)
);
```

## 🔧 **Enums and Types**

### **Business Types**
```sql
CREATE TYPE business_type_enum AS ENUM (
  'sole_proprietorship',
  'llc', 
  'corporation',
  'partnership'
);
```

### **Verification Status**
```sql
CREATE TYPE verification_status_enum AS ENUM (
  'pending',
  'verified',
  'rejected',
  'under_review'
);
```

### **Subscription Status**
```sql
CREATE TYPE subscription_status_enum AS ENUM (
  'active',
  'inactive',
  'cancelled',
  'past_due'
);
```

### **Booking Status**
```sql
CREATE TYPE booking_status_enum AS ENUM (
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);
```

### **Payment Status**
```sql
CREATE TYPE payment_status_enum AS ENUM (
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded'
);
```

### **Delivery Type**
```sql
CREATE TYPE delivery_type_enum AS ENUM (
  'pickup',
  'delivery',
  'on_site'
);
```

### **Service Categories**
```sql
CREATE TYPE service_category_enum AS ENUM (
  'health',
  'fitness',
  'beauty',
  'wellness',
  'education',
  'other'
);
```

## 🔐 **Row Level Security (RLS)**

All tables have RLS enabled with appropriate policies:

### **User Roles Policies**
- Users can view their own roles
- Admins can view all roles
- Business owners can view roles within their business
- Dispatchers can view roles within their business

### **Business Profiles Policies**
- Users can view their own business profiles
- Public read access for verified businesses
- Business owners can update their own profiles

### **Bookings Policies**
- Customers can view their own bookings
- Providers can view bookings assigned to them
- Business owners can view all bookings for their business

### **Storage Policies**
- Authenticated users can upload files
- Users can view their own files
- Public read access to certain folders (brand assets, etc.)
- Admins have full access

## 📊 **Indexes**

Performance indexes are created on:
- Foreign key columns
- Frequently queried columns
- Status columns
- Date/time columns
- Composite indexes for common query patterns

## 🔄 **Triggers**

### **Updated At Triggers**
All tables with `updated_at` columns have triggers to automatically update the timestamp on row modifications.

### **Helper Functions**
- `user_has_role()` - Check if user has specific role
- `get_user_roles()` - Get all active roles for a user
- `update_*_updated_at()` - Update timestamp triggers

## 🗂️ **Storage Buckets**

### **roam-file-storage**
- 50MB file size limit
- Supports: images, PDFs, documents, text files
- Organized folder structure:
  - `provider-dl/` - Driver's licenses
  - `provider-insurance/` - Insurance documents
  - `provider-business/` - Business documents
  - `business-documents/` - General business docs
  - `provider-avatars/` - Provider profile images
  - `customer-avatars/` - Customer profile images
  - `service-images/` - Service images
  - `business-images/` - Business images
  - `brand-assets/` - Brand assets (public)
  - `system-settings/` - System files

## 🎯 **Key Features**

### **Multi-Tenant Architecture**
- Business-based isolation
- Role-based access control
- Location-specific permissions

### **Comprehensive Booking System**
- Service-based bookings
- Add-on support
- Multiple delivery types
- Payment tracking
- Tip management

### **Provider Verification**
- Stripe Identity integration
- Document verification
- Bank account connections (Plaid)
- Background check tracking

### **Communication System**
- Twilio Conversations integration
- Notification system
- Real-time messaging

### **Flexible Scheduling**
- Provider availability management
- Business hours configuration
- Slot-based booking system

## 📈 **Scalability Considerations**

- UUID primary keys for distributed systems
- Proper indexing strategy
- RLS for data isolation
- JSONB for flexible data storage
- Timestamp tracking for audit trails
- Soft deletes where appropriate

This schema provides a robust foundation for the ROAM Platform's service marketplace, supporting complex business workflows while maintaining data integrity and security.
