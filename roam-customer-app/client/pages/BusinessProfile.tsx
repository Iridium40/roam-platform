import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar, Clock, Building, User, CreditCard, Tag, ExternalLink, Share2, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Footer } from "@/components/Footer";

// Lazy load ShareModal
const ShareModal = lazy(() => import("@/components/ShareModal"));

interface BusinessHours {
  [day: string]: {
    open: string;
    close: string;
  };
}

interface Business {
  id: string;
  business_name: string;
  description: string;
  image_url?: string;
  logo_url?: string;
  cover_image_url?: string;
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

// Helper function to format time from 24-hour to 12-hour format
const formatTime = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export default function BusinessProfile() {
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
            verification_status,
            business_hours
          `)
          .eq('id', businessId)
          .single();

        if (businessError) throw businessError;
        
        setBusiness({
          id: businessData.id,
          business_name: businessData.business_name,
          description: businessData.business_description || '',
          image_url: businessData.image_url,
          logo_url: businessData.logo_url,
          cover_image_url: businessData.cover_image_url,
          rating: 4.5, // Mock data
          review_count: 25, // Mock data
          business_hours: businessData.business_hours || undefined,
        });

        // Load services for this business with business-specific pricing and duration
        console.log('🔍 Loading services for business ID:', businessId);
        const { data: servicesData, error: servicesError } = await supabase
          .from('business_services')
          .select(`
            business_price,
            business_duration_minutes,
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

        console.log('📊 Services query result:', { 
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
          }));
          console.log('✅ Transformed services:', transformedServices);
          setServices(transformedServices);
        } else {
          console.log('⚠️ No services found for business');
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
            provider_role
          `)
          .eq('business_id', businessId)
          .in('provider_role', ['owner', 'provider'])
          .eq('is_active', true)
          .eq('active_for_bookings', true);

        console.log('📊 Staff query result:', { staffData, staffError });

        if (staffError) {
          console.error('❌ Error loading staff:', staffError);
          console.error('Error details:', JSON.stringify(staffError, null, 2));
        }

        if (!staffError && staffData) {
          console.log('✅ Found staff members:', staffData.length);
          // Add mock ratings for now
          const staffWithRatings = staffData.map((provider) => ({
            ...provider,
            rating: 4.8,
            review_count: Math.floor(Math.random() * 50) + 10,
          }));
          setStaff(staffWithRatings);
        } else if (!staffError && !staffData) {
          console.log('⚠️ No staff data returned (null)');
          setStaff([]);
        } else {
          console.log('⚠️ No staff members found for this business');
          setStaff([]);
        }

        // If user wants to book, they'll see the services tab by default
        // No automatic redirect - let them choose which service to book

      } catch (error) {
        console.error('Error loading business:', error);
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Cover Image */}
          {business.cover_image_url && (
            <div className="mb-8">
              <div className="w-full h-64 bg-gray-200 rounded-lg overflow-hidden">
                <img 
                  src={business.cover_image_url} 
                  alt={`${business.business_name} cover`} 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
          
          {/* Business Header */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                {business.logo_url ? (
                  <img src={business.logo_url} alt={business.business_name} className="w-full h-full object-cover" />
                ) : business.image_url ? (
                  <img src={business.image_url} alt={business.business_name} className="w-full h-full object-cover" />
                ) : (
                  <Building className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-3xl font-bold text-foreground">
                    {business.business_name}
                  </h1>
                  <div className="flex items-center gap-2">
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
                <p className="text-foreground/60 mb-4">
                  {business.description}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    <span className="text-yellow-500">★</span>
                    <span className="ml-1">{business.rating}</span>
                    <span className="text-gray-500 ml-1">({business.review_count} reviews)</span>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    Verified Business
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-lg mb-8">
            <div className="border-b">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-4 font-medium ${
                    activeTab === 'overview'
                      ? 'border-b-2 border-roam-blue text-roam-blue'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('services')}
                  className={`px-6 py-4 font-medium ${
                    activeTab === 'services'
                      ? 'border-b-2 border-roam-blue text-roam-blue'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Services ({services.length})
                </button>
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`px-6 py-4 font-medium ${
                    activeTab === 'staff'
                      ? 'border-b-2 border-roam-blue text-roam-blue'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Staff ({staff.length})
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`px-6 py-4 font-medium ${
                    activeTab === 'reviews'
                      ? 'border-b-2 border-roam-blue text-roam-blue'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Reviews
                </button>
              </div>
            </div>

            <div className="p-8">
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">About {business.business_name}</h2>
                  <p className="text-gray-600 mb-6">
                    {business.description}
                  </p>
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
                            const hours = business.business_hours?.[day];
                            return (
                              <div key={day} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                                <span className="font-medium text-gray-700">{day}</span>
                                <span className="text-gray-600">
                                  {hours ? (
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
                                  ${service.business_price || service.min_price} Starting
                                </Badge>
                              </div>
                              
                              {/* Duration Badge */}
                              <div className="mb-4">
                                <Badge variant="outline" className="text-sm">
                                  {service.business_duration_minutes || service.duration_minutes} Minutes
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
                          onClick={() => window.location.href = `/provider/${provider.user_id}`}
                        >
                          <CardContent className="p-6">
                            <div className="flex gap-4">
                              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {provider.image_url ? (
                                  <img 
                                    src={provider.image_url} 
                                    alt={`${provider.first_name} ${provider.last_name}`} 
                                    className="w-full h-full object-cover" 
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
                                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <FavoriteButton
                                      type="provider"
                                      itemId={provider.id}
                                      size="sm"
                                      variant="ghost"
                                    />
                                    <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-roam-blue transition-colors flex-shrink-0" />
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
                                    <span className="ml-1 text-sm font-medium">{provider.rating}</span>
                                    <span className="text-gray-500 ml-1 text-sm">
                                      ({provider.review_count} reviews)
                                    </span>
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
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center mb-4">
                      <span className="text-yellow-500 text-2xl">★</span>
                      <span className="text-2xl font-semibold ml-2">{business.rating}</span>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Based on {business.review_count} reviews
                    </p>
                    <p className="text-gray-500">
                      Reviews coming soon! Be the first to review this business.
                    </p>
                  </div>
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
