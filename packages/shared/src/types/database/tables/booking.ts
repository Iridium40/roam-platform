import type {
  BookingStatus,
  PaymentStatus,
  TipStatus,
  DeliveryType,
  PromotionSavingsType,
} from '../enums';

// Bookings Table
export interface BookingsTable {
  Row: {
    id: string;
    customer_id: string | null;
    provider_id: string;
    service_id: string;
    booking_date: string;
    start_time: string;
    total_amount: number;
    created_at: string;
    service_fee: number;
    service_fee_charged: boolean;
    service_fee_charged_at: string | null;
    remaining_balance: number;
    remaining_balance_charged: boolean;
    remaining_balance_charged_at: string | null;
    cancellation_fee: number;
    refund_amount: number;
    cancelled_at: string | null;
    cancelled_by: string | null;
    cancellation_reason: string | null;
    guest_name: string | null;
    guest_email: string | null;
    guest_phone: string | null;
    customer_location_id: string | null;
    business_location_id: string | null;
    delivery_type: DeliveryType;
    payment_status: PaymentStatus;
    booking_status: BookingStatus;
    admin_notes: string | null;
    tip_eligible: boolean;
    tip_amount: number;
    tip_status: TipStatus;
    tip_requested_at: string | null;
    tip_deadline: string | null;
    booking_reference: string | null;
    business_id: string;
    decline_reason: string | null;
    rescheduled_at: string | null;
    rescheduled_by: string | null;
    reschedule_reason: string | null;
    original_booking_date: string | null;
    original_start_time: string | null;
    reschedule_count: number;
  };
  Insert: {
    id?: string;
    customer_id?: string | null;
    provider_id: string;
    service_id: string;
    booking_date: string;
    start_time: string;
    total_amount: number;
    created_at?: string;
    service_fee?: number;
    service_fee_charged?: boolean;
    service_fee_charged_at?: string | null;
    remaining_balance?: number;
    remaining_balance_charged?: boolean;
    remaining_balance_charged_at?: string | null;
    cancellation_fee?: number;
    refund_amount?: number;
    cancelled_at?: string | null;
    cancelled_by?: string | null;
    cancellation_reason?: string | null;
    guest_name?: string | null;
    guest_email?: string | null;
    guest_phone?: string | null;
    customer_location_id?: string | null;
    business_location_id?: string | null;
    delivery_type?: DeliveryType;
    payment_status?: PaymentStatus;
    booking_status?: BookingStatus;
    admin_notes?: string | null;
    tip_eligible?: boolean;
    tip_amount?: number;
    tip_status?: TipStatus;
    tip_requested_at?: string | null;
    tip_deadline?: string | null;
    booking_reference?: string | null;
    business_id: string;
    decline_reason?: string | null;
    rescheduled_at?: string | null;
    rescheduled_by?: string | null;
    reschedule_reason?: string | null;
    original_booking_date?: string | null;
    original_start_time?: string | null;
    reschedule_count?: number;
  };
  Update: {
    id?: string;
    customer_id?: string | null;
    provider_id?: string;
    service_id?: string;
    booking_date?: string;
    start_time?: string;
    total_amount?: number;
    created_at?: string;
    service_fee?: number;
    service_fee_charged?: boolean;
    service_fee_charged_at?: string | null;
    remaining_balance?: number;
    remaining_balance_charged?: boolean;
    remaining_balance_charged_at?: string | null;
    cancellation_fee?: number;
    refund_amount?: number;
    cancelled_at?: string | null;
    cancelled_by?: string | null;
    cancellation_reason?: string | null;
    guest_name?: string | null;
    guest_email?: string | null;
    guest_phone?: string | null;
    customer_location_id?: string | null;
    business_location_id?: string | null;
    delivery_type?: DeliveryType;
    payment_status?: PaymentStatus;
    booking_status?: BookingStatus;
    admin_notes?: string | null;
    tip_eligible?: boolean;
    tip_amount?: number;
    tip_status?: TipStatus;
    tip_requested_at?: string | null;
    tip_deadline?: string | null;
    booking_reference?: string | null;
    business_id?: string;
    decline_reason?: string | null;
    rescheduled_at?: string | null;
    rescheduled_by?: string | null;
    reschedule_reason?: string | null;
    original_booking_date?: string | null;
    original_start_time?: string | null;
    reschedule_count?: number;
  };
}

// Promotions Table
export interface PromotionsTable {
  Row: {
    id: string;
    business_id: string | null;
    promotion_code: string;
    promotion_name: string;
    description: string | null;
    savings_type: PromotionSavingsType;
    savings_amount: number;
    minimum_order_amount: number | null;
    maximum_discount_amount: number | null;
    start_date: string;
    end_date: string;
    usage_limit: number | null;
    usage_count: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    applicable_services: string[] | null;
    customer_eligibility: string | null;
    first_time_customer_only: boolean;
  };
  Insert: {
    id?: string;
    business_id?: string | null;
    promotion_code: string;
    promotion_name: string;
    description?: string | null;
    savings_type: PromotionSavingsType;
    savings_amount: number;
    minimum_order_amount?: number | null;
    maximum_discount_amount?: number | null;
    start_date: string;
    end_date: string;
    usage_limit?: number | null;
    usage_count?: number;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
    applicable_services?: string[] | null;
    customer_eligibility?: string | null;
    first_time_customer_only?: boolean;
  };
  Update: {
    id?: string;
    business_id?: string | null;
    promotion_code?: string;
    promotion_name?: string;
    description?: string | null;
    savings_type?: PromotionSavingsType;
    savings_amount?: number;
    minimum_order_amount?: number | null;
    maximum_discount_amount?: number | null;
    start_date?: string;
    end_date?: string;
    usage_limit?: number | null;
    usage_count?: number;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
    applicable_services?: string[] | null;
    customer_eligibility?: string | null;
    first_time_customer_only?: boolean;
  };
}

// Promotion Usage Table
export interface PromotionUsageTable {
  Row: {
    id: string;
    promotion_id: string;
    booking_id: string;
    customer_id: string | null;
    discount_amount: number;
    used_at: string;
    created_at: string;
  };
  Insert: {
    id?: string;
    promotion_id: string;
    booking_id: string;
    customer_id?: string | null;
    discount_amount: number;
    used_at?: string;
    created_at?: string;
  };
  Update: {
    id?: string;
    promotion_id?: string;
    booking_id?: string;
    customer_id?: string | null;
    discount_amount?: number;
    used_at?: string;
    created_at?: string;
  };
}

// Reviews Table
export interface ReviewsTable {
  Row: {
    id: string;
    booking_id: string;
    overall_rating: number;
    service_rating: number | null;
    communication_rating: number | null;
    punctuality_rating: number | null;
    review_text: string | null;
    is_approved: boolean;
    is_featured: boolean;
    moderated_by: string | null;
    moderated_at: string | null;
    moderation_notes: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    booking_id: string;
    overall_rating: number;
    service_rating?: number | null;
    communication_rating?: number | null;
    punctuality_rating?: number | null;
    review_text?: string | null;
    is_approved?: boolean;
    is_featured?: boolean;
    moderated_by?: string | null;
    moderated_at?: string | null;
    moderation_notes?: string | null;
    created_at?: string;
  };
  Update: {
    id?: string;
    booking_id?: string;
    overall_rating?: number;
    service_rating?: number | null;
    communication_rating?: number | null;
    punctuality_rating?: number | null;
    review_text?: string | null;
    is_approved?: boolean;
    is_featured?: boolean;
    moderated_by?: string | null;
    moderated_at?: string | null;
    moderation_notes?: string | null;
    created_at?: string;
  };
}

// Type exports for convenience
export type Booking = BookingsTable['Row'];
export type Promotion = PromotionsTable['Row'];
export type PromotionUsage = PromotionUsageTable['Row'];
export type Review = ReviewsTable['Row'];