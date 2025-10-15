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
    const response = await fetch(
      `${this.baseURL}/rest/v1/bookings?select=*`,
      {
        method: "POST",
        headers: this.getHeaders(true, accessToken),
        body: JSON.stringify(bookingData),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to create booking: ${response.statusText}`);
    }

    return response.json();
  }
}

export const bookingsAPI = new BookingsAPI();
