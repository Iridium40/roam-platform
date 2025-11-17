import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MapPin, 
  Star, 
  Clock, 
  Map as MapIcon, 
  List, 
  Filter,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Building,
  Car,
  Video,
  Store,
  ExternalLink,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/Header";
import { cn } from "@/lib/utils";

// Declare global Google Maps types
declare global {
  interface Window {
    google?: typeof google;
  }
}

interface Business {
  id: string;
  business_name: string;
  business_description?: string | null;
  description?: string | null; // For backward compatibility
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
  offers_mobile_services?: boolean | null;
  mobile_service_radius?: number | null;
}

interface BusinessServiceSubcategory {
  id: string;
  subcategory_id: string;
  service_subcategories?: {
    id: string;
    service_subcategory_type: string;
  };
}

// Helper function to format subcategory type enum to display name
const formatSubcategoryName = (type: string): string => {
  const nameMap: Record<string, string> = {
    'hair_and_makeup': 'Hair & Makeup',
    'spray_tan': 'Spray Tan',
    'esthetician': 'Esthetician',
    'massage_therapy': 'Massage Therapy',
    'iv_therapy': 'IV Therapy',
    'physical_therapy': 'Physical Therapy',
    'nurse_practitioner': 'Nurse Practitioner',
    'physician': 'Physician',
    'chiropractor': 'Chiropractor',
    'yoga_instructor': 'Yoga Instructor',
    'pilates_instructor': 'Pilates Instructor',
    'personal_trainer': 'Personal Trainer',
    'injectables': 'Injectables',
    'health_coach': 'Health Coach',
  };
  return nameMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

interface Service {
  id: string;
  name: string;
  subcategory_id: string;
  service_subcategories?: {
    id: string;
    service_subcategory_type: string;
  };
}

type ViewMode = "list" | "map" | "combo";

export default function BusinessResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const subcategoryId = searchParams.get("subcategory");
  const subcategoryName = searchParams.get("name") || "Services";
  const searchQuery = searchParams.get("q") || "";
  const locationParam = searchParams.get("location") || "30.3226432,-86.1447833"; // Default to Seaside, FL

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("combo");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"all" | "at_business" | "mobile">("all");
  const [sortBy, setSortBy] = useState<"distance" | "price" | "rating">("distance");
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<google.maps.Map | null>(null);
  const markersRef = React.useRef<google.maps.Marker[]>([]);

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
        
        // Build query parameters
        const params = new URLSearchParams();
        if (subcategoryId) {
          params.append('subcategoryId', subcategoryId);
        }
        if (searchQuery) {
          params.append('searchQuery', searchQuery);
        }
        // Always include location parameter for proximity filtering
        if (locationParam) {
          params.append('location', locationParam);
        }

        // Call API endpoint to fetch businesses
        const response = await fetch(`/api/businesses/search?${params.toString()}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error fetching businesses:', errorData);
          setBusinesses([]);
          setLoading(false);
          return;
        }

        const { businesses: businessesData, services: servicesData, centerLocation } = await response.json();

        // Set businesses data (API already includes locations and filters by proximity)
        if (businessesData && Array.isArray(businessesData)) {
          // Map business_description to description for component compatibility
          const mappedBusinesses = businessesData.map((b: any) => ({
            ...b,
            description: b.business_description || b.description || null
          }));
          setBusinesses(mappedBusinesses as Business[]);
          
          // Set map center to the provided center location (default location) or first business location
          if (centerLocation && centerLocation.lat && centerLocation.lng) {
            setMapCenter({ lat: centerLocation.lat, lng: centerLocation.lng });
          } else if (businessesData[0]?.business_locations?.[0]) {
            const loc = businessesData[0].business_locations[0] as BusinessLocation;
            if (loc.latitude && loc.longitude) {
              setMapCenter({ lat: loc.latitude, lng: loc.longitude });
            }
          } else if (locationParam) {
            // Fallback to parsing the location parameter
            const [lat, lng] = locationParam.split(',').map(Number);
            if (!isNaN(lat) && !isNaN(lng)) {
              setMapCenter({ lat, lng });
            }
          }
        } else {
          setBusinesses([]);
          // Still set map center to default location even if no businesses found
          if (locationParam) {
            const [lat, lng] = locationParam.split(',').map(Number);
            if (!isNaN(lat) && !isNaN(lng)) {
              setMapCenter({ lat, lng });
            }
          }
        }

        // Handle services data
        if (subcategoryId && servicesData && Array.isArray(servicesData)) {
          const servicesList = servicesData as Service[];
          setServices(servicesList);
          // Select all services by default
          if (servicesList.length > 0) {
            const serviceIds = servicesList
              .filter(s => s && s.id)
              .map(s => s.id);
            if (serviceIds.length > 0) {
              setSelectedServices(new Set(serviceIds));
            }
          }
        } else {
          // If no subcategory, clear services
          setServices([]);
          setSelectedServices(new Set());
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setBusinesses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, [subcategoryId, searchQuery, locationParam]);

  // Fetch business services for filtering
  const [businessServicesMap, setBusinessServicesMap] = useState<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    const fetchBusinessServices = async () => {
      if (!subcategoryId || !services || !Array.isArray(services) || services.length === 0) return;

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

  // Helper function to calculate distance
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter and sort businesses
  const filteredBusinesses = useMemo(() => {
    let filtered = businesses;

    // Filter by selected services
    if (selectedServices.size > 0) {
      filtered = filtered.filter(business => {
        const businessServiceIds = businessServicesMap.get(business.id);
        if (!businessServiceIds) return false;
        
        // Check if business offers any of the selected services
        return Array.from(selectedServices).some(serviceId => 
          businessServiceIds.has(serviceId)
        );
      });
    }

    // Filter by delivery type
    if (deliveryType !== "all") {
      filtered = filtered.filter(business => {
        const locations = business.business_locations || [];
        if (locations.length === 0) return false;

        if (deliveryType === "mobile") {
          // Business must have at least one location offering mobile services
          return locations.some((loc: BusinessLocation) => loc.offers_mobile_services === true);
        } else if (deliveryType === "at_business") {
          // Business must have at least one location that doesn't offer mobile services (or has a physical location)
          return locations.some((loc: BusinessLocation) => 
            loc.offers_mobile_services !== true || loc.latitude !== null
          );
        }
        return true;
      });
    }

    // Sort businesses
    if (sortBy === "distance" && mapCenter) {
      filtered = [...filtered].sort((a, b) => {
        const aLoc = a.business_locations?.[0] as BusinessLocation | undefined;
        const bLoc = b.business_locations?.[0] as BusinessLocation | undefined;
        
        if (!aLoc?.latitude || !aLoc?.longitude) return 1;
        if (!bLoc?.latitude || !bLoc?.longitude) return -1;

        const aDist = calculateDistance(
          mapCenter.lat,
          mapCenter.lng,
          aLoc.latitude,
          aLoc.longitude
        );
        const bDist = calculateDistance(
          mapCenter.lat,
          mapCenter.lng,
          bLoc.latitude,
          bLoc.longitude
        );
        
        return aDist - bDist;
      });
    } else if (sortBy === "price") {
      // Sort by minimum service price (we'll need to fetch this or use a default)
      // For now, we'll sort by rating as a fallback
      filtered = [...filtered].sort((a, b) => {
        // TODO: Fetch actual min prices from business_services
        // For now, use rating as proxy
        return (b.rating || 0) - (a.rating || 0);
      });
    } else if (sortBy === "rating") {
      filtered = [...filtered].sort((a, b) => {
        return (b.rating || 0) - (a.rating || 0);
      });
    }

    return filtered;
  }, [businesses, selectedServices, businessServicesMap, deliveryType, sortBy, mapCenter]);

  const selectAllServices = () => {
    if (services && Array.isArray(services) && services.length > 0) {
      const serviceIds = services
        .filter(s => s && s.id)
        .map(s => s.id);
      if (serviceIds.length > 0) {
        setSelectedServices(new Set(serviceIds));
      }
    }
  };

  const deselectAllServices = () => {
    setSelectedServices(new Set());
  };

  // Set default map center based on location parameter
  useEffect(() => {
    if (!mapCenter && locationParam) {
      const [lat, lng] = locationParam.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        setMapCenter({ lat, lng });
      }
    }
  }, [locationParam, mapCenter]);

  // Load Google Maps script
  useEffect(() => {
    const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not configured');
      return;
    }

    // Check if already loaded
    if (window.google?.maps) {
      setMapsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps) {
          setMapsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    // Load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapsLoaded(true);
    script.onerror = () => console.error('Failed to load Google Maps script');
    document.head.appendChild(script);
  }, []);

  // Initialize map when loaded and center is available
  useEffect(() => {
    if (!mapsLoaded || !mapCenter || !mapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: mapCenter,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [mapsLoaded, mapCenter]);

  // Update markers when businesses change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapsLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add markers for each business location
    filteredBusinesses.forEach((business) => {
      const locations = business.business_locations || [];
      locations.forEach((location: BusinessLocation) => {
        if (location.latitude && location.longitude) {
          const marker = new google.maps.Marker({
            position: { lat: location.latitude, lng: location.longitude },
            map: mapInstanceRef.current!,
            title: business.business_name,
            animation: google.maps.Animation.DROP,
          });

          // Add info window
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; min-width: 200px;">
                <h3 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">${business.business_name}</h3>
                ${location.address_line1 ? `<p style="margin: 0; font-size: 12px; color: #666;">${location.address_line1}, ${location.city}, ${location.state}</p>` : ''}
                ${business.rating ? `<p style="margin: 4px 0 0 0; font-size: 12px;">⭐ ${business.rating.toFixed(1)} (${business.review_count} reviews)</p>` : ''}
              </div>
            `,
          });

          // Store info window reference on marker
          (marker as any).infoWindow = infoWindow;

          // Add click listener to select business and show info window
          marker.addListener('click', () => {
            setSelectedBusiness(business);
            // Center map on marker with appropriate zoom level
            mapInstanceRef.current?.setCenter({ lat: location.latitude!, lng: location.longitude! });
            // Use zoom level 14 for better context (not too close, not too far)
            mapInstanceRef.current?.setZoom(14);
            
            // Close all other info windows
            markersRef.current.forEach(m => {
              if (m !== marker) {
                const iw = (m as any).infoWindow;
                if (iw) iw.close();
              }
            });
            
            // Open info window for this marker
            infoWindow.open(mapInstanceRef.current!, marker);
          });

          markersRef.current.push(marker);
        }
      });
    });

    // Fit bounds to show all markers
    if (markersRef.current.length > 0) {
      if (markersRef.current.length === 1) {
        // For single marker, center on it with a reasonable zoom level to show surrounding area
        const position = markersRef.current[0].getPosition();
        if (position) {
          mapInstanceRef.current.setCenter(position);
          mapInstanceRef.current.setZoom(13); // Zoom level 13 shows a good area around the business
        }
      } else {
        // For multiple markers, fit bounds with padding
        const bounds = new google.maps.LatLngBounds();
        markersRef.current.forEach(marker => {
          const position = marker.getPosition();
          if (position) bounds.extend(position);
        });
        mapInstanceRef.current.fitBounds(bounds, {
          padding: { top: 50, right: 50, bottom: 50, left: 50 }
        });
        
        // Limit max zoom to prevent zooming in too far
        const listener = google.maps.event.addListener(mapInstanceRef.current, 'bounds_changed', () => {
          if (mapInstanceRef.current.getZoom()! > 15) {
            mapInstanceRef.current.setZoom(15);
          }
          google.maps.event.removeListener(listener);
        });
      }
    }
  }, [filteredBusinesses, mapsLoaded]);

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
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            {/* Back Button */}
            <div className="mb-3 sm:mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/booknow')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Search
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
                  {subcategoryId 
                    ? `Best ${subcategoryName} in ${searchQuery || "Your Area"}`
                    : searchQuery 
                      ? `Businesses matching "${searchQuery}"`
                      : "Search Results"}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'Business' : 'Businesses'} Available
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="text-xs sm:text-sm"
                >
                  <List className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">List</span>
                </Button>
                <Button
                  variant={(viewMode === "map" || viewMode === "combo") ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    // On mobile (< 768px), use map view only. On desktop, use combo
                    const isMobile = window.innerWidth < 768;
                    setViewMode(isMobile ? "map" : "combo");
                  }}
                  className="text-xs sm:text-sm"
                >
                  <MapIcon className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Map</span>
                </Button>
              </div>
            </div>

            {/* Filter Tags */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="px-2 py-0.5 sm:px-3 sm:py-1 text-xs">
                {subcategoryName}
              </Badge>
              {selectedServices.size > 0 && (
                <Badge variant="outline" className="px-2 py-0.5 sm:px-3 sm:py-1 text-xs">
                  {selectedServices.size} Services Selected
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={cn(
          "flex-1 overflow-hidden",
          viewMode === "combo" ? "flex flex-col md:flex-row" : "flex flex-col"
        )}>
          {/* Left Panel - List View */}
          {(viewMode === "list" || viewMode === "combo") && (
            <div className={cn(
              "overflow-y-auto bg-gray-50",
              viewMode === "combo" ? "w-full md:w-2/5 border-r" : "w-full"
            )}>
              <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                {/* Sort and Delivery Type Filters */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 sm:gap-3">
                  {/* Sort Dropdown */}
                  <Card>
                    <CardContent className="p-2 sm:p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs sm:text-sm font-medium">Sort by</Label>
                        <Select value={sortBy} onValueChange={(value: "distance" | "price" | "rating") => setSortBy(value)}>
                          <SelectTrigger className="w-[120px] sm:w-[140px] h-7 sm:h-8 text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="distance">Distance</SelectItem>
                            <SelectItem value="price">Price</SelectItem>
                            <SelectItem value="rating">Rating</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Delivery Type Filter */}
                  <Card>
                    <CardContent className="p-2 sm:p-3">
                      <Label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Location Type</Label>
                      <div className="flex gap-1.5 sm:gap-2">
                        <Button
                          variant={deliveryType === "at_business" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDeliveryType(deliveryType === "at_business" ? "all" : "at_business")}
                          className={cn(
                            "flex-1 h-8 sm:h-9 text-xs sm:text-sm",
                            deliveryType === "at_business" && "bg-roam-blue hover:bg-roam-light-blue"
                          )}
                        >
                          <Store className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                          <span className="hidden sm:inline">At Business</span>
                          <span className="sm:hidden">At Business</span>
                        </Button>
                        <Button
                          variant={deliveryType === "mobile" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDeliveryType(deliveryType === "mobile" ? "all" : "mobile")}
                          className={cn(
                            "flex-1 h-8 sm:h-9 text-xs sm:text-sm",
                            deliveryType === "mobile" && "bg-roam-blue hover:bg-roam-light-blue"
                          )}
                        >
                          <Car className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Mobile Services</span>
                          <span className="sm:hidden">Mobile</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Service Filter */}
                {services && Array.isArray(services) && services.length > 0 && (
                  <Card>
                    <CardContent className="p-2 sm:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                          className="flex items-center gap-1.5 sm:gap-2 font-semibold text-xs sm:text-sm hover:text-roam-blue transition-colors flex-1 min-w-0"
                        >
                          <span className="truncate">Filter Services</span>
                          {selectedServices.size > 0 && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {selectedServices.size}
                            </Badge>
                          )}
                          {isFilterExpanded ? (
                            <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                          ) : (
                            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                          )}
                        </button>
                        <div className="flex gap-1 sm:gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={selectAllServices}
                            className="text-xs h-7 px-2 sm:px-3"
                          >
                            <span className="hidden sm:inline">Select All</span>
                            <span className="sm:hidden">All</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={deselectAllServices}
                            className="text-xs h-7 px-2 sm:px-3"
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      {isFilterExpanded && (
                        <div className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                          {services && Array.isArray(services) && services
                            .filter(service => service && service.id && service.name)
                            .map((service) => (
                              <div key={service.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`service-${service.id}`}
                                  checked={selectedServices.has(service.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedServices(prev => new Set([...Array.from(prev), service.id]));
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
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Business Listings */}
                {loading ? (
                  <div className="text-center py-8 sm:py-12 text-sm sm:text-base">Loading businesses...</div>
                ) : filteredBusinesses.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
                    No businesses found matching your criteria.
                  </div>
                ) : (
                  filteredBusinesses.map((business) => (
                    <Card
                      key={business.id}
                      className={cn(
                        "cursor-pointer hover:shadow-md transition-shadow relative",
                        selectedBusiness?.id === business.id && "ring-2 ring-roam-blue"
                      )}
                      onClick={() => {
                        // Navigate to business profile with Services tab active
                        navigate(`/business/${business.id}?tab=services`);
                      }}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex gap-3 sm:gap-4">
                          {/* Business Image/Logo */}
                          <div className="flex-shrink-0">
                            {business.logo_url || business.image_url ? (
                              <img
                                src={business.logo_url || business.image_url || ""}
                                alt={business.business_name}
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-200 flex items-center justify-center">
                                <Building className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Business Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base sm:text-lg mb-1 truncate">
                              {business.business_name}
                            </h3>
                            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                              <div className="flex items-center">
                                <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs sm:text-sm font-medium ml-1">
                                  {business.rating.toFixed(1)}
                                </span>
                                <span className="text-xs sm:text-sm text-gray-500 ml-1">
                                  ({business.review_count} Reviews)
                                </span>
                              </div>
                            </div>
                            {business.business_locations?.[0] && (
                              <div className="flex items-center text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="truncate">
                                  {(business.business_locations[0] as BusinessLocation).city}, {(business.business_locations[0] as BusinessLocation).state}
                                </span>
                              </div>
                            )}
                            {business.description && (
                              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                                {business.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {business.business_service_subcategories?.slice(0, 3).map((bss) => (
                                <Badge key={bss.id} variant="secondary" className="text-xs px-1.5 py-0.5">
                                  {bss.service_subcategories?.service_subcategory_type 
                                    ? formatSubcategoryName(bss.service_subcategories.service_subcategory_type)
                                    : 'Service'}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Book Now Button */}
                          <div className="flex-shrink-0 flex items-center">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent card click
                                // Navigate to booking flow
                                const firstServiceId = selectedServices.size > 0 
                                  ? Array.from(selectedServices)[0]
                                  : services && services.length > 0 
                                    ? services[0].id 
                                    : null;
                                
                                if (firstServiceId) {
                                  navigate(`/book-service/${firstServiceId}?business_id=${business.id}`);
                                } else {
                                  // If no service available, navigate to business profile
                                  navigate(`/business/${business.id}`);
                                }
                              }}
                              className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm bg-roam-blue hover:bg-roam-light-blue text-white"
                              title="Book this business"
                            >
                              <span className="hidden sm:inline">Book Now</span>
                              <span className="sm:hidden">Book</span>
                              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 sm:ml-1.5" />
                            </Button>
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
              viewMode === "combo" ? "w-full md:w-3/5 h-[400px] md:h-auto" : "w-full h-[400px] md:h-auto"
            )}>
              {mapCenter ? (
                <div className="w-full h-full relative">
                  {mapsLoaded ? (
                    <div ref={mapRef} className="w-full h-full" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Loading map...
                    </div>
                  )}
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

