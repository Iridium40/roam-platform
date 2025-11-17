import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface HomeHeroProps {
  className?: string;
  onSearch?: (query: string) => void;
  onLocationChange?: (location: string) => void;
  onServiceSearch?: (query: string) => void;
  onTimeSelect?: (time: string) => void;
}

interface ServiceSubcategory {
  id: string;
  service_subcategory_type: string;
  name: string;
  description: string | null;
}

export function HomeHero({ 
  className = "",
  onSearch,
  onLocationChange,
  onServiceSearch,
  onTimeSelect
}: HomeHeroProps) {
  const navigate = useNavigate();
  const [businessSearch, setBusinessSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedTime, setSelectedTime] = useState("anytime");
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(true);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation(`${latitude},${longitude}`);
          onLocationChange?.(`${latitude},${longitude}`);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  // Fetch service subcategories from Supabase
  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        setLoadingSubcategories(true);
        const { data, error } = await supabase
          .from('service_subcategories')
          .select('id, service_subcategory_type, name, description')
          .eq('is_active', true)
          .order('name', { ascending: true })
          .limit(12); // Limit to top 12 for display

        if (error) {
          console.error('Error fetching subcategories:', error);
          // Set empty array on error so UI doesn't break
          setSubcategories([]);
        } else if (data) {
          console.log('✅ Loaded subcategories:', data.length);
          setSubcategories(data);
        } else {
          console.warn('No subcategories data returned');
          setSubcategories([]);
        }
      } catch (error) {
        console.error('Error fetching subcategories:', error);
        setSubcategories([]);
      } finally {
        setLoadingSubcategories(false);
      }
    };

    fetchSubcategories();
  }, []);

  const handleSubcategoryClick = (subcategoryId: string, subcategoryName: string) => {
    // Navigate to results page with subcategory filter
    navigate(`/businesses?subcategory=${subcategoryId}&name=${encodeURIComponent(subcategoryName)}`);
  };

  const handleSearch = () => {
    if (onSearch) {
      onSearch(businessSearch);
    } else {
      // Default behavior: navigate to search results
      const params = new URLSearchParams();
      if (businessSearch) params.set("q", businessSearch);
      if (serviceSearch) params.set("service", serviceSearch);
      if (selectedTime !== "anytime") params.set("time", selectedTime);
      navigate(`/businesses?${params.toString()}`);
    }
  };

  return (
    <section className={`py-20 lg:py-32 relative overflow-hidden ${className}`}>
      {/* Background Video */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {/* Video container with responsive aspect ratio */}
        <div className="absolute inset-0 w-full h-full">
          <iframe
            src="https://www.youtube.com/embed/-g5P96JAif0?autoplay=1&mute=1&loop=1&playlist=-g5P96JAif0&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&vq=hd1080"
            className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto scale-110"
            style={{
              filter: "brightness(0.7)",
              pointerEvents: "none",
              aspectRatio: "16/9",
              transform: "translate(-50%, -50%) scale(1.1)",
            }}
            frameBorder="0"
            allow="autoplay; encrypted-media"
            title="Background Video"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-roam-blue/10 via-black/5 to-roam-yellow/10 pointer-events-none"></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Logo and Tagline Section */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="mb-6">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F98c77fcac42745ca81f9db3fb7f4e366?format=webp&width=800"
              alt="ROAM Logo"
              className="mx-auto h-24 sm:h-32 lg:h-40 w-auto drop-shadow-lg"
            />
          </div>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            Florida's premier on-demand services marketplace. Connecting
            customers with verified professionals for premium services
            delivered anywhere.
          </p>
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-roam-blue/20 via-roam-light-blue/20 to-roam-yellow/20 px-6 py-2 rounded-full backdrop-blur-sm border border-white/20">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
              <span className="text-sm font-medium text-white uppercase tracking-wider">
                Discover Services
              </span>
              <div className="w-2 h-2 rounded-full bg-roam-yellow animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Search Bar Section */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Business Name or Location */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Business Name or Location"
                  value={businessSearch}
                  onChange={(e) => setBusinessSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 h-12 border-gray-200 focus:border-roam-blue focus:ring-roam-blue"
                />
                {!currentLocation && (
                  <button
                    onClick={handleGetCurrentLocation}
                    className="mt-2 text-sm text-roam-blue hover:text-roam-light-blue flex items-center gap-1"
                  >
                    <MapPin className="h-4 w-4" />
                    Current Location
                  </button>
                )}
                {currentLocation && (
                  <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Location set
                  </div>
                )}
              </div>

              {/* Search Services and Classes */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search Services and Classes"
                  value={serviceSearch}
                  onChange={(e) => {
                    setServiceSearch(e.target.value);
                    onServiceSearch?.(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 h-12 border-gray-200 focus:border-roam-blue focus:ring-roam-blue"
                />
              </div>

              {/* Anytime Dropdown */}
              <div>
                <Select value={selectedTime} onValueChange={(value) => {
                  setSelectedTime(value);
                  onTimeSelect?.(value);
                }}>
                  <SelectTrigger className="h-12 border-gray-200 focus:border-roam-blue focus:ring-roam-blue">
                    <SelectValue placeholder="Anytime" />
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anytime">Anytime</SelectItem>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="tomorrow">Tomorrow</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search Button */}
              <Button
                onClick={handleSearch}
                className="h-12 bg-roam-blue hover:bg-roam-light-blue text-white font-semibold text-lg"
              >
                Search
              </Button>
            </div>
          </div>

          {/* Service Subcategory Buttons */}
          {subcategories.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {loadingSubcategories ? (
                <div className="text-white/90 drop-shadow-md">Loading categories...</div>
              ) : (
                <>
                  {subcategories.slice(0, 9).map((subcategory) => (
                    <Button
                      key={subcategory.id}
                      variant="outline"
                      className="rounded-full px-6 py-2 bg-white/95 backdrop-blur-sm border-white/30 text-gray-800 hover:bg-white hover:text-roam-blue hover:border-roam-blue transition-all shadow-lg font-medium"
                      onClick={() => handleSubcategoryClick(subcategory.id, subcategory.name)}
                    >
                      {subcategory.name}
                    </Button>
                  ))}
                  {subcategories.length > 9 && (
                    <Button
                      variant="outline"
                      className="rounded-full px-6 py-2 bg-white/95 backdrop-blur-sm border-white/30 text-gray-800 hover:bg-white hover:text-roam-blue hover:border-roam-blue transition-all shadow-lg font-medium"
                      onClick={() => navigate('/businesses')}
                    >
                      More...
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}