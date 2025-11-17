import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  MapPin, 
  Star, 
  Clock, 
  Map, 
  List, 
  Filter,
  X,
  Search,
  ChevronDown,
  Building,
  Car,
  Video
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/Header";
import { cn } from "@/lib/utils";

interface Business {
  id: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  image_url: string | null;
  rating: number;
  review_count: number;
  business_locations?: BusinessLocation[];
  business_service_subcategories?: BusinessServiceSubcategory[];
}

interface BusinessLocation {
  id: string;
  location_name: string | null;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
}

interface BusinessServiceSubcategory {
  id: string;
  subcategory_id: string;
  service_subcategories?: {
    id: string;
    name: string;
    service_subcategory_type: string;
  };
}

interface Service {
  id: string;
  name: string;
  subcategory_id: string;
  service_subcategories?: {
    id: string;
    name: string;
  };
}

type ViewMode = "list" | "map" | "combo";

export default function BusinessResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const subcategoryId = searchParams.get("subcategory");
  const subcategoryName = searchParams.get("name") || "Services";
  const searchQuery = searchParams.get("q") || "";

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("combo");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch businesses by subcategory or search query
  useEffect(() => {
    const fetchBusinesses = async () => {
      // If no subcategory and no search query, show empty state
      if (!subcategoryId && !searchQuery) {
        setBusinesses([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        let businessIds: string[] = [];

        // If subcategory is provided, filter by subcategory
        if (subcategoryId) {
          // First, get all businesses that offer this subcategory
          const { data: businessSubcategories, error: subcatError } = await supabase
            .from('business_service_subcategories')
            .select(`
              business_id,
              service_subcategories!inner (
                id,
                name
              )
            `)
            .eq('subcategory_id', subcategoryId)
            .eq('is_active', true);

          if (subcatError) {
            console.error('Error fetching business subcategories:', subcatError);
            setLoading(false);
            return;
          }

          businessIds = businessSubcategories?.map(bs => bs.business_id) || [];
        } else if (searchQuery) {
          // If search query is provided, search by business name
          const { data: searchResults, error: searchError } = await supabase
            .from('business_profiles')
            .select('id')
            .ilike('business_name', `%${searchQuery}%`)
            .eq('is_active', true)
            .limit(100);

          if (searchError) {
            console.error('Error searching businesses:', searchError);
            setLoading(false);
            return;
          }

          businessIds = searchResults?.map(b => b.id) || [];
        }

        if (businessIds.length === 0) {
          setBusinesses([]);
          setLoading(false);
          return;
        }

        // Fetch business details with locations
        const { data: businessesData, error: businessesError } = await supabase
          .from('business_profiles')
          .select(`
            id,
            business_name,
            description,
            logo_url,
            image_url,
            rating,
            review_count,
            business_locations (
              id,
              location_name,
              address_line1,
              city,
              state,
              postal_code,
              latitude,
              longitude
            ),
            business_service_subcategories (
              id,
              subcategory_id,
              service_subcategories (
                id,
                name,
                service_subcategory_type
              )
            )
          `)
          .in('id', businessIds)
          .eq('is_active', true);

        if (businessesError) {
          console.error('Error fetching businesses:', businessesError);
        } else if (businessesData) {
          setBusinesses(businessesData as Business[]);
          
          // Set map center to first business location or default
          if (businessesData[0]?.business_locations?.[0]) {
            const loc = businessesData[0].business_locations[0] as BusinessLocation;
            if (loc.latitude && loc.longitude) {
              setMapCenter({ lat: loc.latitude, lng: loc.longitude });
            }
          }
        }

        // Fetch services for this subcategory (only if subcategory is provided)
        if (subcategoryId) {
          const { data: servicesData, error: servicesError } = await supabase
            .from('services')
            .select(`
              id,
              name,
              subcategory_id,
              service_subcategories (
                id,
                name
              )
            `)
            .eq('subcategory_id', subcategoryId)
            .eq('is_active', true)
            .order('name');

          if (servicesError) {
            console.error('Error fetching services:', servicesError);
          } else if (servicesData) {
            const servicesList = servicesData as Service[];
            setServices(servicesList);
            // Select all services by default
            if (servicesList.length > 0) {
              setSelectedServices(new Set(servicesList.map(s => s.id)));
            }
          }
        } else {
          // If no subcategory, clear services
          setServices([]);
          setSelectedServices(new Set());
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, [subcategoryId, searchQuery]);

  // Fetch business services for filtering
  const [businessServicesMap, setBusinessServicesMap] = useState<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    const fetchBusinessServices = async () => {
      if (!subcategoryId || services.length === 0) return;

      try {
        // Get all business_services for the selected services
        const serviceIds = Array.from(selectedServices.size > 0 ? selectedServices : new Set(services.map(s => s.id)));
        
        if (serviceIds.length === 0) return;

        const { data: businessServicesData, error } = await supabase
          .from('business_services')
          .select('business_id, service_id')
          .in('service_id', Array.from(serviceIds))
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching business services:', error);
          return;
        }

        // Create a map of business_id -> Set of service_ids
        const map = new Map<string, Set<string>>();
        businessServicesData?.forEach((bs: any) => {
          if (!map.has(bs.business_id)) {
            map.set(bs.business_id, new Set());
          }
          map.get(bs.business_id)?.add(bs.service_id);
        });

        setBusinessServicesMap(map);
      } catch (error) {
        console.error('Error fetching business services:', error);
      }
    };

    fetchBusinessServices();
  }, [subcategoryId, services, selectedServices]);

  // Filter businesses based on selected services
  const filteredBusinesses = useMemo(() => {
    if (selectedServices.size === 0) {
      // If no services selected, show all businesses with the subcategory
      return businesses;
    }

    return businesses.filter(business => {
      const businessServiceIds = businessServicesMap.get(business.id);
      if (!businessServiceIds) return false;
      
      // Check if business offers any of the selected services
      return Array.from(selectedServices).some(serviceId => 
        businessServiceIds.has(serviceId)
      );
    });
  }, [businesses, selectedServices, businessServicesMap]);

  const selectAllServices = () => {
    setSelectedServices(new Set(services.map(s => s.id)));
  };

  const deselectAllServices = () => {
    setSelectedServices(new Set());
  };

  // Get user location for map
  useEffect(() => {
    if (navigator.geolocation && !mapCenter) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Default to a central location if geolocation fails
          setMapCenter({ lat: 40.7608, lng: -111.8910 }); // Salt Lake City default
        }
      );
    }
  }, [mapCenter]);

  const getGoogleMapsUrl = (business: Business) => {
    const location = business.business_locations?.[0] as BusinessLocation | undefined;
    if (location) {
      const address = `${location.address_line1}, ${location.city}, ${location.state} ${location.postal_code}`;
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }
    return null;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      <div className="flex-1 flex flex-col">
        {/* Header Section */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {subcategoryId 
                    ? `Best ${subcategoryName} in ${searchQuery || "Your Area"}`
                    : searchQuery 
                      ? `Businesses matching "${searchQuery}"`
                      : "Search Results"}
                </h1>
                <p className="text-gray-600 mt-1">
                  {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'Business' : 'Businesses'} Available
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4 mr-2" />
                  List
                </Button>
                <Button
                  variant={viewMode === "combo" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("combo")}
                >
                  <Map className="w-4 h-4 mr-2" />
                  Map
                </Button>
              </div>
            </div>

            {/* Filter Tags */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="px-3 py-1">
                {subcategoryName}
              </Badge>
              {selectedServices.size > 0 && (
                <Badge variant="outline" className="px-3 py-1">
                  {selectedServices.size} Services Selected
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - List View */}
          {(viewMode === "list" || viewMode === "combo") && (
            <div className={cn(
              "overflow-y-auto bg-gray-50",
              viewMode === "combo" ? "w-full md:w-2/5 border-r" : "w-full"
            )}>
              <div className="p-4 space-y-4">
                {/* Service Filter */}
                {services.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm">Filter Services</h3>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={selectAllServices}
                            className="text-xs h-7"
                          >
                            Select All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={deselectAllServices}
                            className="text-xs h-7"
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {services.map((service) => (
                          <div key={service.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`service-${service.id}`}
                              checked={selectedServices.has(service.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedServices(prev => new Set([...prev, service.id]));
                                } else {
                                  setSelectedServices(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(service.id);
                                    return newSet;
                                  });
                                }
                              }}
                            />
                            <Label
                              htmlFor={`service-${service.id}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {service.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Business Listings */}
                {loading ? (
                  <div className="text-center py-12">Loading businesses...</div>
                ) : filteredBusinesses.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No businesses found matching your criteria.
                  </div>
                ) : (
                  filteredBusinesses.map((business) => (
                    <Card
                      key={business.id}
                      className={cn(
                        "cursor-pointer hover:shadow-md transition-shadow",
                        selectedBusiness?.id === business.id && "ring-2 ring-roam-blue"
                      )}
                      onClick={() => {
                        setSelectedBusiness(business);
                        const location = business.business_locations?.[0] as BusinessLocation | undefined;
                        if (location?.latitude && location?.longitude) {
                          setMapCenter({ lat: location.latitude, lng: location.longitude });
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Business Image/Logo */}
                          <div className="flex-shrink-0">
                            {business.logo_url || business.image_url ? (
                              <img
                                src={business.logo_url || business.image_url || ""}
                                alt={business.business_name}
                                className="w-20 h-20 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
                                <Building className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Business Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg mb-1 truncate">
                              {business.business_name}
                            </h3>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium ml-1">
                                  {business.rating.toFixed(1)}
                                </span>
                                <span className="text-sm text-gray-500 ml-1">
                                  ({business.review_count} Reviews)
                                </span>
                              </div>
                            </div>
                            {business.business_locations?.[0] && (
                              <div className="flex items-center text-sm text-gray-600 mb-2">
                                <MapPin className="w-4 h-4 mr-1" />
                                <span className="truncate">
                                  {(business.business_locations[0] as BusinessLocation).city}, {(business.business_locations[0] as BusinessLocation).state}
                                </span>
                              </div>
                            )}
                            {business.description && (
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {business.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {business.business_service_subcategories?.slice(0, 3).map((bss) => (
                                <Badge key={bss.id} variant="secondary" className="text-xs">
                                  {bss.service_subcategories?.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Right Panel - Map View */}
          {(viewMode === "map" || viewMode === "combo") && (
            <div className={cn(
              "bg-gray-100 relative",
              viewMode === "combo" ? "w-full md:w-3/5" : "w-full"
            )}>
              {mapCenter ? (
                <div className="w-full h-full relative">
                  {/* Build Google Maps URL with markers */}
                  {(() => {
                    const locations = filteredBusinesses
                      .map(b => b.business_locations?.[0] as BusinessLocation | undefined)
                      .filter((loc): loc is BusinessLocation => 
                        loc !== undefined && loc.latitude !== null && loc.longitude !== null
                      );

                    if (locations.length === 0) {
                      return (
                        <iframe
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps/embed/v1/view?key=${process.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&center=${mapCenter.lat},${mapCenter.lng}&zoom=12`}
                        />
                      );
                    }

                    // Build markers query string for Google Maps
                    // Note: Google Maps Embed API doesn't support multiple markers well
                    // For better functionality, consider using Google Maps JavaScript API
                    const firstLocation = locations[0];
                    const centerLat = firstLocation.latitude || mapCenter.lat;
                    const centerLng = firstLocation.longitude || mapCenter.lng;
                    
                    // Use a search-based approach that shows all businesses
                    const searchQuery = filteredBusinesses
                      .map(b => b.business_name)
                      .slice(0, 5)
                      .join('|');
                    
                    const mapUrl = `https://www.google.com/maps/embed/v1/search?key=${process.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&q=${encodeURIComponent(searchQuery)}&center=${centerLat},${centerLng}&zoom=12`;

                    return (
                      <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={mapUrl}
                      />
                    );
                  })()}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Loading map...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

