/**
 * Notification Manager - Orchestrates email and SMS notifications
 * Simple interface for both customer and provider apps
 */

import { sendEmail } from './email-service.js';
import { sendSMS } from './sms-service.js';
import type { SendNotificationParams, NotificationResult } from './types.js';

/**
 * Send a notification via email and/or SMS
 * 
 * @example
 * ```typescript
 * await sendNotification({
 *   userId: 'user-uuid',
 *   notificationType: 'customer_booking_declined',
 *   variables: {
 *     customer_name: 'John Doe',
 *     service_name: 'Massage',
 *     // ... other variables
 *   },
 *   channels: ['email', 'sms'], // optional, defaults to both
 *   metadata: { booking_id: 'booking-uuid' }
 * });
 * ```
 */
export async function sendNotification(params: SendNotificationParams): Promise<NotificationResult> {
  const { userId, notificationType, variables, channels, attachment, metadata } = params;

  // Default to both channels if not specified
  const enabledChannels = channels || ['email', 'sms'];

  console.log('📬 Notification Manager: Sending notification', {
    userId,
    notificationType,
    channels: enabledChannels,
    hasAttachment: !!attachment,
  });

  const results: NotificationResult = {};

  // Send email if enabled
  if (enabledChannels.includes('email')) {
    try {
      results.email = await sendEmail({
        userId,
        templateKey: notificationType,
        variables,
        attachment,
        metadata,
      });
    } catch (error) {
      console.error('❌ Email notification failed:', error);
      results.email = {
        success: false,
        channel: 'email',
        recipient: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Send SMS if enabled
  if (enabledChannels.includes('sms')) {
    try {
      results.sms = await sendSMS({
        userId,
        templateKey: notificationType,
        variables,
        metadata,
      });
    } catch (error) {
      console.error('❌ SMS notification failed:', error);
      results.sms = {
        success: false,
        channel: 'sms',
        recipient: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  console.log('✅ Notification Manager: Process complete', {
    email: results.email?.success ? '✅' : results.email?.skipped ? '⏭️' : '❌',
    sms: results.sms?.success ? '✅' : results.sms?.skipped ? '⏭️' : '❌',
  });

  return results;
}

