import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createNotificationService } from './notification-service';
import type { NotificationService, NotificationRequest, NotificationResult } from './notification-service';

// Notification API interface
export interface NotificationAPI {
  handleRequest(req: VercelRequest, res: VercelResponse): Promise<void>;
}

// Shared notification API implementation
export class SharedNotificationAPI implements NotificationAPI {
  private notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
  }

  async handleRequest(req: VercelRequest, res: VercelResponse): Promise<void> {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    try {
      const { action, ...data } = req.body;

      switch (action) {
        case 'send_notification':
          await this.handleSendNotification(req, res, data);
          break;
        case 'send_email':
          await this.handleSendEmail(req, res, data);
          break;
        case 'send_sms':
          await this.handleSendSMS(req, res, data);
          break;
        case 'send_push':
          await this.handleSendPush(req, res, data);
          break;
        case 'send_booking_notification':
          await this.handleSendBookingNotification(req, res, data);
          break;
        case 'send_welcome_email':
          await this.handleSendWelcomeEmail(req, res, data);
          break;
        case 'send_password_reset':
          await this.handleSendPasswordReset(req, res, data);
          break;
        case 'send_booking_status_update':
          await this.handleSendBookingStatusUpdate(req, res, data);
          break;
        default:
          res.status(400).json({
            success: false,
            error: 'Invalid action',
            message: `Unknown action: ${action}`
          });
      }
    } catch (error) {
      console.error('Notification API error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleSendNotification(_req: VercelRequest, res: VercelResponse, data: any): Promise<void> {
    const { to, subject, message, template, type = 'all', channels, userId, userType, bookingId, priority = 'medium' } = data;

    if (!to || !message) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'to and message are required'
      });
      return;
    }

    const request: NotificationRequest = {
      type: type as any,
      to,
      subject,
      message,
      template,
      data: data.data || {},
      priority: priority as any,
      channels: channels as any,
      userId,
      userType: userType as any,
      bookingId
    };

    const results = await this.notificationService.sendNotification(request);
    const success = results.every(result => result.success);

    res.status(success ? 200 : 207).json({
      success,
      results,
      message: success ? 'Notification sent successfully' : 'Some notifications failed'
    });
  }

  private async handleSendEmail(_req: VercelRequest, res: VercelResponse, data: any): Promise<void> {
    const { to, subject, message, template } = data;

    if (!to || !subject || !message) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'to, subject, and message are required'
      });
      return;
    }

    const result = await this.notificationService.sendEmail(to, subject, message, template);

    res.status(result.success ? 200 : 500).json({
      success: result.success,
      result,
      message: result.success ? 'Email sent successfully' : result.error
    });
  }

  private async handleSendSMS(_req: VercelRequest, res: VercelResponse, data: any): Promise<void> {
    const { to, message } = data;

    if (!to || !message) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'to and message are required'
      });
      return;
    }

    const result = await this.notificationService.sendSMS(to, message);

    res.status(result.success ? 200 : 500).json({
      success: result.success,
      result,
      message: result.success ? 'SMS sent successfully' : result.error
    });
  }

  private async handleSendPush(_req: VercelRequest, res: VercelResponse, data: any): Promise<void> {
    const { userId, title, body, data: pushData } = data;

    if (!userId || !title || !body) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId, title, and body are required'
      });
      return;
    }

    const result = await this.notificationService.sendPush(userId, title, body, pushData);

    res.status(result.success ? 200 : 500).json({
      success: result.success,
      result,
      message: result.success ? 'Push notification sent successfully' : result.error
    });
  }

  private async handleSendBookingNotification(_req: VercelRequest, res: VercelResponse, data: any): Promise<void> {
    const { bookingId, type, userId } = data;

    if (!bookingId || !type || !userId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'bookingId, type, and userId are required'
      });
      return;
    }

    // Mock booking object for now
    const booking = { id: bookingId };
    const recipients = [userId];

    const results = await this.notificationService.sendBookingNotification(booking, type, recipients);

    const success = results.every(result => result.success);

    res.status(success ? 200 : 207).json({
      success,
      results,
      message: success ? 'Booking notification sent successfully' : 'Some notifications failed'
    });
  }

  private async handleSendWelcomeEmail(_req: VercelRequest, res: VercelResponse, data: any): Promise<void> {
    const { email, firstName } = data;

    if (!email || !firstName) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'email and firstName are required'
      });
      return;
    }

    const result = await this.notificationService.sendWelcomeEmail(email, firstName);

    res.status(result.success ? 200 : 500).json({
      success: result.success,
      result,
      message: result.success ? 'Welcome email sent successfully' : result.error
    });
  }

  private async handleSendPasswordReset(_req: VercelRequest, res: VercelResponse, data: any): Promise<void> {
    const { email, resetToken } = data;

    if (!email || !resetToken) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'email and resetToken are required'
      });
      return;
    }

    const result = await this.notificationService.sendPasswordResetEmail(email, resetToken);

    res.status(result.success ? 200 : 500).json({
      success: result.success,
      result,
      message: result.success ? 'Password reset email sent successfully' : result.error
    });
  }

  private async handleSendBookingStatusUpdate(_req: VercelRequest, res: VercelResponse, data: any): Promise<void> {
    const { booking, newStatus, notifyCustomer = true, notifyProvider = true } = data;

    if (!booking || !newStatus) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'booking and newStatus are required'
      });
      return;
    }

    const results = await this.notificationService.sendBookingStatusUpdate(booking, newStatus, notifyCustomer, notifyProvider);
    const success = results.every(result => result.success);

    res.status(success ? 200 : 207).json({
      success,
      results,
      message: success ? 'Booking status update notifications sent successfully' : 'Some notifications failed'
    });
  }
}

// Factory function to create notification API
export function createNotificationAPI(notificationService?: NotificationService): NotificationAPI {
  const service = notificationService || createNotificationService();
  return new SharedNotificationAPI(service);
}

// Default export
export default SharedNotificationAPI;

// Export constants
export const NOTIFICATION_ACTIONS = {
  SEND_NOTIFICATION: 'send_notification',
  SEND_EMAIL: 'send_email',
  SEND_SMS: 'send_sms',
  SEND_PUSH: 'send_push',
  SEND_BOOKING_NOTIFICATION: 'send_booking_notification',
  SEND_WELCOME_EMAIL: 'send_welcome_email',
  SEND_PASSWORD_RESET: 'send_password_reset',
  SEND_BOOKING_STATUS_UPDATE: 'send_booking_status_update'
} as const;

// Utility functions
export function validateNotificationRequest(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.to) {
    errors.push('to is required');
  }

  if (!data.message && !data.subject) {
    errors.push('message or subject is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function formatNotificationResponse(results: NotificationResult[]): any {
  const success = results.every(result => result.success);
  const successfulCount = results.filter(result => result.success).length;
  const failedCount = results.length - successfulCount;

  return {
    success,
    summary: {
      total: results.length,
      successful: successfulCount,
      failed: failedCount
    },
    results,
    message: success 
      ? 'All notifications sent successfully' 
      : `${successfulCount} successful, ${failedCount} failed`
  };
}
