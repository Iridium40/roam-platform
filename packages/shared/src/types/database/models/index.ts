// Business logic models and form interfaces

// Review model interface
export interface Review {
  id: string;
  booking_id: string;
  overall_rating: number;
  service_rating?: number;
  communication_rating?: number;
  punctuality_rating?: number;
  review_text?: string;
  is_approved?: boolean;
  is_featured?: boolean;
  moderated_by?: string;
  moderated_at?: string;
  moderation_notes?: string;
  created_at: string;
  business_id?: string | null;
  provider_id?: string | null;
}

// Tip model interface
export interface Tip {
  id: string;
  booking_id: string;
  customer_id?: string;
  provider_id: string;
  business_id: string;
  tip_amount: number;
  tip_percentage?: number;
  stripe_payment_intent_id?: string;
  payment_status?: string;
  platform_fee_amount?: number;
  provider_net_amount: number;
  customer_message?: string;
  provider_response?: string;
  provider_responded_at?: string;
  tip_given_at: string;
  payment_processed_at?: string;
  payout_status?: string;
  payout_batch_id?: string;
  payout_date?: string;
  created_at: string;
  updated_at: string;
}

// Form data interfaces
export interface ReviewFormData {
  overall_rating: number;
  service_rating?: number;
  communication_rating?: number;
  punctuality_rating?: number;
  review_text?: string;
}

export interface TipFormData {
  tip_amount: number;
  tip_percentage?: number;
  customer_message?: string;
}