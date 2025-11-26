import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Calendar, Star, MapPin, Share2, Clock, MessageSquare, Search } from "lucide-react";
import { useState, useEffect, lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { FavoriteButton } from "@/components/FavoriteButton";
import { format } from "date-fns";

// Lazy load ShareModal
const ShareModal = lazy(() => import("@/components/ShareModal"));

interface Provider {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  bio?: string;
  image_url?: string;
  cover_image_url?: string;
  provider_role?: 'owner' | 'provider' | 'dispatcher';
  business_id: string;
  business?: {
    business_name: string;
    id: string;
  };
}

interface Service {
  id: string;
  name: string;
  description: string;
  min_price: number;
  duration_minutes: number;
  image_url?: string;
}

interface Review {
  id: string;
  booking_id: string;
  overall_rating: number;
  service_rating: number | null;
  communication_rating: number | null;
  punctuality_rating: number | null;
  review_text: string | null;
  is_featured: boolean;
  created_at: string;
  customer_profiles?: {
    first_name: string;
    last_name: string;
  };
  services?: {
    name: string;
  };
}

export default function ProviderProfile() {
  const { providerId } = useParams();
  const { toast } = useToast();
  
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('services');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');

  useEffect(() => {
    const loadProviderData = async () => {
      if (!providerId) return;
      
      try {
        // Load provider/owner details
        const { data: providerData, error: providerError } = await supabase
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
            business_id,
            business_profiles (
              business_name,
              id
            )
          `)
          .eq('user_id', providerId)
          .in('provider_role', ['owner', 'provider'])
          .eq('is_active', true)
          .single();

        if (providerError) throw providerError;
        
        setProvider({
          ...providerData,
          business: providerData.business_profiles,
        });

        // Load services this provider offers (from provider_services)
        const { data: providerServicesData, error: providerServicesError } = await supabase
          .from('provider_services')
          .select(`
            service_id,
            is_active,
            services (
              id,
              name,
              description,
              min_price,
              duration_minutes,
              image_url
            )
          `)
          .eq('provider_id', providerData.id)
          .eq('is_active', true);

        if (!providerServicesError && providerServicesData) {
          const providerServices = providerServicesData
            .map((ps: any) => ps.services)
            .filter(Boolean);
          setServices(providerServices);
        }

        // Load reviews for this provider (approved reviews, with featured ones first)
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            id,
            booking_id,
            overall_rating,
            service_rating,
            communication_rating,
            punctuality_rating,
            review_text,
            is_featured,
            created_at,
            bookings (
              service_id,
              customer_id,
              services (
                name
              ),
              customer_profiles (
                first_name,
                last_name
              )
            )
          `)
          .eq('provider_id', providerData.id)
          .eq('is_approved', true)
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false });

        if (!reviewsError && reviewsData) {
          // Transform reviews to include service name and customer info
          const transformedReviews = reviewsData.map((review: any) => ({
            ...review,
            services: review.bookings?.services,
            customer_profiles: review.bookings?.customer_profiles,
          }));
          setReviews(transformedReviews);
        }

      } catch (error) {
        console.error('Error loading provider:', error);
        toast({
          title: "Error",
          description: "Failed to load provider profile",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProviderData();
  }, [providerId, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roam-blue mx-auto mb-4"></div>
          <p>Loading provider profile...</p>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Provider Not Found</h2>
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Cover Image */}
          {provider.cover_image_url && (
            <div className="mb-8">
              <div className="w-full h-64 bg-gradient-to-br from-roam-blue/20 to-roam-light-blue/10 rounded-lg overflow-hidden">
                <img 
                  src={provider.cover_image_url} 
                  alt={`${provider.first_name} ${provider.last_name} cover`} 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
          
          {/* Provider Header */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border-4 border-white shadow-lg">
                {provider.image_url ? (
                  <img 
                    src={provider.image_url} 
                    alt={`${provider.first_name} ${provider.last_name}`} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <User className="w-16 h-16 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-3xl font-bold text-foreground">
                      {provider.first_name} {provider.last_name}
                    </h1>
                    {provider.provider_role === 'owner' && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                        Owner
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <FavoriteButton
                      type="provider"
                      itemId={provider.id}
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
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  {provider.business && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <Link 
                        to={`/business/${provider.business.id}`}
                        className="hover:text-roam-blue transition-colors"
                      >
                        {provider.business.business_name}
                      </Link>
                    </Badge>
                  )}
                </div>
                {provider.bio && (
                  <p className="text-foreground/70 leading-relaxed">
                    {provider.bio}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tabs for Services and Reviews */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="reviews">
                  Reviews {reviews.length > 0 && `(${reviews.length})`}
                </TabsTrigger>
              </TabsList>

              {/* Services Tab */}
              <TabsContent value="services" className="mt-0">
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
                            ${service.min_price} Starting
                          </Badge>
                        </div>
                        
                        {/* Duration Badge */}
                        <div className="mb-4">
                          <Badge variant="outline" className="text-sm">
                            {service.duration_minutes} Minutes
                          </Badge>
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
                            <Link to={`/book-service/${service.id}?provider_id=${provider.user_id}&business_id=${provider.business_id}`}>
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
                  This provider doesn't have any services listed yet.
                </p>
              </div>
            );
            })()}
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="mt-0">
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
                      This provider doesn't have any reviews at the moment.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {provider && (
        <Suspense fallback={<div />}>
          <ShareModal
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            providerName={`${provider.first_name} ${provider.last_name}`}
            providerTitle={provider.provider_role === 'owner' ? 'Business Owner' : 'Service Provider'}
            pageUrl={window.location.href}
          />
        </Suspense>
      )}
    </div>
  );
}
