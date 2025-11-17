import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FavoriteButton } from "@/components/FavoriteButton";
import {
  Heart,
  Star,
  Clock,
  Calendar,
  MapPin,
  Building,
  User,
  Package,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useFavorites, Favorite } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { logger } from '@/utils/logger';

interface ServiceFavorite {
  id: string;
  customer_id: string;
  service_id: string;
  created_at: string;
  services: {
    id: string;
    name: string;
    description: string | null;
    min_price: number | null;
    image_url: string | null;
  };
}

interface BusinessFavorite {
  id: string;
  customer_id: string;
  business_id: string;
  created_at: string;
  business_profiles: {
    id: string;
    business_name: string;
    business_description: string | null;
    image_url: string | null;
    logo_url: string | null;
  };
}

export function CustomerFavorites() {
  const { isCustomer, customer } = useAuth();
  const { favorites: providerFavorites, loading: providersLoading, error: providersError } = useFavorites();
  const [serviceFavorites, setServiceFavorites] = useState<ServiceFavorite[]>([]);
  const [businessFavorites, setBusinessFavorites] = useState<BusinessFavorite[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [businessesLoading, setBusinessesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [businessesError, setBusinessesError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      loadServiceFavorites();
      loadBusinessFavorites();
    }
  }, [customer]);

  const loadServiceFavorites = async () => {
    if (!customer) return;

    try {
      setServicesLoading(true);
      setServicesError(null);

      const { data, error } = await supabase
        .from("customer_favorite_services")
        .select(`
          id,
          customer_id,
          service_id,
          created_at,
          services (
            id,
            name,
            description,
            min_price,
            image_url
          )
        `)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServiceFavorites(data || []);
    } catch (err) {
      logger.error("Error loading service favorites:", err);
      setServicesError(err instanceof Error ? err.message : "Failed to load service favorites");
    } finally {
      setServicesLoading(false);
    }
  };

  const loadBusinessFavorites = async () => {
    if (!customer) return;

    try {
      setBusinessesLoading(true);
      setBusinessesError(null);

      const { data, error } = await supabase
        .from("customer_favorite_businesses")
        .select(`
          id,
          customer_id,
          business_id,
          created_at,
          business_profiles (
            id,
            business_name,
            business_description,
            image_url,
            logo_url
          )
        `)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBusinessFavorites(data || []);
    } catch (err) {
      logger.error("Error loading business favorites:", err);
      setBusinessesError(err instanceof Error ? err.message : "Failed to load business favorites");
    } finally {
      setBusinessesLoading(false);
    }
  };

  const removeServiceFavorite = async (serviceId: string) => {
    if (!customer) return;

    try {
      const { error } = await supabase
        .from("customer_favorite_services")
        .delete()
        .eq("customer_id", customer.id)
        .eq("service_id", serviceId);

      if (error) throw error;
      await loadServiceFavorites();
    } catch (err) {
      logger.error("Error removing service favorite:", err);
    }
  };

  const removeBusinessFavorite = async (businessId: string) => {
    if (!customer) return;

    try {
      const { error } = await supabase
        .from("customer_favorite_businesses")
        .delete()
        .eq("customer_id", customer.id)
        .eq("business_id", businessId);

      if (error) throw error;
      await loadBusinessFavorites();
    } catch (err) {
      logger.error("Error removing business favorite:", err);
    }
  };

  const loading = providersLoading || servicesLoading || businessesLoading;
  const error = providersError || servicesError || businessesError;

  if (!isCustomer) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
        <p className="text-foreground/60 mb-4">
          Please sign in to view and manage your favorites.
        </p>
        <Button asChild className="bg-roam-blue hover:bg-roam-blue/90">
          <Link to="/?signin=true">Sign In</Link>
        </Button>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-roam-blue" />
        <h3 className="text-lg font-semibold mb-2">Loading Favorites</h3>
        <p className="text-foreground/60">Please wait while we load your favorites...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Error Loading Favorites</h3>
        <p className="text-foreground/60 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} className="bg-roam-blue hover:bg-roam-blue/90">
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back to Home Button */}
        <div className="mb-6">
          <Link to="/booknow">
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-foreground/70 hover:text-foreground hover:bg-accent/50 px-3 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Favorites</h1>
            <p className="text-muted-foreground">
              Manage your favorite services, providers, and businesses
            </p>
          </div>
        </div>

        <Tabs defaultValue="services" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="services">
              <Package className="w-4 h-4 mr-2" />
              Services ({serviceFavorites.length})
            </TabsTrigger>
            <TabsTrigger value="providers">
              <User className="w-4 h-4 mr-2" />
              Providers ({providerFavorites.length})
            </TabsTrigger>
            <TabsTrigger value="businesses">
              <Building className="w-4 h-4 mr-2" />
              Businesses ({businessFavorites.length})
            </TabsTrigger>
          </TabsList>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-4">
            {serviceFavorites.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Favorite Services</h3>
                <p className="text-foreground/60 mb-4">
                  You haven't added any services to your favorites yet.
                </p>
                <Button asChild className="bg-roam-blue hover:bg-roam-blue/90">
                  <Link to="/">Browse Services</Link>
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {serviceFavorites.map((favorite) => (
                  <Card key={favorite.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {favorite.services.image_url ? (
                            <img
                              src={favorite.services.image_url}
                              alt={favorite.services.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-1 truncate">
                            {favorite.services.name}
                          </h3>
                          {favorite.services.description && (
                            <p className="text-sm text-foreground/60 line-clamp-2 mb-2">
                              {favorite.services.description}
                            </p>
                          )}
                          {favorite.services.min_price && (
                            <p className="text-sm font-semibold text-roam-blue">
                              From ${favorite.services.min_price}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeServiceFavorite(favorite.service_id)}
                          className="flex-1"
                        >
                          <Heart className="w-4 h-4 mr-1 fill-current" />
                          Remove
                        </Button>
                        <Button 
                          asChild 
                          size="sm" 
                          className="flex-1 bg-roam-blue hover:bg-roam-blue/90"
                        >
                          <Link to={`/book-service/${favorite.service_id}`}>
                            <Calendar className="w-4 h-4 mr-2" />
                            Book Now
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Providers Tab */}
          <TabsContent value="providers" className="space-y-4">
            {providerFavorites.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Favorite Providers</h3>
                <p className="text-foreground/60 mb-4">
                  You haven't added any providers to your favorites yet.
                </p>
                <Button asChild className="bg-roam-blue hover:bg-roam-blue/90">
                  <Link to="/">Browse Providers</Link>
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providerFavorites.map((favorite) => (
                <Card
                  key={favorite.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {favorite.providers.image_url ? (
                          <img
                            src={favorite.providers.image_url}
                            alt={`${favorite.providers.first_name} ${favorite.providers.last_name}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {favorite.providers.first_name} {favorite.providers.last_name}
                            </h3>
                            <p className="text-sm text-foreground/60">
                              {favorite.providers.business_profiles?.business_name}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            asChild
                            size="sm"
                            className="flex-1 bg-roam-blue hover:bg-roam-blue/90"
                          >
                            <Link
                              to={`/provider/${favorite.provider_id}?booking=true`}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Book Now
                            </Link>
                          </Button>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
                          >
                            <Link to={`/provider/${favorite.provider_id}`}>
                              View Profile
                            </Link>
                          </Button>
                          <FavoriteButton
                            type="provider"
                            itemId={favorite.provider_id}
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-600 hover:bg-gray-50"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          </TabsContent>

          {/* Businesses Tab */}
          <TabsContent value="businesses" className="space-y-4">
            {businessFavorites.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Favorite Businesses</h3>
                <p className="text-foreground/60 mb-4">
                  You haven't added any businesses to your favorites yet.
                </p>
                <Button asChild className="bg-roam-blue hover:bg-roam-blue/90">
                  <Link to="/">Browse Businesses</Link>
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {businessFavorites.map((favorite) => (
                  <Card key={favorite.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {favorite.business_profiles.logo_url || favorite.business_profiles.image_url ? (
                            <img
                              src={favorite.business_profiles.logo_url || favorite.business_profiles.image_url || ''}
                              alt={favorite.business_profiles.business_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building className="w-8 h-8 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-1 truncate">
                            {favorite.business_profiles.business_name}
                          </h3>
                          {favorite.business_profiles.business_description && (
                            <p className="text-sm text-foreground/60 line-clamp-2 mb-2">
                              {favorite.business_profiles.business_description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeBusinessFavorite(favorite.business_id)}
                          className="flex-1"
                        >
                          <Heart className="w-4 h-4 mr-1 fill-current" />
                          Remove
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          className="flex-1 bg-roam-blue hover:bg-roam-blue/90"
                        >
                          <Link to={`/business/${favorite.business_id}`}>
                            View Profile
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
