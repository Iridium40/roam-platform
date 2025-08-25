import type { NotificationType } from '../types/database';

// Email service interface
export interface EmailService {
  sendEmail(options: SendEmailOptions): Promise<EmailResult>;
  sendTemplateEmail(options: SendTemplateEmailOptions): Promise<EmailResult>;
  sendBulkEmail(options: SendBulkEmailOptions): Promise<EmailResult[]>;
  validateEmail(email: string): boolean;
}

// Email options
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
}

export interface SendTemplateEmailOptions {
  to: string | string[];
  templateId: string;
  templateData: Record<string, any>;
  subject?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
}

export interface SendBulkEmailOptions {
  emails: Array<{
    to: string;
    subject: string;
    html: string;
    text?: string;
    templateData?: Record<string, any>;
  }>;
  from?: string;
  templateId?: string;
  tags?: string[];
}

// Email attachment
export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  contentId?: string;
}

// Email result
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipient?: string;
}

// Email templates
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text?: string;
  variables: string[];
  category: EmailTemplateCategory;
}

export type EmailTemplateCategory = 
  | 'booking'
  | 'payment'
  | 'notification'
  | 'marketing'
  | 'system'
  | 'verification';

// Predefined email templates
export const EMAIL_TEMPLATES = {
  // Booking templates
  BOOKING_CONFIRMATION: 'booking_confirmation',
  BOOKING_REMINDER: 'booking_reminder',
  BOOKING_CANCELLATION: 'booking_cancellation',
  BOOKING_UPDATE: 'booking_update',
  
  // Payment templates
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_REFUND: 'payment_refund',
  INVOICE: 'invoice',
  
  // Notification templates
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
  ACCOUNT_UPDATE: 'account_update',
  
  // Marketing templates
  NEWSLETTER: 'newsletter',
  PROMOTION: 'promotion',
  FEEDBACK_REQUEST: 'feedback_request',
  
  // System templates
  SYSTEM_ALERT: 'system_alert',
  MAINTENANCE_NOTICE: 'maintenance_notice',
  SECURITY_ALERT: 'security_alert',
} as const;

// Email template variables
export interface BookingEmailData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  providerName: string;
  businessName: string;
  serviceName: string;
  servicePrice: number;
  bookingDate: string;
  bookingTime: string;
  location?: string;
  specialInstructions?: string;
  cancellationPolicy?: string;
}

export interface PaymentEmailData {
  paymentId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionDate: string;
  bookingId: string;
  serviceName: string;
  businessName: string;
  receiptUrl?: string;
}

export interface NotificationEmailData {
  userName: string;
  userEmail: string;
  notificationType: NotificationType;
  notificationTitle: string;
  notificationMessage: string;
  actionUrl?: string;
  actionText?: string;
}

export interface SystemEmailData {
  userName: string;
  userEmail: string;
  systemMessage: string;
  actionRequired: boolean;
  actionUrl?: string;
  actionText?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

// Email configuration
export interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'mailgun' | 'smtp';
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  region?: string;
  domain?: string;
  smtpConfig?: SMTPConfig;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  authMethod: 'login' | 'plain' | 'cram-md5';
}

// Email service implementation base class
export abstract class BaseEmailService implements EmailService {
  protected config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  abstract sendEmail(options: SendEmailOptions): Promise<EmailResult>;
  abstract sendTemplateEmail(options: SendTemplateEmailOptions): Promise<EmailResult>;
  abstract sendBulkEmail(options: SendBulkEmailOptions): Promise<EmailResult[]>;

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  protected validateEmailOptions(options: SendEmailOptions): void {
    if (!options.to || (Array.isArray(options.to) && options.to.length === 0)) {
      throw new Error('Recipient email is required');
    }

    if (!options.subject) {
      throw new Error('Email subject is required');
    }

    if (!options.html) {
      throw new Error('Email HTML content is required');
    }

    // Validate recipient emails
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    for (const email of recipients) {
      if (!this.validateEmail(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    }
  }

  protected formatEmailResult(success: boolean, messageId?: string, error?: string, recipient?: string): EmailResult {
    return {
      success,
      messageId,
      error,
      recipient,
    };
  }
}
