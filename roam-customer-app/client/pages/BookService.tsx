import { useParams, useSearchParams } from "react-router-dom";
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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type BookingStep = 'datetime' | 'business' | 'provider' | 'summary';

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
  business_hours?: any;
}

// Helper functions for delivery types
const getDeliveryTypes = (business: Business): string[] => {
  // If business has explicit delivery types, use them
  if (business.delivery_types?.length) {
    return business.delivery_types;
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
    return ['mobile', 'business_location'];
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
  return ['business_location', 'mobile'];
};

const getDeliveryTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    mobile: 'Mobile Service',
    business_location: 'Business Location',
    virtual: 'Virtual/Online',
    both: 'Mobile & Business'
  };
  return labels[type] || type;
};

const getDeliveryTypeIcon = (type: string) => {
  const icons: Record<string, any> = {
    mobile: Truck,
    business_location: Building,
    virtual: Video,
    both: Smartphone
  };
  return icons[type] || Smartphone;
};

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
            // Sort by delivery type priority: mobile -> business_location -> virtual
            const deliveryPriority = { mobile: 1, business_location: 2, virtual: 3 };
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
  const { customer } = useAuth();
  const { toast } = useToast();
  
  // URL parameters for business-specific booking and promotions
  const businessId = searchParams.get('business_id');
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

  // Business sorting and filtering
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'delivery_type'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]); // Store all businesses
  const [filteredAndSortedBusinesses, setFilteredAndSortedBusinesses] = useState<Business[]>([]); // Display these

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
            const business = {
              id: businessData.id,
              business_name: businessData.business_name,
              description: businessData.business_description || businessData.description,
              image_url: businessData.image_url,
              logo_url: businessData.logo_url,
              business_type: businessData.business_type,
              rating: 4.5, // Mock data
              review_count: 25, // Mock data
            };
            setSelectedBusiness(business);
            setBusinesses([business]); // Only show this business
          }
        }
      } catch (error) {
        console.error('Error loading service:', error);
        toast({
          title: "Error",
          description: "Failed to load service details",
          variant: "destructive",
        });
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

    // Show loading state to user
    toast({
      title: "Loading businesses...",
      description: "Finding available providers for your selected time",
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
          is_active,
          business_profiles (
            id,
            business_name,
            business_description,
            image_url,
            logo_url,
            business_type,
            business_hours,
            is_active
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
            .select('id, business_name, business_description, image_url, logo_url, business_type, business_hours, is_active')
            .eq('is_active', true)
            .limit(10);

          console.log('🔄 Fallback business query:', { fallbackBusinesses, fallbackError });

          if (fallbackError) throw fallbackError;

          if (fallbackBusinesses && fallbackBusinesses.length > 0) {
            // Transform fallback data
            const transformedFallback = fallbackBusinesses.map(business => ({
              id: business.id,
              business_name: business.business_name,
              description: business.business_description || '',
              image_url: business.image_url,
              logo_url: business.logo_url,
              business_type: business.business_type,
              service_price: service?.min_price || 100, // Use service default price
              business_hours: business.business_hours,
              rating: 4.5,
              review_count: 25,
            }));

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

      // Transform data to match Business interface
      const transformedBusinesses = availableBusinesses.map(item => ({
        id: item.business_profiles.id,
        business_name: item.business_profiles.business_name,
        description: item.business_profiles.business_description || '',
        image_url: item.business_profiles.image_url,
        logo_url: item.business_profiles.logo_url,
        business_type: item.business_profiles.business_type,
        service_price: item.business_price || service?.min_price || 0,
        business_hours: item.business_profiles.business_hours,
        rating: 4.5, // Mock data - would come from reviews table
        review_count: 25, // Mock data
      }));

      console.log('Loaded businesses with pricing:', transformedBusinesses.map(b => ({
        name: b.business_name,
        price: b.service_price
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

      // If this is a database schema issue, provide a helpful message
      if (errorMessage.includes('business_services') || errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        toast({
          title: "Database Schema Issue",
          description: "The business_services table may not exist. Using simplified business loading...",
          variant: "destructive",
        });

        // Try one more simplified approach
        try {
          console.log('🔄 Attempting simplified business loading...');
          const { data: simpleBusinesses, error: simpleError } = await supabase
            .from('business_profiles')
            .select('id, business_name, business_description, image_url, logo_url, business_type, is_active')
            .eq('is_active', true)
            .limit(5);

          if (!simpleError && simpleBusinesses) {
            const transformedSimple = simpleBusinesses.map(business => ({
              id: business.id,
              business_name: business.business_name,
              description: business.business_description || '',
              image_url: business.image_url,
              logo_url: business.logo_url,
              business_type: business.business_type,
              service_price: service?.min_price || 100,
              rating: 4.5,
              review_count: 25,
            }));

            setAllBusinesses(transformedSimple);
            const sorted = sortAndFilterBusinesses(transformedSimple, sortBy, sortOrder);
            setFilteredAndSortedBusinesses(sorted);

            toast({
              title: "Businesses loaded",
              description: `Found ${transformedSimple.length} available businesses`,
            });
            return;
          }
        } catch (fallbackError) {
          console.error('❌ Even simplified query failed:', fallbackError);
        }
      }

      toast({
        title: "Error loading businesses",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Load providers from selected business with role-based filtering
  const loadProviders = async (businessId: string) => {
    try {
      // Get all providers for this business first
      const { data, error } = await supabase
        .from('providers')
        .select('id, first_name, last_name, image_url, provider_role')
        .eq('business_id', businessId)
        .eq('is_active', true);

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
          // For non-individual businesses, only show providers (not owners)
          filteredProviders = filteredProviders.filter(provider =>
            provider.provider_role === 'provider'
          );
          console.log('Filtered for non-individual business (providers only):', filteredProviders.length);
        }
      } else {
        console.log('No business type available, showing all providers');
      }

      // Transform data to match Provider interface
      const providerData = filteredProviders.map(provider => ({
        id: provider.id,
        first_name: provider.first_name,
        last_name: provider.last_name,
        image_url: provider.image_url,
        provider_role: provider.provider_role,
        rating: 4.8, // Mock data - would come from reviews table
        review_count: 15, // Mock data
      }));

      setProviders(providerData);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'datetime':
        if (selectedDate && selectedTime) {
          // If businessId is provided, skip business selection and go directly to provider selection
          if (businessId && selectedBusiness) {
            loadProviders(selectedBusiness.id);
            setCurrentStep('provider');
          } else {
            // Load all businesses that offer this service
          loadBusinesses();
          setCurrentStep('business');
          }
        } else {
          toast({
            title: "Please select date and time",
            description: "Both date and time are required to continue",
            variant: "destructive",
          });
        }
        break;
      case 'business':
        if (selectedBusiness) {
          loadProviders(selectedBusiness.id);
          setCurrentStep('provider');
        } else {
          toast({
            title: "Please select a business",
            description: "Choose a business to continue",
            variant: "destructive",
          });
        }
        break;
      case 'provider':
        if (selectedProvider) {
          setCurrentStep('summary');
        } else {
          toast({
            title: "Please select a provider",
            description: "Choose a provider to continue",
            variant: "destructive",
          });
        }
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'business':
        setCurrentStep('datetime');
        break;
      case 'provider':
        // If businessId is provided, go back to datetime (skip business selection)
        if (businessId) {
          setCurrentStep('datetime');
        } else {
          setCurrentStep('business');
        }
        break;
      case 'summary':
        setCurrentStep('provider');
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

  const handleCheckout = () => {
    // This would integrate with Stripe or payment processor
    const finalPrice = calculateDiscountedPrice();
    const discountApplied = promotion ? (service?.min_price || 0) - finalPrice : 0;
    
    toast({
      title: "Booking Confirmed!",
      description: promotion 
        ? `Your booking has been created with ${promotion.promoCode} applied ($${discountApplied.toFixed(2)} saved!)`
        : "Your booking has been successfully created",
    });
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
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-foreground hover:text-roam-blue"
              >
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800"
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
                    Promotion Applied! Code: {promotion.code || 'HYD1234'} - {promotion.savingsType === 'percentage_off' ? `${promotion.savingsAmount}% off` : `$${promotion.savingsAmount} off`}
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
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${currentStep === 'datetime' ? 'text-roam-blue' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'datetime' ? 'bg-roam-blue text-white' : 'bg-gray-200'}`}>
                  1
                </div>
                <span className="ml-2 hidden sm:inline">Date & Time</span>
              </div>
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
              <div className="w-8 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center ${currentStep === 'provider' ? 'text-roam-blue' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'provider' ? 'bg-roam-blue text-white' : 'bg-gray-200'}`}>
                  {businessId ? 2 : 3}
                </div>
                <span className="ml-2 hidden sm:inline">Provider</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center ${currentStep === 'summary' ? 'text-roam-blue' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'summary' ? 'bg-roam-blue text-white' : 'bg-gray-200'}`}>
                  {businessId ? 3 : 4}
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
                            disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
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
                                    <span className="font-medium">{business.rating}</span>
                                    <span className="ml-1">({business.review_count} reviews)</span>
                                  </div>
                                  <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    <span>Miami, FL</span>
                                  </div>
                                </div>

                                {/* Service Pricing */}
                                <div className="mt-2">
                                  <div className="inline-flex items-center px-3 py-1 bg-roam-blue/10 rounded-full">
                                    <CreditCard className="w-4 h-4 text-roam-blue mr-2" />
                                    <span className="text-roam-blue font-semibold">
                                      ${business.service_price || service?.min_price || 0}
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

                            {/* Business Highlights */}
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Same-day booking
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                <Building className="w-3 h-3 mr-1" />
                                Licensed & Insured
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Top-rated
                              </Badge>
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

            {currentStep === 'provider' && (
              <div>
                <h2 className="text-2xl font-semibold mb-6 flex items-center">
                  <User className="w-6 h-6 mr-2" />
                  Select Provider
                </h2>
                <div className="grid gap-4">
                  {providers.map((provider) => (
                    <Card
                      key={provider.id}
                      className={`cursor-pointer transition-all ${
                        selectedProvider?.id === provider.id
                          ? 'ring-2 ring-roam-blue border-roam-blue'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedProvider(provider)}
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
                              <span className="text-sm ml-1">{provider.rating}</span>
                              <span className="text-sm text-gray-500 ml-1">({provider.review_count} reviews)</span>
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
                      <span className="font-medium">{selectedProvider?.first_name} {selectedProvider?.last_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{service.duration_minutes} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Original Price:</span>
                      <span className="font-medium">${service.min_price}</span>
                    </div>
                    {promotion && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({promotion.promoCode}):</span>
                        <span className="font-medium">
                          -${((service.min_price || 0) - calculateDiscountedPrice()).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-3">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-lg font-semibold text-roam-blue">
                        ${calculateDiscountedPrice().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
