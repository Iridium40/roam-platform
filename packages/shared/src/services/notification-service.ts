// Notification service types and interfaces
export interface NotificationRequest {
  type: 'email' | 'sms' | 'push' | 'in_app' | 'all';
  to: string | string[];
  subject?: string;
  message: string;
  template?: string;
  data?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  channels?: ('email' | 'sms' | 'push' | 'in_app')[];
  userId?: string;
  userType?: 'customer' | 'provider' | 'owner' | 'dispatcher';
  bookingId?: string;
}

export interface NotificationResult {
  success: boolean;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  messageId?: string;
  error?: string;
  recipient: string;
}

export interface NotificationService {
  sendNotification(request: NotificationRequest): Promise<NotificationResult[]>;
  sendEmail(to: string, subject: string, message: string, template?: string): Promise<NotificationResult>;
  sendSMS(to: string, message: string): Promise<NotificationResult>;
  sendPush(to: string, title: string, message: string, data?: Record<string, any>): Promise<NotificationResult>;
  sendBookingNotification(booking: any, type: string, recipients: string[]): Promise<NotificationResult[]>;
  sendWelcomeEmail(email: string, name: string): Promise<NotificationResult>;
  sendPasswordResetEmail(email: string, resetToken: string): Promise<NotificationResult>;
  sendBookingStatusUpdate(booking: any, newStatus: string, notifyCustomer?: boolean, notifyProvider?: boolean): Promise<NotificationResult[]>;
}

// Basic notification service implementation
export class BasicNotificationService implements NotificationService {
  async sendNotification(request: NotificationRequest): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const recipients = Array.isArray(request.to) ? request.to : [request.to];

    for (const recipient of recipients) {
      try {
        // For now, just log the notification
        console.log(`[Notification] ${request.type} to ${recipient}:`, {
          subject: request.subject,
          message: request.message,
          template: request.template,
          data: request.data
        });

        results.push({
          success: true,
          channel: request.type as any,
          messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          recipient
        });
      } catch (error) {
        results.push({
          success: false,
          channel: request.type as any,
          error: error instanceof Error ? error.message : 'Unknown error',
          recipient
        });
      }
    }

    return results;
  }

  async sendEmail(to: string, subject: string, message: string, template?: string): Promise<NotificationResult> {
    console.log(`[Email] to ${to}:`, { subject, message, template });
    
    return {
      success: true,
      channel: 'email',
      messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipient: to
    };
  }

  async sendSMS(to: string, message: string): Promise<NotificationResult> {
    console.log(`[SMS] to ${to}:`, { message });
    
    return {
      success: true,
      channel: 'sms',
      messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipient: to
    };
  }

  async sendPush(to: string, title: string, message: string, data?: Record<string, any>): Promise<NotificationResult> {
    console.log(`[Push] to ${to}:`, { title, message, data });
    
    return {
      success: true,
      channel: 'push',
      messageId: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipient: to
    };
  }

  async sendBookingNotification(booking: any, type: string, recipients: string[]): Promise<NotificationResult[]> {
    console.log(`[Booking Notification] type: ${type}, recipients:`, recipients, { booking });
    
    return recipients.map(recipient => ({
      success: true,
      channel: 'email',
      messageId: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipient
    }));
  }

  async sendWelcomeEmail(email: string, name: string): Promise<NotificationResult> {
    console.log(`[Welcome Email] to ${email} for ${name}`);
    
    return {
      success: true,
      channel: 'email',
      messageId: `welcome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipient: email
    };
  }

  async sendPasswordResetEmail(email: string, _resetToken: string): Promise<NotificationResult> {
    console.log(`[Password Reset Email] to ${email}`);
    
    return {
      success: true,
      channel: 'email',
      messageId: `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipient: email
    };
  }

  async sendBookingStatusUpdate(booking: any, newStatus: string, notifyCustomer: boolean = true, notifyProvider: boolean = true): Promise<NotificationResult[]> {
    console.log(`[Booking Status Update] status: ${newStatus}`, { booking, notifyCustomer, notifyProvider });
    
    const results: NotificationResult[] = [];
    
    if (notifyCustomer && booking.customer_email) {
      results.push({
        success: true,
        channel: 'email',
        messageId: `status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        recipient: booking.customer_email
      });
    }
    
    if (notifyProvider && booking.provider_email) {
      results.push({
        success: true,
        channel: 'email',
        messageId: `status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        recipient: booking.provider_email
      });
    }
    
    return results;
  }
}

// Factory function to create notification service
export function createNotificationService(): NotificationService {
  return new BasicNotificationService();
}
