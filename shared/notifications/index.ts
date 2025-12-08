/**
 * Shared Notifications - Main Export
 * Use this for easy imports: import { sendNotification } from '../../shared/notifications';
 */

export { sendNotification } from './notification-manager.js';
export { sendEmail } from './email-service.js';
export { sendSMS } from './sms-service.js';
export type {
  SendNotificationParams,
  SendEmailParams,
  SendSMSParams,
  SendResult,
  NotificationResult,
  NotificationTemplate,
  UserSettings,
  NotificationLog,
} from './types.js';

