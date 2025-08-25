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
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  useFavorites,
  FavoriteService,
  FavoriteBusiness,
  FavoriteProvider,
} from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from '@/utils/logger';

export function CustomerFavorites() {
  const { isCustomer } = useAuth();
  const { getFavoriteServices, getFavoriteBusinesses, getFavoriteProviders } =
    useFavorites();

  const [favoriteServices, setFavoriteServices] = useState<FavoriteService[]>(
    [],
  );
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<
    FavoriteBusiness[]
  >([]);
  const [favoriteProviders, setFavoriteProviders] = useState<
    FavoriteProvider[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("services");

  useEffect(() => {
    const loadFavorites = async () => {
      if (!isCustomer) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [services, businesses, providers] = await Promise.all([
          getFavoriteServices(),
          getFavoriteBusinesses(),
          getFavoriteProviders(),
        ]);

        setFavoriteServices(services);
        setFavoriteBusinesses(businesses);
        setFavoriteProviders(providers);
      } catch (error) {
        logger.error("Error loading favorites:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFavorites();
  }, [
    isCustomer,
    getFavoriteServices,
    getFavoriteBusinesses,
    getFavoriteProviders,
  ]);

  const handleFavoriteRemoved = async () => {
    // Refresh favorites when an item is removed
    if (!isCustomer) return;

    const [services, businesses, providers] = await Promise.all([
      getFavoriteServices(),
      getFavoriteBusinesses(),
      getFavoriteProviders(),
    ]);

    setFavoriteServices(services);
    setFavoriteBusinesses(businesses);
    setFavoriteProviders(providers);
  };

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

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-roam-blue" />
        <h3 className="text-lg font-semibold mb-2">
          Loading your favorites...
        </h3>
        <p className="text-foreground/60">
          Please wait while we fetch your saved items.
        </p>
      </Card>
    );
  }

  const totalFavorites =
    favoriteServices.length +
    favoriteBusinesses.length +
    favoriteProviders.length;

  if (totalFavorites === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
        <p className="text-foreground/60 mb-4">
          Start exploring and save your favorite services, businesses, and
          providers.
        </p>
        <Button asChild className="bg-roam-blue hover:bg-roam-blue/90">
          <Link to="/">Explore Services</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          My <span className="text-roam-blue">Favorites</span>
        </h2>
        <Badge variant="outline" className="border-roam-blue text-roam-blue">
          {totalFavorites} items saved
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Services ({favoriteServices.length})
          </TabsTrigger>
          <TabsTrigger value="businesses" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Businesses ({favoriteBusinesses.length})
          </TabsTrigger>
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Providers ({favoriteProviders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          {favoriteServices.length === 0 ? (
            <Card className="p-6 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">No favorite services</h3>
              <p className="text-sm text-foreground/60">
                Save services you're interested in to book them later.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteServices.map((service) => (
                <Card
                  key={service.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <div className="relative">
                    <img
                      src={
                        service.image_url ||
                        "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&h=300&fit=crop"
                      }
                      alt={service.service_name}
                      className="w-full h-40 object-cover rounded-t-lg"
                    />
                    <div className="absolute top-3 right-3">
                      <FavoriteButton
                        type="service"
                        itemId={service.service_id}
                        size="sm"
                        variant="ghost"
                        className="bg-white/90 hover:bg-white"
                      />
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">
                      {service.service_name}
                    </h3>
                    <p className="text-sm text-foreground/60 mb-3 line-clamp-2">
                      {service.service_description}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-roam-blue">
                        ${service.min_price}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {service.duration_minutes} min
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="text-xs mb-3">
                      {service.service_category_type}
                    </Badge>
                    <Button
                      asChild
                      size="sm"
                      className="w-full bg-roam-blue hover:bg-roam-blue/90"
                    >
                      <Link to={`/book-service/${service.service_id}`}>
                        <Calendar className="w-4 h-4 mr-2" />
                        Book Now
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="businesses" className="space-y-4">
          {favoriteBusinesses.length === 0 ? (
            <Card className="p-6 text-center">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">No favorite businesses</h3>
              <p className="text-sm text-foreground/60">
                Save businesses you love to easily find them later.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favoriteBusinesses.map((business) => (
                <Card
                  key={business.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <div className="relative">
                    <img
                      src={
                        business.cover_image_url ||
                        business.image_url ||
                        "https://images.unsplash.com/photo-1560472355-536de3962603?w=500&h=200&fit=crop"
                      }
                      alt={business.business_name}
                      className="w-full h-32 object-cover rounded-t-lg"
                    />
                    <div className="absolute top-3 right-3">
                      <FavoriteButton
                        type="business"
                        itemId={business.business_id}
                        size="sm"
                        variant="ghost"
                        className="bg-white/90 hover:bg-white"
                      />
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={
                          business.logo_url ||
                          "https://images.unsplash.com/photo-1560472355-536de3962603?w=100&h=100&fit=crop"
                        }
                        alt={`${business.business_name} logo`}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">
                          {business.business_name}
                        </h3>
                        <p className="text-sm text-foreground/60 mb-2">
                          {business.business_type}
                        </p>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge
                            variant={
                              business.verification_status === "approved"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {business.verification_status === "approved"
                              ? "Verified"
                              : "Pending"}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            asChild
                            size="sm"
                            className="flex-1 bg-roam-blue hover:bg-roam-blue/90"
                          >
                            <Link to={`/book/${business.business_id}`}>
                              <Calendar className="w-4 h-4 mr-2" />
                              Book Services
                            </Link>
                          </Button>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
                          >
                            <Link to={`/business/${business.business_id}`}>
                              <Building className="w-4 h-4 mr-2" />
                              View Business
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          {favoriteProviders.length === 0 ? (
            <Card className="p-6 text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">No favorite providers</h3>
              <p className="text-sm text-foreground/60">
                Save providers you trust to book with them again.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favoriteProviders.map((provider) => (
                <Card
                  key={provider.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {provider.image_url ? (
                          <img
                            src={provider.image_url}
                            alt={`${provider.first_name} ${provider.last_name}`}
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
                              {provider.first_name} {provider.last_name}
                            </h3>
                            <p className="text-sm text-foreground/60">
                              {provider.business_name}
                            </p>
                            {provider.experience_years && (
                              <p className="text-xs text-foreground/50">
                                {provider.experience_years} years experience
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-1 mb-1">
                              <Star className="w-4 h-4 text-roam-warning fill-current" />
                              <span className="font-semibold">
                                {provider.average_rating?.toFixed(1) || "4.8"}
                              </span>
                              <span className="text-sm text-foreground/60">
                                ({provider.total_reviews || 0})
                              </span>
                            </div>
                          </div>
                        </div>

                        {provider.bio && (
                          <p className="text-sm text-foreground/70 mb-3 line-clamp-2">
                            {provider.bio}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <Button
                            asChild
                            size="sm"
                            className="flex-1 bg-roam-blue hover:bg-roam-blue/90"
                          >
                            <Link
                              to={`/provider/${provider.provider_id}?booking=true`}
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
                            <Link to={`/provider/${provider.provider_id}`}>
                              View Profile
                            </Link>
                          </Button>
                          <FavoriteButton
                            type="provider"
                            itemId={provider.provider_id}
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
      </Tabs>
    </div>
  );
}
