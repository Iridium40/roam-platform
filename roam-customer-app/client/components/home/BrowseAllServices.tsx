import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Calendar,
  Sparkles,
  Stethoscope,
  Scissors,
  Dumbbell,
  Home,
  Briefcase,
  Car,
  Smartphone,
  Building,
  Loader2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(12); // Show 12 initially for Featured/Category views
  const [allServicesDisplayCount, setAllServicesDisplayCount] = useState(12); // Show 12 initially for All Services
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('featured');

  // Fetch all services and categories
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          setLoading(false);
          setError('Loading took too long. Please refresh the page.');
        }, 15000); // 15 second timeout

        // Fetch services via server API (bypasses RLS)
        const response = await fetch('/api/services/browse');
        const json = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorMsg = json?.error || 'Failed to fetch services';
          throw new Error(errorMsg);
        }

        const { services: servicesData, categories: categoriesData } = json.data || {};

        // Transform services
        const transformedServices: Service[] = (servicesData || []).map((service: any) => ({
          id: service.id,
          title: service.name,
          category: service.category || 'General',
          subcategory: service.subcategory || 'Other',
          image: service.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&h=300&fit=crop',
          description: service.description || 'Professional service',
          price: `$${service.min_price || 50}`,
          min_price: service.min_price || 50,
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
        clearTimeout(timeoutId);
      } catch (err: any) {
        clearTimeout(timeoutId);
        logger.error('BrowseAllServices: Error fetching services:', err);
        setError(err?.message || 'Failed to load services. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Helper function to convert to title case
  const toTitleCase = (str: string) => {
    const upperCaseWords = ['IV', 'AI', 'CPR', 'EMT', 'DNA', 'RNA'];
    
    return str
      .replace(/_and_/g, ' & ')  // Replace _and_ with &
      .replace(/_/g, ' ')         // Replace remaining underscores with spaces
      .split(' ')
      .map(word => {
        const upperWord = word.toUpperCase();
        if (upperCaseWords.includes(upperWord)) {
          return upperWord;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };


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

    return filtered;
  }, [services, selectedCategory]);

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


  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-roam-blue to-roam-light-blue text-white border-0 rounded-lg">
            <Sparkles className="w-4 h-4 mr-1" />
            Browse All Services
          </Badge>
          <h2 className="text-4xl font-bold mb-4">
            Explore Our Complete <span className="text-roam-blue">Service Collection</span>
          </h2>
        </div>

        {/* Category Tabs */}
        <div className="mb-8">
          {/* Desktop View - All buttons in a row */}
          <div className="hidden md:block overflow-x-auto scrollbar-hide">
            <div className="flex justify-center gap-3 pb-2 px-1 min-w-max">
              {/* Featured Services - First */}
              <button
                onClick={() => {
                  setSelectedCategory('featured');
                }}
                className={cn(
                  'px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2',
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
                }}
                className={cn(
                  'px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap',
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
                    }}
                    className={cn(
                      'px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2',
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

          {/* Mobile View - Featured/All Services buttons + Dropdown */}
          <div className="md:hidden space-y-3">
            {/* Featured Services and All Services buttons */}
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setSelectedCategory('featured');
                }}
                className={cn(
                  'px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2 flex-1 justify-center',
                  selectedCategory === 'featured'
                    ? 'bg-gradient-to-r from-roam-blue to-roam-light-blue text-white shadow-lg scale-105'
                    : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                )}
              >
                <Sparkles className="w-4 h-4" />
                Featured Services
              </button>
              
              <button
                onClick={() => {
                  setSelectedCategory('all');
                }}
                className={cn(
                  'px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap flex-1 justify-center',
                  selectedCategory === 'all'
                    ? 'bg-roam-blue text-white shadow-lg scale-105'
                    : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                )}
              >
                All Services
              </button>
            </div>

            {/* Category Dropdown */}
            <div className="w-full">
              <Select
                value={selectedCategory !== 'featured' && selectedCategory !== 'all' ? selectedCategory : undefined}
                onValueChange={(value) => {
                  setSelectedCategory(value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category">
                    {selectedCategory !== 'featured' && selectedCategory !== 'all' ? (
                      (() => {
                        const category = displayCategories.find(c => c.name === selectedCategory);
                        if (category) {
                          const Icon = category.icon;
                          return (
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span>{toTitleCase(selectedCategory)}</span>
                            </div>
                          );
                        }
                        return null;
                      })()
                    ) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {displayCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <SelectItem key={category.id} value={category.name}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{toTitleCase(category.name)}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
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
        ) : error ? (
          <div className="text-center py-20">
            <h3 className="text-2xl font-bold mb-2 text-red-600">Error Loading Services</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-roam-blue hover:bg-roam-blue/90"
            >
              Refresh Page
            </Button>
          </div>
        ) : filteredAndSortedServices.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-2xl font-bold mb-2">No Services Found</h3>
            <p className="text-gray-600 mb-6">Try selecting a different category</p>
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
                              <Badge className={`bg-gradient-to-r ${getCategoryColor(service.category)} text-white border-0 text-xs rounded-lg`}>
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
                  variant={undefined}
                  className="border-2 border-roam-blue bg-background !text-roam-blue hover:!bg-roam-blue hover:!text-white px-8 [&>*]:!text-inherit [&:hover>*]:!text-white"
                >
                  <span className="!text-inherit">Load More Services</span>
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
                          <Badge className={`bg-gradient-to-r ${getCategoryColor(service.category)} text-white border-0 text-xs rounded-lg`}>
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
                  variant={undefined}
                  className="border-2 border-roam-blue bg-background !text-roam-blue hover:!bg-roam-blue hover:!text-white px-8 [&>*]:!text-inherit [&:hover>*]:!text-white"
                >
                  <span className="!text-inherit">Load More Services</span>
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
