import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";
import twilio from "twilio";

// Types for notification service
export interface NotificationRequest {
  type: 'email' | 'sms' | 'push' | 'all';
  to: string | string[];
  subject?: string;
  message: string;
  template?: string;
  data?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  channels?: ('email' | 'sms' | 'push')[];
  userId?: string;
  userType?: 'customer' | 'provider' | 'admin';
  bookingId?: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: 'email' | 'sms' | 'push';
}

export interface NotificationConfig {
  email: {
    enabled: boolean;
    provider: 'resend';
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  sms: {
    enabled: boolean;
    provider: 'twilio';
    accountSid: string;
    authToken: string;
    fromNumber: string;
  };
  push: {
    enabled: boolean;
    vapidPublicKey?: string;
    vapidPrivateKey?: string;
  };
}

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SMSTemplate {
  name: string;
  message: string;
}

// Notification service interface
export interface NotificationService {
  sendNotification(request: NotificationRequest): Promise<NotificationResult[]>;
  sendEmail(to: string | string[], subject: string, html: string, text?: string): Promise<NotificationResult>;
  sendSMS(to: string | string[], message: string): Promise<NotificationResult>;
  sendPushNotification(userId: string, title: string, body: string, data?: Record<string, any>): Promise<NotificationResult>;
  sendBookingNotification(bookingId: string, type: string, userId: string, userType: string): Promise<NotificationResult[]>;
  sendWelcomeEmail(email: string, firstName: string, userType: 'customer' | 'provider' | 'admin'): Promise<NotificationResult>;
  sendPasswordResetEmail(email: string, resetToken: string): Promise<NotificationResult>;
  sendBookingStatusUpdate(booking: any, newStatus: string, notifyCustomer?: boolean, notifyProvider?: boolean): Promise<NotificationResult[]>;
}

// Base notification service implementation
export abstract class BaseNotificationService implements NotificationService {
  protected config: NotificationConfig;
  protected resend!: Resend;
  protected twilioClient: any;

  constructor(config: NotificationConfig) {
    this.config = config;
    this.initializeServices();
  }

  protected abstract initializeServices(): void;

  async sendNotification(request: NotificationRequest): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const channels = request.channels || this.getDefaultChannels(request.type);

    for (const channel of channels) {
      try {
        let result: NotificationResult;

        switch (channel) {
          case 'email':
            result = await this.sendEmail(
              request.to,
              request.subject || 'Notification from ROAM',
              this.getEmailTemplate(request.template, request.data),
              this.getEmailTextTemplate(request.template, request.data)
            );
            break;
          case 'sms':
            result = await this.sendSMS(
              request.to,
              this.getSMSTemplate(request.template, request.data)
            );
            break;
          case 'push':
            if (request.userId) {
              result = await this.sendPushNotification(
                request.userId,
                request.subject || 'ROAM Notification',
                request.message,
                request.data
              );
            } else {
              result = { success: false, error: 'User ID required for push notifications', channel: 'push' };
            }
            break;
          default:
            result = { success: false, error: `Unsupported channel: ${channel}`, channel: channel as any };
        }

        results.push(result);
      } catch (error) {
        console.error(`Error sending ${channel} notification:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          channel: channel as any
        });
      }
    }

    return results;
  }

  async sendEmail(to: string | string[], subject: string, html: string, text?: string): Promise<NotificationResult> {
    if (!this.config.email.enabled) {
      return { success: false, error: 'Email service is disabled', channel: 'email' };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.config.email.fromName} <${this.config.email.fromEmail}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
      });

      if (error) {
        console.error('Resend error:', error);
        return { success: false, error: error.message, channel: 'email' };
      }

      console.log('Email sent successfully:', data?.id);
      return { success: true, messageId: data?.id, channel: 'email' };
    } catch (error) {
      console.error('Email service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        channel: 'email' 
      };
    }
  }

  async sendSMS(to: string | string[], message: string): Promise<NotificationResult> {
    if (!this.config.sms.enabled) {
      return { success: false, error: 'SMS service is disabled', channel: 'sms' };
    }

    try {
      const results = [];
      const recipients = Array.isArray(to) ? to : [to];

      for (const phoneNumber of recipients) {
        const result = await this.twilioClient.messages.create({
          body: message,
          from: this.config.sms.fromNumber,
          to: phoneNumber,
        });

        results.push(result);
      }

      console.log('SMS sent successfully:', results.map(r => r.sid));
      return { success: true, messageId: results[0]?.sid, channel: 'sms' };
    } catch (error) {
      console.error('SMS service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        channel: 'sms' 
      };
    }
  }

  async sendPushNotification(userId: string, title: string, body: string, data?: Record<string, any>): Promise<NotificationResult> {
    if (!this.config.push.enabled) {
      return { success: false, error: 'Push service is disabled', channel: 'push' };
    }

    // Implementation would depend on your push notification service
    // For now, return a placeholder
    console.log('Push notification would be sent:', { userId, title, body, data });
    return { success: true, messageId: `push_${Date.now()}`, channel: 'push' };
  }

  async sendBookingNotification(bookingId: string, type: string, userId: string, userType: string): Promise<NotificationResult[]> {
    const templates = this.getBookingTemplates(type, userType);
    const user = await this.getUserInfo(userId, userType);

    if (!user) {
      return [{ success: false, error: 'User not found', channel: 'email' }];
    }

    const requests: NotificationRequest[] = [];

    // Email notification
    if (templates.email) {
      requests.push({
        type: 'email',
        to: user.email,
        subject: templates.email.subject,
        message: templates.email.message,
        template: type,
        data: { ...templates.email.data, bookingId, user },
        userId,
        userType: userType as any,
        bookingId
      });
    }

    // SMS notification
    if (templates.sms && user.phone) {
      requests.push({
        type: 'sms',
        to: user.phone,
        message: templates.sms.message,
        template: type,
        data: { ...templates.sms.data, bookingId, user },
        userId,
        userType: userType as any,
        bookingId
      });
    }

    const results: NotificationResult[] = [];
    for (const request of requests) {
      const result = await this.sendNotification(request);
      results.push(...result);
    }

    return results;
  }

  async sendWelcomeEmail(email: string, firstName: string, userType: 'customer' | 'provider' | 'admin'): Promise<NotificationResult> {
    const template = this.getWelcomeEmailTemplate(userType);
    const html = this.renderEmailTemplate(template.html, { firstName, userType });
    const text = this.renderEmailTemplate(template.text || '', { firstName, userType });

    return this.sendEmail(email, template.subject, html, text);
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<NotificationResult> {
    const template = this.getPasswordResetTemplate();
    const resetUrl = `${process.env.VITE_APP_URL}/reset-password?token=${resetToken}`;
    const html = this.renderEmailTemplate(template.html, { resetUrl });
    const text = this.renderEmailTemplate(template.text || '', { resetUrl });

    return this.sendEmail(email, template.subject, html, text);
  }

  async sendBookingStatusUpdate(booking: any, newStatus: string, notifyCustomer = true, notifyProvider = true): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Notify customer
    if (notifyCustomer && booking.customer_id) {
      const customerResults = await this.sendBookingNotification(
        booking.id,
        'booking_status_update',
        booking.customer_id,
        'customer'
      );
      results.push(...customerResults);
    }

    // Notify provider
    if (notifyProvider && booking.provider_id) {
      const providerResults = await this.sendBookingNotification(
        booking.id,
        'booking_status_update',
        booking.provider_id,
        'provider'
      );
      results.push(...providerResults);
    }

    // Send Twilio conversation notification for confirmed/in_progress bookings
    if (['confirmed', 'in_progress'].includes(newStatus)) {
      try {
        await this.sendTwilioConversationNotification(booking, newStatus);
      } catch (error) {
        console.error('Error sending Twilio conversation notification:', error);
        results.push({
          success: false,
          error: 'Twilio conversation notification failed',
          channel: 'sms'
        });
      }
    }

    return results;
  }

  // Helper methods
  protected getDefaultChannels(type: string): ('email' | 'sms' | 'push')[] {
    switch (type) {
      case 'email':
        return ['email'];
      case 'sms':
        return ['sms'];
      case 'push':
        return ['push'];
      case 'all':
        return ['email', 'sms', 'push'];
      default:
        return ['email', 'sms'];
    }
  }

  protected getEmailTemplate(templateName?: string, data?: Record<string, any>): string {
    const templates = this.getEmailTemplates();
    const template = templateName ? templates[templateName] : templates.default;
    
    if (!template) {
      return this.getDefaultEmailTemplate(data);
    }

    return this.renderEmailTemplate(template.html, data || {});
  }

  protected getEmailTextTemplate(templateName?: string, data?: Record<string, any>): string {
    const templates = this.getEmailTemplates();
    const template = templateName ? templates[templateName] : templates.default;
    
    if (!template || !template.text) {
      return this.getDefaultEmailTextTemplate(data);
    }

    return this.renderEmailTemplate(template.text, data || {});
  }

  protected getSMSTemplate(templateName?: string, data?: Record<string, any>): string {
    const templates = this.getSMSTemplates();
    const template = templateName ? templates[templateName] : templates.default;
    
    if (!template) {
      return this.getDefaultSMSTemplate(data);
    }

    return this.renderSMSTemplate(template.message, data || {});
  }

  protected renderEmailTemplate(template: string, data: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return result;
  }

  protected renderSMSTemplate(template: string, data: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return result;
  }

  protected async getUserInfo(userId: string, userType: string): Promise<any> {
    // This would fetch user info from your database
    // For now, return a placeholder
    return {
      id: userId,
      email: 'user@example.com',
      phone: '+1234567890',
      firstName: 'User',
      lastName: 'Name'
    };
  }

  protected async sendTwilioConversationNotification(booking: any, status: string): Promise<void> {
    // This would integrate with your existing Twilio Conversations setup
    console.log('Sending Twilio conversation notification for booking:', booking.id, 'status:', status);
  }

  // Template methods - to be implemented by concrete classes
  protected abstract getEmailTemplates(): Record<string, EmailTemplate>;
  protected abstract getSMSTemplates(): Record<string, SMSTemplate>;
  protected abstract getBookingTemplates(type: string, userType: string): { email?: EmailTemplate; sms?: SMSTemplate };
  protected abstract getWelcomeEmailTemplate(userType: string): EmailTemplate;
  protected abstract getPasswordResetTemplate(): EmailTemplate;
  protected abstract getDefaultEmailTemplate(data?: Record<string, any>): string;
  protected abstract getDefaultEmailTextTemplate(data?: Record<string, any>): string;
  protected abstract getDefaultSMSTemplate(data?: Record<string, any>): string;
}

// ROAM-specific notification service implementation
import { env } from '../config/environment';

export class ROAMNotificationService extends BaseNotificationService {
  constructor() {
    const config: NotificationConfig = {
      email: {
        enabled: true,
        provider: 'resend',
        apiKey: env.email.resendApiKey,
        fromEmail: 'noreply@roamyourbestlife.com',
        fromName: 'ROAM Platform'
      },
      sms: {
        enabled: true,
        provider: 'twilio',
        accountSid: env.twilio.accountSid,
        authToken: env.twilio.authToken,
        fromNumber: env.twilio.fromNumber || ''
      },
      push: {
        enabled: false
      }
    };

    super(config);
  }

  protected initializeServices(): void {
    this.resend = new Resend(this.config.email.apiKey);
    this.twilioClient = twilio(this.config.sms.accountSid, this.config.sms.authToken);
  }

  protected getEmailTemplates(): Record<string, EmailTemplate> {
    return {
      default: {
        name: 'default',
        subject: 'ROAM Notification',
        html: this.getDefaultEmailTemplate(),
        text: this.getDefaultEmailTextTemplate()
      },
      welcome: {
        name: 'welcome',
        subject: 'Welcome to ROAM!',
        html: this.getWelcomeEmailTemplate('customer').html,
        text: this.getWelcomeEmailTemplate('customer').text
      },
      password_reset: {
        name: 'password_reset',
        subject: 'Reset Your ROAM Password',
        html: this.getPasswordResetTemplate().html,
        text: this.getPasswordResetTemplate().text
      },
      booking_status_update: {
        name: 'booking_status_update',
        subject: 'Booking Status Update',
        html: this.getBookingStatusUpdateTemplate(),
        text: this.getBookingStatusUpdateTextTemplate()
      }
    };
  }

  protected getSMSTemplates(): Record<string, SMSTemplate> {
    return {
      default: {
        name: 'default',
        message: 'ROAM: {{message}}'
      },
      booking_status_update: {
        name: 'booking_status_update',
        message: 'ROAM: Your booking status has been updated to {{status}}. Booking ID: {{bookingId}}'
      },
      welcome: {
        name: 'welcome',
        message: 'Welcome to ROAM! Your account has been created successfully.'
      }
    };
  }

  protected getBookingTemplates(type: string, userType: string): { email?: EmailTemplate; sms?: SMSTemplate } {
    switch (type) {
      case 'booking_status_update':
        return {
          email: {
            name: 'booking_status_update',
            subject: 'Booking Status Update',
            html: this.getBookingStatusUpdateTemplate(),
            text: this.getBookingStatusUpdateTextTemplate()
          },
          sms: {
            name: 'booking_status_update',
            message: 'ROAM: Your booking status has been updated to {{status}}. Booking ID: {{bookingId}}'
          }
        };
      default:
        return {};
    }
  }

  protected getWelcomeEmailTemplate(userType: string): EmailTemplate {
    const templates = {
      customer: {
        name: 'welcome_customer',
        subject: 'Welcome to ROAM - Your Best Life. Everywhere.',
        html: this.getCustomerWelcomeTemplate(),
        text: this.getCustomerWelcomeTextTemplate()
      },
      provider: {
        name: 'welcome_provider',
        subject: 'Welcome to ROAM Provider Platform',
        html: this.getProviderWelcomeTemplate(),
        text: this.getProviderWelcomeTextTemplate()
      },
      admin: {
        name: 'welcome_admin',
        subject: 'Welcome to ROAM Admin Platform',
        html: this.getAdminWelcomeTemplate(),
        text: this.getAdminWelcomeTextTemplate()
      }
    };

    return templates[userType as keyof typeof templates] || templates.customer;
  }

  protected getPasswordResetTemplate(): EmailTemplate {
    return {
      name: 'password_reset',
      subject: 'Reset Your ROAM Password',
      html: this.getPasswordResetEmailTemplate(),
      text: this.getPasswordResetEmailTextTemplate()
    };
  }

  protected getDefaultEmailTemplate(data?: Record<string, any>): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ROAM - Your Best Life. Everywhere.</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
          }
          .email-container {
            background-color: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .logo {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo img {
            max-width: 200px;
            height: auto;
          }
          .content {
            margin-bottom: 30px;
          }
          .button {
            display: inline-block;
            background-color: #4F46E5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="logo">
            <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=800" alt="ROAM Logo">
          </div>
          <div class="content">
            <h2>ROAM Notification</h2>
            <p>{{message}}</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 ROAM Platform. All rights reserved.</p>
            <p>If you have any questions, please contact us at support@roamyourbestlife.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  protected getDefaultEmailTextTemplate(data?: Record<string, any>): string {
    return `
ROAM Notification

{{message}}

---
ROAM Platform
support@roamyourbestlife.com
    `;
  }

  protected getDefaultSMSTemplate(data?: Record<string, any>): string {
    return 'ROAM: {{message}}';
  }

  // Template implementations
  protected getCustomerWelcomeTemplate(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ROAM</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
          }
          .email-container {
            background-color: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .logo {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo img {
            max-width: 200px;
            height: auto;
          }
          .content {
            margin-bottom: 30px;
          }
          .button {
            display: inline-block;
            background-color: #4F46E5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="logo">
            <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=800" alt="ROAM Logo">
          </div>
          <div class="content">
            <h2>Welcome to ROAM, {{firstName}}!</h2>
            <p>Your journey to your best life starts now. Discover amazing services and experiences tailored just for you.</p>
            <a href="{{appUrl}}" class="button">Get Started</a>
          </div>
          <div class="footer">
            <p>&copy; 2024 ROAM Platform. All rights reserved.</p>
            <p>If you have any questions, please contact us at support@roamyourbestlife.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  protected getCustomerWelcomeTextTemplate(): string {
    return `
Welcome to ROAM, {{firstName}}!

Your journey to your best life starts now. Discover amazing services and experiences tailored just for you.

Get started at: {{appUrl}}

---
ROAM Platform
support@roamyourbestlife.com
    `;
  }

  protected getProviderWelcomeTemplate(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ROAM Provider Platform</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
          }
          .email-container {
            background-color: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .logo {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo img {
            max-width: 200px;
            height: auto;
          }
          .content {
            margin-bottom: 30px;
          }
          .button {
            display: inline-block;
            background-color: #4F46E5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="logo">
            <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=800" alt="ROAM Logo">
          </div>
          <div class="content">
            <h2>Welcome to ROAM Provider Platform, {{firstName}}!</h2>
            <p>Start offering your services to customers and grow your business with ROAM.</p>
            <a href="{{providerAppUrl}}" class="button">Access Provider Dashboard</a>
          </div>
          <div class="footer">
            <p>&copy; 2024 ROAM Platform. All rights reserved.</p>
            <p>If you have any questions, please contact us at providersupport@roamyourbestlife.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  protected getProviderWelcomeTextTemplate(): string {
    return `
Welcome to ROAM Provider Platform, {{firstName}}!

Start offering your services to customers and grow your business with ROAM.

Access your provider dashboard at: {{providerAppUrl}}

---
ROAM Platform
providersupport@roamyourbestlife.com
    `;
  }

  protected getAdminWelcomeTemplate(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ROAM Admin Platform</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
          }
          .email-container {
            background-color: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .logo {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo img {
            max-width: 200px;
            height: auto;
          }
          .content {
            margin-bottom: 30px;
          }
          .button {
            display: inline-block;
            background-color: #4F46E5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="logo">
            <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=800" alt="ROAM Logo">
          </div>
          <div class="content">
            <h2>Welcome to ROAM Admin Platform, {{firstName}}!</h2>
            <p>Manage the ROAM platform and ensure smooth operations for all users.</p>
            <a href="{{adminAppUrl}}" class="button">Access Admin Dashboard</a>
          </div>
          <div class="footer">
            <p>&copy; 2024 ROAM Platform. All rights reserved.</p>
            <p>If you have any questions, please contact us at adminsupport@roamyourbestlife.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  protected getAdminWelcomeTextTemplate(): string {
    return `
Welcome to ROAM Admin Platform, {{firstName}}!

Manage the ROAM platform and ensure smooth operations for all users.

Access your admin dashboard at: {{adminAppUrl}}

---
ROAM Platform
adminsupport@roamyourbestlife.com
    `;
  }

  protected getPasswordResetEmailTemplate(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your ROAM Password</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
          }
          .email-container {
            background-color: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .logo {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo img {
            max-width: 200px;
            height: auto;
          }
          .content {
            margin-bottom: 30px;
          }
          .button {
            display: inline-block;
            background-color: #4F46E5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="logo">
            <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=800" alt="ROAM Logo">
          </div>
          <div class="content">
            <h2>Reset Your ROAM Password</h2>
            <p>You requested to reset your password. Click the button below to create a new password:</p>
            <a href="{{resetUrl}}" class="button">Reset Password</a>
            <p>If you didn't request this password reset, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 ROAM Platform. All rights reserved.</p>
            <p>If you have any questions, please contact us at support@roamyourbestlife.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  protected getPasswordResetEmailTextTemplate(): string {
    return `
Reset Your ROAM Password

You requested to reset your password. Click the link below to create a new password:

{{resetUrl}}

If you didn't request this password reset, please ignore this email.

---
ROAM Platform
support@roamyourbestlife.com
    `;
  }

  protected getBookingStatusUpdateTemplate(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Status Update</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
          }
          .email-container {
            background-color: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .logo {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo img {
            max-width: 200px;
            height: auto;
          }
          .content {
            margin-bottom: 30px;
          }
          .status {
            background-color: #fef3c7;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            background-color: #4F46E5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="logo">
            <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=800" alt="ROAM Logo">
          </div>
          <div class="content">
            <h2>Booking Status Update</h2>
            <div class="status">
              <strong>New Status:</strong> {{status}}<br>
              <strong>Booking ID:</strong> {{bookingId}}<br>
              <strong>Service:</strong> {{serviceName}}
            </div>
            <p>Your booking status has been updated. You can view the details in your ROAM dashboard.</p>
            <a href="{{bookingUrl}}" class="button">View Booking</a>
          </div>
          <div class="footer">
            <p>&copy; 2024 ROAM Platform. All rights reserved.</p>
            <p>If you have any questions, please contact us at support@roamyourbestlife.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  protected getBookingStatusUpdateTextTemplate(): string {
    return `
Booking Status Update

New Status: {{status}}
Booking ID: {{bookingId}}
Service: {{serviceName}}

Your booking status has been updated. You can view the details in your ROAM dashboard.

View booking at: {{bookingUrl}}

---
ROAM Platform
support@roamyourbestlife.com
    `;
  }
}

// Factory function to create notification service
export function createNotificationService(): NotificationService {
  return new ROAMNotificationService();
}

// Default export
export default ROAMNotificationService;
