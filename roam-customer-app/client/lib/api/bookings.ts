// Direct Supabase Bookings API calls
import { BaseAPI, ApiResponse } from './BaseAPI';
import { BookingRecord, BookingWithRelations } from '@/types/api';
import { logger } from "../../utils/logger";

class BookingsAPI extends BaseAPI {

  constructor() {
    super();
  }

  private getHeaders(useAuthToken = false, accessToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      apikey: this.apiKey,
      "Content-Type": "application/json",
    };

    if (useAuthToken && accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    } else {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  async getBookings(customerId: string, accessToken?: string): Promise<BookingRecord[]> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/bookings?customer_id=eq.${customerId}&select=*`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch bookings: ${response.statusText}`);
    }

    return response.json();
  }

  async getBookingWithDetails(bookingId: string, accessToken?: string): Promise<BookingRecord> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/bookings?id=eq.${bookingId}&select=*,customer_profiles(*),providers(*),services(*),business_profiles(*)`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch booking details: ${response.statusText}`);
    }

    const bookings = await response.json();
    return bookings[0];
  }

  async updateBooking(
    bookingId: string,
    updates: Partial<BookingRecord>,
    accessToken?: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/bookings?id=eq.${bookingId}`,
      {
        method: "PATCH",
        headers: this.getHeaders(true, accessToken),
        body: JSON.stringify(updates),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update booking: ${response.statusText}`);
    }
  }

  async cancelBooking(
    bookingId: string,
    cancellationData: {
      cancelled_at: string;
      cancelled_by: string;
      cancellation_reason: string;
      cancellation_fee: number;
      refund_amount: number;
    },
    accessToken?: string
  ): Promise<void> {
    const updates = {
      booking_status: "cancelled",
      ...cancellationData,
    };

    await this.updateBooking(bookingId, updates, accessToken);
  }

  async rescheduleBooking(
    bookingId: string,
    rescheduleData: {
      booking_date: string;
      booking_time: string;
      reschedule_reason: string;
      rescheduled_at: string;
      rescheduled_by: string;
      original_booking_date: string;
      original_booking_time: string;
      reschedule_count: number;
      last_reschedule_date: string;
    },
    accessToken?: string
  ): Promise<void> {
    await this.updateBooking(bookingId, rescheduleData, accessToken);
  }

  async createBooking(
    bookingData: Omit<BookingRecord, "id">,
    accessToken?: string
  ): Promise<BookingRecord> {
    logger.debug('Creating booking with data:', bookingData);
    
    const response = await fetch(
      `${this.baseURL}/rest/v1/bookings?select=*`,
      {
        method: "POST",
        headers: this.getHeaders(true, accessToken),
        body: JSON.stringify(bookingData),
      },
    );

    logger.debug('Create booking response status:', response.status);

    if (!response.ok) {
      // Try to get error details
      let errorMessage = `Failed to create booking: ${response.statusText}`;
      try {
        const errorText = await response.text();
        logger.error('Create booking error response:', errorText);
        if (errorText) {
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
        }
      } catch (e) {
        logger.error('Could not read error response:', e);
      }
      throw new Error(errorMessage);
    }

    // Check if response has content
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    logger.debug('Response headers:', {
      contentType,
      contentLength
    });

    if (contentLength === '0' || !contentType?.includes('application/json')) {
      logger.error('Invalid response - no JSON content');
      throw new Error('Server returned invalid response (no JSON content)');
    }

    try {
      const data = await response.json();
      logger.debug('Booking created successfully:', data);
      // Supabase returns an array when using select=*
      return Array.isArray(data) ? data[0] : data;
    } catch (jsonError) {
      logger.error('Failed to parse booking response as JSON:', jsonError);
      throw new Error('Invalid JSON response from server');
    }
  }
}

export const bookingsAPI = new BookingsAPI();
