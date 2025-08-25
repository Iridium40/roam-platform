// Application constants
export const APP_NAME = 'ROAM';
export const APP_DESCRIPTION = 'Your Best Life. Everywhere.';
export const APP_VERSION = '1.0.0';

import { env } from '../config/environment';

// API constants
export const API_BASE_URL = env.app.apiBaseUrl || 'https://api.roamyourbestlife.com';
export const API_TIMEOUT = 30000; // 30 seconds
export const API_RETRY_ATTEMPTS = 3;
export const API_RETRY_DELAY = 1000; // 1 second

// Pagination constants
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE = 1;

// File upload constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
export const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// Authentication constants
export const JWT_EXPIRY = '24h';
export const REFRESH_TOKEN_EXPIRY = '7d';
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// Business constants
export const BUSINESS_NAME_MIN_LENGTH = 2;
export const BUSINESS_NAME_MAX_LENGTH = 100;
export const BUSINESS_DESCRIPTION_MAX_LENGTH = 500;

// Service constants
export const SERVICE_NAME_MIN_LENGTH = 1;
export const SERVICE_NAME_MAX_LENGTH = 100;
export const SERVICE_DESCRIPTION_MAX_LENGTH = 500;
export const SERVICE_PRICE_MIN = 0;
export const SERVICE_PRICE_MAX = 999999;
export const SERVICE_DURATION_MIN = 1;
export const SERVICE_DURATION_MAX = 1440; // 24 hours in minutes

// Booking constants
export const BOOKING_ADVANCE_DAYS = 30; // Can book up to 30 days in advance
export const BOOKING_CANCELLATION_HOURS = 24; // Must cancel at least 24 hours in advance
export const BOOKING_NOTES_MAX_LENGTH = 500;

// Payment constants
export const DEFAULT_CURRENCY = 'USD';
export const SUPPORTED_CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP'];
export const SERVICE_FEE_PERCENTAGE = 10; // 10% service fee
export const MINIMUM_TIP_AMOUNT = 1;
export const MAXIMUM_TIP_AMOUNT = 100;

// Notification constants
export const NOTIFICATION_TITLE_MAX_LENGTH = 100;
export const NOTIFICATION_MESSAGE_MAX_LENGTH = 500;
export const NOTIFICATION_RETENTION_DAYS = 90; // Keep notifications for 90 days

// Time constants
export const BUSINESS_HOURS = {
  monday: { open: '09:00', close: '17:00' },
  tuesday: { open: '09:00', close: '17:00' },
  wednesday: { open: '09:00', close: '17:00' },
  thursday: { open: '09:00', close: '17:00' },
  friday: { open: '09:00', close: '17:00' },
  saturday: { open: '10:00', close: '16:00' },
  sunday: { open: '10:00', close: '16:00' },
};

// Status colors for UI
export const STATUS_COLORS = {
  pending: '#f59e0b', // amber-500
  confirmed: '#10b981', // emerald-500
  in_progress: '#3b82f6', // blue-500
  completed: '#059669', // emerald-600
  cancelled: '#ef4444', // red-500
  no_show: '#6b7280', // gray-500
  paid: '#10b981', // emerald-500
  failed: '#ef4444', // red-500
  refunded: '#8b5cf6', // violet-500
  partially_refunded: '#f59e0b', // amber-500
} as const;

// Error messages
export const ERROR_MESSAGES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
  WEAK_PASSWORD: 'Password must be at least 8 characters long',
  INVALID_TOKEN: 'Invalid or expired token',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  
  // Validation errors
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_DATE: 'Please enter a valid date',
  INVALID_TIME: 'Please enter a valid time',
  INVALID_AMOUNT: 'Please enter a valid amount',
  
  // Business errors
  BUSINESS_NOT_FOUND: 'Business not found',
  BUSINESS_ALREADY_EXISTS: 'A business with this name already exists',
  BUSINESS_NOT_APPROVED: 'Business is not yet approved',
  
  // Booking errors
  BOOKING_NOT_FOUND: 'Booking not found',
  BOOKING_ALREADY_EXISTS: 'A booking already exists for this time',
  BOOKING_CANCELLED: 'This booking has been cancelled',
  BOOKING_COMPLETED: 'This booking has already been completed',
  INVALID_BOOKING_TIME: 'Invalid booking time',
  BOOKING_TOO_FAR_IN_FUTURE: 'Cannot book more than 30 days in advance',
  BOOKING_TOO_LATE_TO_CANCEL: 'Cannot cancel booking less than 24 hours before',
  
  // Service errors
  SERVICE_NOT_FOUND: 'Service not found',
  SERVICE_NOT_AVAILABLE: 'Service is not available',
  SERVICE_NOT_ACTIVE: 'Service is not active',
  
  // Payment errors
  PAYMENT_FAILED: 'Payment failed. Please try again',
  PAYMENT_DECLINED: 'Payment was declined',
  INSUFFICIENT_FUNDS: 'Insufficient funds',
  PAYMENT_ALREADY_PROCESSED: 'Payment has already been processed',
  
  // File upload errors
  FILE_TOO_LARGE: 'File size exceeds the maximum limit of 5MB',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload a supported file format',
  UPLOAD_FAILED: 'File upload failed. Please try again',
  
  // Network errors
  NETWORK_ERROR: 'Network error. Please check your connection and try again',
  TIMEOUT_ERROR: 'Request timed out. Please try again',
  SERVER_ERROR: 'Server error. Please try again later',
  
  // General errors
  UNKNOWN_ERROR: 'An unknown error occurred. Please try again',
  VALIDATION_ERROR: 'Please check your input and try again',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: 'Successfully logged in',
  REGISTER_SUCCESS: 'Account created successfully',
  LOGOUT_SUCCESS: 'Successfully logged out',
  PASSWORD_RESET_SENT: 'Password reset email sent',
  PASSWORD_CHANGED: 'Password changed successfully',
  
  // Business
  BUSINESS_CREATED: 'Business profile created successfully',
  BUSINESS_UPDATED: 'Business profile updated successfully',
  BUSINESS_APPROVED: 'Business approved successfully',
  
  // Booking
  BOOKING_CREATED: 'Booking created successfully',
  BOOKING_UPDATED: 'Booking updated successfully',
  BOOKING_CANCELLED: 'Booking cancelled successfully',
  BOOKING_CONFIRMED: 'Booking confirmed successfully',
  
  // Service
  SERVICE_CREATED: 'Service created successfully',
  SERVICE_UPDATED: 'Service updated successfully',
  SERVICE_DELETED: 'Service deleted successfully',
  
  // Payment
  PAYMENT_SUCCESSFUL: 'Payment processed successfully',
  REFUND_PROCESSED: 'Refund processed successfully',
  
  // File upload
  FILE_UPLOADED: 'File uploaded successfully',
  
  // General
  SAVED_SUCCESSFULLY: 'Saved successfully',
  DELETED_SUCCESSFULLY: 'Deleted successfully',
  UPDATED_SUCCESSFULLY: 'Updated successfully',
} as const;

// Route constants
export const ROUTES = {
  // Auth routes
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  
  // Dashboard routes
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  
  // Business routes
  BUSINESS_PROFILE: '/business/profile',
  BUSINESS_SETTINGS: '/business/settings',
  BUSINESS_VERIFICATION: '/business/verification',
  
  // Booking routes
  BOOKINGS: '/bookings',
  BOOKING_DETAILS: '/bookings/:id',
  CREATE_BOOKING: '/bookings/create',
  
  // Service routes
  SERVICES: '/services',
  SERVICE_DETAILS: '/services/:id',
  CREATE_SERVICE: '/services/create',
  
  // Admin routes
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_USERS: '/admin/users',
  ADMIN_BUSINESSES: '/admin/businesses',
  ADMIN_BOOKINGS: '/admin/bookings',
  ADMIN_REPORTS: '/admin/reports',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'roam_auth_token',
  REFRESH_TOKEN: 'roam_refresh_token',
  USER_DATA: 'roam_user_data',
  THEME: 'roam_theme',
  LANGUAGE: 'roam_language',
  NOTIFICATIONS: 'roam_notifications',
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_SMS_NOTIFICATIONS: true,
  ENABLE_EMAIL_NOTIFICATIONS: true,
  ENABLE_TIPS: true,
  ENABLE_REVIEWS: true,
  ENABLE_CHAT: true,
  ENABLE_VIDEO_CALLS: false,
  ENABLE_ANALYTICS: true,
} as const;

// Environment constants
export const ENV = {
  IS_DEVELOPMENT: env.isDevelopment(),
  IS_PRODUCTION: env.isProduction(),
  IS_TEST: env.isTest(),
} as const;
