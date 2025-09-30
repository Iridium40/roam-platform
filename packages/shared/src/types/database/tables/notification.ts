// Notification and messaging table type definitions
import { 
  NotificationStatus, 
  NotificationType, 
  MfaMethodType,
  DeviceType,
  DeviceStatus,
  AuditEventType 
} from '../enums';

// Message notifications table
export interface MessageNotificationsTable {
  Row: {
    id: number;
    created_at: string;
    user_id: string;
    title: string;
    message: string;
    type: NotificationType;
    status: NotificationStatus;
    read_at: string | null;
    action_url: string | null;
    metadata: Record<string, any> | null;
  };
  Insert: {
    id?: number;
    created_at?: string;
    user_id: string;
    title: string;
    message: string;
    type: NotificationType;
    status?: NotificationStatus;
    read_at?: string | null;
    action_url?: string | null;
    metadata?: Record<string, any> | null;
  };
  Update: {
    id?: number;
    created_at?: string;
    user_id?: string;
    title?: string;
    message?: string;
    type?: NotificationType;
    status?: NotificationStatus;
    read_at?: string | null;
    action_url?: string | null;
    metadata?: Record<string, any> | null;
  };
}

// Announcements table
export interface AnnouncementsTable {
  Row: {
    id: number;
    created_at: string;
    updated_at: string;
    title: string;
    content: string;
    type: NotificationType;
    target_audience: string | null;
    published_at: string | null;
    expires_at: string | null;
    is_active: boolean;
    priority: number;
    metadata: Record<string, any> | null;
    created_by: string;
  };
  Insert: {
    id?: number;
    created_at?: string;
    updated_at?: string;
    title: string;
    content: string;
    type: NotificationType;
    target_audience?: string | null;
    published_at?: string | null;
    expires_at?: string | null;
    is_active?: boolean;
    priority?: number;
    metadata?: Record<string, any> | null;
    created_by: string;
  };
  Update: {
    id?: number;
    created_at?: string;
    updated_at?: string;
    title?: string;
    content?: string;
    type?: NotificationType;
    target_audience?: string | null;
    published_at?: string | null;
    expires_at?: string | null;
    is_active?: boolean;
    priority?: number;
    metadata?: Record<string, any> | null;
    created_by?: string;
  };
}

// MFA sessions table
export interface MfaSessionsTable {
  Row: {
    id: string;
    user_id: string;
    method_type: MfaMethodType;
    code: string;
    created_at: string;
    expires_at: string;
    verified_at: string | null;
    attempts: number;
    max_attempts: number;
    is_used: boolean;
    metadata: Record<string, any> | null;
  };
  Insert: {
    id?: string;
    user_id: string;
    method_type: MfaMethodType;
    code: string;
    created_at?: string;
    expires_at: string;
    verified_at?: string | null;
    attempts?: number;
    max_attempts?: number;
    is_used?: boolean;
    metadata?: Record<string, any> | null;
  };
  Update: {
    id?: string;
    user_id?: string;
    method_type?: MfaMethodType;
    code?: string;
    created_at?: string;
    expires_at?: string;
    verified_at?: string | null;
    attempts?: number;
    max_attempts?: number;
    is_used?: boolean;
    metadata?: Record<string, any> | null;
  };
}

// User devices table
export interface UserDevicesTable {
  Row: {
    id: string;
    user_id: string;
    device_type: DeviceType;
    device_name: string;
    device_id: string;
    push_token: string | null;
    status: DeviceStatus;
    last_active: string;
    created_at: string;
    updated_at: string;
    metadata: Record<string, any> | null;
  };
  Insert: {
    id?: string;
    user_id: string;
    device_type: DeviceType;
    device_name: string;
    device_id: string;
    push_token?: string | null;
    status?: DeviceStatus;
    last_active?: string;
    created_at?: string;
    updated_at?: string;
    metadata?: Record<string, any> | null;
  };
  Update: {
    id?: string;
    user_id?: string;
    device_type?: DeviceType;
    device_name?: string;
    device_id?: string;
    push_token?: string | null;
    status?: DeviceStatus;
    last_active?: string;
    created_at?: string;
    updated_at?: string;
    metadata?: Record<string, any> | null;
  };
}

// Audit log table
export interface AuditLogTable {
  Row: {
    id: string;
    created_at: string;
    user_id: string | null;
    event_type: AuditEventType;
    resource_type: string;
    resource_id: string | null;
    old_values: Record<string, any> | null;
    new_values: Record<string, any> | null;
    ip_address: string | null;
    user_agent: string | null;
    metadata: Record<string, any> | null;
  };
  Insert: {
    id?: string;
    created_at?: string;
    user_id?: string | null;
    event_type: AuditEventType;
    resource_type: string;
    resource_id?: string | null;
    old_values?: Record<string, any> | null;
    new_values?: Record<string, any> | null;
    ip_address?: string | null;
    user_agent?: string | null;
    metadata?: Record<string, any> | null;
  };
  Update: {
    id?: string;
    created_at?: string;
    user_id?: string | null;
    event_type?: AuditEventType;
    resource_type?: string;
    resource_id?: string | null;
    old_values?: Record<string, any> | null;
    new_values?: Record<string, any> | null;
    ip_address?: string | null;
    user_agent?: string | null;
    metadata?: Record<string, any> | null;
  };
}

// Push notification logs table
export interface PushNotificationLogsTable {
  Row: {
    id: string;
    created_at: string;
    user_id: string;
    device_id: string | null;
    notification_id: number | null;
    title: string;
    body: string;
    status: NotificationStatus;
    sent_at: string | null;
    delivered_at: string | null;
    error_message: string | null;
    retry_count: number;
    metadata: Record<string, any> | null;
  };
  Insert: {
    id?: string;
    created_at?: string;
    user_id: string;
    device_id?: string | null;
    notification_id?: number | null;
    title: string;
    body: string;
    status?: NotificationStatus;
    sent_at?: string | null;
    delivered_at?: string | null;
    error_message?: string | null;
    retry_count?: number;
    metadata?: Record<string, any> | null;
  };
  Update: {
    id?: string;
    created_at?: string;
    user_id?: string;
    device_id?: string | null;
    notification_id?: number | null;
    title?: string;
    body?: string;
    status?: NotificationStatus;
    sent_at?: string | null;
    delivered_at?: string | null;
    error_message?: string | null;
    retry_count?: number;
    metadata?: Record<string, any> | null;
  };
}