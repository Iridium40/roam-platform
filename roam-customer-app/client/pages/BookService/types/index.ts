export type BookingStep = 'datetime' | 'business' | 'provider' | 'delivery-location' | 'summary' | 'checkout';

export interface Promotion {
  id: string;
  promoCode: string;
  savingsType: 'percentage' | 'fixed_amount';
  savingsAmount: number;
  savingsMaxAmount?: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  min_price: number;
  duration_minutes: number;
  image_url?: string;
  delivery_type?: string;
}

export interface Business {
  id: string;
  business_name: string;
  description: string;
  image_url?: string;
  logo_url?: string;
  rating: number;
  review_count: number;
  delivery_types?: string[];
  business_type?: string;
  service_price?: number;
  service_duration_minutes?: number;
  business_hours?: any;
  city?: string;
  state?: string;
  postal_code?: string;
}

export interface BusinessLocation {
  id: string;
  location_name: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string | null;
  is_primary: boolean;
  is_active: boolean;
}

export interface CustomerLocation {
  id: string;
  customer_id: string;
  location_name: string;
  street_address: string;
  unit_number: string | null;
  city: string;
  state: string;
  zip_code: string;
  is_primary: boolean;
  is_active: boolean;
  location_type: string;
  created_at: string;
}

export interface Provider {
  id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  image_url?: string;
  rating: number;
  review_count: number;
  provider_role?: string;
}

export interface ServiceAddon {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_recommended: boolean;
  price: number;
}

export interface BookingState {
  // Step navigation
  currentStep: BookingStep;
  
  // Service data
  service: Service | null;
  
  // Date/time selection
  selectedDate: Date | undefined;
  selectedTime: string;
  
  // Business selection
  selectedBusiness: Business | null;
  businesses: Business[];
  
  // Provider selection
  selectedProvider: Provider | null;
  providers: Provider[];
  noProviderPreference: boolean;
  
  // Delivery & location
  selectedDeliveryType: string;
  businessLocations: BusinessLocation[];
  selectedBusinessLocation: BusinessLocation | null;
  customerLocations: CustomerLocation[];
  selectedCustomerLocation: CustomerLocation | null;
  
  // Add-ons
  selectedAddons: ServiceAddon[];
  availableAddons: ServiceAddon[];
  
  // Promotion
  promotion: Promotion | null;
  
  // Checkout
  clientSecret: string;
  paymentBreakdown: any;
  createdBookingId: string | null;
}
