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
        } else if (data) {
          setSubcategories(data);
        }
      } catch (error) {
        console.error('Error fetching subcategories:', error);
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
    <section className={`py-12 lg:py-16 relative overflow-hidden ${className}`}>
      {/* Background Image/Video */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-blue-900/40"></div>
        {/* Optional: Add background image here */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1920&h=1080&fit=crop')"
          }}
        ></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero Title */}
        <div className="max-w-4xl mx-auto mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            Book your next facial
          </h1>
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
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {loadingSubcategories ? (
              <div className="text-white/80">Loading categories...</div>
            ) : (
              <>
                {subcategories.slice(0, 9).map((subcategory) => (
                  <Button
                    key={subcategory.id}
                    variant="outline"
                    className="rounded-full px-6 py-2 bg-white/90 backdrop-blur-sm border-white/20 text-gray-700 hover:bg-white hover:text-roam-blue transition-all"
                    onClick={() => handleSubcategoryClick(subcategory.id, subcategory.name)}
                  >
                    {subcategory.name}
                  </Button>
                ))}
                {subcategories.length > 9 && (
                  <Button
                    variant="outline"
                    className="rounded-full px-6 py-2 bg-white/90 backdrop-blur-sm border-white/20 text-gray-700 hover:bg-white hover:text-roam-blue transition-all"
                    onClick={() => navigate('/businesses')}
                  >
                    More...
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}