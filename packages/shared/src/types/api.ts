import { z } from 'zod';
import type { 
  BookingStatus, 
  PaymentStatus, 
  UserRole, 
  BusinessType, 
  ServiceCategory,
  NotificationType 
} from './database';

// Base API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication Types
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  businessId?: string;
  locationId?: string;
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  userType: 'customer' | 'provider' | 'admin';
  agreedToTerms: boolean;
  agreedToBackground?: boolean;
  role?: UserRole;
  businessId?: string;
}

// Business Types
export interface BusinessProfile {
  id: string;
  businessName: string;
  businessType: BusinessType;
  contactEmail: string | null;
  phone: string | null;
  verificationStatus: string;
  isActive: boolean;
  imageUrl: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  businessDescription: string | null;
  setupCompleted: boolean;
  setupStep: number;
  approvedAt: string | null;
}

export interface CreateBusinessRequest {
  businessName: string;
  businessType: BusinessType;
  contactEmail: string;
  phone: string;
  businessDescription?: string;
}

// Booking Types
export interface Booking {
  id: string;
  customerId: string | null;
  providerId: string;
  serviceId: string;
  bookingDate: string;
  startTime: string;
  totalAmount: number;
  serviceFee: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  deliveryType: string;
  tipEligible: boolean;
  tipAmount: number;
  tipStatus: string;
  createdAt: string;
}

export interface CreateBookingRequest {
  serviceId: string;
  bookingDate: string;
  startTime: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  deliveryType: string;
  specialInstructions?: string;
}

export interface UpdateBookingStatusRequest {
  bookingId: string;
  status: BookingStatus;
  notifyCustomer?: boolean;
  notifyProvider?: boolean;
  notes?: string;
}

// Service Types
export interface Service {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  price: number;
  duration: number;
  isActive: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  category: ServiceCategory;
  price: number;
  duration: number;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: any | null;
  read: boolean;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  status: string;
}

export interface SendNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  channels?: ('email' | 'sms' | 'push' | 'in_app')[];
}

// Payment Types
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
  bookingId: string;
}

export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  bookingId: string;
  customerEmail: string;
  customerName: string;
  businessName: string;
  serviceName: string;
}

// Twilio Conversation Types
export interface TwilioConversation {
  sid: string;
  friendlyName: string;
  dateCreated: string;
  dateUpdated: string;
  state: string;
}

export interface TwilioParticipant {
  sid: string;
  identity: string;
  attributes: any;
  dateCreated: string;
  dateUpdated: string;
}

export interface TwilioMessage {
  sid: string;
  author: string;
  body: string;
  dateCreated: string;
  dateUpdated: string;
}

export interface CreateConversationRequest {
  bookingId: string;
  participants: Array<{
    identity: string;
    attributes?: any;
  }>;
}

// Zod Schemas for Validation
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['admin', 'owner', 'dispatcher', 'provider', 'customer']),
  businessId: z.string().optional(),
});

export const CreateBookingRequestSchema = z.object({
  serviceId: z.string().uuid(),
  bookingDate: z.string().datetime(),
  startTime: z.string(),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),
  deliveryType: z.enum(['pickup', 'delivery', 'on_site']),
  specialInstructions: z.string().optional(),
});

export const UpdateBookingStatusSchema = z.object({
  bookingId: z.string().uuid(),
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  notifyCustomer: z.boolean().optional(),
  notifyProvider: z.boolean().optional(),
  notes: z.string().optional(),
});

export const CreateServiceRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['health', 'fitness', 'beauty', 'wellness', 'education', 'other']),
  price: z.number().positive(),
  duration: z.number().positive(),
});

export const SendNotificationRequestSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['booking_update', 'payment', 'system', 'marketing']),
  title: z.string().min(1),
  message: z.string().min(1),
  data: z.any().optional(),
  channels: z.array(z.enum(['email', 'sms', 'push', 'in_app'])).optional(),
});

export const CreatePaymentIntentRequestSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  bookingId: z.string().uuid(),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  businessName: z.string().min(1),
  serviceName: z.string().min(1),
});

// API Endpoint Types
export interface ApiEndpoints {
  // Auth endpoints
  'POST /auth/login': {
    request: LoginRequest;
    response: ApiResponse<LoginResponse>;
  };
  'POST /auth/register': {
    request: RegisterRequest;
    response: ApiResponse<AuthUser>;
  };
  'POST /auth/logout': {
    request: {};
    response: ApiResponse<void>;
  };
  'POST /auth/refresh': {
    request: { refreshToken: string };
    response: ApiResponse<{ token: string }>;
  };

  // Business endpoints
  'GET /business/profile': {
    request: {};
    response: ApiResponse<BusinessProfile>;
  };
  'POST /business/profile': {
    request: CreateBusinessRequest;
    response: ApiResponse<BusinessProfile>;
  };
  'PUT /business/profile': {
    request: Partial<CreateBusinessRequest>;
    response: ApiResponse<BusinessProfile>;
  };

  // Booking endpoints
  'GET /bookings': {
    request: { page?: number; limit?: number; status?: BookingStatus };
    response: PaginatedResponse<Booking>;
  };
  'POST /bookings': {
    request: CreateBookingRequest;
    response: ApiResponse<Booking>;
  };
  'PUT /bookings/:id/status': {
    request: UpdateBookingStatusRequest;
    response: ApiResponse<Booking>;
  };

  // Service endpoints
  'GET /services': {
    request: { businessId?: string; category?: ServiceCategory };
    response: ApiResponse<Service[]>;
  };
  'POST /services': {
    request: CreateServiceRequest;
    response: ApiResponse<Service>;
  };

  // Notification endpoints
  'GET /notifications': {
    request: { page?: number; limit?: number };
    response: PaginatedResponse<Notification>;
  };
  'POST /notifications/send': {
    request: SendNotificationRequest;
    response: ApiResponse<void>;
  };

  // Payment endpoints
  'POST /payments/create-intent': {
    request: CreatePaymentIntentRequest;
    response: ApiResponse<PaymentIntent>;
  };
}
