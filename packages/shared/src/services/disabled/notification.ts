import type { NotificationType, NotificationStatus } from '../types/database';

// Notification service interface
export interface NotificationService {
  sendNotification(options: SendNotificationOptions): Promise<NotificationResult>;
  sendBulkNotifications(options: SendBulkNotificationOptions): Promise<NotificationResult[]>;
  getNotificationHistory(userId: string, options?: GetNotificationHistoryOptions): Promise<NotificationHistory>;
  markAsRead(notificationId: string): Promise<boolean>;
  markAllAsRead(userId: string): Promise<boolean>;
  deleteNotification(notificationId: string): Promise<boolean>;
  getNotificationPreferences(userId: string): Promise<NotificationPreferences>;
  updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean>;
}

// Notification options
export interface SendNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  scheduledAt?: Date;
  expiresAt?: Date;
  tags?: string[];
}

export interface SendBulkNotificationOptions {
  notifications: Array<{
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    channels?: NotificationChannel[];
    priority?: NotificationPriority;
  }>;
  scheduledAt?: Date;
  expiresAt?: Date;
  tags?: string[];
}

// Notification channels
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app' | 'webhook';

// Notification priority
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Notification result
export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
  userId?: string;
  channels?: NotificationChannel[];
  sentAt?: Date;
}

// Notification history
export interface NotificationHistory {
  notifications: NotificationRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  status: NotificationStatus;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  read: boolean;
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
  tags?: string[];
}

// Notification preferences
export interface NotificationPreferences {
  userId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  webhook: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    timezone: string;
  };
  categories: {
    booking: boolean;
    payment: boolean;
    system: boolean;
    marketing: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  digest: boolean;
  updatedAt: Date;
}

// Get notification history options
export interface GetNotificationHistoryOptions {
  page?: number;
  limit?: number;
  type?: NotificationType;
  read?: boolean;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
}

// Notification templates
export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  title: string;
  message: string;
  variables: string[];
  channels: NotificationChannel[];
  priority: NotificationPriority;
  category: NotificationCategory;
}

export type NotificationCategory = 
  | 'booking'
  | 'payment'
  | 'system'
  | 'marketing'
  | 'security'
  | 'verification';

// Predefined notification templates
export const NOTIFICATION_TEMPLATES = {
  // Booking notifications
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_REMINDER: 'booking_reminder',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_UPDATED: 'booking_updated',
  BOOKING_STARTING_SOON: 'booking_starting_soon',
  
  // Payment notifications
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_REFUNDED: 'payment_refunded',
  PAYMENT_DUE: 'payment_due',
  
  // System notifications
  WELCOME: 'welcome',
  ACCOUNT_VERIFIED: 'account_verified',
  PASSWORD_CHANGED: 'password_changed',
  SECURITY_ALERT: 'security_alert',
  MAINTENANCE_NOTICE: 'maintenance_notice',
  
  // Marketing notifications
  NEW_FEATURE: 'new_feature',
  SPECIAL_OFFER: 'special_offer',
  FEEDBACK_REQUEST: 'feedback_request',
  NEWSLETTER: 'newsletter',
} as const;

// Notification template data
export interface BookingNotificationData {
  bookingId: string;
  customerName: string;
  providerName: string;
  businessName: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  location?: string;
  amount?: number;
  currency?: string;
}

export interface PaymentNotificationData {
  paymentId: string;
  customerName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionDate: string;
  bookingId: string;
  serviceName: string;
  businessName: string;
  status: 'success' | 'failed' | 'refunded';
}

export interface SystemNotificationData {
  userName: string;
  systemMessage: string;
  actionRequired: boolean;
  actionUrl?: string;
  actionText?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

// Notification configuration
export interface NotificationConfig {
  emailService?: EmailServiceConfig;
  smsService?: SMSServiceConfig;
  pushService?: PushServiceConfig;
  webhookService?: WebhookServiceConfig;
  defaultChannels: NotificationChannel[];
  defaultPriority: NotificationPriority;
  retryAttempts: number;
  retryDelay: number;
  maxBulkSize: number;
}

export interface EmailServiceConfig {
  enabled: boolean;
  provider: string;
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export interface SMSServiceConfig {
  enabled: boolean;
  provider: 'twilio' | 'aws-sns' | 'other';
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface PushServiceConfig {
  enabled: boolean;
  provider: 'firebase' | 'aws-sns' | 'other';
  projectId?: string;
  privateKey?: string;
  clientEmail?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface WebhookServiceConfig {
  enabled: boolean;
  endpoints: string[];
  timeout: number;
  retryAttempts: number;
}

// Notification service implementation base class
export abstract class BaseNotificationService implements NotificationService {
  protected config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  abstract sendNotification(options: SendNotificationOptions): Promise<NotificationResult>;
  abstract sendBulkNotifications(options: SendBulkNotificationOptions): Promise<NotificationResult[]>;
  abstract getNotificationHistory(userId: string, options?: GetNotificationHistoryOptions): Promise<NotificationHistory>;
  abstract markAsRead(notificationId: string): Promise<boolean>;
  abstract markAllAsRead(userId: string): Promise<boolean>;
  abstract deleteNotification(notificationId: string): Promise<boolean>;
  abstract getNotificationPreferences(userId: string): Promise<NotificationPreferences>;
  abstract updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean>;

  protected validateNotificationOptions(options: SendNotificationOptions): void {
    if (!options.userId) {
      throw new Error('User ID is required');
    }

    if (!options.type) {
      throw new Error('Notification type is required');
    }

    if (!options.title) {
      throw new Error('Notification title is required');
    }

    if (!options.message) {
      throw new Error('Notification message is required');
    }

    if (options.channels && options.channels.length === 0) {
      throw new Error('At least one notification channel must be specified');
    }
  }

  protected formatNotificationResult(
    success: boolean, 
    notificationId?: string, 
    error?: string, 
    userId?: string,
    channels?: NotificationChannel[],
    sentAt?: Date
  ): NotificationResult {
    return {
      success,
      notificationId,
      error,
      userId,
      channels,
      sentAt,
    };
  }

  protected async shouldSendNotification(userId: string, preferences: NotificationPreferences): Promise<boolean> {
    // Check if user has enabled notifications
    if (!preferences.email && !preferences.sms && !preferences.push && !preferences.inApp) {
      return false;
    }

    // Check quiet hours
    if (preferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        timeZone: preferences.quietHours.timezone 
      });
      
      const startTime = preferences.quietHours.startTime;
      const endTime = preferences.quietHours.endTime;
      
      if (currentTime >= startTime && currentTime <= endTime) {
        return false;
      }
    }

    return true;
  }
}

// Import the email service interface
export interface EmailService {
  sendEmail(options: any): Promise<any>;
  sendTemplateEmail(options: any): Promise<any>;
  sendBulkEmail(options: any): Promise<any[]>;
  validateEmail(email: string): boolean;
}
