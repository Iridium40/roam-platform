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
import { useFavorites, Favorite } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from '@/utils/logger';

export function CustomerFavorites() {
  const { isCustomer } = useAuth();
  const { favorites, loading, error } = useFavorites();

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Favorites</h1>
          <p className="text-foreground/60">
            Manage your favorite providers and services
          </p>
        </div>
      </div>

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="providers">
            <User className="w-4 h-4 mr-2" />
            Providers ({favorites.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          {favorites.length === 0 ? (
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
              {favorites.map((favorite) => (
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
      </Tabs>
    </div>
  );
}
