import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, MapPin, ChevronDown, X } from "lucide-react";
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
  description: string | null;
  category_id?: string;
  service_categories?: {
    id: string;
    service_category_type: string;
    description: string | null;
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

interface CategoryWithSubcategories {
  id: string;
  service_category_type: string;
  description: string | null;
  subcategories: ServiceSubcategory[];
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
  const [featuredSubcategories, setFeaturedSubcategories] = useState<ServiceSubcategory[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryWithSubcategories[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(true);
  const [showMoreModal, setShowMoreModal] = useState(false);

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

  // Fetch featured subcategories and all categories with subcategories
  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        setLoadingSubcategories(true);
        
        // Fetch specific featured subcategories by type (enum values)
        const featuredTypes = [
          'hair_and_makeup',
          'massage_therapy',
          'iv_therapy',
          'yoga_instructor',
          'physician'
        ];

        const { data: featuredData, error: featuredError } = await supabase
          .from('service_subcategories')
          .select('id, service_subcategory_type, description, category_id')
          .in('service_subcategory_type', featuredTypes)
          .eq('is_active', true);

        if (featuredError) {
          console.error('Error fetching featured subcategories:', featuredError);
        } else if (featuredData) {
          // Sort to match the order requested
          const orderMap: Record<string, number> = {
            'hair_and_makeup': 1,
            'massage_therapy': 2,
            'iv_therapy': 3,
            'yoga_instructor': 4,
            'physician': 5,
          };
          const sorted = featuredData.sort((a, b) => {
            const orderA = orderMap[a.service_subcategory_type] || 999;
            const orderB = orderMap[b.service_subcategory_type] || 999;
            return orderA - orderB;
          });
          setFeaturedSubcategories(sorted);
        }

        // Fetch all categories with their subcategories for the modal
        // Use left join (no !inner) to get all categories, even if they have no subcategories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('service_categories')
          .select(`
            id,
            service_category_type,
            description,
            service_subcategories (
              id,
              service_subcategory_type,
              description,
              is_active
            )
          `)
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (categoriesError) {
          console.error('Error fetching categories:', categoriesError);
        } else if (categoriesData) {
          const organized = categoriesData.map((cat: any) => ({
            id: cat.id,
            service_category_type: cat.service_category_type,
            description: cat.description,
            subcategories: (cat.service_subcategories || [])
              .filter((sub: any) => sub.is_active !== false)
              .map((sub: any) => ({
                ...sub,
                // Add formatted name for display
                displayName: formatSubcategoryName(sub.service_subcategory_type),
              })),
          }));
          setAllCategories(organized);
        }
      } catch (error) {
        console.error('Error fetching subcategories:', error);
      } finally {
        setLoadingSubcategories(false);
      }
    };

    fetchSubcategories();
  }, []);

  const handleSubcategoryClick = (subcategoryId: string, subcategoryType: string) => {
    // Navigate to results page with subcategory filter
    const displayName = formatSubcategoryName(subcategoryType);
    navigate(`/businesses?subcategory=${subcategoryId}&name=${encodeURIComponent(displayName)}`);
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
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {loadingSubcategories ? (
              <div className="text-white/90 drop-shadow-md">Loading categories...</div>
            ) : (
              <>
                {featuredSubcategories.map((subcategory) => (
                  <Button
                    key={subcategory.id}
                    variant="outline"
                    className="rounded-full px-6 py-2 bg-white/95 backdrop-blur-sm border-white/30 text-gray-800 hover:bg-white hover:text-roam-blue hover:border-roam-blue transition-all shadow-lg font-medium"
                    onClick={() => handleSubcategoryClick(subcategory.id, subcategory.service_subcategory_type)}
                  >
                    {formatSubcategoryName(subcategory.service_subcategory_type)}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  className="rounded-full px-6 py-2 bg-white/95 backdrop-blur-sm border-white/30 text-gray-800 hover:bg-white hover:text-roam-blue hover:border-roam-blue transition-all shadow-lg font-medium"
                  onClick={() => setShowMoreModal(true)}
                >
                  More...
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* More Categories Modal */}
      <Dialog open={showMoreModal} onOpenChange={setShowMoreModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">All Service Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-8 mt-4">
            {allCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No categories available</div>
            ) : (
              allCategories
                .filter(category => category.subcategories.length > 0)
                .map((category) => (
                  <div key={category.id}>
                    <h3 className="text-xl font-semibold mb-4 capitalize">
                      {category.service_category_type === 'beauty' ? 'Beauty' :
                       category.service_category_type === 'fitness' ? 'Fitness' :
                       category.service_category_type === 'therapy' ? 'Wellness' :
                       category.service_category_type === 'healthcare' ? 'Healthcare' :
                       category.service_category_type}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {category.subcategories.map((subcategory: any) => (
                        <Button
                          key={subcategory.id}
                          variant="outline"
                          className="rounded-full px-4 py-2 h-auto text-sm font-medium hover:bg-roam-blue hover:text-white hover:border-roam-blue transition-all"
                          onClick={() => {
                            handleSubcategoryClick(subcategory.id, subcategory.service_subcategory_type);
                            setShowMoreModal(false);
                          }}
                        >
                          {subcategory.displayName || formatSubcategoryName(subcategory.service_subcategory_type)}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}