import { z } from 'zod';
import type { 
  BusinessType, 
  ServiceCategoryType, 
  BookingStatus, 
  PaymentStatus,
  UserRole,
  NotificationType 
} from '../types/database';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number');
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Business validation schemas
export const businessNameSchema = z.string().min(2, 'Business name must be at least 2 characters').max(100);
export const businessTypeSchema = z.enum(['sole_proprietorship', 'llc', 'corporation', 'partnership'] as const);
export const businessDescriptionSchema = z.string().max(500, 'Description must be less than 500 characters').optional();

export const createBusinessSchema = z.object({
  businessName: businessNameSchema,
  businessType: businessTypeSchema,
  contactEmail: emailSchema,
  phone: phoneSchema,
  businessDescription: businessDescriptionSchema,
});

// Service validation schemas
export const serviceNameSchema = z.string().min(1, 'Service name is required').max(100);
export const serviceDescriptionSchema = z.string().max(500).optional();
export const serviceCategorySchema = z.enum(['health', 'fitness', 'beauty', 'wellness', 'education', 'other'] as const);
export const priceSchema = z.number().positive('Price must be positive');
export const durationSchema = z.number().positive('Duration must be positive').int('Duration must be a whole number');

export const createServiceSchema = z.object({
  name: serviceNameSchema,
  description: serviceDescriptionSchema,
  category: serviceCategorySchema,
  price: priceSchema,
  duration: durationSchema,
});

// Booking validation schemas
export const bookingDateSchema = z.string().datetime('Invalid date format');
export const startTimeSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)');
export const deliveryTypeSchema = z.enum(['pickup', 'delivery', 'on_site'] as const);
export const bookingStatusSchema = z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] as const);

export const createBookingSchema = z.object({
  serviceId: uuidSchema,
  bookingDate: bookingDateSchema,
  startTime: startTimeSchema,
  guestName: z.string().min(1).max(100).optional(),
  guestEmail: emailSchema.optional(),
  guestPhone: phoneSchema.optional(),
  deliveryType: deliveryTypeSchema,
  specialInstructions: z.string().max(500).optional(),
});

export const updateBookingStatusSchema = z.object({
  bookingId: uuidSchema,
  status: bookingStatusSchema,
  notifyCustomer: z.boolean().optional(),
  notifyProvider: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

// User validation schemas
export const firstNameSchema = z.string().min(1, 'First name is required').max(50);
export const lastNameSchema = z.string().min(1, 'Last name is required').max(50);
export const userRoleSchema = z.enum(['admin', 'owner', 'dispatcher', 'provider', 'customer'] as const);

export const registerUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  role: userRoleSchema,
  businessId: uuidSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Payment validation schemas
export const amountSchema = z.number().positive('Amount must be positive');
export const currencySchema = z.string().length(3, 'Currency must be 3 characters');
export const paymentStatusSchema = z.enum(['pending', 'paid', 'failed', 'refunded', 'partially_refunded'] as const);

export const createPaymentIntentSchema = z.object({
  amount: amountSchema,
  currency: currencySchema,
  bookingId: uuidSchema,
  customerEmail: emailSchema,
  customerName: z.string().min(1, 'Customer name is required'),
  businessName: z.string().min(1, 'Business name is required'),
  serviceName: z.string().min(1, 'Service name is required'),
});

// Notification validation schemas
export const notificationTypeSchema = z.enum(['booking_update', 'payment', 'system', 'marketing'] as const);
export const notificationChannelsSchema = z.array(z.enum(['email', 'sms', 'push', 'in_app'] as const));

export const sendNotificationSchema = z.object({
  userId: uuidSchema,
  type: notificationTypeSchema,
  title: z.string().min(1, 'Title is required').max(100),
  message: z.string().min(1, 'Message is required').max(500),
  data: z.any().optional(),
  channels: notificationChannelsSchema.optional(),
});

// File upload validation schemas
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().optional().default(50 * 1024 * 1024), // 50MB default
  allowedTypes: z.array(z.string()).optional().default(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
});

// Pagination validation schemas
export const paginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

// Search validation schemas
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100),
  filters: z.record(z.any()).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc'] as const).optional().default('desc'),
});

// Validation helper functions
export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validatePassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}

export function validatePhone(phone: string): boolean {
  return phoneSchema.safeParse(phone).success;
}

export function validateUUID(uuid: string): boolean {
  return uuidSchema.safeParse(uuid).success;
}

export function validateBusinessType(type: string): type is BusinessType {
  return businessTypeSchema.safeParse(type).success;
}

export function validateServiceCategory(category: string): category is ServiceCategoryType {
  return serviceCategorySchema.safeParse(category).success;
}

export function validateBookingStatus(status: string): status is BookingStatus {
  return bookingStatusSchema.safeParse(status).success;
}

export function validatePaymentStatus(status: string): status is PaymentStatus {
  return paymentStatusSchema.safeParse(status).success;
}

export function validateUserRole(role: string): role is UserRole {
  return userRoleSchema.safeParse(role).success;
}

export function validateNotificationType(type: string): type is NotificationType {
  return notificationTypeSchema.safeParse(type).success;
}

// Error formatting utilities
export function formatValidationError(error: z.ZodError): string {
  return error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
}

export function getFieldError(error: z.ZodError, field: string): string | undefined {
  const fieldError = error.errors.find(err => err.path.includes(field));
  return fieldError?.message;
}

// Sanitization utilities
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+\-\(\)\s]/g, '');
}

// Type guards
export function isBusinessType(value: any): value is BusinessType {
  return validateBusinessType(value);
}

export function isServiceCategory(value: any): value is ServiceCategoryType {
  return validateServiceCategory(value);
}

export function isBookingStatus(value: any): value is BookingStatus {
  return validateBookingStatus(value);
}

export function isPaymentStatus(value: any): value is PaymentStatus {
  return validatePaymentStatus(value);
}

export function isUserRole(value: any): value is UserRole {
  return validateUserRole(value);
}

export function isNotificationType(value: any): value is NotificationType {
  return validateNotificationType(value);
}

// Export all schemas as a single object for convenience
export const schemas = {
  // Business schemas
  businessName: businessNameSchema,
  businessType: businessTypeSchema,
  businessDescription: businessDescriptionSchema,
  createBusiness: createBusinessSchema,
  businessInfo: createBusinessSchema, // Alias for server compatibility
  businessProfile: createBusinessSchema, // Alias for server compatibility
  
  // Service schemas
  serviceName: serviceNameSchema,
  serviceDescription: serviceDescriptionSchema,
  serviceCategory: serviceCategorySchema,
  price: priceSchema,
  duration: durationSchema,
  createService: createServiceSchema,
  service: createServiceSchema, // Alias for server compatibility
  
  // Booking schemas
  bookingDate: bookingDateSchema,
  startTime: startTimeSchema,
  deliveryType: deliveryTypeSchema,
  bookingStatus: bookingStatusSchema,
  createBooking: createBookingSchema,
  updateBookingStatus: updateBookingStatusSchema,
  booking: createBookingSchema, // Alias for server compatibility
  bookingStatusUpdate: updateBookingStatusSchema, // Alias for server compatibility
  
  // User schemas
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  userRole: userRoleSchema,
  registerUser: registerUserSchema,
  login: loginSchema,
  signup: registerUserSchema, // Alias for server compatibility
  userProfile: registerUserSchema, // Alias for server compatibility
  
  // Payment schemas
  amount: amountSchema,
  currency: currencySchema,
  paymentStatus: paymentStatusSchema,
  createPaymentIntent: createPaymentIntentSchema,
  
  // Notification schemas
  notificationType: notificationTypeSchema,
  notificationChannels: notificationChannelsSchema,
  sendNotification: sendNotificationSchema,
  
  // File upload schemas
  fileUpload: fileUploadSchema,
  
  // Pagination schemas
  pagination: paginationSchema,
  
  // Search schemas
  search: searchSchema,
  
  // Common schemas
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  uuid: uuidSchema,
  
  // Additional schemas for server compatibility
  applicationSubmission: z.object({
    userId: uuidSchema,
    businessId: uuidSchema,
    finalConsents: z.object({
      informationAccuracy: z.boolean().refine(val => val === true, 'Must confirm information accuracy'),
      termsAccepted: z.boolean().refine(val => val === true, 'Must accept terms'),
      backgroundCheckConsent: z.boolean().refine(val => val === true, 'Must consent to background check')
    })
  }),
  
  phase2Progress: z.object({
    business_id: uuidSchema,
    step: z.enum([
      'welcome',
      'business_profile',
      'personal_profile', 
      'business_hours',
      'staff_management',
      'banking_payout',
      'service_pricing',
      'final_review'
    ]),
    data: z.record(z.any()).optional()
  }),
  
  plaidToken: z.object({
    publicToken: z.string(),
    metadata: z.object({
      institution: z.object({
        name: z.string()
      }),
      accounts: z.array(z.object({
        id: z.string(),
        name: z.string(),
        mask: z.string(),
        type: z.string(),
        subtype: z.string()
      }))
    })
  }),
  
  applicationApproval: z.object({
    applicationId: uuidSchema,
    approved: z.boolean(),
    reason: z.string().optional(),
    notes: z.string().optional()
  }),
};
