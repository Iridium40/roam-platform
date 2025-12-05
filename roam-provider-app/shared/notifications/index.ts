/**
 * Shared Notifications - Main Export
 * Use this for easy imports: import { sendNotification } from '../../shared/notifications';
 */

export { sendNotification } from './notification-manager';
export { sendEmail } from './email-service';
export { sendSMS } from './sms-service';
export type {
  SendNotificationParams,
  SendEmailParams,
  SendSMSParams,
  SendResult,
  NotificationResult,
  NotificationTemplate,
  UserSettings,
  NotificationLog,
} from './types';

