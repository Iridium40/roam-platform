// Comprehensive API type definitions

// Base API types
export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// User and Authentication types
export interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: User;
}

export interface AuthResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: number;
  refresh_token?: string;
  user?: User;
  session?: Session;
}

// Customer types
export interface CustomerProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  bio: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerRecord {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  date_of_birth?: string | null;
  bio?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

// Provider types
export interface ProviderProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderRecord {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  bio?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

// Business types
export interface BusinessRecord {
  id: string;
  business_name: string;
  business_type: string;
  business_description?: string;
  logo_url?: string;
  image_url?: string;
  cover_image_url?: string;
  verification_status: string;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessLocation {
  id: string;
  business_id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

// Service types
export interface ServiceRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  min_price: number;
  max_price: number;
  duration: string;
  location_type: string;
  image_url?: string;
  is_featured: boolean;
  business_id: string;
  created_at: string;
  updated_at: string;
}

// Booking types
export interface BookingRecord {
  id: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  status: string;
  price: string;
  duration: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Optional aliases/backwards compatibility
  booking_time?: string;
  original_booking_date?: string;
  original_start_time?: string;
  reschedule_count?: number;
  last_reschedule_date?: string;
}

export interface BookingWithRelations extends BookingRecord {
  customer_profiles?: CustomerProfile;
  providers?: ProviderProfile;
  services?: ServiceRecord;
  businesses?: BusinessRecord;
}

// Notification types
export interface Notification {
  id: string;
  type: string;
  userId: string;
  userType: string;
  bookingId?: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: Record<string, unknown>;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

// Conversation types
export interface ConversationMessage {
  sid: string;
  author: string;
  body: string;
  dateCreated: string;
  attributes?: {
    userRole?: string;
    userName?: string;
    userId?: string;
    timestamp?: string;
  };
}

export interface ConversationParticipant {
  sid: string;
  identity: string;
  attributes?: {
    userType?: string;
    userId?: string;
    userName?: string;
  };
  dateCreated: string;
  dateUpdated: string;
}

export interface Conversation {
  sid: string;
  friendlyName: string;
  attributes: {
    bookingId?: string;
    createdAt?: string;
    type?: string;
  };
  lastMessage?: {
    body: string;
    author: string;
    dateCreated: string;
  };
  unreadMessagesCount: number;
  userType: string;
}

// Form and UI types
export interface FormErrors {
  [key: string]: string[];
}

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerName: string;
  providerTitle: string;
  pageUrl: string;
}

// System configuration types
export interface SystemConfig {
  branding?: {
    logo_url?: string;
    favicon_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
  features?: {
    chat_enabled?: boolean;
    notifications_enabled?: boolean;
    payments_enabled?: boolean;
  };
  settings?: Record<string, unknown>;
}

// Payment types
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
  customer_id?: string;
  metadata?: Record<string, string>;
}

export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

// Calendar types
export interface CalendarProvider {
  type: string;
  name: string;
  description: string;
  features: string[];
}

export interface CalendarConnection {
  id: string;
  provider_id: string;
  calendar_type: string;
  sync_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Generic types for flexible data
export type JsonValue = 
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type DatabaseRecord = Record<string, JsonValue>;

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
