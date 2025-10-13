import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
// ShareModal will be lazy loaded below
import { FavoriteButton } from "@/components/FavoriteButton";
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Clock,
  Shield,
  Star,
  Search,
  Calendar,
  Heart,
  Scissors,
  Dumbbell,
  Home,
  Stethoscope,
  Hand,
  Filter,
  Users,
  BookOpen,
  ChevronRight,
  Smartphone,
  Building,
  Video,
  QrCode,
  Share2,
  ChevronLeft,
  TrendingUp,
  Tag,
  Percent,
  X,
  Car,
  Menu,
  Activity,
  Brain,
  Eye,
  Palette,
  Wrench,
  Briefcase,
} from "lucide-react";
import { Link } from "react-router-dom";
import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { Header } from "@/components/Header";
import { HomeHero } from "@/components/home/HomeHero";
import { Loader2 } from "lucide-react";
import type { 
  FeaturedService, 
  PopularService, 
  FeaturedBusiness, 
  Promotion, 
  TransformedPromotion,
  ServiceFilters 
} from "@/types/index";

// Lazy load heavy components
const CustomerAuthModal = lazy(() => import("@/components/CustomerAuthModal").then(module => ({ default: module.CustomerAuthModal })));
const GoogleOneTap = lazy(() => import("@/components/GoogleOneTap"));
const ShareModal = lazy(() => import("@/components/ShareModal"));

// Fallback loader for heavy components
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="w-6 h-6 animate-spin text-roam-blue" />
  </div>
);
import { supabase } from "@/lib/supabase";
import { logger } from '@/utils/logger';

// Enhanced Index page with proper error handling and database schema compliance
export default function IndexFixed() {
  const { customer, isCustomer, signOut } = useAuth();
  // Consolidated filter state
  const [filters, setFilters] = useState({
    searchQuery: "",
    selectedCategory: "all",
    selectedDelivery: "all",
  });

  // Consolidated carousel state
  const [carouselSlides, setCarouselSlides] = useState({
    currentServiceSlide: 0,
    currentPopularSlide: 0,
    currentPromotionSlide: 0,
    currentBusinessSlide: 0,
  });

  // Consolidated modal state
  const [modals, setModals] = useState({
    shareModalOpen: false,
    authModalOpen: false,
    selectedServiceForShare: null as FeaturedService | null,
  });

  // Service categories with icons and colors
  const serviceCategories = [
    {
      id: "beauty",
      name: "Beauty",
      icon: Scissors,
      color: "from-pink-500 to-purple-600",
      description: "Hair, nails, skincare",
    },
    {
      id: "fitness", 
      name: "Fitness",
      icon: Dumbbell,
      color: "from-green-500 to-emerald-600",
      description: "Personal training, yoga",
    },
    {
      id: "therapy",
      name: "Therapy",
      icon: Heart,
      color: "from-blue-500 to-cyan-600",
      description: "Massage, mental health",
    },
    {
      id: "healthcare",
      name: "Healthcare",
      icon: Stethoscope,
      color: "from-red-500 to-rose-600",
      description: "Medical consultations",
    },
  ];

  // State for data (using any to avoid type complexity while restoring visuals)
  const [featuredServices, setFeaturedServices] = useState<any[]>([]);
  const [popularServices, setPopularServices] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected category state
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch featured services using correct schema
        try {
          const { data: featuredData, error: featuredError } = await supabase
            .from("services")
            .select(`
              id,
              name,
              description,
              min_price,
              duration_minutes,
              image_url,
              is_active,
              is_featured
            `)
            .eq("is_active", true)
            .eq("is_featured", true)
            .limit(6);

          if (featuredError) {
            console.warn("Featured services query failed:", featuredError);
          } else if (featuredData) {
            const transformedFeatured = featuredData.map((service: any) => ({
              id: service.id,
              title: service.name,
              category: "Featured Service",
              image: service.image_url || "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&h=300&fit=crop",
              description: service.description || "Professional featured service",
              price: `$${service.min_price || 50}`,
              rating: 4.8,
              duration: `${service.duration_minutes || 60} min`,
            }));
            setFeaturedServices(transformedFeatured);
          }
        } catch (featuredErr) {
          console.warn("Featured services error:", featuredErr);
        }

        // Fetch popular services using correct schema  
        try {
          const { data: popularData, error: popularError } = await supabase
            .from("services")
            .select(`
              id,
              name,
              description,
              min_price,
              duration_minutes,
              image_url,
              is_active,
              is_popular
            `)
            .eq("is_active", true)
            .eq("is_popular", true)
            .limit(6);

          if (popularError) {
            console.warn("Popular services query failed:", popularError);
          } else if (popularData) {
            const transformedPopular = popularData.map((service: any) => ({
              id: service.id,
              title: service.name,
              category: "Popular Service",
              image: service.image_url || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=300&fit=crop",
              description: service.description || "Popular professional service",
              price: `$${service.min_price || 50}`,
              rating: 4.9,
              duration: `${service.duration_minutes || 60} min`,
              bookings: `${Math.floor(Math.random() * 50) + 10} bookings this month`,
              availability: `${Math.floor(Math.random() * 8) + 1} slots available`,
            }));
            setPopularServices(transformedPopular);
          }
        } catch (popularErr) {
          console.warn("Popular services error:", popularErr);
        }

        // Fetch promotions using correct schema
        try {
          const { data: promotionsData, error: promotionsError } = await supabase
            .from("promotions")
            .select(`
              id,
              title,
              description,
              savings_value,
              savings_type,
              is_active,
              start_date,
              end_date
            `)
            .eq("is_active", true)
            .gte("end_date", new Date().toISOString())
            .limit(3);

          if (promotionsError) {
            console.warn("Promotions query failed:", promotionsError);
          } else if (promotionsData) {
            const transformedPromotions = promotionsData.map((promo: any) => ({
              id: promo.id,
              title: promo.title,
              description: promo.description,
              discount: promo.savings_type === 'percentage_off' 
                ? `${promo.savings_value}% off`
                : `$${promo.savings_value} off`,
              code: `SAVE${promo.savings_value}`,
              expiry: new Date(promo.end_date).toLocaleDateString(),
            }));
            setPromotions(transformedPromotions);
          }
        } catch (promoErr) {
          console.warn("Promotions error:", promoErr);
        }

      } catch (err: any) {
        console.error("Error fetching homepage data:", err);
        setError("Failed to load services. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Mock fallback data if database queries fail
  const mockFeaturedServices = [
    {
      id: "1",
      title: "Hair Styling",
      category: "Beauty",
      image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&h=300&fit=crop",
      description: "Professional hair styling and cuts",
      price: "$75",
      rating: 4.8,
      duration: "60 min",
    },
    {
      id: "2", 
      title: "Massage Therapy",
      category: "Wellness",
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=300&fit=crop",
      description: "Relaxing therapeutic massage",
      price: "$90",
      rating: 4.9,
      duration: "90 min",
    },
    {
      id: "3",
      title: "Personal Training",
      category: "Fitness", 
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=300&fit=crop",
      description: "One-on-one fitness training",
      price: "$85",
      rating: 4.7,
      duration: "60 min",
    }
  ];

  const mockPromotions = [
    {
      id: "1",
      title: "New Customer Special",
      description: "Get 20% off your first booking",
      discount: "20% off",
      code: "WELCOME20",
      expiry: "Dec 31, 2025",
    }
  ];

  // Use real data if available, otherwise fallback to mock data
  const displayFeaturedServices = featuredServices.length > 0 ? featuredServices : mockFeaturedServices;
  const displayPopularServices = popularServices.length > 0 ? popularServices : mockFeaturedServices;
  const displayPromotions = promotions.length > 0 ? promotions : mockPromotions;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-roam-blue mx-auto mb-4" />
          <p className="text-lg font-semibold">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Announcement Popup */}
      <AnnouncementPopup isCustomer={isCustomer} />
      
      <Header />

      {/* Hero Section with Search */}
      <HomeHero />

      {/* Service Categories */}
      <section className="py-12 bg-background/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Elegant Header Section */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Browse by{" "}
              <span className="bg-gradient-to-r from-roam-blue to-roam-light-blue bg-clip-text text-transparent">
                Category
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find the perfect service for your needs from our curated selection
              of professional providers
            </p>
          </div>

          {/* Mobile Category Dropdown - Enhanced */}
          <div className="md:hidden mb-12">
            <div className="relative">
              <Select
                value={selectedCategory}
                onValueChange={handleCategorySelect}
              >
                <SelectTrigger className="w-full h-16 bg-white border-0 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 ring-1 ring-gray-100 focus:ring-2 focus:ring-roam-blue/50">
                  <div className="flex items-center gap-4 px-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-2xl flex items-center justify-center flex-shrink-0">
                      {selectedCategory === "all" ? (
                        <Filter className="w-6 h-6 text-white" />
                      ) : (
                        serviceCategories.find(
                          (cat) => cat.id === selectedCategory,
                        )?.icon && (
                          <div className="w-6 h-6 flex items-center justify-center">
                            {React.createElement(
                              serviceCategories.find(
                                (cat) => cat.id === selectedCategory,
                              )!.icon,
                              { className: "w-6 h-6 text-white" },
                            )}
                          </div>
                        )
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-900 text-lg">
                        {selectedCategory === "all"
                          ? "All Categories"
                          : serviceCategories.find(
                              (cat) => cat.id === selectedCategory,
                            )?.name ||
                            (selectedCategory === "therapy"
                              ? "Therapy"
                              : selectedCategory === "fitness"
                                ? "Fitness"
                                : selectedCategory === "beauty"
                                  ? "Beauty"
                                  : selectedCategory)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Tap to change category
                      </div>
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-0 shadow-2xl">
                  <SelectItem value="all" className="rounded-xl m-1">
                    <div className="flex items-center gap-3 py-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
                        <Filter className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">All Categories</div>
                        <div className="text-xs text-gray-500">
                          Browse everything
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  {serviceCategories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      className="rounded-xl m-1"
                    >
                      <div className="flex items-center gap-3 py-2">
                        <div
                          className={`w-10 h-10 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center`}
                        >
                          <category.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {category.id === "therapy"
                              ? "Therapy"
                              : category.id === "fitness"
                                ? "Fitness"
                                : category.id === "beauty"
                                  ? "Beauty"
                                  : category.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {category.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Desktop Category Cards - Enhanced */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-8 mb-16">
            {/* All Categories Option */}
            <div
              className={`group cursor-pointer transition-all duration-500 hover:-translate-y-4 ${
                selectedCategory === "all" ? "scale-105" : ""
              }`}
              onClick={() => handleCategorySelect("all")}
            >
              <div
                className={`relative overflow-hidden rounded-3xl bg-white shadow-xl hover:shadow-2xl transition-all duration-500 ${
                  selectedCategory === "all"
                    ? "ring-4 ring-roam-blue/30 bg-gradient-to-br from-roam-blue/5 to-roam-light-blue/5"
                    : ""
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-500/10 via-transparent to-gray-600/5"></div>
                <div className="relative p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-500 to-gray-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg">
                    <Filter className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-3 text-gray-900 group-hover:text-roam-blue transition-colors">
                    All Categories
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Browse all available services
                  </p>
                  {selectedCategory === "all" && (
                    <div className="absolute top-4 right-4">
                      <div className="w-3 h-3 bg-roam-blue rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {serviceCategories.map((category) => (
              <div
                key={category.id}
                className={`group cursor-pointer transition-all duration-500 hover:-translate-y-4 ${
                  selectedCategory === category.id ? "scale-105" : ""
                }`}
                onClick={() => handleCategorySelect(category.id)}
              >
                <div
                  className={`relative overflow-hidden rounded-3xl bg-white shadow-xl hover:shadow-2xl transition-all duration-500 ${
                    selectedCategory === category.id
                      ? "ring-4 ring-roam-blue/30 bg-gradient-to-br from-roam-blue/5 to-roam-light-blue/5"
                      : ""
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent opacity-50"></div>
                  <div className="relative p-8 text-center">
                    <div
                      className={`w-20 h-20 bg-gradient-to-br ${category.color} rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}
                    >
                      <category.icon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-3 text-gray-900 group-hover:text-roam-blue transition-colors">
                      {category.id === "therapy"
                        ? "Therapy"
                        : category.id === "fitness"
                          ? "Fitness"
                          : category.id === "beauty"
                            ? "Beauty"
                            : category.name}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {category.description}
                    </p>
                    {selectedCategory === category.id && (
                      <div className="absolute top-4 right-4">
                        <div className="w-3 h-3 bg-roam-blue rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Featured <span className="text-roam-blue">Services</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayFeaturedServices.slice(0, 6).map((service: any) => (
              <div key={service.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <img 
                  src={service.image} 
                  alt={service.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold">{service.title}</h3>
                    <span className="text-roam-blue font-bold">{service.price}</span>
                  </div>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      <span className="font-medium">{service.rating}</span>
                    </div>
                    <span className="text-sm text-gray-500">{service.duration}</span>
                  </div>
                  <button className="w-full mt-4 bg-roam-blue text-white py-2 rounded-lg font-medium hover:bg-roam-blue/90 transition-colors">
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promotions */}
      {displayPromotions.length > 0 && (
        <section className="py-12 bg-accent/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">
              Special <span className="text-roam-blue">Offers</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayPromotions.map((promo: any) => (
                <div key={promo.id} className="bg-gradient-to-r from-roam-blue to-roam-light-blue text-white rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold mb-2">{promo.title}</h3>
                  <p className="mb-4 opacity-90">{promo.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold">{promo.discount}</span>
                    <div className="text-right">
                      <p className="text-sm opacity-75">Code: {promo.code}</p>
                      <p className="text-xs opacity-75">Expires: {promo.expiry}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Services */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Popular <span className="text-roam-blue">This Month</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayPopularServices.slice(0, 6).map((service: any) => (
              <div key={service.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <img 
                  src={service.image} 
                  alt={service.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold">{service.title}</h3>
                    <span className="text-roam-blue font-bold">{service.price}</span>
                  </div>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      <span className="font-medium">{service.rating}</span>
                    </div>
                    <span className="text-sm text-gray-500">{service.duration}</span>
                  </div>
                  {service.bookings && (
                    <p className="text-sm text-green-600 font-medium">{service.bookings}</p>
                  )}
                  {service.availability && (
                    <p className="text-sm text-blue-600">{service.availability}</p>
                  )}
                  <button className="w-full mt-4 bg-roam-blue text-white py-2 rounded-lg font-medium hover:bg-roam-blue/90 transition-colors">
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}