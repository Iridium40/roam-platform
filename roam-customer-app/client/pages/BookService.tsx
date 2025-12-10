import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar as CalendarIcon, Clock, Building, User, CreditCard, Tag, ChevronDown, Info, ExternalLink, MapPin, Star, Smartphone, Video, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../lib/stripe-client';
import { CheckoutForm } from '../components/CheckoutForm';
import { getDeliveryTypeLabel, getDeliveryTypeIcon } from '@/utils/deliveryTypeHelpers';
import { CustomerAuthModal } from '@/components/CustomerAuthModal';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import { Footer } from '@/components/Footer';

type BookingStep = 'datetime' | 'business' | 'provider' | 'delivery-location' | 'summary' | 'checkout';

interface Promotion {
  id: string;
  promoCode: string;
  savingsType: 'percentage' | 'fixed_amount';
  savingsAmount: number;
  savingsMaxAmount?: number;
}

interface Service {
  id: string;
  name: string;
  description: string;
  min_price: number;
  duration_minutes: number;
  image_url?: string;
}

interface Business {
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
  // Location data from business_locations
  city?: string;
  state?: string;
  postal_code?: string;
}

interface BusinessLocation {
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

interface CustomerLocation {
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

// Helper functions for delivery types
const getDeliveryTypes = (business: Business): string[] => {
  // Safety check: ensure delivery_types is an array
  if (business.delivery_types) {
    // If it's already an array, use it
    if (Array.isArray(business.delivery_types)) {
      return business.delivery_types;
    }
    // If it's an object or string, try to handle it gracefully
    console.warn('delivery_types is not an array:', business.delivery_types);
  }

  // Otherwise, determine based on business type/name (intelligent defaults)
  const businessName = business.business_name.toLowerCase();
  const description = business.description?.toLowerCase() || '';

  // Mobile services (likely to travel to customers)
  if (businessName.includes('mobile') ||
      businessName.includes('home') ||
      businessName.includes('house') ||
      description.includes('mobile') ||
      description.includes('your location') ||
      description.includes('on-site')) {
    return ['customer_location', 'business_location'];
  }

  // Virtual services (online consultations, therapy, etc.)
  if (businessName.includes('virtual') ||
      businessName.includes('online') ||
      businessName.includes('telehealth') ||
      businessName.includes('consultation') ||
      description.includes('virtual') ||
      description.includes('video call')) {
    return ['virtual', 'business_location'];
  }

  // Default: most businesses offer services at their location
  // Some also offer mobile services
  return ['business_location', 'customer_location'];
};

// Note: getDeliveryTypeLabel and getDeliveryTypeIcon are now imported from utils/deliveryTypeHelpers.tsx



// Business sorting and filtering logic
const sortAndFilterBusinesses = (businesses: Business[], sortBy: string, sortOrder: string): Business[] => {
  try {
    console.log('🔄 Sorting businesses:', { count: businesses.length, sortBy, sortOrder });

    const sorted = [...businesses].sort((a, b) => {
      try {
        switch (sortBy) {
          case 'price':
            const priceA = a.service_price || 0;
            const priceB = b.service_price || 0;
            return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;

          case 'rating':
            return sortOrder === 'asc' ? a.rating - b.rating : b.rating - a.rating;

          case 'delivery_type':
            // Sort by delivery type priority: customer_location -> business_location -> virtual
            const deliveryPriority = { customer_location: 1, business_location: 2, virtual: 3, both_locations: 4 };
            const primaryDeliveryA = getDeliveryTypes(a)[0] || 'business_location';
            const primaryDeliveryB = getDeliveryTypes(b)[0] || 'business_location';
            const priorityA = deliveryPriority[primaryDeliveryA as keyof typeof deliveryPriority] || 999;
            const priorityB = deliveryPriority[primaryDeliveryB as keyof typeof deliveryPriority] || 999;
            return sortOrder === 'asc' ? priorityA - priorityB : priorityB - priorityA;

          default:
            return 0;
        }
      } catch (sortError) {
        console.error('Error in individual sort comparison:', sortError);
        return 0;
      }
    });

    console.log('✅ Sorting completed successfully');
    return sorted;
  } catch (error) {
    console.error('❌ Error in sortAndFilterBusinesses:', error);
    return businesses; // Return original array if sorting fails
  }
};

interface Provider {
  id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  image_url?: string;
  rating: number;
  review_count: number;
  provider_role?: string;
}

export default function BookService() {
  const { serviceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { customer } = useAuth();
  const { toast } = useToast();
  
  // URL parameters for business-specific booking and promotions
  const businessId = searchParams.get('business_id');
  const providerId = searchParams.get('provider_id');
  const promotionId = searchParams.get('promotion');
  const promoCode = searchParams.get('promo_code');
  
  const [currentStep, setCurrentStep] = useState<BookingStep>('datetime');
  const [service, setService] = useState<Service | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  
  // Booking data
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [noProviderPreference, setNoProviderPreference] = useState(false);
  
  // Delivery type and location selection
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<string>('');
  const [businessLocations, setBusinessLocations] = useState<BusinessLocation[]>([]);
  const [selectedBusinessLocation, setSelectedBusinessLocation] = useState<BusinessLocation | null>(null);
  const [customerLocations, setCustomerLocations] = useState<CustomerLocation[]>([]);
  const [selectedCustomerLocation, setSelectedCustomerLocation] = useState<CustomerLocation | null>(null);
  const [newCustomerLocation, setNewCustomerLocation] = useState({
    location_name: '',
    street_address: '',
    unit_number: '',
    city: '',
    state: '',
    zip_code: '',
    is_primary: false,
    location_type: 'Home' as 'Home' | 'Condo' | 'Hotel' | 'Other'
  });

  // Business sorting and filtering
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'delivery_type'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]); // Store all businesses
  const [filteredAndSortedBusinesses, setFilteredAndSortedBusinesses] = useState<Business[]>([]); // Display these

  // Platform fee configuration
  const [platformFeePercentage, setPlatformFeePercentage] = useState<number>(0);

  // Checkout state
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentBreakdown, setPaymentBreakdown] = useState<any>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [saveLocationForFuture, setSaveLocationForFuture] = useState(true); // Default to true to save locations
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  
  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(false);
  
  // Exit confirmation state
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  
  // Guest booking state
  const [isBookingForGuest, setIsBookingForGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Calculate total amount for booking (including any promotions)
  const calculateTotalAmount = (): number => {
    if (!service || !selectedBusiness) return 0;
    
    // Use business service price if available, otherwise fall back to service min_price
    let basePrice = selectedBusiness.service_price || service.min_price || 0;
    
    // Apply promotion discount if available
    if (promotion) {
      if (promotion.savingsType === 'percentage') {
        const discountAmount = basePrice * (promotion.savingsAmount / 100);
        const maxDiscount = promotion.savingsMaxAmount || discountAmount;
        basePrice = Math.max(0, basePrice - Math.min(discountAmount, maxDiscount));
      } else if (promotion.savingsType === 'fixed_amount') {
        basePrice = Math.max(0, basePrice - promotion.savingsAmount);
      }
    }
    
    return basePrice;
  };

  // Time slots data
  const timeSlots = [
    { value: '09:00', label: '9:00 AM', period: 'Morning' },
    { value: '09:30', label: '9:30 AM', period: 'Morning' },
    { value: '10:00', label: '10:00 AM', period: 'Morning' },
    { value: '10:30', label: '10:30 AM', period: 'Morning' },
    { value: '11:00', label: '11:00 AM', period: 'Morning' },
    { value: '11:30', label: '11:30 AM', period: 'Morning' },
    { value: '12:00', label: '12:00 PM', period: 'Afternoon' },
    { value: '12:30', label: '12:30 PM', period: 'Afternoon' },
    { value: '13:00', label: '1:00 PM', period: 'Afternoon' },
    { value: '13:30', label: '1:30 PM', period: 'Afternoon' },
    { value: '14:00', label: '2:00 PM', period: 'Afternoon' },
    { value: '14:30', label: '2:30 PM', period: 'Afternoon' },
    { value: '15:00', label: '3:00 PM', period: 'Afternoon' },
    { value: '15:30', label: '3:30 PM', period: 'Afternoon' },
    { value: '16:00', label: '4:00 PM', period: 'Afternoon' },
    { value: '16:30', label: '4:30 PM', period: 'Afternoon' },
    { value: '17:00', label: '5:00 PM', period: 'Evening' },
    { value: '17:30', label: '5:30 PM', period: 'Evening' },
    { value: '18:00', label: '6:00 PM', period: 'Evening' },
    { value: '18:30', label: '6:30 PM', period: 'Evening' },
  ];

  // Group time slots by period
  const groupedTimeSlots = timeSlots.reduce((acc, slot) => {
    if (!acc[slot.period]) {
      acc[slot.period] = [];
    }
    acc[slot.period].push(slot);
    return acc;
  }, {} as Record<string, typeof timeSlots>);

  // Auto-proceed with checkout after successful login
  useEffect(() => {
    if (customer && pendingCheckout) {
      setPendingCheckout(false);
      setShowAuthModal(false);
      // Small delay to ensure modal closes before checkout
      setTimeout(() => {
        handleCheckout();
      }, 300);
    }
  }, [customer, pendingCheckout]);

  // Load service details and promotion if applicable
  useEffect(() => {
    const loadServiceAndPromotion = async () => {
      if (!serviceId) return;
      
      try {
        // Load service details
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .single();

        if (serviceError) throw serviceError;
        setService(serviceData);

        // Load promotion if promotionId is provided
        if (promotionId) {
          const { data: promotionData, error: promotionError } = await supabase
            .from('promotions')
            .select('*')
            .eq('id', promotionId)
            .single();

          if (!promotionError && promotionData) {
            setPromotion({
              id: promotionData.id,
              promoCode: promotionData.promo_code,
              savingsType: promotionData.savings_type,
              savingsAmount: promotionData.savings_amount,
              savingsMaxAmount: promotionData.savings_max_amount,
            });
          }
        }

        // If businessId is provided, load that specific business and skip business selection
        if (businessId) {
          const { data: businessData, error: businessError } = await supabase
            .from('business_profiles')
            .select('id, business_name, business_description, image_url, logo_url, business_type')
            .eq('id', businessId)
            .single();

          if (!businessError && businessData) {
            // Fetch actual rating for this business
            const { data: businessReviews } = await supabase
              .from('reviews')
              .select('overall_rating')
              .eq('business_id', businessData.id)
              .eq('is_approved', true);
            
            let businessRating = 0;
            let businessReviewCount = 0;
            if (businessReviews && businessReviews.length > 0) {
              businessReviewCount = businessReviews.length;
              const totalRating = businessReviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0);
              businessRating = totalRating / businessReviewCount;
            }

            const business = {
              id: businessData.id,
              business_name: businessData.business_name,
              description: businessData.business_description || businessData.description,
              image_url: businessData.image_url,
              logo_url: businessData.logo_url,
              business_type: businessData.business_type,
              rating: businessRating,
              review_count: businessReviewCount,
            };
            setSelectedBusiness(business);
            setBusinesses([business]); // Only show this business
          }
        }
      } catch (error) {
        console.error('Error loading service:', error);
      } finally {
        setLoading(false);
      }
    };

    loadServiceAndPromotion();
  }, [serviceId, promotionId, businessId, toast]);

  // Re-sort businesses when sorting options change
  useEffect(() => {
    if (allBusinesses.length > 0) {
      const sorted = sortAndFilterBusinesses(allBusinesses, sortBy, sortOrder);
      setFilteredAndSortedBusinesses(sorted);
    }
  }, [sortBy, sortOrder, allBusinesses]);

  // Fetch platform fee configuration
  useEffect(() => {
    const fetchPlatformFee = async () => {
      try {
        console.log('💰 Fetching platform fee configuration...');
        const { data, error } = await supabase
          .from('system_config')
          .select('config_value')
          .eq('config_key', 'platform_fee_percentage')
          .single();

        if (error) {
          console.error('Error fetching platform fee:', error);
          // Default to 0% if config not found
          setPlatformFeePercentage(0);
          return;
        }

        const feePercentage = parseFloat(data.config_value) || 0;
        console.log('💰 Platform fee percentage loaded:', feePercentage + '%');
        setPlatformFeePercentage(feePercentage);
      } catch (error) {
        console.error('Error fetching platform fee configuration:', error);
        setPlatformFeePercentage(0);
      }
    };

    fetchPlatformFee();
  }, []);

  // Load locations when delivery type is selected
  useEffect(() => {
    if (currentStep === 'delivery-location' && selectedDeliveryType) {
      if (selectedDeliveryType === 'customer_location' && customerLocations.length === 0) {
        loadCustomerLocations();
      } else if (selectedDeliveryType === 'business_location' && businessLocations.length === 0 && selectedBusiness) {
        loadBusinessLocations(selectedBusiness.id);
      }
    }
  }, [selectedDeliveryType]);

  // Load businesses that offer this service with pricing and availability validation
  const loadBusinesses = async () => {
    console.log('🏢 loadBusinesses called with:', {
      serviceId,
      selectedDate,
      selectedTime: selectedTime,
      selectedDateType: typeof selectedDate,
      selectedDateValid: selectedDate instanceof Date,
      selectedTimeType: typeof selectedTime
    });

    if (!serviceId) {
      console.log('❌ Missing serviceId');
      return;
    }

    if (!selectedDate) {
      console.log('❌ Missing selectedDate');
      return;
    }

    if (!selectedTime) {
      console.log('❌ Missing selectedTime');
      return;
    }

    setCheckoutLoading(true);

    try {
      console.log('📋 Fetching service details...');
      // Get the service details first
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('id, name, subcategory_id')
        .eq('id', serviceId)
        .single();

      console.log('📋 Service query result:', { serviceData, serviceError });

      if (serviceError) throw serviceError;

      if (!serviceData) {
        setAllBusinesses([]);
        setFilteredAndSortedBusinesses([]);
        return;
      }

      console.log('🏪 Fetching business services with pricing...');

      // First, try a simple query to see if business_services table exists
      console.log('🔍 Testing business_services table access...');
      const { data: testBusinessServices, error: testError } = await supabase
        .from('business_services')
        .select('business_id, service_id, business_price, is_active')
        .eq('service_id', serviceId)
        .limit(5);

      console.log('🔍 Test query result:', { testBusinessServices, testError });

      if (testError) {
        console.log('❌ business_services table query failed, using fallback approach');
        throw new Error(`business_services query failed: ${testError.message}`);
      }

      // If test query works, try the full query
      const { data: businessServiceData, error: businessServiceError } = await supabase
        .from('business_services')
        .select(`
          business_id,
          business_price,
          business_duration_minutes,
          delivery_type,
          is_active,
          business_profiles (
            id,
            business_name,
            business_description,
            image_url,
            logo_url,
            business_type,
            business_hours,
            is_active,
            business_locations!inner (
              city,
              state,
              postal_code,
              is_primary
            )
          )
        `)
        .eq('service_id', serviceId)
        .eq('is_active', true);

      console.log('🏪 Business services query result:', {
        businessServiceData,
        businessServiceError,
        count: businessServiceData?.length
      });

      if (businessServiceError) throw businessServiceError;

      if (!businessServiceData || businessServiceData.length === 0) {
        console.log('⚠️ No business services found, trying fallback approach...');

        // Fallback: try to get businesses directly and assume they offer the service
        try {
          const { data: fallbackBusinesses, error: fallbackError } = await supabase
            .from('business_profiles')
            .select(`
              id, 
              business_name, 
              business_description, 
              image_url, 
              logo_url, 
              business_type, 
              business_hours, 
              is_active,
              business_locations!inner (
                city,
                state,
                postal_code,
                is_primary
              )
            `)
            .eq('is_active', true)
            .limit(10);

          console.log('🔄 Fallback business query:', { fallbackBusinesses, fallbackError });

          if (fallbackError) throw fallbackError;

          if (fallbackBusinesses && fallbackBusinesses.length > 0) {
            // Fetch ratings for fallback businesses
            const fallbackBusinessIds = fallbackBusinesses.map(b => b.id);
            const { data: fallbackReviewsData } = await supabase
              .from('reviews')
              .select('business_id, overall_rating')
              .in('business_id', fallbackBusinessIds)
              .eq('is_approved', true);
            
            const fallbackBusinessRatings: Record<string, { total: number; count: number }> = {};
            if (fallbackReviewsData) {
              fallbackReviewsData.forEach(review => {
                if (review.business_id) {
                  if (!fallbackBusinessRatings[review.business_id]) {
                    fallbackBusinessRatings[review.business_id] = { total: 0, count: 0 };
                  }
                  fallbackBusinessRatings[review.business_id].total += review.overall_rating || 0;
                  fallbackBusinessRatings[review.business_id].count += 1;
                }
              });
            }

            // Transform fallback data with actual ratings
            const transformedFallback = fallbackBusinesses.map(business => {
              const locations = business.business_locations || [];
              const primaryLocation = locations.find(loc => loc.is_primary) || locations[0];
              
              const ratingData = fallbackBusinessRatings[business.id];
              const rating = ratingData && ratingData.count > 0 
                ? ratingData.total / ratingData.count 
                : 0;
              const reviewCount = ratingData?.count || 0;
              
              return {
                id: business.id,
                business_name: business.business_name,
                description: business.business_description || '',
                image_url: business.image_url,
                logo_url: business.logo_url,
                business_type: business.business_type,
                service_price: service?.min_price || 100, // Use service default price
                business_hours: business.business_hours,
                rating: rating,
                review_count: reviewCount,
                city: primaryLocation?.city,
                state: primaryLocation?.state,
                postal_code: primaryLocation?.postal_code,
              };
            });

            console.log('🔄 Using fallback businesses:', transformedFallback.length);
            setAllBusinesses(transformedFallback);
            const sorted = sortAndFilterBusinesses(transformedFallback, sortBy, sortOrder);
            setFilteredAndSortedBusinesses(sorted);
            return;
          }
        } catch (fallbackError) {
          console.error('❌ Fallback query also failed:', fallbackError);
        }

        setAllBusinesses([]);
        setFilteredAndSortedBusinesses([]);
        return;
      }

      // Filter businesses that are available at selected date/time
      const availableBusinesses = businessServiceData.filter(item => {
        const business = item.business_profiles;
        if (!business || !business.is_active) return false;

        // TODO: Add proper business hours validation here
        // For now, assume all businesses are available at selected time
        // This would check if selectedDate/selectedTime falls within business hours
        return true;
      });

      // Fetch ratings for each business from reviews table
      const businessIds = availableBusinesses.map(item => item.business_profiles.id);
      
      const { data: businessReviewsData } = await supabase
        .from('reviews')
        .select('business_id, overall_rating')
        .in('business_id', businessIds)
        .eq('is_approved', true);
      
      // Calculate ratings per business
      const businessRatings: Record<string, { total: number; count: number }> = {};
      if (businessReviewsData) {
        businessReviewsData.forEach(review => {
          if (review.business_id) {
            if (!businessRatings[review.business_id]) {
              businessRatings[review.business_id] = { total: 0, count: 0 };
            }
            businessRatings[review.business_id].total += review.overall_rating || 0;
            businessRatings[review.business_id].count += 1;
          }
        });
      }

      // Transform data to match Business interface with actual ratings
      const transformedBusinesses = availableBusinesses.map(item => {
        // Get primary location data
        const locations = item.business_profiles.business_locations || [];
        const primaryLocation = locations.find(loc => loc.is_primary) || locations[0];
        
        // Get actual rating data
        const ratingData = businessRatings[item.business_profiles.id];
        const rating = ratingData && ratingData.count > 0 
          ? ratingData.total / ratingData.count 
          : 0;
        const reviewCount = ratingData?.count || 0;
        
        // Map delivery_type to delivery_types array
        let deliveryTypes: string[] = [];
        if (item.delivery_type) {
          if (item.delivery_type === 'both' || item.delivery_type === 'both_locations') {
            deliveryTypes = ['business_location', 'customer_location'];
          } else {
            deliveryTypes = [item.delivery_type];
          }
        }
        
        return {
          id: item.business_profiles.id,
          business_name: item.business_profiles.business_name,
          description: item.business_profiles.business_description || '',
          image_url: item.business_profiles.image_url,
          logo_url: item.business_profiles.logo_url,
          business_type: item.business_profiles.business_type,
          service_price: item.business_price || service?.min_price || 0,
          service_duration_minutes: item.business_duration_minutes || service?.duration_minutes || 60,
          business_hours: item.business_profiles.business_hours,
          rating: rating,
          review_count: reviewCount,
          delivery_types: deliveryTypes,
          // Location data from primary business location
          city: primaryLocation?.city,
          state: primaryLocation?.state,
          postal_code: primaryLocation?.postal_code,
        };
      });

      console.log('Loaded businesses with pricing:', transformedBusinesses.map(b => ({
        name: b.business_name,
        price: b.service_price,
        originalBusinessPrice: availableBusinesses.find(item => item.business_profiles.id === b.id)?.business_price
      })));

      setAllBusinesses(transformedBusinesses);

      // Apply initial sorting
      const sortedBusinesses = sortAndFilterBusinesses(transformedBusinesses, sortBy, sortOrder);
      setFilteredAndSortedBusinesses(sortedBusinesses);

    } catch (error) {
      console.error('Error loading businesses - Full error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));

      let errorMessage = "Unknown error occurred";
      if (error) {
        if (typeof error === "string") {
          errorMessage = error;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.error_description) {
          errorMessage = error.error_description;
        } else if (error.details) {
          errorMessage = error.details;
        } else if (error.hint) {
          errorMessage = error.hint;
        } else if (error.code) {
          errorMessage = `Database error (${error.code})`;
        } else {
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = "Unable to parse error details";
          }
        }
      }

      console.error('Parsed error message:', errorMessage);

      // If this is a database schema issue, log it
      if (errorMessage.includes('business_services') || errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        console.warn('Database schema issue detected - using simplified business loading');

        // Try one more simplified approach
        try {
          console.log('🔄 Attempting simplified business loading...');
          const { data: simpleBusinesses, error: simpleError } = await supabase
            .from('business_profiles')
            .select(`
              id, 
              business_name, 
              business_description, 
              image_url, 
              logo_url, 
              business_type, 
              is_active,
              business_locations (
                city,
                state,
                postal_code,
                is_primary
              )
            `)
            .eq('is_active', true)
            .limit(5);

          if (!simpleError && simpleBusinesses) {
            // Fetch ratings for simplified businesses
            const simpleBusinessIds = simpleBusinesses.map(b => b.id);
            const { data: simpleReviewsData } = await supabase
              .from('reviews')
              .select('business_id, overall_rating')
              .in('business_id', simpleBusinessIds)
              .eq('is_approved', true);
            
            const simpleBusinessRatings: Record<string, { total: number; count: number }> = {};
            if (simpleReviewsData) {
              simpleReviewsData.forEach(review => {
                if (review.business_id) {
                  if (!simpleBusinessRatings[review.business_id]) {
                    simpleBusinessRatings[review.business_id] = { total: 0, count: 0 };
                  }
                  simpleBusinessRatings[review.business_id].total += review.overall_rating || 0;
                  simpleBusinessRatings[review.business_id].count += 1;
                }
              });
            }

            const transformedSimple = simpleBusinesses.map(business => {
              const locations = business.business_locations || [];
              const primaryLocation = locations.find(loc => loc.is_primary) || locations[0];
              
              const ratingData = simpleBusinessRatings[business.id];
              const rating = ratingData && ratingData.count > 0 
                ? ratingData.total / ratingData.count 
                : 0;
              const reviewCount = ratingData?.count || 0;
              
              return {
                id: business.id,
                business_name: business.business_name,
                description: business.business_description || '',
                image_url: business.image_url,
                logo_url: business.logo_url,
                business_type: business.business_type,
                service_price: service?.min_price || 100,
                rating: rating,
                review_count: reviewCount,
                city: primaryLocation?.city,
                state: primaryLocation?.state,
                postal_code: primaryLocation?.postal_code,
              };
            });

            setAllBusinesses(transformedSimple);
            const sorted = sortAndFilterBusinesses(transformedSimple, sortBy, sortOrder);
            setFilteredAndSortedBusinesses(sorted);

            return;
          }
        } catch (fallbackError) {
          console.error('❌ Even simplified query failed:', fallbackError);
        }
      }

      console.error('Error loading businesses:', errorMessage);
    }
  };

  // Load providers from selected business with role-based filtering
  const loadProviders = async (businessId: string) => {
    try {
      // Get all providers for this business first
      const { data, error } = await supabase
        .from('providers')
        .select('id, user_id, first_name, last_name, image_url, provider_role')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .eq('active_for_bookings', true);

      if (error) throw error;

      // Apply filtering logic based on business type and provider role
      let filteredProviders = data || [];

      console.log('Provider filtering debug:', {
        businessType: selectedBusiness?.business_type,
        businessName: selectedBusiness?.business_name,
        allProviders: data?.map(p => ({ name: `${p.first_name} ${p.last_name}`, role: p.provider_role })),
        totalCount: data?.length
      });

      if (selectedBusiness?.business_type) {
        if (selectedBusiness.business_type === 'individual') {
          // For individual businesses, only show owners
          filteredProviders = filteredProviders.filter(provider =>
            provider.provider_role === 'owner'
          );
          console.log('Filtered for individual business (owners only):', filteredProviders.length);
        } else {
          // For non-individual businesses (agency), show both owners and providers
          // All are already filtered by active_for_bookings = true
          filteredProviders = filteredProviders.filter(provider =>
            provider.provider_role === 'owner' || provider.provider_role === 'provider'
          );
          console.log('Filtered for non-individual business (owners and providers):', filteredProviders.length);
        }
      } else {
        console.log('No business type available, showing all providers');
      }

      // Fetch ratings for each provider from reviews table
      const providerIds = filteredProviders.map(p => p.id);
      
      // Get all reviews for these providers
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('provider_id, overall_rating')
        .in('provider_id', providerIds)
        .eq('is_approved', true);
      
      // Calculate ratings per provider
      const providerRatings: Record<string, { total: number; count: number }> = {};
      if (reviewsData) {
        reviewsData.forEach(review => {
          if (review.provider_id) {
            if (!providerRatings[review.provider_id]) {
              providerRatings[review.provider_id] = { total: 0, count: 0 };
            }
            providerRatings[review.provider_id].total += review.overall_rating || 0;
            providerRatings[review.provider_id].count += 1;
          }
        });
      }

      // Transform data to match Provider interface with actual ratings
      const providerData = filteredProviders.map(provider => {
        const ratingData = providerRatings[provider.id];
        const rating = ratingData && ratingData.count > 0 
          ? ratingData.total / ratingData.count 
          : 0;
        const reviewCount = ratingData?.count || 0;
        
        return {
          id: provider.id,
          user_id: provider.user_id,
          first_name: provider.first_name,
          last_name: provider.last_name,
          image_url: provider.image_url,
          provider_role: provider.provider_role,
          rating: rating,
          review_count: reviewCount,
        };
      });

      setProviders(providerData);

      // Auto-select provider if provider_id is provided in URL
      if (providerId) {
        const preSelectedProvider = providerData.find(p => p.user_id === providerId);
        if (preSelectedProvider) {
          console.log('Auto-selecting provider from URL:', preSelectedProvider);
          setSelectedProvider(preSelectedProvider);
        }
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  // Load business locations
  const loadBusinessLocations = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('business_locations')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });

      if (error) throw error;

      const locations = data || [];
      setBusinessLocations(locations);

      // Auto-select if only one location
      if (locations.length === 1) {
        setSelectedBusinessLocation(locations[0]);
      } else if (locations.length > 0) {
        // Auto-select primary location
        const primaryLocation = locations.find(loc => loc.is_primary);
        if (primaryLocation) {
          setSelectedBusinessLocation(primaryLocation);
        }
      }
    } catch (error) {
      console.error('Error loading business locations:', error);
    }
  };

  // Load customer locations
  const loadCustomerLocations = async () => {
    if (!customer) return;

    try {
      const { data, error } = await supabase
        .from('customer_locations')
        .select('*')
        .eq('customer_id', customer.user_id)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });

      if (error) throw error;

      const locations = data || [];
      setCustomerLocations(locations);

      // Auto-select primary location
      if (locations.length > 0) {
        const primaryLocation = locations.find(loc => loc.is_primary);
        if (primaryLocation) {
          setSelectedCustomerLocation(primaryLocation);
        }
      }
    } catch (error) {
      console.error('Error loading customer locations:', error);
    }
  };

  // Handle Google Places address selection
  const handlePlaceSelect = (address: string, place?: any) => {
    // Clear any selected saved location when user starts typing a new address
    setSelectedCustomerLocation(null);
    
    // If no place data, just update the address (user is typing manually)
    if (!place || !place.address_components || place.address_components.length === 0) {
      setNewCustomerLocation(prev => ({ ...prev, street_address: address }));
      return;
    }

    // Extract address components
    const addressComponents = place.address_components || [];
    let streetNumber = '';
    let route = '';
    let city = '';
    let state = '';
    let zipCode = '';
    let unitNumber = '';

    addressComponents.forEach((component) => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      } else if (types.includes('route')) {
        route = component.long_name;
      } else if (types.includes('locality') || types.includes('sublocality')) {
        city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = component.short_name; // Use short name for state (e.g., "FL")
      } else if (types.includes('postal_code')) {
        zipCode = component.long_name;
      } else if (types.includes('subpremise')) {
        unitNumber = component.long_name; // Apartment/unit number
      }
    });

    // Build street address
    const streetAddress = [streetNumber, route].filter(Boolean).join(' ').trim();

    // Update newCustomerLocation with parsed address components
    setNewCustomerLocation(prev => {
      const updated = {
        ...prev,
        street_address: streetAddress || address,
        city: city || prev.city,
        state: state || prev.state,
        zip_code: zipCode || prev.zip_code,
      };

      // Only update unit_number if we found one from Google Places
      if (unitNumber) {
        updated.unit_number = unitNumber;
      }

      // Auto-suggest location name if empty
      if (!prev.location_name) {
        const premise = addressComponents.find(c => 
          c.types.includes('premise') || c.types.includes('subpremise')
        );
        if (premise) {
          updated.location_name = premise.long_name;
        }
      }

      return updated;
    });
  };

  // Save new customer location
  const saveNewCustomerLocation = async (): Promise<CustomerLocation | null> => {
    if (!customer) return null;

    try {
      const { data, error } = await supabase
        .from('customer_locations')
        .insert({
          customer_id: customer.user_id,
          ...newCustomerLocation,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh customer locations
      await loadCustomerLocations();

      return data;
    } catch (error) {
      console.error('Error saving customer location:', error);
      return null;
    }
  };

  const handleNext = async () => {
    switch (currentStep) {
      case 'datetime':
        if (selectedDate && selectedTime) {
          // If businessId is provided, skip business selection (Business + Service specified)
          if (businessId && selectedBusiness) {
            loadProviders(selectedBusiness.id);
            
            // Check delivery types for the selected business
            const deliveryTypes = getDeliveryTypes(selectedBusiness);
            
            // If only one delivery type, auto-select and skip delivery-location step
            if (deliveryTypes.length === 1) {
              setSelectedDeliveryType(deliveryTypes[0]);
              
              // Load locations if needed
              if (deliveryTypes[0] === 'business_location') {
                loadBusinessLocations(selectedBusiness.id);
              } else if (deliveryTypes[0] === 'customer_location') {
                loadCustomerLocations();
              }
              
              setCurrentStep('provider');
            } else {
              // Multiple delivery types available, go to delivery-location selection
              setCurrentStep('delivery-location');
            }
          } else {
            // No businessId provided - go to business selection (Service Only specified)
            // Load all businesses that offer this service
            loadBusinesses();
            setCurrentStep('business');
          }
        }
        break;
      case 'business':
        if (selectedBusiness) {
          loadProviders(selectedBusiness.id);
          
          // Check delivery types for the selected business
          const deliveryTypes = getDeliveryTypes(selectedBusiness);
          
          // If only one delivery type, auto-select and skip delivery-location step
          if (deliveryTypes.length === 1) {
            setSelectedDeliveryType(deliveryTypes[0]);
            
            // Load locations if needed
            if (deliveryTypes[0] === 'business_location') {
              loadBusinessLocations(selectedBusiness.id);
            } else if (deliveryTypes[0] === 'customer_location') {
              loadCustomerLocations();
            }
            
            setCurrentStep('provider');
          } else {
            // Multiple delivery types available, go to delivery-location selection
            setCurrentStep('delivery-location');
          }
        }
        break;
      case 'delivery-location':
        // First validate delivery type is selected
        if (!selectedDeliveryType) {
          return;
        }
        
        // Then validate location selection based on delivery type
        if (selectedDeliveryType === 'business_location') {
          if (!selectedBusinessLocation && businessLocations.length > 1) {
            return;
          }
        } else if (selectedDeliveryType === 'customer_location') {
          // Check if a new address is being entered (has any data)
          const isNewLocationEntered = newCustomerLocation.street_address || 
                                       newCustomerLocation.city || 
                                       newCustomerLocation.state || 
                                       newCustomerLocation.zip_code;
          
          if (!selectedCustomerLocation && !isNewLocationEntered) {
            return;
          }
          
          // If new location is entered, validate and optionally save it
          if (!selectedCustomerLocation && isNewLocationEntered) {
            if (!newCustomerLocation.street_address || !newCustomerLocation.city || 
                !newCustomerLocation.state || !newCustomerLocation.zip_code) {
              return;
            }
            
            // Save the location if checkbox is checked
            if (saveLocationForFuture) {
              const savedLocation = await saveNewCustomerLocation();
              if (savedLocation) {
                setSelectedCustomerLocation(savedLocation);
              } else {
                return; // Don't proceed if save failed
              }
            } else {
              // Use the new location for this booking only (don't save to database)
              // Create a temporary location object to use for this booking
              const tempLocation: CustomerLocation = {
                id: 'temp-' + Date.now(), // Temporary ID
                customer_id: customer?.user_id || '',
                ...newCustomerLocation,
                is_primary: false,
                is_active: true,
                created_at: new Date().toISOString(),
              };
              setSelectedCustomerLocation(tempLocation);
            }
          }
        }
        
        setCurrentStep('provider');
        break;
      case 'provider':
        if (selectedProvider || noProviderPreference) {
          setCurrentStep('summary');
        }
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'datetime':
        // Navigate back to booknow page
        navigate('/booknow');
        break;
      case 'business':
        setCurrentStep('datetime');
        break;
      case 'delivery-location':
        setCurrentStep('business');
        break;
      case 'provider':
        // Determine which step to go back to
        const deliveryTypes = selectedBusiness ? getDeliveryTypes(selectedBusiness) : [];
        if (deliveryTypes.length > 1) {
          setCurrentStep('delivery-location');
        } else if (businessId) {
          setCurrentStep('datetime');
        } else {
          setCurrentStep('business');
        }
        break;
      case 'summary':
        setCurrentStep('provider');
        break;
      case 'checkout':
        setCurrentStep('summary');
        // Clean up created booking and payment intent
        if (createdBookingId) {
          supabase
            .from('bookings')
            .delete()
            .eq('id', createdBookingId)
            .then(() => {
              console.log('🗑️ Cancelled pending booking:', createdBookingId);
            });
          setCreatedBookingId(null);
          setClientSecret('');
          setPaymentBreakdown(null);
        }
        break;
    }
  };

  const calculateDiscountedPrice = () => {
    if (!service || !promotion) return service?.min_price || 0;

    const originalPrice = service.min_price;

    if (promotion.savingsType === 'percentage_off') {
      const discount = (originalPrice * promotion.savingsAmount) / 100;
      const maxDiscount = promotion.savingsMaxAmount || discount;
      const finalDiscount = Math.min(discount, maxDiscount);
      return Math.max(originalPrice - finalDiscount, 0);
    } else if (promotion.savingsType === 'fixed_amount') {
      return Math.max(originalPrice - promotion.savingsAmount, 0);
    }

    return originalPrice;
  };

  // Calculate service fee based on platform fee percentage
  const calculateServiceFee = () => {
    const basePrice = calculateDiscountedPrice();
    return (basePrice * platformFeePercentage) / 100;
  };

  // Calculate total price including platform fee (covers operational costs including payment processing)
  const calculateTotalWithFees = () => {
    const basePrice = calculateDiscountedPrice();
    const serviceFee = calculateServiceFee();
    return basePrice + serviceFee;
  };

  const handleCheckout = async () => {
    // Check if user is authenticated first
    if (!customer) {
      setShowAuthModal(true);
      setPendingCheckout(true);
      return;
    }

    // Ensure all necessary data is available
    // Note: selectedProvider can be null if noProviderPreference is true (business will assign)
    if (!service || !selectedBusiness || (!selectedProvider && !noProviderPreference) || !selectedDate || !selectedTime) {
      return;
    }

    // Validate that booking date is not more than 1 year in the future
    if (selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const oneYearFromToday = new Date();
      oneYearFromToday.setFullYear(oneYearFromToday.getFullYear() + 1);
      oneYearFromToday.setHours(23, 59, 59, 999);
      
      const selectedDateOnly = new Date(selectedDate);
      selectedDateOnly.setHours(0, 0, 0, 0);
      
      if (selectedDateOnly > oneYearFromToday) {
        toast({
          title: "Invalid Date",
          description: "Booking date cannot be more than 1 year in the future. Please select a date within the next year.",
          variant: "destructive",
        });
        return;
      }
    }

    // Use selected delivery type or get the primary one for the business
    const businessDeliveryTypes = getDeliveryTypes(selectedBusiness);
    const deliveryType = selectedDeliveryType || businessDeliveryTypes[0] || 'business_location';

    // Prepare booking details for creation (snake_case, DB schema compliant)
    // Ensure start_time is always in HH:MM:SS format
    let formattedStartTime = selectedTime;
    if (selectedTime && selectedTime.length === 5) {
      formattedStartTime = selectedTime + ':00';
    }
    // Only set one of business_location_id or customer_location_id based on deliveryType
    let business_location_id = null;
    let customer_location_id = null;
    if (deliveryType === 'business_location') {
      business_location_id = selectedBusinessLocation?.id || null;
    } else if (deliveryType === 'customer_location') {
      customer_location_id = selectedCustomerLocation?.id && !selectedCustomerLocation.id.startsWith('temp-') ? selectedCustomerLocation.id : null;
    }

    // Calculate service amount (base price after discounts)
    const serviceAmount = calculateTotalAmount();
    
    // Calculate service fee (20% of service amount)
    const serviceFeePercentage = 0.2; // Fixed 20% service fee
    const serviceFee = serviceAmount * serviceFeePercentage;
    
    // Calculate total amount (service amount + service fee)
    const totalAmount = serviceAmount + serviceFee;
    
    // Remaining balance is the service amount (what the business receives)
    const remainingBalance = serviceAmount;

    const bookingDetails = {
      service_id: service.id,
      business_id: selectedBusiness.id,
      customer_id: customer.id,
      provider_id: selectedProvider?.id || null,
      booking_date: selectedDate.toISOString().split('T')[0],
      start_time: formattedStartTime,
      guest_name: isBookingForGuest && guestName ? guestName : `${customer.first_name} ${customer.last_name}`,
      guest_email: isBookingForGuest && guestEmail ? guestEmail : customer.email,
      guest_phone: isBookingForGuest && guestPhone ? guestPhone : (customer.phone || ''),
      delivery_type: deliveryType,
      business_location_id,
      customer_location_id,
      special_instructions: selectedCustomerLocation?.id && selectedCustomerLocation.id.startsWith('temp-')
        ? `Service Address: ${selectedCustomerLocation.street_address}${selectedCustomerLocation.unit_number ? `, ${selectedCustomerLocation.unit_number}` : ''}, ${selectedCustomerLocation.city}, ${selectedCustomerLocation.state} ${selectedCustomerLocation.zip_code}`
        : '',
      total_amount: totalAmount,
      service_fee: serviceFee,
      remaining_balance: remainingBalance,
    };

    console.log('💳 Creating booking with pending status (payment to follow):', bookingDetails);

    try {
      // Get auth headers - try multiple methods for Vercel compatibility
      let token: string | null = null;
      
      // Method 1: Try getting fresh session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          token = session.access_token;
          console.log('✅ Using session token');
        }
      } catch (error) {
        console.warn('⚠️ Session retrieval failed, trying localStorage:', error);
      }
      
      // Method 2: Fallback to localStorage cached token
      if (!token) {
        token = localStorage.getItem('roam_access_token');
        if (token) {
          console.log('✅ Using cached token from localStorage');
        }
      }
      
      // Method 3: Check if customer object has user_id (they're authenticated)
      if (!token && customer?.user_id) {
        console.warn('⚠️ No token but customer exists, proceeding anyway');
        // For Supabase operations, the client is already authenticated
        // For API calls, we'll try without explicit auth header
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Step 1: Create the booking in pending status
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          ...bookingDetails,
          booking_status: 'pending',  // Using 'pending' - payment will be processed immediately
          payment_status: 'pending'
        })
        .select('id')
        .single();

      if (bookingError || !newBooking) {
        throw new Error(bookingError?.message || 'Failed to create booking');
      }

      console.log('✅ Booking created with ID:', newBooking.id);
      setCreatedBookingId(newBooking.id);

      // Step 2: Create promotion usage if promotion was applied
      if (promotion) {
        await supabase
          .from('promotion_usage')
          .insert({
            promotion_id: promotion.id,
            user_id: customer.user_id,
            booking_id: newBooking.id,
            discount_applied: promotion.savingsAmount
          });

        await supabase
          .from('promotions')
          .update({ current_uses: promotion.current_uses + 1 })
          .eq('id', promotion.id);
      }

      // Step 3: Create Payment Intent
      const paymentPayload = {
        bookingId: newBooking.id,
        serviceId: service.id,
        businessId: selectedBusiness.id,
        customerId: customer.id,
        bookingDate: bookingDetails.booking_date,
        startTime: formattedStartTime,
        guestName: bookingDetails.guest_name,
        guestEmail: bookingDetails.guest_email,
        guestPhone: bookingDetails.guest_phone,
        deliveryType,
        specialInstructions: bookingDetails.special_instructions,
        promotionId: promotion?.id || null,
        // Customer address for tax calculation
        customerAddress: selectedCustomerLocation ? {
          line1: selectedCustomerLocation.street_address,
          city: selectedCustomerLocation.city,
          state: selectedCustomerLocation.state,
          postal_code: selectedCustomerLocation.zip_code,
          country: 'US'
        } : null
      };

      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers,
        body: JSON.stringify(paymentPayload),
      });

      console.log('📡 Response status:', response.status);
      console.log('���� Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const paymentData = await response.json();
      console.log('✅ Payment Intent created:', paymentData);

      // Store client secret and payment breakdown
      setClientSecret(paymentData.clientSecret);
      setPaymentBreakdown(paymentData.breakdown);

      // Move to checkout step (embedded form)
      setCurrentStep('checkout');
      setCheckoutLoading(false);
    } catch (error) {
      console.error('❌ Error preparing checkout:', error);
      setCheckoutLoading(false);
      
      // Clean up booking if it was created
      if (createdBookingId) {
        await supabase.from('bookings').delete().eq('id', createdBookingId);
        setCreatedBookingId(null);
      }

      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMessage = "Network error: Could not connect to payment service. Please check your connection and try again.";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error('Checkout error:', errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roam-blue mx-auto mb-4"></div>
          <p>Loading service details...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Service Not Found</h2>
          <Button asChild>
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              {/* Back to Home - with confirmation if mid-booking */}
              {currentStep === 'datetime' ? (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-foreground hover:text-roam-blue font-medium"
                >
                  <Link to="/booknow">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-foreground hover:text-roam-blue font-medium"
                    onClick={() => setShowExitConfirmation(true)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Exit Booking
                  </Button>
                  
                  {/* Exit Confirmation Dialog */}
                  <Dialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Exit Booking Process?</DialogTitle>
                      </DialogHeader>
                      <p className="text-gray-600">
                        Are you sure you want to exit? Your booking progress will be lost.
                      </p>
                      <div className="flex justify-end gap-3 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowExitConfirmation(false)}
                        >
                          Continue Booking
                        </Button>
                        <Button
                          asChild
                          variant="destructive"
                        >
                          <Link to="/booknow">
                            Exit to Home
                          </Link>
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
              <img
                src="/default-placeholder.png"
                alt="ROAM - Your Best Life. Everywhere."
                className="h-8 w-auto"
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Service Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-6">
              Book {service.name}
            </h1>

            {/* Service Image */}
            <div className="flex justify-center mb-6">
              <div className="relative w-full max-w-md h-64 rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-roam-blue/10 to-roam-light-blue/20">
                {service.image_url ? (
                  <>
                    <img
                      src={service.image_url}
                      alt={service.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <User className="w-16 h-16 text-roam-blue/60 mx-auto mb-2" />
                      <p className="text-roam-blue/80 font-medium">{service.name}</p>
                    </div>
                  </div>
                )}
                {/* Service badge overlay */}
                <div className="absolute top-4 left-4">
                  <Badge className="bg-white/90 text-roam-blue shadow-sm">
                    {service.duration_minutes} min session
                  </Badge>
                </div>
                <div className="absolute top-4 right-4">
                  <Badge className="bg-roam-blue text-white shadow-sm">
                    From ${service.min_price}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Promotion Applied Section */}
            {promotion && (
              <div className="mb-4">
                <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-800">
                  <Tag className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">
                    Promotion Applied! Code: {promotion.promoCode || 'HYD1234'} - {promotion.savingsType === 'percentage' ? `${promotion.savingsAmount}% off` : `$${promotion.savingsAmount} off`}
                  </span>
                </div>
              </div>
            )}
            
            <p className="text-foreground/60 mb-4">
              {service.description}
            </p>
            <div className="flex justify-center gap-4">
              <Badge variant="secondary" className="text-sm">
                ${service.min_price} starting
              </Badge>
              <Badge variant="outline" className="text-sm">
                {service.duration_minutes} minutes
              </Badge>
              {promotion && (
                <Badge variant="default" className="text-sm bg-green-500 hover:bg-green-600">
                  <Tag className="w-3 h-3 mr-1" />
                  {promotion.savingsType === 'percentage' ? `${promotion.savingsAmount}% OFF` : `$${promotion.savingsAmount} OFF`}
                </Badge>
              )}
            </div>
            {selectedBusiness && (
              <div className="mt-4">
                <Badge variant="outline" className="text-sm">
                  <Building className="w-3 h-3 mr-1" />
                  {selectedBusiness.business_name}
                </Badge>
              </div>
            )}
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto px-4">
              {/* Step 1: Date & Time */}
              <div className={`flex items-center ${currentStep === 'datetime' ? 'text-roam-blue' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'datetime' ? 'bg-roam-blue text-white' : 'bg-gray-200'}`}>
                  1
                </div>
                <span className="ml-2 hidden sm:inline">Date & Time</span>
              </div>
              
              {/* Step 2: Business (if not pre-selected) */}
              {!businessId && (
                <>
                  <div className="w-8 h-0.5 bg-gray-300"></div>
                  <div className={`flex items-center ${currentStep === 'business' ? 'text-roam-blue' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'business' ? 'bg-roam-blue text-white' : 'bg-gray-200'}`}>
                      2
                    </div>
                    <span className="ml-2 hidden sm:inline">Business</span>
                  </div>
                </>
              )}
              
              {/* Step 3: Delivery & Location (if applicable) */}
              {selectedBusiness && (getDeliveryTypes(selectedBusiness).length > 1 || getDeliveryTypes(selectedBusiness).some(type => type !== 'virtual')) && (
                <>
                  <div className="w-8 h-0.5 bg-gray-300"></div>
                  <div className={`flex items-center ${currentStep === 'delivery-location' ? 'text-roam-blue' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'delivery-location' ? 'bg-roam-blue text-white' : 'bg-gray-200'}`}>
                      {businessId ? 2 : 3}
                    </div>
                    <span className="ml-2 hidden sm:inline">Location</span>
                  </div>
                </>
              )}
              
              {/* Step: Provider */}
              <div className="w-8 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center ${currentStep === 'provider' ? 'text-roam-blue' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'provider' ? 'bg-roam-blue text-white' : 'bg-gray-200'}`}>
                  {(() => {
                    let stepNum = 2;
                    if (!businessId) stepNum = 3;
                    if (selectedBusiness && (getDeliveryTypes(selectedBusiness).length > 1 || getDeliveryTypes(selectedBusiness).some(type => type !== 'virtual'))) stepNum++;
                    return stepNum;
                  })()}
                </div>
                <span className="ml-2 hidden sm:inline">Provider</span>
              </div>
              
              {/* Step: Summary */}
              <div className="w-8 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center ${currentStep === 'summary' ? 'text-roam-blue' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'summary' ? 'bg-roam-blue text-white' : 'bg-gray-200'}`}>
                  {(() => {
                    let stepNum = 3;
                    if (!businessId) stepNum = 4;
                    if (selectedBusiness && (getDeliveryTypes(selectedBusiness).length > 1 || getDeliveryTypes(selectedBusiness).some(type => type !== 'virtual'))) stepNum++;
                    return stepNum;
                  })()}
                </div>
                <span className="ml-2 hidden sm:inline">Summary</span>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            {currentStep === 'datetime' && (
              <div>
                <h2 className="text-2xl font-semibold mb-6 flex items-center">
                  <CalendarIcon className="w-6 h-6 mr-2" />
                  Select Date & Time
                </h2>
                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Enhanced Calendar Selector */}
                  <div>
                    <label className="block text-sm font-medium mb-3">Choose your preferred date</label>
                    <div className="space-y-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-12",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
                              
                              const oneYearFromToday = new Date();
                              oneYearFromToday.setFullYear(oneYearFromToday.getFullYear() + 1);
                              oneYearFromToday.setHours(23, 59, 59, 999); // End of day
                              
                              // Disable dates before today or more than 1 year from today
                              return date < today || date > oneYearFromToday;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {selectedDate && (
                        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                          <CalendarIcon className="w-4 h-4 inline mr-2" />
                          You selected: {format(selectedDate, "EEEE, MMMM do, yyyy")}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Compact Time Selector */}
                  <div>
                    <label className="block text-sm font-medium mb-3">Choose your preferred time</label>
                    <div className="space-y-3">
                      <Select value={selectedTime} onValueChange={setSelectedTime}>
                        <SelectTrigger className="w-full h-12">
                          <Clock className="mr-2 h-4 w-4" />
                          <SelectValue placeholder="Select a time slot" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(groupedTimeSlots).map(([period, slots]) => (
                            <SelectGroup key={period}>
                              <SelectLabel className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {period}
                              </SelectLabel>
                              {slots.map((slot) => (
                                <SelectItem key={slot.value} value={slot.value}>
                                  {slot.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTime && (
                        <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
                          <Clock className="w-4 h-4 inline mr-2" />
                          You selected: {timeSlots.find(slot => slot.value === selectedTime)?.label}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'business' && (
              <div>
                <h2 className="text-2xl font-semibold mb-6 flex items-center">
                  <Building className="w-6 h-6 mr-2" />
                  Select Business
                </h2>

                {/* Sorting Controls */}
                <div className="mb-6 flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Sort by:</span>

                  <div className="flex items-center gap-2">
                    <Select value={sortBy} onValueChange={(value: 'price' | 'rating' | 'delivery_type') => setSortBy(value)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
                        <SelectItem value="delivery_type">Delivery Type</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-3"
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Button>
                  </div>

                  <div className="text-sm text-gray-600">
                    {filteredAndSortedBusinesses.length} business{filteredAndSortedBusinesses.length !== 1 ? 'es' : ''} available
                    {sortBy === 'price' && ` • Sorted by price (${sortOrder === 'asc' ? 'low to high' : 'high to low'})`}
                    {sortBy === 'rating' && ` • Sorted by rating (${sortOrder === 'asc' ? 'low to high' : 'high to low'})`}
                    {sortBy === 'delivery_type' && ` • Sorted by delivery type`}
                  </div>
                </div>

                {filteredAndSortedBusinesses.length === 0 ? (
                  <div className="text-center py-12">
                    <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No businesses available</h3>
                    <p className="text-gray-500 mb-4">
                      No businesses offer this service at your selected date and time.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep('datetime')}
                      className="mr-2"
                    >
                      Change Date/Time
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {filteredAndSortedBusinesses.map((business) => (
                    <Card
                      key={business.id}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        selectedBusiness?.id === business.id
                          ? 'ring-2 ring-roam-blue border-roam-blue bg-blue-50/50'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedBusiness(business)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          {/* Enhanced Business Logo */}
                          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                            {(business.logo_url || business.image_url) ? (
                              <img
                                src={business.logo_url || business.image_url}
                                alt={`${business.business_name} logo`}
                                className="w-full h-full object-cover rounded-xl"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  // Show fallback icon when image fails
                                  const parent = target.parentElement;
                                  if (parent && !parent.querySelector('.fallback-icon')) {
                                    const fallback = document.createElement('div');
                                    fallback.className = 'fallback-icon flex items-center justify-center w-full h-full';
                                    fallback.innerHTML = '<svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>';
                                    parent.appendChild(fallback);
                                  }
                                }}
                              />
                            ) : (
                              <Building className="w-10 h-10 text-gray-400" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Business Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                  {business.business_name}
                                </h3>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <div className="flex items-center">
                                    <Star className="w-4 h-4 text-yellow-500 mr-1" />
                                    {business.review_count > 0 ? (
                                      <>
                                        <span className="font-medium">{business.rating.toFixed(1)}</span>
                                        <span className="ml-1">({business.review_count} {business.review_count === 1 ? 'review' : 'reviews'})</span>
                                      </>
                                    ) : (
                                      <span className="text-gray-500">No reviews yet</span>
                                    )}
                                  </div>
                                  {business.city && business.state && (
                                    <div className="flex items-center">
                                      <MapPin className="w-4 h-4 mr-1" />
                                      <span>{business.city}, {business.state}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Service Pricing */}
                                <div className="mt-2">
                                  <div className="inline-flex items-center px-3 py-1 bg-roam-blue/10 rounded-full">
                                    <CreditCard className="w-4 h-4 text-roam-blue mr-2" />
                                    <span className="text-roam-blue font-semibold">
                                      ${Number(business.service_price || service?.min_price || 0).toFixed(2)}
                                    </span>
                                    <span className="text-gray-600 text-sm ml-1">for this service</span>
                                  </div>
                                </div>
                              </div>

                              {/* More Info Button */}
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="ml-4 flex-shrink-0"
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  className="hover:bg-roam-blue hover:text-white"
                                >
                                  <Link to={`/business/${business.id}`} target="_blank">
                                    <Info className="w-4 h-4 mr-1" />
                                    More Info
                                    <ExternalLink className="w-3 h-3 ml-1" />
                                  </Link>
                                </Button>
                              </div>
                            </div>

                            {/* Business Description */}
                            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                              {business.description || "Professional service provider dedicated to delivering excellent results."}
                            </p>

                            {/* Delivery Types */}
                            <div className="mb-3">
                              <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                                Service Delivery Options
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {getDeliveryTypes(business).map((deliveryType) => {
                                  const Icon = getDeliveryTypeIcon(deliveryType);
                                  return (
                                    <Badge
                                      key={deliveryType}
                                      variant="outline"
                                      className="text-xs bg-roam-blue/5 border-roam-blue/20 text-roam-blue hover:bg-roam-blue/10"
                                    >
                                      <Icon className="w-3 h-3 mr-1" />
                                      {getDeliveryTypeLabel(deliveryType)}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* Selection Indicator */}
                        {selectedBusiness?.id === business.id && (
                          <div className="mt-4 pt-4 border-t border-roam-blue/20">
                            <div className="flex items-center text-roam-blue text-sm font-medium">
                              <div className="w-4 h-4 rounded-full bg-roam-blue flex items-center justify-center mr-2">
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              </div>
                              Selected for your booking
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentStep === 'delivery-location' && selectedBusiness && (
              <div>
                <h2 className="text-2xl font-semibold mb-6 flex items-center">
                  <MapPin className="w-6 h-6 mr-2" />
                  Select Service Location
                </h2>
                <p className="text-gray-600 mb-6">
                  Choose how you'd like to receive this service
                </p>
                <div className="grid gap-4">
                  {getDeliveryTypes(selectedBusiness).map((deliveryType) => {
                    const Icon = getDeliveryTypeIcon(deliveryType);
                    const label = getDeliveryTypeLabel(deliveryType);
                    const isSelected = selectedDeliveryType === deliveryType;
                    
                    return (
                      <div key={deliveryType}>
                        <Card
                          className={`cursor-pointer transition-all ${
                            isSelected
                              ? 'ring-2 ring-roam-blue border-roam-blue bg-roam-blue/5'
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => {
                            setSelectedDeliveryType(deliveryType);
                            // Load locations when delivery type is selected
                            if (deliveryType === 'business_location') {
                              loadBusinessLocations(selectedBusiness.id);
                            } else if (deliveryType === 'customer_location') {
                              loadCustomerLocations();
                            }
                          }}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                isSelected ? 'bg-roam-blue text-white' : 'bg-gray-100'
                              }`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{label}</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {deliveryType === 'business_location' && 'Visit the business location'}
                                  {deliveryType === 'customer_location' && 'Provider comes to your location'}
                                  {deliveryType === 'virtual' && 'Virtual service via video call'}
                                  {deliveryType === 'both_locations' && 'Choose business or your location'}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Expandable Location Selection */}
                        {isSelected && deliveryType === 'business_location' && (
                          <div className="mt-4 ml-4 pl-4 border-l-2 border-roam-blue space-y-4">
                            <h3 className="font-medium text-lg">Select Business Location</h3>
                            {businessLocations.length === 0 ? (
                              <p className="text-gray-600">No business locations available.</p>
                            ) : (
                              businessLocations.map((location) => (
                                <Card
                                  key={location.id}
                                  className={`cursor-pointer transition-all ${
                                    selectedBusinessLocation?.id === location.id
                                      ? 'ring-2 ring-green-500 border-green-500 bg-green-50'
                                      : 'hover:shadow-md'
                                  }`}
                                  onClick={() => setSelectedBusinessLocation(location)}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-start space-x-3">
                                      <Building className="w-5 h-5 text-roam-blue mt-1" />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <h3 className="font-semibold">
                                            {location.location_name || 'Main Location'}
                                          </h3>
                                          {location.is_primary && (
                                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                          {location.address_line1}
                                          {location.address_line2 && `, ${location.address_line2}`}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          {location.city}, {location.state} {location.postal_code}
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </div>
                        )}
                        
                        {isSelected && deliveryType === 'customer_location' && (
                          <div className="mt-4 ml-4 pl-4 border-l-2 border-roam-blue space-y-6">
                            {customerLocations.length > 0 && (
                              <div className="space-y-4">
                                <h3 className="font-medium text-lg">Your Saved Locations</h3>
                                {customerLocations.map((location) => (
                                  <Card
                                    key={location.id}
                                    className={`cursor-pointer transition-all ${
                                      selectedCustomerLocation?.id === location.id
                                        ? 'ring-2 ring-green-500 border-green-500 bg-green-50'
                                        : 'hover:shadow-md'
                                    }`}
                                    onClick={() => setSelectedCustomerLocation(location)}
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex items-start space-x-3">
                                        <MapPin className="w-5 h-5 text-roam-blue mt-1" />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <h3 className="font-semibold capitalize">
                                              {location.location_name}
                                            </h3>
                                            {location.is_primary && (
                                              <Badge variant="secondary" className="text-xs">Primary</Badge>
                                            )}
                                            <Badge variant="outline" className="text-xs capitalize">
                                              {location.location_type}
                                            </Badge>
                                          </div>
                                          <p className="text-sm text-gray-600 mt-1">
                                            {location.street_address}
                                            {location.unit_number && `, ${location.unit_number}`}
                                          </p>
                                          <p className="text-sm text-gray-600">
                                            {location.city}, {location.state} {location.zip_code}
                                          </p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}

                            {/* Add New Location Form */}
                            <div className={customerLocations.length > 0 ? "border-t pt-6" : ""}>
                              <h3 className="font-medium mb-4 text-lg">
                                {customerLocations.length > 0 ? 'Or Add a New Location' : 'Add Your Location'}
                              </h3>
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">Location Name</label>
                                  <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-md bg-white text-gray-900"
                                    placeholder="e.g., Home, Office"
                                    value={newCustomerLocation.location_name}
                                    onChange={(e) => {
                                      setSelectedCustomerLocation(null);
                                      setNewCustomerLocation({ ...newCustomerLocation, location_name: e.target.value });
                                    }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Street Address *</label>
                                  <GooglePlacesAutocomplete
                                    value={newCustomerLocation.street_address}
                                    onChange={handlePlaceSelect}
                                    placeholder="123 Main Street"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Unit/Apt Number</label>
                                  <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-md bg-white text-gray-900"
                                    placeholder="Apt 2B"
                                    value={newCustomerLocation.unit_number}
                                    onChange={(e) => {
                                      setSelectedCustomerLocation(null);
                                      setNewCustomerLocation({ ...newCustomerLocation, unit_number: e.target.value });
                                    }}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-2">City *</label>
                                    <input
                                      type="text"
                                      className="w-full px-3 py-2 border rounded-md bg-white text-gray-900"
                                      placeholder="Miami"
                                      value={newCustomerLocation.city}
                                      onChange={(e) => {
                                        setSelectedCustomerLocation(null);
                                        setNewCustomerLocation({ ...newCustomerLocation, city: e.target.value });
                                      }}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-2">State *</label>
                                    <input
                                      type="text"
                                      className="w-full px-3 py-2 border rounded-md bg-white text-gray-900"
                                      placeholder="FL"
                                      value={newCustomerLocation.state}
                                      onChange={(e) => {
                                        setSelectedCustomerLocation(null);
                                        setNewCustomerLocation({ ...newCustomerLocation, state: e.target.value });
                                      }}
                                      required
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">ZIP Code *</label>
                                  <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-md bg-white text-gray-900"
                                    placeholder="33101"
                                    value={newCustomerLocation.zip_code}
                                    onChange={(e) => {
                                      setSelectedCustomerLocation(null);
                                      setNewCustomerLocation({ ...newCustomerLocation, zip_code: e.target.value });
                                    }}
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Location Type</label>
                                  <select
                                    className="w-full px-3 py-2 border rounded-md bg-white text-gray-900"
                                    value={newCustomerLocation.location_type}
                                    onChange={(e) => {
                                      setSelectedCustomerLocation(null);
                                      setNewCustomerLocation({ ...newCustomerLocation, location_type: e.target.value as 'Home' | 'Condo' | 'Hotel' | 'Other' });
                                    }}
                                  >
                                    <option value="Home">Home</option>
                                    <option value="Condo">Condo</option>
                                    <option value="Hotel">Hotel</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </div>
                                
                                {/* Save Location Checkbox */}
                                <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
                                  <input
                                    type="checkbox"
                                    id="saveLocation"
                                    checked={saveLocationForFuture}
                                    onChange={(e) => setSaveLocationForFuture(e.target.checked)}
                                    className="mt-1 w-4 h-4 text-roam-blue border-gray-300 rounded focus:ring-roam-blue"
                                  />
                                  <label htmlFor="saveLocation" className="text-sm cursor-pointer">
                                    <span className="font-medium text-gray-900">Save this location for future bookings</span>
                                    <p className="text-gray-600 mt-1">
                                      You'll be able to quickly select this address for your next service.
                                    </p>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {currentStep === 'provider' && (
              <div>
                <h2 className="text-2xl font-semibold mb-6 flex items-center">
                  <User className="w-6 h-6 mr-2" />
                  Select Provider
                </h2>
                <div className="grid gap-4">
                  {/* No Preference Option */}
                  <Card
                    className={`cursor-pointer transition-all ${
                      noProviderPreference
                        ? 'ring-2 ring-roam-blue border-roam-blue bg-roam-blue/5'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => {
                      setNoProviderPreference(true);
                      setSelectedProvider(null);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          noProviderPreference ? 'bg-roam-blue text-white' : 'bg-gray-100'
                        }`}>
                          <User className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">No Preference</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Business will assign a provider for you
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {providers.map((provider) => (
                    <Card
                      key={provider.id}
                      className={`cursor-pointer transition-all ${
                        selectedProvider?.id === provider.id && !noProviderPreference
                          ? 'ring-2 ring-roam-blue border-roam-blue'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => {
                        setSelectedProvider(provider);
                        setNoProviderPreference(false);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                            {provider.image_url ? (
                              <img src={provider.image_url} alt={`${provider.first_name} ${provider.last_name}`} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <User className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{provider.first_name} {provider.last_name}</h3>
                            {provider.provider_role && (
                              <p className="text-sm text-gray-600 capitalize">
                                {provider.provider_role}
                              </p>
                            )}
                            <div className="flex items-center mt-2">
                              <span className="text-yellow-500">★</span>
                              {provider.review_count > 0 ? (
                                <>
                                  <span className="text-sm ml-1">{provider.rating.toFixed(1)}</span>
                                  <span className="text-sm text-gray-500 ml-1">({provider.review_count} {provider.review_count === 1 ? 'review' : 'reviews'})</span>
                                </>
                              ) : (
                                <span className="text-sm text-gray-500 ml-1">No reviews yet</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 'summary' && (
              <div>
                <h2 className="text-2xl font-semibold mb-6 flex items-center">
                  <CreditCard className="w-6 h-6 mr-2" />
                  Booking Summary
                </h2>
                
                {/* Promotion Banner */}
                {promotion && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <Tag className="w-5 h-5 text-green-600 mr-2" />
                      <div>
                        <h3 className="font-semibold text-green-800">Promotion Applied!</h3>
                        <p className="text-sm text-green-700">
                          Code: {promotion.promoCode} - {promotion.savingsType === 'percentage' ? `${promotion.savingsAmount}% off` : `$${promotion.savingsAmount} off`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold mb-4">Booking Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-medium">{service.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date & Time:</span>
                      <span className="font-medium">
                        {selectedDate ? format(selectedDate, "PPP") : "Not selected"} at {timeSlots.find(slot => slot.value === selectedTime)?.label || selectedTime}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Business:</span>
                      <span className="font-medium">{selectedBusiness?.business_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Provider:</span>
                      <span className="font-medium">
                        {noProviderPreference 
                          ? 'No Preference (Business will assign)' 
                          : `${selectedProvider?.first_name} ${selectedProvider?.last_name}`
                        }
                      </span>
                    </div>
                    {selectedDeliveryType && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service Type:</span>
                        <span className="font-medium flex items-center gap-2">
                          {(() => {
                            const Icon = getDeliveryTypeIcon(selectedDeliveryType);
                            return <Icon className="w-4 h-4" />;
                          })()}
                          {getDeliveryTypeLabel(selectedDeliveryType)}
                        </span>
                      </div>
                    )}
                    {selectedBusinessLocation && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-medium text-right">
                          {selectedBusinessLocation.location_name || 'Business Location'}<br />
                          <span className="text-sm text-gray-500">
                            {selectedBusinessLocation.address_line1}, {selectedBusinessLocation.city}, {selectedBusinessLocation.state}
                          </span>
                        </span>
                      </div>
                    )}
                    {selectedCustomerLocation && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service Address:</span>
                        <span className="font-medium text-right">
                          {selectedCustomerLocation.location_name}<br />
                          <span className="text-sm text-gray-500">
                            {selectedCustomerLocation.street_address}, {selectedCustomerLocation.city}, {selectedCustomerLocation.state}
                          </span>
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{selectedBusiness?.service_duration_minutes || service.duration_minutes} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service Price:</span>
                      <span className="font-medium">${selectedBusiness?.service_price || service.min_price}</span>
                    </div>
                    {promotion && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({promotion.promoCode}):</span>
                        <span className="font-medium">
                          -${((service.min_price || 0) - calculateDiscountedPrice()).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">${calculateDiscountedPrice().toFixed(2)}</span>
                      </div>
                      {platformFeePercentage > 0 && (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <span className="text-gray-600">Platform Fee ({platformFeePercentage}%):</span>
                            <div className="ml-2 group relative">
                              <Info className="w-4 h-4 text-gray-400 cursor-help" />
                              <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-6 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                                Covers payment processing & platform support
                              </div>
                            </div>
                          </div>
                          <span className="font-medium">${calculateServiceFee().toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between border-t-2 border-roam-blue/20 pt-3 mt-3">
                      <span className="text-xl font-bold">Total:</span>
                      <span className="text-xl font-bold text-roam-blue">
                        ${calculateTotalWithFees().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CHECKOUT STEP - Embedded Payment Form */}
            {currentStep === 'checkout' && clientSecret && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-6 flex items-center">
                  <CreditCard className="w-6 h-6 mr-2" />
                  Complete Your Payment
                </h2>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-3">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">Booking Reserved</p>
                        <p className="text-blue-700 mt-1">
                          Reference: {createdBookingId?.slice(-8).toUpperCase()}
                        </p>
                        <p className="text-blue-600 mt-1 text-xs">
                          Complete payment to confirm your booking
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Guest Information Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Guest Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="guest-booking-toggle" className="text-base font-medium">
                          Booking for someone else?
                        </Label>
                        <p className="text-sm text-gray-500">
                          Enter guest details if booking on behalf of another person
                        </p>
                      </div>
                      <Switch
                        id="guest-booking-toggle"
                        checked={isBookingForGuest}
                        onCheckedChange={setIsBookingForGuest}
                      />
                    </div>

                    {isBookingForGuest && (
                      <div className="mt-4 space-y-4 pt-4 border-t">
                        <div>
                          <Label htmlFor="guest-name">Guest Name</Label>
                          <Input
                            id="guest-name"
                            type="text"
                            placeholder="Enter guest's full name"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="guest-email">Guest Email</Label>
                          <Input
                            id="guest-email"
                            type="email"
                            placeholder="guest@example.com"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="guest-phone">Guest Phone</Label>
                          <Input
                            id="guest-phone"
                            type="tel"
                            placeholder="(555) 123-4567"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Embedded Stripe Checkout Form */}
                <div className="bg-white rounded-lg">
                  <Elements 
                    stripe={stripePromise} 
                    options={{ 
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#3b82f6',
                          colorBackground: '#ffffff',
                          colorText: '#1f2937',
                          colorDanger: '#ef4444',
                          fontFamily: 'system-ui, sans-serif',
                          borderRadius: '8px',
                        }
                      }
                    }}
                  >
                    <CheckoutForm
                      clientSecret={clientSecret}
                      bookingDetails={{
                        id: createdBookingId || '',
                        serviceName: service?.name || '',
                        providerName: selectedProvider 
                          ? `${selectedProvider.first_name} ${selectedProvider.last_name}` 
                          : '',
                        businessName: selectedBusiness?.business_name || '',
                        scheduledDate: selectedDate 
                          ? `${selectedDate.toISOString().split('T')[0]} ${selectedTime}` 
                          : '',
                        serviceAmount: paymentBreakdown?.serviceAmount || calculateDiscountedPrice(),
                        platformFee: paymentBreakdown?.platformFee || calculateServiceFee(),
                        discountAmount: paymentBreakdown?.discountAmount || 0,
                        taxAmount: paymentBreakdown?.taxAmount || 0,
                        taxRate: paymentBreakdown?.taxRate || null,
                        total: paymentBreakdown?.total || calculateTotalWithFees(),
                      }}
                      onSuccess={(paymentIntent) => {
                        console.log('✅ Payment successful!', paymentIntent);
                        console.log('📋 Payment Intent Status:', paymentIntent.status);
                        console.log('📋 Booking ID:', createdBookingId);

                        // Show success message
                        toast({
                          title: "Payment Authorized!",
                          description: paymentIntent.status === 'requires_capture' 
                            ? "Your payment has been authorized. The charge will be processed when your booking is accepted by the business."
                            : "Your payment has been processed successfully.",
                        });

                        // Redirect to success page with booking_id
                        // Note: BookingSuccess page will fetch booking by booking_id
                        navigate(`/booking-success?booking_id=${createdBookingId}`);
                      }}
                      onError={(error) => {
                        console.error('❌ Payment error:', error);
                      }}
                    />
                  </Elements>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            {currentStep !== 'checkout' && (
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 'datetime'}
                >
                  Back
                </Button>
                <div className="flex gap-4">
                  {currentStep === 'summary' ? (
                    <Button
                      onClick={handleCheckout}
                      className="bg-roam-blue hover:bg-roam-blue/90"
                    >
                      Proceed to Checkout
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      className="bg-roam-blue hover:bg-roam-blue/90"
                    >
                      Continue
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <CustomerAuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingCheckout(false);
        }}
        defaultTab="signin"
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
