/**
 * Client-side helper to trigger notifications via API
 * Use this from client components or pages
 */

import { NotificationType } from './notification-service';

export interface TriggerNotificationParams {
  userId: string;
  notificationType: NotificationType;
  templateVariables: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Trigger a notification via the API endpoint
 * This should be called from client-side code or API routes
 */
export async function triggerNotification(params: TriggerNotificationParams): Promise<void> {
  try {
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Failed to send notification');
    }

    console.log(`✅ Notification triggered: ${params.notificationType}`);
  } catch (error) {
    console.error('❌ Failed to trigger notification:', error);
    // Don't throw - notifications should be best-effort
  }
}

/**
 * Helper functions for common notification scenarios
 */

export async function notifyBookingAccepted(params: {
  customerId: string;
  customerName: string;
  serviceName: string;
  providerName: string;
  bookingDate: string;
  bookingTime: string;
  bookingLocation: string;
  totalAmount: string;
  bookingId: string;
}) {
  await triggerNotification({
    userId: params.customerId,
    notificationType: 'customer_booking_accepted',
    templateVariables: {
      customer_name: params.customerName,
      service_name: params.serviceName,
      provider_name: params.providerName,
      booking_date: params.bookingDate,
      booking_time: params.bookingTime,
      booking_location: params.bookingLocation,
      total_amount: params.totalAmount,
      booking_id: params.bookingId,
    },
    metadata: {
      booking_id: params.bookingId,
      event_type: 'booking_accepted',
    },
  });
}

export async function notifyNewBookingRequest(params: {
  providerId: string;
  providerName: string;
  customerName: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  bookingLocation: string;
  providerEarnings: string;
  bookingId: string;
}) {
  await triggerNotification({
    userId: params.providerId,
    notificationType: 'provider_new_booking',
    templateVariables: {
      provider_name: params.providerName,
      customer_name: params.customerName,
      service_name: params.serviceName,
      booking_date: params.bookingDate,
      booking_time: params.bookingTime,
      booking_location: params.bookingLocation,
      provider_earnings: params.providerEarnings,
      booking_id: params.bookingId,
    },
    metadata: {
      booking_id: params.bookingId,
      event_type: 'new_booking_request',
    },
  });
}

export async function notifyBookingCompleted(params: {
  customerId: string;
  customerName: string;
  serviceName: string;
  providerName: string;
  providerId: string;
  bookingId: string;
}) {
  await triggerNotification({
    userId: params.customerId,
    notificationType: 'customer_booking_completed',
    templateVariables: {
      customer_name: params.customerName,
      service_name: params.serviceName,
      provider_name: params.providerName,
      provider_id: params.providerId,
      booking_id: params.bookingId,
    },
    metadata: {
      booking_id: params.bookingId,
      event_type: 'booking_completed',
    },
  });
}

export async function notifyBookingCancelled(params: {
  providerId: string;
  providerName: string;
  customerName: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  cancellationReason: string;
}) {
  await triggerNotification({
    userId: params.providerId,
    notificationType: 'provider_booking_cancelled',
    templateVariables: {
      provider_name: params.providerName,
      customer_name: params.customerName,
      service_name: params.serviceName,
      booking_date: params.bookingDate,
      booking_time: params.bookingTime,
      cancellation_reason: params.cancellationReason,
    },
    metadata: {
      event_type: 'booking_cancelled',
    },
  });
}

