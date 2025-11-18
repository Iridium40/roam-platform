import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Calendar, Star, MapPin, Share2, Clock } from "lucide-react";
import { useState, useEffect, lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { FavoriteButton } from "@/components/FavoriteButton";

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

export default function ProviderProfile() {
  const { providerId } = useParams();
  const { toast } = useToast();
  
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

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
                src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800"
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

          {/* Services */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6">Services Offered</h2>
            {services.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {services.map((service) => {
                  const isExpanded = expandedServices.has(service.id);
                  const descriptionLength = 200; // Character limit before truncation
                  const shouldTruncate = service.description.length > descriptionLength;
                  const displayDescription = isExpanded || !shouldTruncate
                    ? service.description
                    : service.description.substring(0, descriptionLength) + '...';

                  return (
                    <Card key={service.id} className="hover:shadow-md transition-shadow flex flex-col overflow-hidden">
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
            )}
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
