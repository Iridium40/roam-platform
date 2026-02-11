/**
 * Shared notification types for ROAM platform
 * Used by both customer and provider apps
 */

export interface NotificationTemplate {
  id: string;
  template_key: string;
  template_name: string;
  description: string | null;
  email_subject: string | null;
  email_body_html: string | null;
  email_body_text: string | null;
  sms_body: string | null;
  variables: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  notification_email: string | null;
  notification_phone: string | null;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  // Granular preferences (dynamically accessed via template_key)
  [key: string]: any;
}

export interface SendEmailParams {
  userId: string;
  templateKey: string;
  variables: Record<string, any>;
  attachment?: {
    filename: string;
    content: string; // Base64 encoded
  };
  metadata?: Record<string, any>;
}

export interface SendSMSParams {
  userId: string;
  templateKey: string;
  variables: Record<string, any>;
  metadata?: Record<string, any>;
  /** Optional message type: 'service' for transactional, 'marketing' for promotional */
  messageType?: 'service' | 'marketing';
}

export interface SendNotificationParams {
  userId: string;
  notificationType: string;
  variables: Record<string, any>;
  channels?: ('email' | 'sms')[];
  attachment?: {
    filename: string;
    content: string;
  };
  metadata?: Record<string, any>;
}

export interface SendResult {
  success: boolean;
  channel: 'email' | 'sms';
  recipient: string;
  externalId?: string; // Resend ID or Twilio SID
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface NotificationResult {
  email?: SendResult;
  sms?: SendResult;
}

export interface NotificationLog {
  user_id: string;
  recipient_email?: string;
  recipient_phone?: string;
  notification_type: string;
  channel: 'email' | 'sms';
  status: 'sent' | 'failed';
  resend_id?: string;
  twilio_sid?: string;
  subject?: string;
  body?: string;
  error_message?: string;
  sent_at?: string;
  metadata?: Record<string, any>;
}

