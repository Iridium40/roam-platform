import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { Header } from "@/components/Header";
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import {
  MapPin,
  Clock,
  Shield,
  Star,
  Heart,
  Stethoscope,
  Scissors,
  Dumbbell,
  Home,
  Briefcase,
  Car,
  Smartphone,
  Building,
  Zap,
  Filter,
} from "lucide-react";
import type { 
  FeaturedService, 
  PopularService, 
  FeaturedBusiness, 
  TransformedPromotion,
  ServiceFilters 
} from "@/types/index";
import { supabase } from "@/lib/supabase";
import { logger } from '@/utils/logger';

// Import new components
import { HomeHero } from "@/components/home/HomeHero";
import { ServiceSearch } from "@/components/home/ServiceSearch";
import { ServiceGrid } from "@/components/home/ServiceGrid";
import { FeaturedServices } from "@/components/home/FeaturedServices";
import { CustomerActions } from "@/components/home/CustomerActions";

export default function Index() {
  const { customer, isCustomer, signOut } = useAuth();
  
  // Consolidated filter state
  const [filters, setFilters] = useState({
    searchQuery: "",
    selectedCategory: "all",
    selectedDelivery: "all",
  });

  // Consolidated modal state
  const [modals, setModals] = useState({
    shareModalOpen: false,
    authModalOpen: false,
    authModalTab: "signin" as "signin" | "signup",
    mobileMenuOpen: false,
  });

  // Other UI state
  const [selectedProvider, setSelectedProvider] = useState<FeaturedBusiness | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  // Database-driven state
  const [featuredServices, setFeaturedServices] = useState<FeaturedService[]>([]);
  const [popularServices, setPopularServices] = useState<PopularService[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<FeaturedBusiness[]>([]);
  const [promotions, setPromotions] = useState<TransformedPromotion[]>([]);
  const [loading, setLoading] = useState(false);

  // Destructure for easier access
  const { searchQuery, selectedCategory, selectedDelivery } = filters;
  const { shareModalOpen, authModalOpen, authModalTab, mobileMenuOpen } = modals;

  // State setters
  const setSearchQuery = (value: string) => setFilters(prev => ({ ...prev, searchQuery: value }));
  const setShareModalOpen = (value: boolean) => setModals(prev => ({ ...prev, shareModalOpen: value }));
  const setAuthModalOpen = (value: boolean) => setModals(prev => ({ ...prev, authModalOpen: value }));

  // Service categories for filtering
  const serviceCategories = [
    {
      id: "beauty",
      name: "Beauty & Wellness",
      description: "Salon, spa, and wellness services",
      icon: Scissors,
      color: "from-pink-500 to-rose-500",
    },
    {
      id: "fitness",
      name: "Fitness & Training",
      description: "Personal training and fitness classes",
      icon: Dumbbell,
      color: "from-orange-500 to-red-500",
    },
    {
      id: "therapy",
      name: "Therapy & Recovery",
      description: "Massage and therapeutic services",
      icon: Zap,
      color: "from-green-500 to-emerald-500",
    },
    {
      id: "healthcare",
      name: "Healthcare",
      description: "Medical and health services",
      icon: Stethoscope,
      color: "from-blue-500 to-cyan-500",
    },
  ];

  // Category mapping for filtering
  const categoryMapping = {
    beauty: ["beauty"],
    fitness: ["fitness"],
    therapy: ["therapy"],
    healthcare: ["healthcare"],
  };

  // Filter services based on selected category, search query, and delivery type
  const getFilteredServices = useCallback((services: FeaturedService[]) => {
    return services.filter((service: FeaturedService) => {
      // Category filter
      let categoryMatch = true;
      if (selectedCategory !== "all") {
        const categoryKeywords =
          categoryMapping[selectedCategory as keyof typeof categoryMapping] ||
          [];
        const serviceCategory = service.category?.toLowerCase() || "";
        const serviceName = service.name?.toLowerCase() || "";

        categoryMatch = categoryKeywords.some(
          (keyword) =>
            serviceCategory.includes(keyword.toLowerCase()) ||
            serviceName.includes(keyword.toLowerCase()),
        );
      }

      // Search query filter
      let searchMatch = true;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const serviceName = service.name?.toLowerCase() || "";
        const serviceCategory = service.category?.toLowerCase() || "";
        const serviceDescription = service.description?.toLowerCase() || "";

        searchMatch =
          serviceName.includes(query) ||
          serviceCategory.includes(query) ||
          serviceDescription.includes(query);
      }

      // Delivery type filter (services don't have delivery type data in current structure)
      let deliveryMatch = true;
      if (selectedDelivery !== "all") {
        deliveryMatch = true;
      }

      return categoryMatch && searchMatch && deliveryMatch;
    });
  }, [selectedCategory, searchQuery, selectedDelivery]);

  // Get filtered services - memoized to avoid recalculation on every render
  const filteredFeaturedServices = useMemo(() => 
    getFilteredServices(featuredServices), 
    [getFilteredServices, featuredServices]
  );
  
  const filteredPopularServices = useMemo(() => 
    getFilteredServices(popularServices), 
    [getFilteredServices, popularServices]
  );

  // Event handlers
  const handleBusinessShare = useCallback((business: FeaturedBusiness) => {
    setSelectedProvider(business);
    setModals(prev => ({ ...prev, shareModalOpen: true }));
  }, []);

  const handleSignIn = useCallback(() => {
    setModals(prev => ({ ...prev, authModalTab: "signin", authModalOpen: true }));
  }, []);

  const handleSignUp = useCallback(() => {
    setModals(prev => ({ ...prev, authModalTab: "signup", authModalOpen: true }));
  }, []);

  const handleMyBookings = useCallback(() => {
    if (isCustomer) {
      window.location.href = "/my-bookings";
    } else {
      handleSignIn();
    }
  }, [isCustomer, handleSignIn]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setFilters(prev => ({ ...prev, selectedCategory: categoryId }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      searchQuery: "",
      selectedCategory: "all",
      selectedDelivery: "all",
    });
  }, []);

  const handleDeliveryChange = useCallback((delivery: string) => {
    setFilters(prev => ({ ...prev, selectedDelivery: delivery }));
  }, []);

  // Fetch real data from Supabase
  useEffect(() => {
    const fetchData = async (retryCount = 0) => {
      try {
        setLoading(true);

        // Fetch featured services
        const featuredServicesResponse = await supabase
          .from("services")
          .select(`
            id, name, description, min_price, duration_minutes, image_url,
            is_active, is_featured, subcategory_id
          `)
          .eq("is_active", true)
          .eq("is_featured", true);

        const { data: featuredServicesData, error: featuredError } = featuredServicesResponse;

        if (!featuredError && featuredServicesData) {
          const transformedFeatured = featuredServicesData.map((service: any) => ({
            id: service.id,
            name: service.name,
            category: "General",
            description: service.description || "Professional featured service",
            price_min: service.min_price || 50,
            price_max: service.min_price || 100,
            duration: `${service.duration_minutes || 60} min`,
            location_type: "mobile",
            image_url: service.image_url || "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&h=300&fit=crop",
            rating: 4.8,
          }));
          setFeaturedServices(transformedFeatured);
        }

        // Fetch popular services
        const popularServicesResponse = await supabase
          .from("services")
          .select(`
            id, name, description, min_price, duration_minutes, image_url,
            is_active, is_popular, subcategory_id
          `)
          .eq("is_active", true)
          .eq("is_popular", true)
          .limit(6);

        const { data: popularServicesData, error: popularError } = popularServicesResponse;

        if (!popularError && popularServicesData) {
          const transformedPopular = popularServicesData.map((service: any) => ({
            id: service.id,
            name: service.name,
            category: "General",
            description: service.description || "Popular professional service",
            price_min: service.min_price || 50,
            price_max: service.min_price || 100,
            duration: `${service.duration_minutes || 60} min`,
            location_type: "mobile",
            image_url: service.image_url || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=300&fit=crop",
            rating: 4.9,
            bookings: `${Math.floor(Math.random() * 50) + 10} bookings this month`,
            availability: `${Math.floor(Math.random() * 8) + 1} slots available`,
          }));
          setPopularServices(transformedPopular);
        }

        // Fetch featured businesses
        const businessesResponse = await supabase
          .from("business_profiles")
          .select(`
            id, business_name, business_type, logo_url, image_url,
            verification_status, service_categories, is_active, is_featured,
            business_locations (location_name, city, state)
          `)
          .eq("is_featured", true)
          .limit(12);

        const { data: businessesData, error: businessesError } = businessesResponse;

        if (!businessesError && businessesData) {
          const transformedBusinesses = businessesData.map((business: any) => ({
            id: business.id,
            name: business.business_name,
            description: `Professional ${business.business_type.replace("_", " ")} services`,
            type: business.business_type,
            rating: 4.8,
            reviews_count: Math.floor(Math.random() * 200) + 50,
            image_url: business.logo_url || business.image_url,
            logo_url: business.logo_url,
            location: business.business_locations?.city 
              ? `${business.business_locations.city}, ${business.business_locations.state}`
              : "Florida",
            verification_status: business.verification_status,
            is_featured: business.is_featured,
          }));
          setFeaturedBusinesses(transformedBusinesses);
        }

        // Fetch active promotions
        const promotionsResponse = await supabase
          .from("promotions")
          .select(`
            id, title, description, start_date, end_date, is_active,
            created_at, business_id, image_url, promo_code, savings_type,
            savings_amount, savings_max_amount, service_id,
            business_profiles (id, business_name, logo_url, business_type),
            services (id, name, min_price)
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(6);

        const { data: promotionsData, error: promotionsError } = promotionsResponse;

        if (!promotionsError && promotionsData) {
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0);

          const transformedPromotions = promotionsData
            .filter((promotion: any) => {
              if (promotion.end_date) {
                const endDate = new Date(promotion.end_date);
                endDate.setHours(23, 59, 59, 999);
                return endDate >= currentDate;
              }
              return true;
            })
            .map((promotion: any) => ({
              id: promotion.id,
              title: promotion.title,
              description: promotion.description,
              startDate: promotion.start_date,
              endDate: promotion.end_date,
              isActive: promotion.is_active,
              createdAt: promotion.created_at,
              businessId: promotion.business_id,
              imageUrl: promotion.image_url,
              promoCode: promotion.promo_code,
              savingsType: promotion.savings_type,
              savingsAmount: promotion.savings_amount,
              savingsMaxAmount: promotion.savings_max_amount,
              serviceId: promotion.service_id,
              business: promotion.business_profiles ? {
                id: promotion.business_profiles.id,
                name: promotion.business_profiles.business_name,
                logo: promotion.business_profiles.logo_url,
                type: promotion.business_profiles.business_type,
              } : null,
              service: promotion.services ? {
                id: promotion.services.id,
                name: promotion.services.name,
                minPrice: promotion.services.min_price,
              } : null,
            }));
          setPromotions(transformedPromotions);
        }

      } catch (error) {
        logger.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <AnnouncementPopup />

      {/* Hero Section */}
      <HomeHero />

      {/* Service Search & Categories */}
      <ServiceSearch
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedDelivery={selectedDelivery}
        serviceCategories={serviceCategories}
        onSearchChange={setSearchQuery}
        onCategorySelect={handleCategorySelect}
        onDeliveryChange={handleDeliveryChange}
        onResetFilters={resetFilters}
      />

      {/* Featured Services Carousel */}
      <ServiceGrid
        title='Featured <span className="text-roam-blue">Services</span>'
        subtitle="Discover our most popular and highly-rated services"
        services={filteredFeaturedServices}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
        showDebugInfo={true}
      />

      {/* Popular Services */}
      <ServiceGrid
        title='Most <span className="text-roam-blue">Popular Services</span>'
        subtitle="Trending services in your area this month"
        services={filteredPopularServices}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
        showDebugInfo={true}
      />

      {/* Promotions & Featured Businesses */}
      <FeaturedServices
        promotions={promotions}
        businesses={featuredBusinesses}
        onBusinessShare={handleBusinessShare}
      />

      {/* Trust Section */}
      <section className="py-16 bg-gradient-to-br from-gray-50 via-white to-roam-light-blue/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose <span className="text-roam-blue">ROAM</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're committed to connecting you with the best service providers while ensuring your peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Verified Professionals</h3>
              <p className="text-foreground/70">
                All service providers are thoroughly vetted and background-checked for your safety.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Convenient Locations</h3>
              <p className="text-foreground/70">
                Find services near you or book mobile providers who come to your location.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">5-Star Quality</h3>
              <p className="text-foreground/70">
                Only the highest-rated professionals with proven track records join our platform.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Satisfaction Guaranteed</h3>
              <p className="text-foreground/70">
                Your satisfaction is guaranteed or we'll make it right, every time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Actions (Modals) */}
      <CustomerActions
        shareModalOpen={shareModalOpen}
        authModalOpen={authModalOpen}
        authModalTab={authModalTab}
        selectedProvider={selectedProvider}
        onShareModalClose={() => setShareModalOpen(false)}
        onAuthModalClose={() => setAuthModalOpen(false)}
        isCustomer={isCustomer}
      />
    </div>
  );
}