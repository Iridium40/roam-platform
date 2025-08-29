import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar as CalendarIcon, Clock, Building, User, CreditCard, Tag, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  rating: number;
  review_count: number;
}

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  image_url?: string;
  rating: number;
  review_count: number;
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
            .select('*')
            .eq('id', businessId)
            .single();

          if (!businessError && businessData) {
            const business = {
              id: businessData.id,
              business_name: businessData.business_name,
              description: businessData.description,
              image_url: businessData.image_url,
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

  // Load businesses that offer this service
  const loadBusinesses = async () => {
    if (!serviceId) return;
    
    try {
      // Get the service details first to understand what we're looking for
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('id, name, subcategory_id')
        .eq('id', serviceId)
        .single();

      if (serviceError) throw serviceError;
      
      if (!serviceData) {
        setBusinesses([]);
        return;
      }

      // Get business IDs that offer this specific service
      const { data: businessServiceData, error: businessServiceError } = await supabase
        .from('business_services')
        .select('business_id')
        .eq('service_id', serviceId)
        .eq('is_active', true);

      if (businessServiceError) throw businessServiceError;
      
      if (!businessServiceData || businessServiceData.length === 0) {
        setBusinesses([]);
        return;
      }

      // Extract business IDs
      const businessIds = businessServiceData.map(item => item.business_id);

      // Then, get the business details
      const { data: businessData, error: businessError } = await supabase
        .from('business_profiles')
        .select('id, business_name, business_description, image_url')
        .in('id', businessIds)
        .eq('is_active', true);

      if (businessError) throw businessError;
      
      // Transform data to match Business interface
      const transformedBusinesses = businessData?.map(business => ({
        id: business.id,
        business_name: business.business_name,
        description: business.business_description || '',
        image_url: business.image_url,
        rating: 4.5, // Mock data - would come from reviews table
        review_count: 25, // Mock data
      })) || [];
      
      setBusinesses(transformedBusinesses);
    } catch (error) {
      console.error('Error loading businesses:', error);
    }
  };

  // Load providers from selected business
  const loadProviders = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('id, first_name, last_name, image_url')
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (error) throw error;
      
      // Transform data to match Provider interface
      const providerData = data?.map(provider => ({
        id: provider.id,
        first_name: provider.first_name,
        last_name: provider.last_name,
        image_url: provider.image_url,
        rating: 4.8, // Mock data - would come from reviews table
        review_count: 15, // Mock data
      })) || [];
      
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

                  {/* Enhanced Time Selector */}
                  <div>
                    <label className="block text-sm font-medium mb-3">Choose your preferred time</label>
                    <div className="space-y-4">
                      {Object.entries(groupedTimeSlots).map(([period, slots]) => (
                        <div key={period}>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {period}
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {slots.map((slot) => (
                              <Button
                                key={slot.value}
                                variant={selectedTime === slot.value ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                  "justify-center text-sm",
                                  selectedTime === slot.value && "bg-roam-blue hover:bg-roam-blue/90"
                                )}
                                onClick={() => setSelectedTime(slot.value)}
                              >
                                {slot.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                      {selectedTime && (
                        <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg mt-4">
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
                <div className="grid gap-4">
                  {businesses.map((business) => (
                    <Card
                      key={business.id}
                      className={`cursor-pointer transition-all ${
                        selectedBusiness?.id === business.id
                          ? 'ring-2 ring-roam-blue border-roam-blue'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedBusiness(business)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            {business.image_url ? (
                              <img src={business.image_url} alt={business.business_name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Building className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{business.business_name}</h3>
                            <p className="text-sm text-gray-600">{business.description}</p>
                            <div className="flex items-center mt-2">
                              <span className="text-yellow-500">★</span>
                              <span className="text-sm ml-1">{business.rating}</span>
                              <span className="text-sm text-gray-500 ml-1">({business.review_count} reviews)</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
