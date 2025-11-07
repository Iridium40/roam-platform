import type { VercelRequest, VercelResponse } from '@vercel/node';
import { notificationService, NotificationType } from '../../lib/notifications/notification-service';

/**
 * POST /api/notifications/send
 * 
 * Send a notification to a user
 * 
 * Body:
 * {
 *   userId: string,
 *   notificationType: NotificationType,
 *   templateVariables: Record<string, any>,
 *   metadata?: Record<string, any>
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, notificationType, templateVariables, metadata } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!notificationType) {
      return res.status(400).json({ error: 'notificationType is required' });
    }

    if (!templateVariables || typeof templateVariables !== 'object') {
      return res.status(400).json({ error: 'templateVariables object is required' });
    }

    // Validate notification type
    const validTypes: NotificationType[] = [
      'customer_welcome',
      'customer_booking_accepted',
      'customer_booking_completed',
      'customer_booking_reminder',
      'provider_new_booking',
      'provider_booking_cancelled',
      'provider_booking_rescheduled',
      'admin_business_verification',
    ];

    if (!validTypes.includes(notificationType)) {
      return res.status(400).json({ 
        error: 'Invalid notification type',
        validTypes 
      });
    }

    console.log(`📧 Sending ${notificationType} notification to user ${userId}`);

    // Send notification
    await notificationService.send({
      userId,
      notificationType,
      templateVariables,
      metadata,
    });

    console.log(`✅ Notification sent successfully: ${notificationType}`);

    return res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
    });

  } catch (error) {
    console.error('❌ Notification API error:', error);
    return res.status(500).json({
      error: 'Failed to send notification',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

