// Unified Booking API for ROAM platform
// Provides consistent booking data access across all applications

import {
  UnifiedBookingBase,
  BookingQueryOptions,
  BookingApiResponse,
  BookingError,
  CustomerBooking,
  ProviderBooking,
  AdminBooking,
  BookingUpdateData,
  BookingValidationResult,
  CustomerBookingRequest,
  BookingStats
} from '../../types/bookings';
import { safeJsonParse } from '../../utils/serviceUtils';

export interface UnifiedBookingAPIConfig {
  baseURL: string;
  apiKey: string;
  role?: 'admin' | 'provider' | 'customer' | 'business';
  timeout?: number;
  retries?: number;
}

export class UnifiedBookingAPI {
  private baseURL: string;
  private headers: Record<string, string>;
  private timeout: number;
  private retries: number;

  constructor(config: UnifiedBookingAPIConfig) {
    this.baseURL = config.baseURL;
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
    
    this.headers = {
      'apikey': config.apiKey,
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add role-specific headers if needed
    if (config.role) {
      this.headers['X-Client-Role'] = config.role;
    }
  }

  // Enhanced fetch with retry logic and timeout
  private async fetchWithRetry(url: string, options: RequestInit = {}, attempt = 1): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...this.headers, ...options.headers },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (attempt < this.retries && error instanceof Error && error.name !== 'AbortError') {
        console.warn(`Request failed, retrying (${attempt}/${this.retries}):`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      
      throw error;
    }
  }

  // Build query parameters from options
  private buildQueryParams(options: BookingQueryOptions): URLSearchParams {
    const params = new URLSearchParams();
    
    // Filtering parameters
    if (options.customerId) params.set('customer_id', options.customerId);
    if (options.providerId) params.set('provider_id', options.providerId);
    if (options.businessId) params.set('business_id', options.businessId);
    if (options.serviceId) params.set('service_id', options.serviceId);
    if (options.deliveryType) params.set('delivery_type', options.deliveryType);
    
    // Status filtering
    if (options.bookingStatus) {
      if (Array.isArray(options.bookingStatus)) {
        params.set('booking_status', `in.(${options.bookingStatus.join(',')})`);
      } else {
        params.set('booking_status', `eq.${options.bookingStatus}`);
      }
    }
    
    if (options.paymentStatus) {
      if (Array.isArray(options.paymentStatus)) {
        params.set('payment_status', `in.(${options.paymentStatus.join(',')})`);
      } else {
        params.set('payment_status', `eq.${options.paymentStatus}`);
      }
    }
    
    if (options.tipStatus) params.set('tip_status', `eq.${options.tipStatus}`);
    
    // Date filtering
    if (options.dateFrom) params.set('booking_date', `gte.${options.dateFrom}`);
    if (options.dateTo) params.set('booking_date', `lte.${options.dateTo}`);
    if (options.createdFrom) params.set('created_at', `gte.${options.createdFrom}`);
    if (options.createdTo) params.set('created_at', `lte.${options.createdTo}`);
    
    // Search
    if (options.searchQuery) params.set('search', options.searchQuery);
    if (options.guestName) params.set('guest_name', `ilike.%${options.guestName}%`);
    if (options.bookingReference) params.set('booking_reference', `eq.${options.bookingReference}`);
    
    // Pagination
    if (options.page && options.limit) {
      const offset = (options.page - 1) * options.limit;
      params.set('offset', offset.toString());
    }
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    
    // Sorting
    if (options.sortBy) {
      const order = options.sortOrder === 'desc' ? 'desc' : 'asc';
      params.set('order', `${options.sortBy}.${order}`);
    }
    
    // Build select clause based on includes
    const selectParts = ['*'];
    if (options.includeCustomer) {
      selectParts.push('customer_profiles(id,first_name,last_name,email,phone,is_active)');
    }
    if (options.includeProvider) {
      selectParts.push('providers(id,first_name,last_name,email,phone,image_url,bio,is_active,provider_role,business_profiles(id,business_name,logo_url,image_url))');
    }
    if (options.includeBusiness) {
      selectParts.push('business_profiles(id,business_name,business_type,logo_url,image_url,verification_status,is_active,contact_email,phone,website_url)');
    }
    if (options.includeService) {
      selectParts.push('services(id,name,description,min_price,max_price,duration_minutes,image_url,is_active)');
    }
    if (options.includeLocations) {
      selectParts.push('customer_locations(id,address_line_1,city,state,zip_code)');
      selectParts.push('business_locations(id,address_line_1,city,state,zip_code)');
    }
    if (options.includeReviews) {
      selectParts.push('reviews(id,overall_rating,service_rating,communication_rating,punctuality_rating,review_text,created_at)');
    }
    if (options.includeTips) {
      selectParts.push('tips(id,tip_amount,tip_percentage,customer_message,provider_response,tip_given_at)');
    }
    
    params.set('select', selectParts.join(','));
    
    return params;
  }

  // Core booking fetching method with app-specific transforms
  async getBookings<T = UnifiedBookingBase>(
    options: BookingQueryOptions & {
      endpoint?: string;
      transform?: (data: any) => T;
    } = {}
  ): Promise<BookingApiResponse<T>> {
    try {
      const endpoint = options.endpoint || 'bookings';
      const params = this.buildQueryParams(options);
      const url = `${this.baseURL}/${endpoint}?${params}`;

      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        const errorData = await safeJsonParse<BookingError>(response, `${endpoint} fetch`);
        return {
          data: [],
          total: 0,
          success: false,
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const rawData = await safeJsonParse<any[]>(response, `${endpoint} data`);
      
      // Apply transformation if provided
      const transformedData = options.transform 
        ? rawData.map(options.transform) 
        : rawData as T[];

      // Extract total count from response headers if available
      const totalHeader = response.headers.get('X-Total-Count');
      const total = totalHeader ? parseInt(totalHeader, 10) : transformedData.length;

      return {
        data: transformedData,
        total,
        page: options.page,
        limit: options.limit,
        success: true,
      };
    } catch (error) {
      console.error(`Error fetching ${options.endpoint || 'bookings'}:`, error);
      return {
        data: [],
        total: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Customer App: Get customer's bookings
  async getCustomerBookings(customerId: string, options: Partial<BookingQueryOptions> = {}): Promise<BookingApiResponse<CustomerBooking>> {
    return this.getBookings<CustomerBooking>({
      ...options,
      customerId,
      includeProvider: true,
      includeBusiness: true,
      includeService: true,
      includeLocations: true,
      includeReviews: true,
      transform: (data: any) => ({
        ...data,
        display_name: this.getDisplayName(data, 'customer'),
        service_name: data.services?.name || 'Unknown Service',
        business_name: data.providers?.business_profiles?.business_name || 'Unknown Business',
        formatted_date: this.formatDate(data.booking_date),
        formatted_time: this.formatTime(data.start_time),
        formatted_duration: this.formatDuration(data.services?.duration_minutes || 60),
        formatted_price: this.formatPrice(data.total_amount),
        is_upcoming: new Date(data.booking_date + 'T' + data.start_time) > new Date(),
        is_past: new Date(data.booking_date + 'T' + data.start_time) < new Date(),
        is_today: data.booking_date === new Date().toISOString().split('T')[0],
        can_cancel: this.canCancel(data),
        can_reschedule: this.canReschedule(data),
        can_tip: this.canTip(data),
        needs_review: this.needsReview(data),
        needs_tip: this.needsTip(data),
        available_actions: this.getAvailableActions(data, 'customer'),
      }),
    });
  }

  // Provider App: Get provider's assigned bookings
  async getProviderBookings(providerId: string, options: Partial<BookingQueryOptions> = {}): Promise<BookingApiResponse<ProviderBooking>> {
    return this.getBookings<ProviderBooking>({
      ...options,
      providerId,
      includeCustomer: true,
      includeService: true,
      includeBusiness: true,
      includeLocations: true,
      transform: (data: any) => ({
        ...data,
        customer_display_name: this.getDisplayName(data, 'provider'),
        service_name: data.services?.name || 'Unknown Service',
        business_name: data.business_profiles?.business_name || 'Unknown Business',
        formatted_date: this.formatDate(data.booking_date),
        formatted_time: this.formatTime(data.start_time),
        formatted_duration: this.formatDuration(data.services?.duration_minutes || 60),
        provider_earnings: this.calculateProviderEarnings(data),
        estimated_earnings: this.calculateEstimatedEarnings(data),
        is_assigned_to_me: data.provider_id === providerId,
        is_upcoming: new Date(data.booking_date + 'T' + data.start_time) > new Date(),
        is_today: data.booking_date === new Date().toISOString().split('T')[0],
        is_overdue: this.isOverdue(data),
        requires_action: this.requiresAction(data),
        can_start: this.canStart(data),
        can_complete: this.canComplete(data),
        can_cancel: this.canCancel(data),
        can_reschedule: this.canReschedule(data),
        available_actions: this.getAvailableActions(data, 'provider'),
        unread_messages: 0, // TODO: Implement message counting
      }),
    });
  }

  // Business App: Get business bookings across all providers
  async getBusinessBookings(businessId: string, options: Partial<BookingQueryOptions> = {}): Promise<BookingApiResponse<ProviderBooking>> {
    return this.getBookings<ProviderBooking>({
      ...options,
      businessId,
      includeCustomer: true,
      includeProvider: true,
      includeService: true,
      includeLocations: true,
      transform: (data: any) => ({
        ...data,
        customer_display_name: this.getDisplayName(data, 'business'),
        service_name: data.services?.name || 'Unknown Service',
        business_name: data.business_profiles?.business_name || 'Unknown Business',
        formatted_date: this.formatDate(data.booking_date),
        formatted_time: this.formatTime(data.start_time),
        formatted_duration: this.formatDuration(data.services?.duration_minutes || 60),
        provider_earnings: this.calculateProviderEarnings(data),
        estimated_earnings: this.calculateEstimatedEarnings(data),
        is_assigned_to_me: false, // Business view doesn't assign to specific user
        is_upcoming: new Date(data.booking_date + 'T' + data.start_time) > new Date(),
        is_today: data.booking_date === new Date().toISOString().split('T')[0],
        is_overdue: this.isOverdue(data),
        requires_action: this.requiresAction(data),
        can_start: false, // Business owners don't start services directly
        can_complete: false,
        can_cancel: this.canCancel(data),
        can_reschedule: this.canReschedule(data),
        available_actions: this.getAvailableActions(data, 'business'),
        unread_messages: 0,
      }),
    });
  }

  // Admin App: Get all bookings with comprehensive data
  async getAllBookingsWithAnalytics(options: Partial<BookingQueryOptions> = {}): Promise<BookingApiResponse<AdminBooking>> {
    return this.getBookings<AdminBooking>({
      ...options,
      includeCustomer: true,
      includeProvider: true,
      includeBusiness: true,
      includeService: true,
      includeLocations: true,
      transform: (data: any) => ({
        ...data,
        customer_display_name: this.getDisplayName(data, 'admin'),
        provider_display_name: data.providers ? `${data.providers.first_name} ${data.providers.last_name}` : 'Unknown Provider',
        business_display_name: data.business_profiles?.business_name || 'Unknown Business',
        service_display_name: data.services?.name || 'Unknown Service',
        platform_revenue: this.calculatePlatformRevenue(data),
        provider_payout: this.calculateProviderEarnings(data),
        business_commission: this.calculateBusinessCommission(data),
        fee_breakdown: this.calculateFeeBreakdown(data),
        risk_score: this.calculateRiskScore(data),
        compliance_flags: this.getComplianceFlags(data),
        requires_review: this.requiresAdminReview(data),
        admin_actions: this.getAvailableActions(data, 'admin'),
        customer_booking_count: 0, // TODO: Add aggregated data
        provider_booking_count: 0,
        business_booking_count: 0,
        repeat_booking: false,
        customer_lifetime_value: 0,
        acquisition_channel: 'organic', // TODO: Track acquisition channels
      }),
    });
  }

  // Create a new booking
  async createBooking(bookingData: CustomerBookingRequest): Promise<BookingApiResponse<UnifiedBookingBase>> {
    try {
      // Validate booking data first
      const validation = await this.validateBooking(bookingData);
      if (!validation.is_valid) {
        return {
          data: [],
          total: 0,
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      const response = await this.fetchWithRetry(`${this.baseURL}/bookings`, {
        method: 'POST',
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await safeJsonParse<BookingError>(response, 'create booking');
        return {
          data: [],
          total: 0,
          success: false,
          error: errorData.message || `Failed to create booking`,
        };
      }

      const booking = await safeJsonParse<UnifiedBookingBase>(response, 'created booking');
      return {
        data: [booking],
        total: 1,
        success: true,
        message: 'Booking created successfully',
      };
    } catch (error) {
      console.error('Error creating booking:', error);
      return {
        data: [],
        total: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create booking',
      };
    }
  }

  // Update a booking
  async updateBooking(bookingId: string, updates: BookingUpdateData): Promise<BookingApiResponse<UnifiedBookingBase>> {
    try {
      const response = await this.fetchWithRetry(`${this.baseURL}/bookings/${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await safeJsonParse<BookingError>(response, 'update booking');
        return {
          data: [],
          total: 0,
          success: false,
          error: errorData.message || `Failed to update booking`,
        };
      }

      const booking = await safeJsonParse<UnifiedBookingBase>(response, 'updated booking');
      return {
        data: [booking],
        total: 1,
        success: true,
        message: 'Booking updated successfully',
      };
    } catch (error) {
      console.error('Error updating booking:', error);
      return {
        data: [],
        total: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update booking',
      };
    }
  }

  // Cancel a booking
  async cancelBooking(
    bookingId: string, 
    reason: string
  ): Promise<BookingApiResponse<UnifiedBookingBase>> {
    return this.updateBooking(bookingId, {
      booking_status: 'cancelled',
      cancellation_reason: reason,
    });
  }

  // Get booking statistics
  async getBookingStats(
    entityType: 'customer' | 'provider' | 'business' | 'platform',
    entityId?: string,
    dateRange?: { start: string; end: string }
  ): Promise<BookingApiResponse<BookingStats>> {
    try {
      const params = new URLSearchParams();
      params.set('type', entityType);
      if (entityId) params.set('entity_id', entityId);
      if (dateRange) {
        params.set('date_from', dateRange.start);
        params.set('date_to', dateRange.end);
      }

      const response = await this.fetchWithRetry(`${this.baseURL}/booking-stats?${params}`);

      if (!response.ok) {
        const errorData = await safeJsonParse<BookingError>(response, 'booking stats');
        return {
          data: [],
          total: 0,
          success: false,
          error: errorData.message || `Failed to fetch booking stats`,
        };
      }

      const stats = await safeJsonParse<BookingStats>(response, 'booking stats data');
      return {
        data: [stats],
        total: 1,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      return {
        data: [],
        total: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch booking stats',
      };
    }
  }

  // Validate booking data
  async validateBooking(bookingData: CustomerBookingRequest): Promise<BookingValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const conflicts = {
      provider_conflict: false,
      time_conflict: false,
      service_unavailable: false,
      location_conflict: false,
    };

    // Basic validation
    if (!bookingData.service_id) errors.push('Service ID is required');
    if (!bookingData.booking_date) errors.push('Booking date is required');
    if (!bookingData.start_time) errors.push('Start time is required');
    if (!bookingData.delivery_type) errors.push('Delivery type is required');

    // Date validation
    const bookingDateTime = new Date(bookingData.booking_date + 'T' + bookingData.start_time);
    if (bookingDateTime < new Date()) {
      errors.push('Cannot book in the past');
    }

    // TODO: Add more sophisticated validation (provider availability, service availability, etc.)

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      conflicts,
    };
  }

  // Helper methods for data transformation
  private getDisplayName(data: any, context: string): string {
    if (context === 'customer' || context === 'admin') {
      if (data.providers) {
        return `${data.providers.first_name} ${data.providers.last_name}`;
      }
    }
    if (context === 'provider' || context === 'business' || context === 'admin') {
      if (data.guest_name) return data.guest_name;
      if (data.customer_profiles) {
        return `${data.customer_profiles.first_name} ${data.customer_profiles.last_name}`;
      }
    }
    return 'Unknown';
  }

  private formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  private formatTime(time: string): string {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0 ? `${hours} hr` : `${hours} hr ${remainingMinutes} min`;
  }

  private formatPrice(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  private calculateProviderEarnings(data: any): number {
    // TODO: Implement proper earnings calculation based on business rules
    return data.total_amount * 0.8; // 80% to provider, 20% platform fee
  }

  private calculateEstimatedEarnings(data: any): number {
    return this.calculateProviderEarnings(data) + (data.tip_amount || 0);
  }

  private calculatePlatformRevenue(data: any): number {
    return data.total_amount * 0.2; // 20% platform fee
  }

  private calculateBusinessCommission(data: any): number {
    return data.total_amount * 0.1; // 10% business commission
  }

  private calculateFeeBreakdown(data: any) {
    const total = data.total_amount;
    const platformFee = total * 0.2;
    const processingFee = total * 0.029; // Typical payment processing fee
    const businessCommission = total * 0.1;
    const providerPayout = total - platformFee - processingFee;

    return {
      service_amount: total,
      platform_fee: platformFee,
      payment_processing_fee: processingFee,
      business_commission: businessCommission,
      provider_payout: providerPayout,
      tip_amount: data.tip_amount || 0,
      total_platform_revenue: platformFee + processingFee,
    };
  }

  private calculateRiskScore(data: any): number {
    // TODO: Implement risk scoring algorithm
    let score = 0;
    if (data.guest_name) score += 10; // Guest bookings are slightly riskier
    if (data.total_amount > 500) score += 20; // High-value bookings
    if (data.payment_status === 'failed') score += 50;
    return Math.min(score, 100);
  }

  private getComplianceFlags(data: any): string[] {
    const flags: string[] = [];
    if (data.total_amount > 1000) flags.push('high_value');
    if (data.guest_name && !data.guest_email) flags.push('incomplete_guest_info');
    if (data.payment_status === 'failed') flags.push('payment_issue');
    return flags;
  }

  // Business logic helpers
  private canCancel(data: any): boolean {
    return ['pending', 'confirmed'].includes(data.booking_status);
  }

  private canReschedule(data: any): boolean {
    return ['pending', 'confirmed'].includes(data.booking_status);
  }

  private canTip(data: any): boolean {
    return data.booking_status === 'completed' && data.tip_eligible && data.tip_status === 'none';
  }

  private canStart(data: any): boolean {
    return data.booking_status === 'confirmed' && data.booking_date === new Date().toISOString().split('T')[0];
  }

  private canComplete(data: any): boolean {
    return data.booking_status === 'in_progress';
  }

  private needsReview(data: any): boolean {
    return data.booking_status === 'completed' && !data.reviews?.length;
  }

  private needsTip(data: any): boolean {
    return this.canTip(data);
  }

  private isOverdue(data: any): boolean {
    const bookingTime = new Date(data.booking_date + 'T' + data.start_time);
    const now = new Date();
    return bookingTime < now && ['pending', 'confirmed'].includes(data.booking_status);
  }

  private requiresAction(data: any): boolean {
    return this.isOverdue(data) || data.booking_status === 'pending';
  }

  private requiresAdminReview(data: any): boolean {
    return this.calculateRiskScore(data) > 50 || this.getComplianceFlags(data).length > 0;
  }

  private getAvailableActions(data: any, context: string): string[] {
    const actions: string[] = [];
    
    if (context === 'customer') {
      if (this.canCancel(data)) actions.push('cancel');
      if (this.canReschedule(data)) actions.push('reschedule');
      if (this.canTip(data)) actions.push('tip');
      if (this.needsReview(data)) actions.push('review');
      actions.push('contact');
      if (data.delivery_type === 'customer_location') actions.push('directions');
    } else if (context === 'provider') {
      if (data.booking_status === 'pending') actions.push('accept', 'decline');
      if (this.canStart(data)) actions.push('start');
      if (this.canComplete(data)) actions.push('complete');
      if (this.canCancel(data)) actions.push('cancel');
      if (this.canReschedule(data)) actions.push('reschedule');
      actions.push('contact_customer', 'navigate');
    } else if (context === 'admin') {
      actions.push('approve', 'flag', 'refund', 'reassign', 'cancel', 'investigate');
      actions.push('contact_customer', 'contact_provider');
    }
    
    return actions;
  }
}