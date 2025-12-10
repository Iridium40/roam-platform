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
import { BrowseAllServices } from "@/components/home/BrowseAllServices";
import { Footer } from "@/components/Footer";
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
import { formatSpecialty } from '@/utils/formatSpecialty';

export default function Index() {
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
    authModalTab: "signin" as "signin" | "signup",
    mobileMenuOpen: false,
  });

  // Other UI state
  const [selectedProvider, setSelectedProvider] = useState<FeaturedBusiness | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set(),
  );

  // Destructure for easier access
  const { searchQuery, selectedCategory, selectedDelivery } = filters;
  const { currentServiceSlide, currentPopularSlide, currentPromotionSlide, currentBusinessSlide } = carouselSlides;
  const { shareModalOpen, authModalOpen, authModalTab, mobileMenuOpen } = modals;

  // State setters
  const setSearchQuery = (value: string) => setFilters(prev => ({ ...prev, searchQuery: value }));
  const setCurrentServiceSlide = (value: number) => setCarouselSlides(prev => ({ ...prev, currentServiceSlide: value }));
  const setCurrentPopularSlide = (value: number) => setCarouselSlides(prev => ({ ...prev, currentPopularSlide: value }));
  const setCurrentPromotionSlide = (value: number) => setCarouselSlides(prev => ({ ...prev, currentPromotionSlide: value }));
  const setCurrentBusinessSlide = (value: number) => setCarouselSlides(prev => ({ ...prev, currentBusinessSlide: value }));
  const setShareModalOpen = (value: boolean) => setModals(prev => ({ ...prev, shareModalOpen: value }));
  const setAuthModalOpen = (value: boolean) => setModals(prev => ({ ...prev, authModalOpen: value }));

  // Database-driven state
  const [featuredServices, setFeaturedServices] = useState<FeaturedService[]>([]);
  const [popularServices, setPopularServices] = useState<PopularService[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<FeaturedBusiness[]>([]);
  const [promotions, setPromotions] = useState<TransformedPromotion[]>([]);
  const [loading, setLoading] = useState(false);

  // Category icon mapping function
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();

    if (
      cat.includes("healthcare") ||
      cat.includes("medical") ||
      cat.includes("health")
    ) {
      return Stethoscope;
    }
    if (
      cat.includes("beauty") ||
      cat.includes("wellness") ||
      cat.includes("spa")
    ) {
      return Scissors;
    }
    if (
      cat.includes("fitness") ||
      cat.includes("gym") ||
      cat.includes("workout")
    ) {
      return Dumbbell;
    }
    if (
      cat.includes("home") ||
      cat.includes("cleaning") ||
      cat.includes("repair")
    ) {
      return Home;
    }
    if (cat.includes("business") || cat.includes("professional")) {
      return Briefcase;
    }
    if (cat.includes("automotive") || cat.includes("car")) {
      return Car;
    }
    if (cat.includes("technology") || cat.includes("tech")) {
      return Smartphone;
    }

    // Default icon
    return Building;
  };

  // Category color mapping function - consistent with filter cards
  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();

    if (
      cat.includes("beauty") ||
      cat.includes("wellness") ||
      cat.includes("spa")
    ) {
      return "bg-gradient-to-r from-pink-500 to-rose-500";
    }
    if (
      cat.includes("fitness") ||
      cat.includes("gym") ||
      cat.includes("workout")
    ) {
      return "bg-gradient-to-r from-orange-500 to-red-500";
    }
    if (
      cat.includes("therapy") ||
      cat.includes("therapeutic") ||
      cat.includes("massage")
    ) {
      return "bg-gradient-to-r from-green-500 to-emerald-500";
    }
    if (
      cat.includes("healthcare") ||
      cat.includes("medical") ||
      cat.includes("health")
    ) {
      return "bg-gradient-to-r from-blue-500 to-cyan-500";
    }

    // Default gradient
    return "bg-gradient-to-r from-gray-500 to-gray-600";
  };

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
      // Navigate to my bookings
      window.location.href = "/my-bookings";
    } else {
      // Show sign in modal
      handleSignIn();
    }
  }, [isCustomer, handleSignIn]);

  const toggleDescription = useCallback((serviceId: string) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  }, []);

  const getDisplayDescription = (description: string, serviceId: string) => {
    const isExpanded = expandedDescriptions.has(serviceId);
    if (description.length <= 200 || isExpanded) {
      return description;
    }
    return description.substring(0, 200) + "...";
  };

  const formatSavings = (promotion: TransformedPromotion) => {
    if (!promotion.savingsType || !promotion.savingsAmount) return null;

    if (promotion.savingsType === "percentage_off") {
      const maxAmount = promotion.savingsMaxAmount
        ? ` (max $${promotion.savingsMaxAmount})`
        : "";
      return `${promotion.savingsAmount}% OFF${maxAmount}`;
    } else if (promotion.savingsType === "fixed_amount") {
      return `$${promotion.savingsAmount} OFF`;
    }

    return null;
  };

  // Fetch real data from Supabase
  useEffect(() => {
    const fetchData = async (retryCount = 0) => {
      try {
        setLoading(true);

        // Fetch featured services using is_featured flag with proper category information
        const featuredServicesResponse = await supabase
          .from("services")
          .select(
            `
            id,
            name,
            description,
            min_price,
            duration_minutes,
            image_url,
            is_active,
            is_featured,
            subcategory_id,
            service_subcategories!subcategory_id (
              id,
              service_subcategory_type,
              service_categories (
                id,
                service_category_type
              )
            )
          `
          )
          .eq("is_active", true)
          .eq("is_featured", true);

        const { data: featuredServicesData, error: featuredError } =
          featuredServicesResponse;

        logger.debug("Featured services query result:", {
          featuredServicesData,
          featuredError,
        });

        if (!featuredError && featuredServicesData) {
          console.log('🔍 Featured Services Raw Data (Index):', featuredServicesData);
          const transformedFeatured = featuredServicesData.map(
            (service: any) => {
              const category = service.service_subcategories?.service_categories?.service_category_type || 'general';
              console.log('🔍 Featured Service Category Debug (Index):', {
                serviceName: service.name,
                serviceId: service.id,
                subcategoryId: service.subcategory_id,
                subcategory: service.service_subcategories,
                category: service.service_subcategories?.service_categories,
                finalCategory: category
              });
              return {
                id: service.id,
                title: service.name,
                category: category,
                image:
                  service.image_url ||
                  "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&h=300&fit=crop",
                description:
                  service.description || "Professional featured service",
                price: `$${service.min_price || 50}`,
                rating: 4.8, // Default rating
                duration: `${service.duration_minutes || 60} min`,
              };
            }
          );
          console.log('🔍 Transformed Featured Services (Index):', transformedFeatured);
          setFeaturedServices(transformedFeatured);
        }

        // Fetch popular services using is_popular flag with proper category information
        const popularServicesResponse = await supabase
          .from("services")
          .select(
            `
            id,
            name,
            description,
            min_price,
            duration_minutes,
            image_url,
            is_active,
            is_popular,
            subcategory_id,
            service_subcategories!subcategory_id (
              id,
              service_subcategory_type,
              service_categories (
                id,
                service_category_type
              )
            )
          `
          )
          .eq("is_active", true)
          .eq("is_popular", true)
          .limit(6);

        const { data: popularServicesData, error: popularError } =
          popularServicesResponse;

        logger.debug("Popular services query result:", {
          popularServicesData,
          popularError,
        });

        if (!popularError && popularServicesData) {
          console.log('🔍 Popular Services Raw Data (Index):', popularServicesData);
          const transformedPopular = popularServicesData.map(
            (service: any) => {
              const category = service.service_subcategories?.service_categories?.service_category_type || 'general';
              console.log('🔍 Popular Service Category Debug (Index):', {
                serviceName: service.name,
                serviceId: service.id,
                subcategoryId: service.subcategory_id,
                subcategory: service.service_subcategories,
                category: service.service_subcategories?.service_categories,
                finalCategory: category
              });
              return {
                id: service.id,
                title: service.name,
                category: category,
                image:
                  service.image_url ||
                  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=300&fit=crop",
                description:
                  service.description || "Popular professional service",
                price: `$${service.min_price || 50}`,
                rating: 4.9, // Default rating
                duration: `${service.duration_minutes || 60} min`,
                bookings: `${Math.floor(Math.random() * 50) + 10} bookings this month`, // Dynamic booking count
                availability: `${Math.floor(Math.random() * 8) + 1} slots available`, // Dynamic availability
              };
            }
          );
          console.log('🔍 Transformed Popular Services (Index):', transformedPopular);
          setPopularServices(transformedPopular);
        }

        // Fetch featured businesses with their subcategories
        const businessesResponse = await supabase
          .from("business_profiles")
          .select(
            `
            id,
            business_name,
            business_type,
            logo_url,
            image_url,
            cover_image_url,
            verification_status,
            service_categories,
            is_active,
            is_featured,
            business_locations (
              location_name,
              city,
              state
            ),
            business_services (
              service_id,
              is_active,
              services (
                subcategory_id,
                service_subcategories (
                  id,
                  service_subcategory_type
                )
              )
            )
          `,
          )
          .eq("is_featured", true)
          .limit(12);

        const { data: businessesData, error: businessesError } =
          businessesResponse;

        // Check for authentication errors
        const authErrors = [
          featuredServicesResponse,
          popularServicesResponse,
          businessesResponse,
        ].filter((response) => response.status === 401);

        if (authErrors.length > 0 && retryCount === 0) {
          logger.debug("JWT token expired, refreshing session...");
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();

          if (refreshError) {
            logger.error("Token refresh failed:", refreshError);
            // For the index page, we can continue without authentication
            logger.debug("Continuing without authentication for public content");
          } else if (refreshData?.session) {
            logger.debug("Session refreshed successfully, retrying...");
            return await fetchData(1);
          }
        }

        logger.debug("Featured businesses query result:", {
          businessesData,
          businessesError,
        });

        if (!businessesError && businessesData) {
          const transformedBusinesses = businessesData.map((business: any) => {
            // Extract unique subcategories from business_services (only active services)
            const subcategoriesSet = new Set<string>();
            if (business.business_services && Array.isArray(business.business_services)) {
              business.business_services
                .filter((bs: any) => bs.is_active === true) // Only include active services
                .forEach((bs: any) => {
                  if (bs.services?.service_subcategories?.service_subcategory_type) {
                    subcategoriesSet.add(bs.services.service_subcategories.service_subcategory_type);
                  }
                });
            }
            const specialties = Array.from(subcategoriesSet).slice(0, 4); // Limit to 4 specialties

            return {
              id: business.id,
              name: business.business_name,
              description: `Professional ${business.business_type.replace("_", " ")} services`,
              type: business.business_type,
              deliveryTypes: ["mobile", "business_location", "virtual"],
              price: "Starting at $100",
              image:
                business.logo_url ||
                business.image_url ||
                "/api/placeholder/80/80",
              cover_image_url: business.cover_image_url,
              specialties: specialties.length > 0 ? specialties : ["Professional Service"], // Fallback if no subcategories
              location: business.business_locations?.city
                ? `${business.business_locations.city}, ${business.business_locations.state}`
                : "Florida",
              verification_status: business.verification_status,
              is_featured: business.is_featured,
              years_in_business: 5, // Default years
            };
          });
          logger.debug(
            "Transformed featured businesses:",
            transformedBusinesses,
          );
          setFeaturedBusinesses(transformedBusinesses);
        }

        // Fetch active promotions with business and service information
        const promotionsResponse = await supabase
          .from("promotions")
          .select(
            `
            id,
            title,
            description,
            start_date,
            end_date,
            is_active,
            created_at,
            business_id,
            image_url,
            promo_code,
            savings_type,
            savings_amount,
            savings_max_amount,
            service_id,
            business_profiles (
              id,
              business_name,
              logo_url,
              business_type
            ),
            services (
              id,
              name,
              min_price
            )
          `,
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(6);

        const { data: promotionsData, error: promotionsError } =
          promotionsResponse;

        if (promotionsError) {
          logger.error("Error fetching promotions:", promotionsError);
        } else {
          logger.debug("Raw promotions data:", promotionsData);
        }

        if (!promotionsError && promotionsData) {
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

          const transformedPromotions = promotionsData
            .filter((promotion: any) => {
              // Filter out promotions with expired end dates
              if (promotion.end_date) {
                const endDate = new Date(promotion.end_date);
                endDate.setHours(23, 59, 59, 999); // Set to end of day
                return endDate >= currentDate;
              }
              // Keep promotions without end dates (ongoing promotions)
              return true;
            })
            .map((promotion: any) => ({
              id: promotion.id,
              title: promotion.title,
              description: promotion.description || "Limited time offer",
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
              business: promotion.business_profiles
                ? {
                    id: promotion.business_profiles.id,
                    name: promotion.business_profiles.business_name,
                    logo: promotion.business_profiles.logo_url,
                    type: promotion.business_profiles.business_type,
                  }
                : null,
              service: promotion.services
                ? {
                    id: promotion.services.id,
                    name: promotion.services.name,
                    minPrice: promotion.services.min_price,
                  }
                : null,
            }));
          logger.debug(
            "Transformed promotions (expired filtered):",
            transformedPromotions,
          );

          setPromotions(transformedPromotions);
        }
      } catch (error: unknown) {
        logger.error("Error fetching data:", error);

        // Check if this is a JWT expiration error and we haven't retried yet
        if (
          (error.message?.includes("JWT") ||
            error.message?.includes("401") ||
            error.status === 401) &&
          retryCount === 0
        ) {
          logger.debug("JWT error detected, attempting token refresh...");
          try {
            const { data: refreshData, error: refreshError } =
              await supabase.auth.refreshSession();

            if (!refreshError && refreshData?.session) {
              logger.debug("Session refreshed, retrying data fetch...");
              return await fetchData(1);
            }
          } catch (refreshError) {
            logger.error("Token refresh failed:", refreshError);
          }

          // For index page, continue even if refresh fails since it has public content
          logger.debug("Continuing with public content after auth error");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const serviceCategories = [
    {
      id: "beauty",
      icon: Scissors,
      name: "Beauty & Wellness",
      count: "150+ providers",
      color: "from-pink-500 to-rose-500",
      description: "Hair, nails, skincare, and beauty treatments",
    },
    {
      id: "fitness",
      icon: Dumbbell,
      name: "Fitness",
      count: "80+ trainers",
      color: "from-orange-500 to-red-500",
      description: "Personal trainers, yoga, and fitness coaching",
    },
    {
      id: "therapy",
      icon: Hand,
      name: "Therapy",
      count: "120+ therapists",
      color: "from-green-500 to-emerald-500",
      description: "Therapeutic massage and bodywork",
    },
    {
      id: "healthcare",
      icon: Stethoscope,
      name: "Healthcare",
      count: "90+ specialists",
      color: "from-blue-500 to-cyan-500",
      description: "Medical services and health consultations",
    },
  ];

  // Use real promotions data from database


  const deliveryIcons = {
    mobile: Car,
    business: Building,
    virtual: Video,
  };

  const getDeliveryBadge = (type: string) => {
    const config = {
      mobile: { label: "Mobile", color: "bg-green-100 text-green-800" },
      business: { label: "Business", color: "bg-blue-100 text-blue-800" },
      virtual: { label: "Virtual", color: "bg-purple-100 text-purple-800" },
    };
    return (
      config[type as keyof typeof config] || {
        label: type,
        color: "bg-gray-100 text-gray-800",
      }
    );
  };

  // Category mapping for filtering services - maps UI category IDs to database service_category_type enum values
  const categoryMapping = {
    beauty: ["beauty"],
    fitness: ["fitness"],
    therapy: ["therapy"],
    healthcare: ["healthcare"],
  };

  // Filter services based on selected category, search query, and delivery type
  const getFilteredServices = useCallback((services: FeaturedService[]) => {
    console.log('🔍 Filtering Services Debug:', {
      selectedCategory,
      totalServices: services.length,
      services: services.map(s => ({ name: s.name, category: s.category }))
    });
    
    return services.filter((service: FeaturedService) => {
      // Category filter
      let categoryMatch = true;
      if (selectedCategory !== "all") {
        const categoryKeywords =
          categoryMapping[selectedCategory as keyof typeof categoryMapping] ||
          [];
        const serviceCategory = service.category?.toLowerCase() || "";
        const serviceTitle = service.title?.toLowerCase() || "";

        console.log('🔍 Category Filter Debug:', {
          serviceName: service.name,
          serviceCategory,
          selectedCategory,
          categoryKeywords,
          willMatch: categoryKeywords.some(keyword => serviceCategory === keyword.toLowerCase())
        });

        categoryMatch = categoryKeywords.some(
          (keyword) => serviceCategory === keyword.toLowerCase()
        );
      }

      // Search query filter
      let searchMatch = true;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const serviceTitle = service.title?.toLowerCase() || "";
        const serviceCategory = service.category?.toLowerCase() || "";
        const serviceDescription = service.description?.toLowerCase() || "";

        searchMatch =
          serviceTitle.includes(query) ||
          serviceCategory.includes(query) ||
          serviceDescription.includes(query);
      }

      // Delivery type filter (services don't have delivery type data in current structure)
      // This would need to be added to service data structure to work properly
      let deliveryMatch = true;
      if (selectedDelivery !== "all") {
        // For now, we'll assume all services support all delivery types
        // In a real implementation, this would check service.deliveryTypes array
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

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId: string) => {
    setFilters(prev => ({ ...prev, selectedCategory: categoryId }));
    setCarouselSlides(prev => ({ ...prev, currentServiceSlide: 0 })); // Reset carousel to first slide when category changes
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      searchQuery: "",
      selectedCategory: "all",
      selectedDelivery: "all",
    });
    setCarouselSlides(prev => ({ ...prev, currentServiceSlide: 0 }));
  }, []);

  // Reset carousel when filters change
  useEffect(() => {
    console.log('Resetting carousel due to filter change');
    setCarouselSlides(prev => ({
      ...prev,
      currentServiceSlide: 0,
      currentPopularSlide: 0,
      currentPromotionSlide: 0,
      currentBusinessSlide: 0
    }));
  }, [selectedCategory, searchQuery, selectedDelivery]);

  // Featured Services: paginate into pages of 2 for desktop, 1 for mobile
  const servicePages = useMemo(() => {
    const pages: FeaturedService[][] = [];
    // Paginate by 2 cards per page for desktop, 1 for mobile
    for (let i = 0; i < filteredFeaturedServices.length; i += 2) {
      pages.push(filteredFeaturedServices.slice(i, i + 2));
    }
    return pages;
  }, [filteredFeaturedServices]);

  const nextServiceSlide = useCallback(() => {
    const maxPage = Math.max(0, servicePages.length - 1);
    const newPage = Math.min(currentServiceSlide + 1, maxPage);
    console.log('🔄 Next service slide clicked');
    console.log('📊 Current state:', { currentServiceSlide, maxPage, newPage, servicesCount: filteredFeaturedServices.length, pagesCount: servicePages.length });
    console.log('📋 Service pages:', servicePages.map((page, i) => ({ pageIndex: i, servicesInPage: page.length })));
    setCurrentServiceSlide(newPage);
  }, [currentServiceSlide, servicePages, filteredFeaturedServices.length]);

  const prevServiceSlide = useCallback(() => {
    const newPage = Math.max(currentServiceSlide - 1, 0);
    console.log('🔄 Prev service slide clicked');
    console.log('📊 Current state:', { currentServiceSlide, newPage, servicesCount: filteredFeaturedServices.length, pagesCount: servicePages.length });
    console.log('📋 Service pages:', servicePages.map((page, i) => ({ pageIndex: i, servicesInPage: page.length })));
    setCurrentServiceSlide(newPage);
  }, [currentServiceSlide, servicePages, filteredFeaturedServices.length]);

  // Most Popular Services: paginate into pages of 3
  const popularPages = useMemo(() => {
    const pages: FeaturedService[][] = [];
    for (let i = 0; i < filteredPopularServices.length; i += 2) {
      pages.push(filteredPopularServices.slice(i, i + 2));
    }
    return pages;
  }, [filteredPopularServices]);

  const nextPopularSlide = useCallback(() => {
    const maxPage = Math.max(0, popularPages.length - 1);
    const newPage = Math.min(currentPopularSlide + 1, maxPage);
    console.log('🔄 Next popular slide clicked');
    console.log('📊 Popular state:', { currentPopularSlide, maxPage, newPage, servicesCount: filteredPopularServices.length, pagesCount: popularPages.length });
    console.log('📋 Popular pages:', popularPages.map((page, i) => ({ pageIndex: i, servicesInPage: page.length })));
    setCurrentPopularSlide(newPage);
  }, [currentPopularSlide, popularPages, filteredPopularServices.length]);

  const prevPopularSlide = useCallback(() => {
    const newPage = Math.max(currentPopularSlide - 1, 0);
    console.log('🔄 Prev popular slide clicked');
    console.log('📊 Popular state:', { currentPopularSlide, newPage, servicesCount: filteredPopularServices.length, pagesCount: popularPages.length });
    console.log('📋 Popular pages:', popularPages.map((page, i) => ({ pageIndex: i, servicesInPage: page.length })));
    setCurrentPopularSlide(newPage);
  }, [currentPopularSlide, popularPages, filteredPopularServices.length]);

  // Special Promotions: paginate into pages of 3 for desktop, 1 for mobile
  const promotionPages = useMemo(() => {
    const pages: TransformedPromotion[][] = [];
    // Paginate by 3 cards per page for desktop, 1 for mobile
    for (let i = 0; i < promotions.length; i += 3) {
      pages.push(promotions.slice(i, i + 3));
    }
    return pages;
  }, [promotions]);

  const nextPromotionSlide = useCallback(() => {
    const maxSlide = Math.max(0, promotionPages.length - 1);
    const newPage = Math.min(currentPromotionSlide + 1, maxSlide);
    console.log('🔄 Next promotion slide clicked');
    console.log('📊 Promotion state:', { currentPromotionSlide, maxSlide, newPage, promotionsCount: promotions.length, pagesCount: promotionPages.length });
    setCurrentPromotionSlide(newPage);
  }, [currentPromotionSlide, promotionPages.length, promotions.length]);

  const prevPromotionSlide = useCallback(() => {
    const newPage = Math.max(currentPromotionSlide - 1, 0);
    console.log('🔄 Prev promotion slide clicked');
    console.log('📊 Promotion state:', { currentPromotionSlide, newPage, promotionsCount: promotions.length, pagesCount: promotionPages.length });
    setCurrentPromotionSlide(newPage);
  }, [currentPromotionSlide, promotionPages.length, promotions.length]);

  // Featured Businesses are NOT filtered by search or delivery type
  // They remain static regardless of user's search/filter selections
  // Only services (Featured Services and Popular Services) are filtered

  // Featured Businesses: paginate into pages of 3 for desktop, 1 for mobile
  const businessPages = useMemo(() => {
    const pages: FeaturedService[][] = [];
    // Paginate by 3 cards per page for desktop, 1 for mobile
    for (let i = 0; i < featuredBusinesses.length; i += 3) {
      pages.push(featuredBusinesses.slice(i, i + 3));
    }
    return pages;
  }, [featuredBusinesses]);

  const nextBusinessSlide = useCallback(() => {
    const maxPage = Math.max(0, businessPages.length - 1);
    const newPage = Math.min(currentBusinessSlide + 1, maxPage);
    console.log('🔄 Next business slide clicked');
    console.log('📊 Business state:', { currentBusinessSlide, maxPage, newPage, businessesCount: featuredBusinesses.length, pagesCount: businessPages.length });
    setCurrentBusinessSlide(newPage);
  }, [currentBusinessSlide, businessPages.length, featuredBusinesses.length]);

  const prevBusinessSlide = useCallback(() => {
    const newPage = Math.max(currentBusinessSlide - 1, 0);
    console.log('🔄 Prev business slide clicked');
    console.log('📊 Business state:', { currentBusinessSlide, newPage, businessesCount: featuredBusinesses.length, pagesCount: businessPages.length });
    setCurrentBusinessSlide(newPage);
  }, [currentBusinessSlide, businessPages.length, featuredBusinesses.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Announcement Popup */}
      <AnnouncementPopup isCustomer={isCustomer} />
      {/* Google One Tap - only show when not authenticated */}
      {/* Google One Tap - temporarily disabled due to OAuth configuration */}
      {/* {!isCustomer && import.meta.env.VITE_GOOGLE_CLIENT_ID && (
        <Suspense fallback={null}>
          <GoogleOneTap
            clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
            onSuccess={() => {
              // Google One Tap sign-in successful
            }}
            onError={(error) => {
              // Handle Google One Tap error silently
            }}
          />
        </Suspense>
      )} */}
      <Header />

      {/* Hero Section with Search */}
      <HomeHero />

      {/* Browse All Services Section */}
      <BrowseAllServices />

      {/* Special Promotions */}
      <section className="py-12 bg-background/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">
              <span className="text-roam-blue">Special</span>&nbsp;Promotions
            </h2>
            <p className="text-lg text-foreground/70">
              Limited-time offers on your favorite services
            </p>
          </div>

          {promotions.length > 0 ? (
            <div className="relative">
              {/* Navigation Arrows */}
              {promotionPages.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPromotionSlide}
                    disabled={currentPromotionSlide === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPromotionSlide}
                    disabled={currentPromotionSlide >= promotionPages.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 border-roam-blue text-roam-blue hover:text-white shadow-lg disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{
                    transform: `translateX(-${currentPromotionSlide * 100}%)`,
                  }}
                >
                  {promotionPages.map((page, pageIndex) => (
                    <div
                      key={`promotion-page-${pageIndex}`}
                      className="flex gap-6 w-full flex-none px-4"
                    >
                      {page.map((promotion) => (
                        <Card
                          key={promotion.id}
                          className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-0 shadow-xl bg-white overflow-hidden rounded-3xl flex-shrink-0 w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                        >
                          {/* Hero Image Section */}
                          <div className="relative h-64 bg-gradient-to-br from-roam-yellow/20 via-roam-light-blue/10 to-roam-blue/5 overflow-hidden">
                            {promotion.imageUrl ? (
                              <img
                                src={promotion.imageUrl}
                                alt={promotion.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                {promotion.business && promotion.business.logo ? (
                                  <div className="flex flex-col items-center space-y-3">
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white shadow-xl border-4 border-white">
                                      <img
                                        src={promotion.business.logo}
                                        alt={promotion.business.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <h3 className="text-lg font-bold text-roam-blue">
                                      {promotion.business.name}
                                    </h3>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center space-y-3">
                                    <div className="w-20 h-20 rounded-2xl bg-roam-yellow/20 flex items-center justify-center">
                                      <Tag className="w-10 h-10 text-roam-blue" />
                                    </div>
                                    <h3 className="text-xl font-bold text-roam-blue">
                                      SPECIAL OFFER
                                    </h3>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>

                            {/* Floating Action Button */}
                            <div className="absolute top-4 right-4">
                              <FavoriteButton
                                type="promotion"
                                itemId={promotion.id}
                                size="sm"
                                variant="ghost"
                                className="w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-lg border-0 text-gray-600 hover:text-red-500 hover:scale-110 transition-all backdrop-blur-sm"
                              />
                            </div>

                            {/* Savings Badge - Bottom Right */}
                            {formatSavings(promotion) && (
                              <div className="absolute bottom-4 right-4">
                                <div className="bg-red-500 text-white px-4 py-2 rounded-2xl shadow-lg font-bold text-lg">
                                  {formatSavings(promotion)}
                                </div>
                              </div>
                            )}

                          </div>

                          <CardContent className="p-6">
                            {/* Promotion Title & Service Info */}
                            <div className="mb-4">
                              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-roam-blue transition-colors">
                                {promotion.title}
                              </h3>
                              {promotion.service && (
                                <span className="inline-block px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                  {promotion.service.name}
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4">
                              {promotion.description}
                            </p>

                            {/* Business Info */}
                            {promotion.business && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                                <Building className="w-4 h-4 text-roam-blue" />
                                <span>{promotion.business.name}</span>
                              </div>
                            )}

                            {/* Claim Button */}
                            <Button
                              asChild
                              className="w-full bg-gradient-to-r from-roam-blue to-roam-light-blue hover:from-roam-blue/90 hover:to-roam-light-blue/90 text-white font-semibold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                            >
                              <Link
                                to={(() => {
                                  const baseParams = `promotion=${promotion.id}&promo_code=${promotion.promoCode}`;

                                  // If promotion has both business and service, start the booking flow
                                  if (promotion.business && promotion.service) {
                                    return `/book-service/${promotion.service.id}?${baseParams}&business_id=${promotion.business.id}`;
                                  }
                                  // If only business, go to business profile
                                  else if (promotion.business) {
                                    return `/business/${promotion.business.id}?${baseParams}`;
                                  }
                                  // If only service, start service booking flow
                                  else if (promotion.service) {
                                    return `/book-service/${promotion.service.id}?${baseParams}`;
                                  }
                                  // Default fallback
                                  else {
                                    return `/services?${baseParams}`;
                                  }
                                })()}
                              >
                                <Tag className="w-4 h-4 mr-2" />
                                {promotion.business && promotion.service
                                  ? "Claim Offer"
                                  : promotion.business
                                    ? "Book with Business"
                                    : promotion.service
                                      ? "Book This Service"
                                      : "Claim Offer"}
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel indicators - only show when there are multiple pages */}
              {promotionPages.length > 1 && (
                <div className="flex justify-center mt-6 gap-2">
                  {promotionPages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPromotionSlide(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentPromotionSlide
                          ? "bg-roam-blue"
                          : "bg-gray-300 hover:bg-gray-400"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground/60 mb-2">
                No Active Promotions
              </h3>
              <p className="text-foreground/50">
                Check back soon for exciting deals and offers!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Popular Services */}
      <section className="py-12 bg-background/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">
              Most <span className="text-roam-blue">Popular Services</span>
            </h2>
            <p className="text-lg text-foreground/70">
              Trending services in your area this month
            </p>
            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-400 mt-1">
                Debug: {filteredPopularServices.length} popular services, {popularPages.length} pages, current: {currentPopularSlide + 1}
              </div>
            )}
          </div>

          {filteredPopularServices.length > 0 ? (
            <div className="relative">
              {/* Navigation Arrows */}
              {popularPages.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Popular Prev button clicked!');
                      prevPopularSlide();
                    }}
                    disabled={currentPopularSlide === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-white border-2 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Popular Next button clicked!');
                      nextPopularSlide();
                    }}
                    disabled={currentPopularSlide >= popularPages.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-white border-2 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{
                    transform: `translateX(-${currentPopularSlide * 100}%)`,
                  }}
                >
                  {popularPages.map((page, pageIndex) => (
                    <div
                      key={`popular-page-${pageIndex}`}
                      className="flex gap-6 w-full flex-none px-4"
                    >
                      {page.map((service) => (
                        <Card
                          key={service.id}
                          className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-0 shadow-xl bg-white overflow-hidden rounded-3xl flex-shrink-0 w-full md:w-[calc(50%-12px)]"
                        >
                          {/* Hero Image Section */}
                          <div className="relative h-64 bg-gradient-to-br from-roam-blue/20 via-roam-light-blue/10 to-roam-yellow/5 overflow-hidden">
                            <img
                              src={service.image}
                              alt={service.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>

                            {/* Floating Action Button */}
                            <div className="absolute top-4 right-4">
                              <FavoriteButton
                                type="service"
                                itemId={service.id}
                                size="sm"
                                variant="ghost"
                                className="w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-lg border-0 text-gray-600 hover:text-red-500 hover:scale-110 transition-all backdrop-blur-sm"
                              />
                            </div>

                            {/* Price Badge - Bottom Left */}
                            <div className="absolute bottom-4 left-4">
                              <div className="bg-roam-blue text-white px-4 py-2 rounded-2xl shadow-lg font-bold text-lg">
                                Starting at {service.price}
                              </div>
                            </div>
                          </div>

                          <CardContent className="p-6">
                            {/* Service Title & Category */}
                            <div className="mb-4">
                              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-roam-blue transition-colors">
                                {service.title}
                              </h3>
                              <span className="inline-block px-3 py-1 text-xs font-medium bg-roam-blue/10 text-roam-blue rounded-full capitalize">
                                {service.category}
                              </span>
                            </div>

                            {/* Description */}
                            <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4">
                              {service.description}
                            </p>

                            {/* Stats Row */}
                            <div className="flex items-center gap-1 text-sm text-gray-600 mb-4">
                              <Clock className="w-4 h-4 text-roam-blue" />
                              <span>{service.duration}</span>
                            </div>

                            {/* Book Button */}
                            <Button
                              asChild
                              className="w-full bg-gradient-to-r from-roam-blue to-roam-light-blue hover:from-roam-blue/90 hover:to-roam-light-blue/90 text-white font-semibold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                            >
                              <Link to={`/book-service/${service.id}`}>
                                <Calendar className="w-4 h-4 mr-2" />
                                Book Now
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel indicators - only show when there are multiple pages */}
              {popularPages.length > 1 && (
                <div className="flex justify-center mt-6 gap-2">
                  {popularPages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPopularSlide(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentPopularSlide
                          ? "bg-roam-blue"
                          : "bg-gray-300 hover:bg-gray-400"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No popular services available at the moment.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Featured Businesses */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">
              Featured <span className="text-roam-blue">Businesses</span>
            </h2>
            <p className="text-lg text-foreground/70 mt-4">
              Trusted and verified businesses providing exceptional services
            </p>
          </div>

          {featuredBusinesses.length > 0 ? (
            <div className="relative overflow-hidden">
              {/* Navigation Arrows */}
              {businessPages.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevBusinessSlide}
                    disabled={currentBusinessSlide === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextBusinessSlide}
                    disabled={currentBusinessSlide >= businessPages.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{
                    transform: `translateX(-${currentBusinessSlide * 100}%)`,
                  }}
                >
                  {businessPages.map((page, pageIndex) => (
                    <div
                      key={`businesses-page-${pageIndex}`}
                      className="flex gap-6 w-full flex-none px-4"
                    >
                      {page.map((business) => (
                        <Card
                          key={business.id}
                          className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-0 shadow-xl bg-white overflow-hidden rounded-3xl flex-shrink-0 w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                        >
                          <CardContent className="p-0">
                            {/* Hero Cover Section */}
                            <div
                              className="relative h-64 bg-gradient-to-br from-roam-blue/20 via-roam-light-blue/10 to-roam-yellow/5"
                              style={{
                                backgroundImage: business.cover_image_url
                                  ? `url(${business.cover_image_url})`
                                  : undefined,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                              }}
                            >
                              {/* Cover overlay */}
                              {business.cover_image_url && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                              )}

                              {/* Favorite Icon - Top Right */}
                              <div className="absolute top-4 right-4 z-20">
                                <FavoriteButton
                                  type="business"
                                  itemId={business.id}
                                  size="sm"
                                  variant="ghost"
                                  className="w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-lg border-0 text-gray-600 hover:text-red-500 hover:scale-110 transition-all backdrop-blur-sm"
                                />
                              </div>

                              {/* Share Icon - Bottom Right */}
                              <div className="absolute -bottom-4 right-6 z-20">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-lg border-0 text-gray-600 hover:text-roam-blue hover:scale-110 transition-all backdrop-blur-sm"
                                  onClick={() => handleBusinessShare(business)}
                                >
                                  <Share2 className="w-4 h-4" />
                                </Button>
                              </div>

                              {/* Business Logo - Overlapping */}
                              <div className="absolute -bottom-8 left-6 z-20">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center overflow-hidden border-4 border-white group-hover:scale-110 transition-transform duration-300">
                                  {business.image &&
                                  business.image !==
                                    "/api/placeholder/80/80" ? (
                                    <img
                                      src={business.image}
                                      alt={business.name}
                                      className="w-full h-full object-cover rounded-xl"
                                    />
                                  ) : (
                                    <Building className="w-8 h-8 text-roam-blue" />
                                  )}
                                </div>
                              </div>

                            </div>

                            {/* Content Section */}
                            <div className="px-6 pt-12 pb-6 space-y-6">
                              {/* Business Name */}
                              <div>
                                <h3 className="font-bold text-xl text-gray-900 group-hover:text-roam-blue transition-colors leading-tight mb-1">
                                  {business.name}
                                </h3>
                              </div>

                              {/* Specialties */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  Specialties
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {business.specialties
                                    .slice(0, 4)
                                    .map((specialty, index) => {
                                      return (
                                        <span
                                          key={specialty}
                                          className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-roam-blue/8 to-roam-light-blue/8 text-roam-blue rounded-lg border border-roam-blue/15 hover:border-roam-blue/25 transition-colors"
                                        >
                                          {formatSpecialty(specialty)}
                                        </span>
                                      );
                                    })}
                                  {business.specialties.length > 4 && (
                                    <span className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg border border-gray-200">
                                      +{business.specialties.length - 4}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-3 pt-2">
                                <Button
                                  asChild
                                  className="flex-1 bg-gradient-to-r from-roam-blue to-roam-light-blue hover:from-roam-blue/90 hover:to-roam-light-blue/90 text-white font-semibold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                                >
                                  <Link
                                    to={`/business/${business.id}?tab=services&book=true`}
                                  >
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Book
                                  </Link>
                                </Button>
                                <Button
                                  asChild
                                  variant="outline"
                                  className="flex-1 border-2 border-roam-blue/20 text-roam-blue hover:bg-roam-blue hover:text-white font-semibold py-3 rounded-2xl transition-all duration-300"
                                >
                                  <Link to={`/business/${business.id}`}>
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    View
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel indicators - only show when there are multiple pages */}
              {businessPages.length > 1 && (
                <div className="flex justify-center mt-6 gap-2">
                  {businessPages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentBusinessSlide(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentBusinessSlide
                          ? "bg-roam-blue"
                          : "bg-gray-300 hover:bg-gray-400"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No featured businesses found
              </h3>
              <p className="text-foreground/60 mb-4">
                No featured businesses match your search criteria. Try adjusting
                your search or browse all businesses.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  resetFilters();
                }}
                className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
              >
                Clear Filters
              </Button>
            </Card>
          )}

          {false && (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No featured businesses found
              </h3>
              <p className="text-foreground/60 mb-4">
                No featured businesses match your search criteria. Try adjusting
                your search or browse all businesses.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  resetFilters();
                }}
                className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
              >
                Clear Filters
              </Button>
            </Card>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 bg-gradient-to-r from-roam-blue to-roam-light-blue">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Book Your Service?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Discover verified businesses and book premium services with trusted
            professionals across Florida.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-roam-blue hover:bg-white/90 text-lg px-8 py-6"
              onClick={handleMyBookings}
            >
              <Calendar className="w-5 h-5 mr-2" />
              {isCustomer ? "View My Bookings" : "Sign In to Book"}
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white text-lg px-8 py-6"
            >
              <Link to="/about">
                <Building className="w-5 h-5 mr-2" />
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-12 bg-background/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Your Safety is Our{" "}
              <span className="text-roam-blue">Priority</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Background Verified
                </h3>
                <p className="text-foreground/70">
                  All providers undergo comprehensive background checks and
                  identity verification.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">5-Star Quality</h3>
                <p className="text-foreground/70">
                  Only the highest-rated professionals with proven track records
                  join our platform.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Satisfaction Guaranteed
                </h3>
                <p className="text-foreground/70">
                  Your satisfaction is guaranteed or we'll make it right, every
                  time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Share Modal */}
      {selectedProvider && shareModalOpen && (
        <Suspense fallback={<ComponentLoader />}>
          <ShareModal
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            providerName={selectedProvider.name}
            providerTitle={selectedProvider.type || selectedProvider.description}
            pageUrl={`${window.location.origin}/business/${selectedProvider.id}`}
          />
        </Suspense>
      )}

      {/* Customer Authentication Modal */}
      {authModalOpen && (
        <Suspense fallback={<ComponentLoader />}>
          <CustomerAuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            defaultTab={authModalTab}
          />
        </Suspense>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
