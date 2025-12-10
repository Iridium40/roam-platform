import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  SlidersHorizontal,
  Star,
  Clock,
  Calendar,
  TrendingUp,
  DollarSign,
  Sparkles,
  Stethoscope,
  Scissors,
  Dumbbell,
  Home,
  Briefcase,
  Car,
  Smartphone,
  Building,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FavoriteButton } from '@/components/FavoriteButton';
import { cn } from '@/lib/utils';

interface Service {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  image: string;
  description: string;
  price: string;
  min_price: number;
  rating: number;
  duration: string;
  booking_count?: number;
  is_featured?: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: any;
  color: string;
  subcategories: string[];
}

// Category icon mapping
const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('healthcare') || cat.includes('medical') || cat.includes('health')) return Stethoscope;
  if (cat.includes('beauty') || cat.includes('wellness') || cat.includes('spa')) return Scissors;
  if (cat.includes('fitness') || cat.includes('gym') || cat.includes('workout')) return Dumbbell;
  if (cat.includes('home') || cat.includes('cleaning') || cat.includes('repair')) return Home;
  if (cat.includes('business') || cat.includes('professional')) return Briefcase;
  if (cat.includes('automotive') || cat.includes('car')) return Car;
  if (cat.includes('technology') || cat.includes('tech')) return Smartphone;
  return Building;
};

// Category color mapping
const getCategoryColor = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('beauty') || cat.includes('wellness') || cat.includes('spa')) {
    return 'from-pink-500 to-rose-500';
  }
  if (cat.includes('fitness') || cat.includes('gym') || cat.includes('workout')) {
    return 'from-orange-500 to-red-500';
  }
  if (cat.includes('therapy') || cat.includes('therapeutic') || cat.includes('massage')) {
    return 'from-green-500 to-emerald-500';
  }
  if (cat.includes('healthcare') || cat.includes('medical') || cat.includes('health')) {
    return 'from-blue-500 to-cyan-500';
  }
  return 'from-gray-500 to-gray-600';
};

export function BrowseAllServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(12); // Show 12 initially for Featured/Category views
  const [allServicesDisplayCount, setAllServicesDisplayCount] = useState(12); // Show 12 initially for All Services
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('featured');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all services and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all active services with category and subcategory info
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select(`
            id,
            name,
            description,
            min_price,
            duration_minutes,
            image_url,
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
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (servicesError) throw servicesError;

        // Fetch categories with subcategories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('service_categories')
          .select(`
            id,
            service_category_type,
            service_subcategories (
              id,
              service_subcategory_type
            )
          `)
          .eq('is_active', true);

        if (categoriesError) throw categoriesError;

        // Transform services
        const transformedServices: Service[] = (servicesData || []).map((service: any) => ({
          id: service.id,
          title: service.name,
          category: service.service_subcategories?.service_categories?.service_category_type || 'General',
          subcategory: service.service_subcategories?.service_subcategory_type || 'Other',
          image: service.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&h=300&fit=crop',
          description: service.description || 'Professional service',
          price: `$${service.min_price || 50}`,
          min_price: service.min_price || 50,
          rating: 4.5 + Math.random() * 0.5, // Random rating between 4.5-5.0
          duration: `${service.duration_minutes || 60} min`,
          booking_count: Math.floor(Math.random() * 100) + 10,
          is_featured: service.is_featured || false,
        }));

        // Transform categories
        const transformedCategories: Category[] = (categoriesData || []).map((cat: any) => ({
          id: cat.id,
          name: cat.service_category_type,
          icon: getCategoryIcon(cat.service_category_type),
          color: getCategoryColor(cat.service_category_type),
          subcategories: (cat.service_subcategories || []).map((sub: any) => sub.service_subcategory_type),
        }));

        setServices(transformedServices);
        setCategories(transformedCategories);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper function to convert to title case
  const toTitleCase = (str: string) => {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get subcategories for selected category
  const availableSubcategories = useMemo(() => {
    if (selectedCategory === 'all' || selectedCategory === 'featured') return [];
    const category = categories.find((cat) => cat.name === selectedCategory);
    return category?.subcategories || [];
  }, [selectedCategory, categories]);

  // Priority categories in specific order
  const priorityCategories = ['Beauty', 'Fitness', 'Therapy', 'Healthcare'];

  // Filtered categories for display
  const displayCategories = useMemo(() => {
    // Get priority categories that exist in the database
    const priority = categories.filter(cat => 
      priorityCategories.some(p => cat.name.toLowerCase().includes(p.toLowerCase()))
    ).sort((a, b) => {
      const aIndex = priorityCategories.findIndex(p => a.name.toLowerCase().includes(p.toLowerCase()));
      const bIndex = priorityCategories.findIndex(p => b.name.toLowerCase().includes(p.toLowerCase()));
      return aIndex - bIndex;
    });

    // Get remaining categories
    const remaining = categories.filter(cat => 
      !priorityCategories.some(p => cat.name.toLowerCase().includes(p.toLowerCase()))
    );

    return [...priority, ...remaining];
  }, [categories]);

  // Filter and sort services
  const filteredAndSortedServices = useMemo(() => {
    let filtered = [...services];

    // Featured filter
    if (selectedCategory === 'featured') {
      filtered = filtered.filter((service) => service.is_featured === true);
    }
    // Category filter
    else if (selectedCategory !== 'all') {
      filtered = filtered.filter((service) => service.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (service) =>
          service.title.toLowerCase().includes(query) ||
          service.description.toLowerCase().includes(query) ||
          service.category.toLowerCase().includes(query) ||
          service.subcategory.toLowerCase().includes(query)
      );
    }

    // Subcategory filter
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter((service) => service.subcategory === selectedSubcategory);
    }

    // Note: Delivery type filtering removed as delivery_types are set at business_services level, not service level

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.min_price - b.min_price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.min_price - a.min_price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
        filtered.sort((a, b) => (b.booking_count || 0) - (a.booking_count || 0));
        break;
      case 'newest':
        // Already sorted by created_at desc from DB
        break;
    }

    return filtered;
  }, [services, searchQuery, selectedCategory, selectedSubcategory, sortBy, categories]);

  // Group services by subcategory when showing "All Services"
  const groupedServices = useMemo(() => {
    if (selectedCategory !== 'all') {
      return null; // Don't group for specific categories or featured
    }

    const groups: Record<string, Service[]> = {};
    filteredAndSortedServices.forEach((service) => {
      const subcategory = service.subcategory || 'Other';
      if (!groups[subcategory]) {
        groups[subcategory] = [];
      }
      groups[subcategory].push(service);
    });

    // Sort subcategories alphabetically
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredAndSortedServices, selectedCategory]);

  // For "All Services" view with grouping, slice services to display count
  const displayedGroupedServices = useMemo(() => {
    if (!groupedServices) return null;
    
    let count = 0;
    const displayed: [string, Service[]][] = [];
    
    for (const [subcategory, services] of groupedServices) {
      const remaining = allServicesDisplayCount - count;
      if (remaining <= 0) break;
      
      if (services.length <= remaining) {
        displayed.push([subcategory, services]);
        count += services.length;
      } else {
        displayed.push([subcategory, services.slice(0, remaining)]);
        count += remaining;
      }
    }
    
    return displayed;
  }, [groupedServices, allServicesDisplayCount]);

  const displayedServices = filteredAndSortedServices.slice(0, displayCount);
  const hasMore = displayCount < filteredAndSortedServices.length;
  const hasMoreAllServices = allServicesDisplayCount < filteredAndSortedServices.length;

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + 12); // Load 12 more services
  };

  const handleLoadMoreAllServices = () => {
    setAllServicesDisplayCount((prev) => prev + 12); // Load 12 more services
  };

  // Reset display counts when category changes
  useEffect(() => {
    setDisplayCount(12);
    setAllServicesDisplayCount(12);
  }, [selectedCategory]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('featured');
    setSelectedSubcategory('all');
    setSortBy('popular');
  };

  const activeFilterCount = [
    selectedCategory !== 'featured',
    selectedSubcategory !== 'all',
    searchQuery !== '',
  ].filter(Boolean).length;

  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-roam-blue to-roam-light-blue text-white border-0">
            <Sparkles className="w-4 h-4 mr-1" />
            Browse All Services
          </Badge>
          <h2 className="text-4xl font-bold mb-4">
            Explore Our Complete <span className="text-roam-blue">Service Collection</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover {services.length}+ professional services across multiple categories. Filter, search, and find the perfect service for your needs.
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          {/* Search and Main Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-48 h-12">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Most Popular
                  </div>
                </SelectItem>
                <SelectItem value="rating">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Highest Rated
                  </div>
                </SelectItem>
                <SelectItem value="price-low">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Price: Low to High
                  </div>
                </SelectItem>
                <SelectItem value="price-high">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Price: High to Low
                  </div>
                </SelectItem>
                <SelectItem value="newest">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Newest First
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Filters Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 relative"
            >
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-roam-blue text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="border-t pt-4 space-y-4 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subcategory Filter */}
                {availableSubcategories.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Subcategory</label>
                    <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="All subcategories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subcategories</SelectItem>
                        {availableSubcategories.map((sub) => (
                          <SelectItem key={sub} value={sub}>
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Reset Filters */}
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  onClick={resetFilters}
                  className="text-roam-blue hover:text-roam-blue/80"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reset All Filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="mb-8 overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 pb-2 min-w-max">
            {/* Featured Services - First */}
            <button
              onClick={() => {
                setSelectedCategory('featured');
                setSelectedSubcategory('all');
              }}
              className={cn(
                'px-6 py-3 rounded-full font-medium transition-all whitespace-nowrap flex items-center gap-2',
                selectedCategory === 'featured'
                  ? 'bg-gradient-to-r from-roam-blue to-roam-light-blue text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
              )}
            >
              <Sparkles className="w-4 h-4" />
              Featured Services
            </button>
            
            {/* All Services - Second */}
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedSubcategory('all');
              }}
              className={cn(
                'px-6 py-3 rounded-full font-medium transition-all whitespace-nowrap',
                selectedCategory === 'all'
                  ? 'bg-roam-blue text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
              )}
            >
              All Services
            </button>
            
            {/* Priority Categories: Beauty, Fitness, Therapy, Healthcare */}
            {displayCategories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.name);
                    setSelectedSubcategory('all');
                  }}
                  className={cn(
                    'px-6 py-3 rounded-full font-medium transition-all whitespace-nowrap flex items-center gap-2',
                    selectedCategory === category.name
                      ? `bg-gradient-to-r ${category.color} text-white shadow-lg scale-105`
                      : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {toTitleCase(category.name)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            Showing <span className="font-semibold text-roam-blue">{displayedServices.length}</span> of{' '}
            <span className="font-semibold">{filteredAndSortedServices.length}</span> services
          </p>
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-roam-blue" />
          </div>
        ) : filteredAndSortedServices.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No Services Found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your filters or search query</p>
            <Button onClick={resetFilters} variant="outline" className="border-roam-blue text-roam-blue">
              Reset Filters
            </Button>
          </div>
        ) : displayedGroupedServices ? (
          // Grouped by Subcategory View (for "All Services")
          <>
            {displayedGroupedServices.map(([subcategory, services]) => (
              <div key={subcategory} className="mb-12">
                {/* Subcategory Header */}
                <div className="flex items-center gap-3 mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">{toTitleCase(subcategory)}</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent"></div>
                  <span className="text-sm text-gray-500 font-medium">{services.length} services</span>
                </div>

                {/* Services Grid for this Subcategory */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                  {services.map((service) => {
                    const Icon = getCategoryIcon(service.category);
                    return (
                      <Link
                        key={service.id}
                        to={`/book-service/${service.id}`}
                        className="group block"
                      >
                        <div className="bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden h-full flex flex-col">
                          {/* Image */}
                          <div className="relative h-40 overflow-hidden">
                            <img
                              src={service.image}
                              alt={service.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute top-2 left-2">
                              <Badge className={`bg-gradient-to-r ${getCategoryColor(service.category)} text-white border-0 text-xs`}>
                                <Icon className="w-3 h-3 mr-1" />
                                {service.category}
                              </Badge>
                            </div>
                            <div className="absolute top-2 right-2">
                              <FavoriteButton
                                type="service"
                                itemId={service.id}
                                size="sm"
                                variant="ghost"
                                className="bg-white/90 hover:bg-white h-8 w-8"
                              />
                            </div>
                            {/* Rating Badge */}
                            <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs font-semibold">{service.rating.toFixed(1)}</span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-4 flex-1 flex flex-col">
                            <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-roam-blue transition-colors">
                              {service.title}
                            </h3>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                              <Clock className="w-3 h-3" />
                              <span>{service.duration}</span>
                            </div>

                            <div className="mt-auto">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-gray-500">Starting at</p>
                                  <p className="text-lg font-bold text-roam-blue">{service.price}</p>
                                </div>
                                <Button
                                  size="sm"
                                  className="bg-roam-blue hover:bg-roam-blue/90 text-xs h-8 px-3"
                                >
                                  <Calendar className="w-3 h-3 mr-1" />
                                  Book
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Load More Button for All Services */}
            {hasMoreAllServices && (
              <div className="text-center mt-12">
                <Button
                  onClick={handleLoadMoreAllServices}
                  size="lg"
                  variant="outline"
                  className="border-2 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white px-8"
                >
                  Load More Services
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-sm text-gray-500 mt-4">
                  {filteredAndSortedServices.length - allServicesDisplayCount} more services available
                </p>
              </div>
            )}
          </>
        ) : (
          // Regular Grid View (for Featured, specific categories)
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              {displayedServices.map((service) => {
                const Icon = getCategoryIcon(service.category);
                return (
                  <Link
                    key={service.id}
                    to={`/book-service/${service.id}`}
                    className="group block"
                  >
                    <div className="bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden h-full flex flex-col">
                      {/* Image */}
                      <div className="relative h-40 overflow-hidden">
                        <img
                          src={service.image}
                          alt={service.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge className={`bg-gradient-to-r ${getCategoryColor(service.category)} text-white border-0 text-xs`}>
                            <Icon className="w-3 h-3 mr-1" />
                            {service.category}
                          </Badge>
                        </div>
                        <div className="absolute top-2 right-2">
                          <FavoriteButton
                            type="service"
                            itemId={service.id}
                            size="sm"
                            variant="ghost"
                            className="bg-white/90 hover:bg-white h-8 w-8"
                          />
                        </div>
                        {/* Rating Badge */}
                        <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-semibold">{service.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-roam-blue transition-colors">
                          {service.title}
                        </h3>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          <Clock className="w-3 h-3" />
                          <span>{service.duration}</span>
                        </div>

                        <div className="mt-auto">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-500">Starting at</p>
                              <p className="text-lg font-bold text-roam-blue">{service.price}</p>
                            </div>
                            <Button
                              size="sm"
                              className="bg-roam-blue hover:bg-roam-blue/90 text-xs h-8 px-3"
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              Book
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center mt-12">
                <Button
                  onClick={handleLoadMore}
                  size="lg"
                  variant="outline"
                  className="border-2 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white px-8"
                >
                  Load More Services
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-sm text-gray-500 mt-4">
                  {filteredAndSortedServices.length - displayCount} more services available
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
