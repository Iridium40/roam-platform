// Local shared schemas for customer app to avoid @roam/shared resolution issues
import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number');
export const uuidSchema = z.string().uuid('Invalid UUID format');

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

// Export all schemas as a single object for convenience
export const schemas = {
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
  
  // Common schemas
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  uuid: uuidSchema,
};
