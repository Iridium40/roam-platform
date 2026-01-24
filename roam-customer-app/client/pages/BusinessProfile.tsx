import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar, Clock, Building, User, CreditCard, Tag, Share2, Search, Star, MessageSquare, MapPin, Home, Video, BadgeCheck } from "lucide-react";
import { getDeliveryTypeLabel, getDeliveryTypeIcon } from "@/utils/deliveryTypeHelpers";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Footer } from "@/components/Footer";
import { logger } from "@/utils/logger";
import { PageErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load ShareModal
const ShareModal = lazy(() => import("@/components/ShareModal"));

interface BusinessHours {
  [day: string]: {
    open?: string;
    close?: string;
    closed?: boolean;
    isOpen?: boolean;
  };
}

interface Business {
  id: string;
  business_name: string;
  description: string;
  image_url?: string;
  logo_url?: string;
  cover_image_url?: string;
  cover_image_position?: number;
  verification_status?: string;
  rating: number;
  review_count: number;
  business_hours?: BusinessHours;
}

interface Service {
  id: string;
  name: string;
  description: string;
  min_price: number;
  duration_minutes: number;
  business_price?: number;
  business_duration_minutes?: number;
  image_url?: string;
  delivery_type?: string;
}

interface Provider {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  bio?: string;
  image_url?: string;
  cover_image_url?: string;
  provider_role: 'owner' | 'provider' | 'dispatcher';
  rating?: number;
  review_count?: number;
}

interface Review {
  id: string;
  booking_id: string;
  overall_rating: number;
  service_rating?: number;
  communication_rating?: number;
  punctuality_rating?: number;
  review_text?: string;
  is_featured?: boolean;
  created_at: string;
  services?: { name: string };
  customer_profiles?: { first_name: string; last_name: string };
}

// Helper function to format time from 24-hour to 12-hour format
const formatTime = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const normalizeBusinessHours = (raw: any): Record<string, { open?: string; close?: string; closed?: boolean }> => {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, { open?: string; close?: string; closed?: boolean }> = {};

  for (const [key, value] of Object.entries(raw)) {
    const dayKey = String(key).toLowerCase();
    if (!value || typeof value !== "object") continue;

    const v: any = value;
    const open = v.open ?? v.open_time ?? v.start ?? v.start_time;
    const close = v.close ?? v.close_time ?? v.end ?? v.end_time;
    const closed = v.closed ?? v.isClosed ?? (typeof v.isOpen === "boolean" ? !v.isOpen : undefined);

    out[dayKey] = { open, close, closed };
  }

  return out;
};

function BusinessProfileContent() {
  const { businessId } = useParams();
  const [searchParams] = useSearchParams();
  const { customer } = useAuth();
  const { toast } = useToast();
  
  console.log('🔍 BusinessProfile Debug:', {
    businessId,
    url: window.location.href,
    pathname: window.location.pathname
  });
  
  // Check if user wants to book directly or which tab to show
  const shouldBook = searchParams.get('book') === 'true';
  const tabParam = searchParams.get('tab');
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Provider[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  // Set active tab based on query parameter, default to 'services' if coming from search, otherwise 'overview'
  const [activeTab, setActiveTab] = useState(
    tabParam === 'services' || shouldBook ? 'services' : 
    tabParam === 'staff' ? 'staff' :
    tabParam === 'reviews' ? 'reviews' :
    'overview'
  );
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const BUSINESS_DESCRIPTION_PREVIEW_LEN = 500;
  const [isBusinessDescriptionExpanded, setIsBusinessDescriptionExpanded] = useState(false);
  const normalizedHours = normalizeBusinessHours(business?.business_hours);

  // Load business details and services
  useEffect(() => {
    const loadBusinessAndServices = async () => {
      if (!businessId) return;
      
      try {
        // Load business details
        const { data: businessData, error: businessError } = await supabase
          .from('business_profiles')
          .select(`
            id,
            business_name,
            business_description,
            image_url,
            logo_url,
            cover_image_url,
            cover_image_position,
            verification_status,
            business_hours,
            is_active,
            bank_connected,
            stripe_account_id,
            providers!inner (
              id,
              provider_role,
              is_active,
              active_for_bookings
            )
          `)
          .eq('id', businessId)
          .eq('is_active', true)
          .eq('verification_status', 'approved')
          .eq('bank_connected', true)
          .not('stripe_account_id', 'is', null)
          .eq('providers.is_active', true)
          .eq('providers.active_for_bookings', true)
          .in('providers.provider_role', ['owner', 'provider'])
          .single();

        if (businessError) throw businessError;
        if (!businessData) throw new Error('Business not available');
        
        // Fetch reviews using API endpoint (avoids RLS issues for unauthenticated users)
        let calculatedRating = 0;
        let reviewCount = 0;
        
        try {
          const apiBaseUrl = import.meta.env.VITE_API_URL || '';
          const reviewsResponse = await fetch(`${apiBaseUrl}/api/reviews/business?businessId=${businessId}`);
          
          if (reviewsResponse.ok) {
            const reviewsData = await reviewsResponse.json();
            calculatedRating = reviewsData.averageRating || 0;
            reviewCount = reviewsData.reviewCount || 0;
            setReviews(reviewsData.reviews || []);
          } else {
            console.warn('Failed to fetch reviews, continuing without them');
          }
        } catch (reviewsError) {
          console.warn('Error fetching reviews:', reviewsError);
          // Continue without reviews - not critical for page load
        } else {
          setReviews([]);
        }
        
        setBusiness({
          id: businessData.id,
          business_name: businessData.business_name,
          description: businessData.business_description || '',
          image_url: businessData.image_url,
          logo_url: businessData.logo_url,
          cover_image_url: businessData.cover_image_url,
          cover_image_position: businessData.cover_image_position,
          verification_status: businessData.verification_status,
          rating: calculatedRating,
          review_count: reviewCount,
          business_hours: businessData.business_hours || undefined,
        });

        // Load services for this business with business-specific pricing and duration
        logger.debug('Loading services for business ID:', businessId);
        const { data: servicesData, error: servicesError } = await supabase
          .from('business_services')
          .select(`
            business_price,
            business_duration_minutes,
            delivery_type,
            services (
              id,
              name,
              description,
              min_price,
              duration_minutes,
              image_url
            )
          `)
          .eq('business_id', businessId)
          .eq('is_active', true);

        logger.debug('Services query result:', { 
          servicesData, 
          servicesError,
          servicesCount: servicesData?.length || 0
        });

        if (servicesError) {
          console.error('❌ Error loading services:', servicesError);
          console.error('Error details:', JSON.stringify(servicesError, null, 2));
          setServices([]); // Set empty array on error
        } else if (servicesData && servicesData.length > 0) {
          // Transform business_services data to Service interface
          const transformedServices = servicesData.map((item: any) => ({
            id: item.services.id,
            name: item.services.name,
            description: item.services.description,
            min_price: item.services.min_price,
            duration_minutes: item.business_duration_minutes || item.services.duration_minutes,
            business_price: item.business_price,
            business_duration_minutes: item.business_duration_minutes,
            image_url: item.services.image_url,
            delivery_type: item.delivery_type,
          }));
          logger.debug('Transformed services:', transformedServices);
          setServices(transformedServices);
        } else {
          logger.debug('No services found for business');
          setServices([]);
        }

        // Load staff members (owners and providers) for this business
        console.log('🔍 Loading staff for business ID:', businessId);
        const { data: staffData, error: staffError } = await supabase
          .from('providers')
          .select(`
            id,
            user_id,
            first_name,
            last_name,
            bio,
            image_url,
            cover_image_url,
            provider_role,
            active_for_bookings
          `)
          .eq('business_id', businessId)
          .in('provider_role', ['owner', 'provider'])
          .eq('is_active', true)
          .eq('active_for_bookings', true);

        logger.debug('Staff query result:', { staffData, staffError });

        if (staffError) {
          logger.error('Error loading staff:', staffError);
          logger.error('Error details:', JSON.stringify(staffError, null, 2));
        }

        if (!staffError && staffData) {
          console.log('✅ Found staff members:', staffData.length);
          
          // Fetch ratings for staff members using API (avoids RLS issues)
          let staffRatings: Record<string, { rating: number; count: number }> = {};
          
          try {
            const staffIds = staffData.map(s => s.id);
            const apiBaseUrl = import.meta.env.VITE_API_URL || '';
            
            // Fetch ratings for each provider
            const ratingPromises = staffIds.map(async (providerId) => {
              try {
                const response = await fetch(`${apiBaseUrl}/api/reviews/provider?providerId=${providerId}`);
                if (response.ok) {
                  const data = await response.json();
                  return { providerId, rating: data.averageRating || 0, count: data.reviewCount || 0 };
                }
              } catch (error) {
                console.warn(`Failed to fetch rating for provider ${providerId}`);
              }
              return { providerId, rating: 0, count: 0 };
            });
            
            const ratings = await Promise.all(ratingPromises);
            ratings.forEach(({ providerId, rating, count }) => {
              staffRatings[providerId] = { rating, count };
            });
          } catch (error) {
            console.warn('Error fetching staff ratings:', error);
            // Continue without ratings
          }

          // Add ratings to staff members
          const staffWithRatings = staffData.map((provider) => {
            const ratingData = staffRatings[provider.id];
            return {
              ...provider,
              rating: ratingData?.rating || 0,
              review_count: ratingData?.count || 0,
            };
          });
          setStaff(staffWithRatings);
        } else if (!staffError && !staffData) {
          logger.debug('No staff data returned (null)');
          setStaff([]);
        } else {
          logger.debug('No staff members found for this business');
          setStaff([]);
        }

        // If user wants to book, they'll see the services tab by default
        // No automatic redirect - let them choose which service to book

      } catch (error) {
        logger.error('Error loading business:', error);
        toast({
          title: "Error",
          description: "Failed to load business details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadBusinessAndServices();
  }, [businessId, shouldBook, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roam-blue mx-auto mb-4"></div>
          <p>Loading business details...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Business Not Found</h2>
          <Button asChild>
            <Link to="/booknow">Return to Home</Link>
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
                <Link to="/booknow">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
              <img
                src="/default-placeholder.png"
                alt="ROAM - Your Best Life. Everywhere."
                className="h-8 w-auto"
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Cover Image */}
          {business.cover_image_url && (
            <div className="mb-8">
              <div className="w-full h-44 sm:h-56 lg:h-64 bg-gray-200 rounded-lg overflow-hidden">
                <img 
                  src={business.cover_image_url} 
                  alt={`${business.business_name} cover`} 
                  className="w-full h-full object-cover"
                  style={{ objectPosition: `center ${business.cover_image_position ?? 50}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Business Header */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                {business.logo_url ? (
                  <img src={business.logo_url} alt={business.business_name} className="w-full h-full object-cover rounded-lg" />
                ) : business.image_url ? (
                  <img src={business.image_url} alt={business.business_name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Building className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">
                      {business.business_name}
                    </h1>
                    {business.verification_status === 'approved' && (
                      <BadgeCheck className="w-6 h-6 text-green-500 flex-shrink-0" aria-label="Verified Provider" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <FavoriteButton
                      type="business"
                      itemId={business.id}
                      size="sm"
                      variant="outline"
                      showText={false}
                    />
                    <Button
                      onClick={() => setShareModalOpen(true)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                  </div>
                </div>
                {(() => {
                  const fullDescription = business.description || '';
                  const shouldTruncate = fullDescription.length > BUSINESS_DESCRIPTION_PREVIEW_LEN;
                  const displayDescription =
                    isBusinessDescriptionExpanded || !shouldTruncate
                      ? fullDescription
                      : fullDescription.slice(0, BUSINESS_DESCRIPTION_PREVIEW_LEN) + '...';

                  return (
                    <div className="mb-4">
                      <p className="text-foreground/60 break-words">
                        {displayDescription}
                      </p>
                      {shouldTruncate && (
                        <button
                          type="button"
                          aria-expanded={isBusinessDescriptionExpanded}
                          onClick={() => setIsBusinessDescriptionExpanded((v) => !v)}
                          className="text-roam-blue hover:text-roam-blue/80 text-sm font-medium mt-2"
                        >
                          {isBusinessDescriptionExpanded ? 'Read less' : 'Read more...'}
                        </button>
                      )}
                    </div>
                  );
                })()}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center">
                    <span className="text-yellow-500">★</span>
                    {business.review_count > 0 ? (
                      <>
                        <span className="ml-1">{business.rating.toFixed(1)}</span>
                        <span className="text-gray-500 ml-1">({business.review_count} {business.review_count === 1 ? 'review' : 'reviews'})</span>
                      </>
                    ) : (
                      <span className="text-gray-500 ml-1">No reviews yet</span>
                    )}
                  </div>
                  {business.verification_status === "verified" && (
                    <Badge variant="outline" className="text-sm inline-flex items-center gap-1">
                      <BadgeCheck className="w-4 h-4 text-green-600" />
                      Verified Business
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-lg mb-8">
            <div className="border-b">
              <div className="flex overflow-x-auto whitespace-nowrap [-webkit-overflow-scrolling:touch]">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 sm:px-6 py-3 sm:py-4 font-medium shrink-0 ${
                    activeTab === 'overview'
                      ? 'border-b-2 border-roam-blue text-roam-blue'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('services')}
                  className={`px-4 sm:px-6 py-3 sm:py-4 font-medium shrink-0 ${
                    activeTab === 'services'
                      ? 'border-b-2 border-roam-blue text-roam-blue'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Services ({services.length})
                </button>
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`px-4 sm:px-6 py-3 sm:py-4 font-medium shrink-0 ${
                    activeTab === 'staff'
                      ? 'border-b-2 border-roam-blue text-roam-blue'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Staff ({staff.length})
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`px-4 sm:px-6 py-3 sm:py-4 font-medium shrink-0 ${
                    activeTab === 'reviews'
                      ? 'border-b-2 border-roam-blue text-roam-blue'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Reviews
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-8">
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">About {business.business_name}</h2>
                  {(() => {
                    const fullDescription = business.description || '';
                    const shouldTruncate = fullDescription.length > BUSINESS_DESCRIPTION_PREVIEW_LEN;
                    const displayDescription =
                      isBusinessDescriptionExpanded || !shouldTruncate
                        ? fullDescription
                        : fullDescription.slice(0, BUSINESS_DESCRIPTION_PREVIEW_LEN) + '...';

                    return (
                      <div className="mb-6">
                        <p className="text-gray-600">
                          {displayDescription}
                        </p>
                        {shouldTruncate && (
                          <button
                            type="button"
                            aria-expanded={isBusinessDescriptionExpanded}
                            onClick={() => setIsBusinessDescriptionExpanded((v) => !v)}
                            className="text-roam-blue hover:text-roam-blue/80 text-sm font-medium mt-2"
                          >
                            {isBusinessDescriptionExpanded ? 'Read less' : 'Read more...'}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">Business Information</h3>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Verified business on ROAM</li>
                        <li>• Professional service providers</li>
                        <li>• Quality guaranteed</li>
                        <li>• Secure booking and payment</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Why Choose Us</h3>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Experienced professionals</li>
                        <li>• Competitive pricing</li>
                        <li>• Flexible scheduling</li>
                        <li>• Customer satisfaction guarantee</li>
                      </ul>
                    </div>
                  </div>
                  
                  {/* Business Hours */}
                  {business.business_hours && Object.keys(business.business_hours).length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Business Hours
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-6">
                        <div className="space-y-2">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                            const hours = normalizedHours[day.toLowerCase()];
                            const isClosed = !hours || hours.closed === true;
                            return (
                              <div key={day} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                                <span className="font-medium text-gray-700">{day}</span>
                                <span className="text-gray-600">
                                  {!isClosed && hours?.open && hours?.close ? (
                                    <span>
                                      {formatTime(hours.open)} - {formatTime(hours.close)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">Closed</span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'services' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">Available Services</h2>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="Search services by name..."
                        value={serviceSearchQuery}
                        onChange={(e) => setServiceSearchQuery(e.target.value)}
                        className="pl-10 w-full max-w-md"
                      />
                    </div>
                  </div>

                  {(() => {
                    // Filter services based on search query
                    const filteredServices = services.filter((service) =>
                      service.name.toLowerCase().includes(serviceSearchQuery.toLowerCase())
                    );

                    return filteredServices.length > 0 ? (
                      <div className="grid md:grid-cols-2 gap-6">
                        {filteredServices.map((service) => {
                        const isExpanded = expandedServices.has(service.id);
                        const descriptionLength = 200; // Character limit before truncation
                        const shouldTruncate = service.description.length > descriptionLength;
                        const displayDescription = isExpanded || !shouldTruncate
                          ? service.description
                          : service.description.substring(0, descriptionLength) + '...';

                        return (
                          <Card key={service.id} className="hover:shadow-md transition-shadow flex flex-col overflow-hidden relative">
                            {/* Favorite Button - Top Right Corner */}
                            <div className="absolute top-2 right-2 z-10">
                              <FavoriteButton
                                type="service"
                                itemId={service.id}
                                size="sm"
                                variant="ghost"
                                showText={false}
                              />
                            </div>
                            
                            {/* Hero Banner Image */}
                            <div className="w-full h-48 bg-gray-200 relative overflow-hidden">
                              {service.image_url ? (
                                <img 
                                  src={service.image_url} 
                                  alt={service.name} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Clock className="w-16 h-16 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            <CardContent className="p-6 flex flex-col flex-1">
                              {/* Title and Price Row */}
                              <div className="flex items-start justify-between mb-3">
                                <h3 className="font-semibold text-xl flex-1">{service.name}</h3>
                                <Badge variant="secondary" className="text-sm ml-4 flex-shrink-0">
                                  ${service.business_price || service.min_price}
                                </Badge>
                              </div>
                              
                              {/* Duration and Delivery Type Badges */}
                              <div className="mb-4 flex flex-wrap gap-2">
                                <Badge className="bg-purple-100 text-purple-700 border-purple-300 border px-2.5 py-1 text-sm font-semibold">
                                  <Clock className="w-3.5 h-3.5 mr-1" />
                                  {service.business_duration_minutes || service.duration_minutes} min
                                </Badge>
                                {service.delivery_type && (
                                  (() => {
                                    // Handle "both" or "both_locations" - show separate badges
                                    if (service.delivery_type === 'both' || service.delivery_type === 'both_locations') {
                                      const BusinessIcon = getDeliveryTypeIcon('business_location');
                                      const MobileIcon = getDeliveryTypeIcon('customer_location');
                                      return (
                                        <>
                                          <Badge variant="outline" className="text-sm bg-roam-blue/5 border-roam-blue/20 text-roam-blue">
                                            <BusinessIcon className="w-3 h-3 mr-1" />
                                            {getDeliveryTypeLabel('business_location')}
                                          </Badge>
                                          <Badge variant="outline" className="text-sm bg-roam-blue/5 border-roam-blue/20 text-roam-blue">
                                            <MobileIcon className="w-3 h-3 mr-1" />
                                            {getDeliveryTypeLabel('customer_location')}
                                          </Badge>
                                        </>
                                      );
                                    }
                                    // Single delivery type
                                    const DeliveryIcon = getDeliveryTypeIcon(service.delivery_type);
                                    return (
                                      <Badge variant="outline" className="text-sm bg-roam-blue/5 border-roam-blue/20 text-roam-blue">
                                        <DeliveryIcon className="w-3 h-3 mr-1" />
                                        {getDeliveryTypeLabel(service.delivery_type)}
                                      </Badge>
                                    );
                                  })()
                                )}
                              </div>
                              
                              {/* Description */}
                              <div className="flex-1 mb-4">
                                <p className="text-gray-600 leading-relaxed">{displayDescription}</p>
                                {shouldTruncate && (
                                  <button
                                    onClick={() => {
                                      setExpandedServices((prev) => {
                                        const newSet = new Set(prev);
                                        if (isExpanded) {
                                          newSet.delete(service.id);
                                        } else {
                                          newSet.add(service.id);
                                        }
                                        return newSet;
                                      });
                                    }}
                                    className="text-roam-blue hover:text-roam-blue/80 text-sm font-medium mt-2"
                                  >
                                    {isExpanded ? 'Read less' : 'Read more'}
                                  </button>
                                )}
                              </div>
                              
                              {/* Book Now Button */}
                              <div className="mt-auto pt-4">
                                <Button asChild className="w-full">
                                  <Link to={`/book-service/${service.id}?business_id=${business.id}`}>
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Book Now
                                  </Link>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                        })}
                      </div>
                    ) : serviceSearchQuery ? (
                      <div className="text-center py-8">
                        <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">
                          No services found matching "{serviceSearchQuery}"
                        </h3>
                        <p className="text-gray-500">Try adjusting your search terms.</p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        No Services Available
                      </h3>
                      <p className="text-gray-500">
                        This business doesn't have any services listed yet.
                      </p>
                    </div>
                  );
                  })()}
                </div>
              )}

              {activeTab === 'staff' && (
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Our Team</h2>
                  {staff.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2">
                      {staff.map((provider) => (
                        <Card 
                          key={provider.id} 
                          className="hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-roam-blue/30 relative"
                          onClick={() => window.location.href = `/provider/${provider.id}`}
                        >
                          <CardContent className="p-6">
                            <div className="flex gap-4">
                              <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {provider.image_url ? (
                                  <img 
                                    src={provider.image_url} 
                                    alt={`${provider.first_name} ${provider.last_name}`} 
                                    className="w-full h-full object-cover rounded-lg" 
                                  />
                                ) : (
                                  <User className="w-10 h-10 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-xl group-hover:text-roam-blue transition-colors">
                                      {provider.first_name} {provider.last_name}
                                    </h3>
                                    {provider.provider_role === 'owner' && (
                                      <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                                        Owner
                                      </Badge>
                                    )}
                                  </div>
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <FavoriteButton
                                      type="provider"
                                      itemId={provider.id}
                                      size="sm"
                                      variant="ghost"
                                    />
                                  </div>
                                </div>
                                {provider.bio && (
                                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                    {provider.bio}
                                  </p>
                                )}
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center">
                                    <span className="text-yellow-500">★</span>
                                    {provider.review_count && provider.review_count > 0 ? (
                                      <>
                                        <span className="ml-1 text-sm font-medium">{provider.rating?.toFixed(1)}</span>
                                        <span className="text-gray-500 ml-1 text-sm">
                                          ({provider.review_count} {provider.review_count === 1 ? 'review' : 'reviews'})
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-gray-500 ml-1 text-sm">No reviews yet</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        No Team Members Listed
                      </h3>
                      <p className="text-gray-500">
                        This business hasn't added any team members yet.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Customer Reviews</h2>
                  
                  {/* Rating Summary */}
                  {business.review_count > 0 && (
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <div className="flex items-center justify-center gap-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            <span className="text-4xl font-bold text-gray-900">{business.rating.toFixed(1)}</span>
                            <Star className="w-8 h-8 fill-roam-yellow text-roam-yellow ml-2" />
                          </div>
                          <p className="text-gray-600">
                            Based on {business.review_count} {business.review_count === 1 ? 'review' : 'reviews'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Reviews List */}
                  {reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map((review) => {
                        const customerName = review.customer_profiles
                          ? `${review.customer_profiles.first_name} ${review.customer_profiles.last_name}`
                          : 'Anonymous';
                        const serviceName = review.services?.name || 'Service';
                        
                        // Render stars helper
                        const renderStars = (rating: number) => {
                          return (
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= rating
                                      ? 'fill-roam-yellow text-roam-yellow'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          );
                        };

                        return (
                          <Card key={review.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-roam-blue/10 rounded-full flex items-center justify-center">
                                      <User className="w-5 h-5 text-roam-blue" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-lg">{customerName}</h4>
                                        {review.is_featured && (
                                          <Badge className="bg-roam-yellow text-roam-blue border-roam-yellow">
                                            Featured
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-500">
                                        {serviceName} • {format(new Date(review.created_at), 'MMMM d, yyyy')}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mb-3">
                                    {renderStars(review.overall_rating)}
                                    <span className="text-sm font-medium text-gray-700">
                                      {review.overall_rating}/5
                                    </span>
                                  </div>
                                  {review.review_text && (
                                    <div className="mt-3">
                                      <p className="text-gray-700 leading-relaxed italic">
                                        "{review.review_text}"
                                      </p>
                                    </div>
                                  )}
                                  {/* Additional ratings if available */}
                                  {(review.service_rating || review.communication_rating || review.punctuality_rating) && (
                                    <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                                      {review.service_rating && (
                                        <div>
                                          <p className="text-xs text-gray-500 mb-1">Service</p>
                                          <div className="flex items-center gap-1">
                                            {renderStars(review.service_rating)}
                                            <span className="text-xs text-gray-600">{review.service_rating}/5</span>
                                          </div>
                                        </div>
                                      )}
                                      {review.communication_rating && (
                                        <div>
                                          <p className="text-xs text-gray-500 mb-1">Communication</p>
                                          <div className="flex items-center gap-1">
                                            {renderStars(review.communication_rating)}
                                            <span className="text-xs text-gray-600">{review.communication_rating}/5</span>
                                          </div>
                                        </div>
                                      )}
                                      {review.punctuality_rating && (
                                        <div>
                                          <p className="text-xs text-gray-500 mb-1">Punctuality</p>
                                          <div className="flex items-center gap-1">
                                            {renderStars(review.punctuality_rating)}
                                            <span className="text-xs text-gray-600">{review.punctuality_rating}/5</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        No Reviews Yet
                      </h3>
                      <p className="text-gray-500">
                        This business doesn't have any reviews at the moment. Be the first to review!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {business && (
        <Suspense fallback={<div />}>
          <ShareModal
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            providerName={business.business_name}
            providerTitle="Business"
            pageUrl={window.location.href}
          />
        </Suspense>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}

// Wrap the component with PageErrorBoundary for resilient error handling
export default function BusinessProfile() {
  return (
    <PageErrorBoundary>
      <BusinessProfileContent />
    </PageErrorBoundary>
  );
}
