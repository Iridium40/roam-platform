import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FavoriteButton } from '@/components/FavoriteButton';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Calendar,
  Search,
  Clock,
  Stethoscope,
  Scissors,
  Dumbbell,
  Home,
  Briefcase,
  Car,
  Smartphone,
  Building,
} from 'lucide-react';

interface FeaturedService {
  id: string;
  name: string;
  category: string;
  description: string;
  price_min: number;
  price_max: number;
  duration: string;
  location_type: string;
  image_url?: string;
  rating?: number;
  reviews_count?: number;
  provider_name?: string;
  provider_id?: string;
}

interface ServiceGridProps {
  title: string;
  subtitle: string;
  services: FeaturedService[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  showDebugInfo?: boolean;
}

export const ServiceGrid: React.FC<ServiceGridProps> = ({
  title,
  subtitle,
  services,
  selectedCategory,
  onCategorySelect,
  showDebugInfo = false,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  // Category icon mapping function
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();

    if (cat.includes("healthcare") || cat.includes("medical") || cat.includes("health")) {
      return Stethoscope;
    }
    if (cat.includes("beauty") || cat.includes("wellness") || cat.includes("spa")) {
      return Scissors;
    }
    if (cat.includes("fitness") || cat.includes("gym") || cat.includes("workout")) {
      return Dumbbell;
    }
    if (cat.includes("home") || cat.includes("cleaning") || cat.includes("repair")) {
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

    return Building;
  };

  // Category color mapping function
  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();

    if (cat.includes("beauty") || cat.includes("wellness") || cat.includes("spa")) {
      return "bg-gradient-to-r from-pink-500 to-rose-500";
    }
    if (cat.includes("fitness") || cat.includes("gym") || cat.includes("workout")) {
      return "bg-gradient-to-r from-orange-500 to-red-500";
    }
    if (cat.includes("therapy") || cat.includes("therapeutic") || cat.includes("massage")) {
      return "bg-gradient-to-r from-green-500 to-emerald-500";
    }
    if (cat.includes("healthcare") || cat.includes("medical") || cat.includes("health")) {
      return "bg-gradient-to-r from-blue-500 to-cyan-500";
    }

    return "bg-gradient-to-r from-gray-500 to-gray-600";
  };

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

  // Paginate services into pages of 2 for desktop, 1 for mobile
  const servicePages = useMemo(() => {
    const pages: FeaturedService[][] = [];
    for (let i = 0; i < services.length; i += 2) {
      pages.push(services.slice(i, i + 2));
    }
    return pages;
  }, [services]);

  const nextSlide = useCallback(() => {
    const maxPage = Math.max(0, servicePages.length - 1);
    const newPage = Math.min(currentSlide + 1, maxPage);
    setCurrentSlide(newPage);
  }, [currentSlide, servicePages.length]);

  const prevSlide = useCallback(() => {
    const newPage = Math.max(currentSlide - 1, 0);
    setCurrentSlide(newPage);
  }, [currentSlide]);

  // Reset carousel when services change
  React.useEffect(() => {
    setCurrentSlide(0);
  }, [services]);

  return (
    <section className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold" dangerouslySetInnerHTML={{ __html: title }} />
          <p className="text-lg text-foreground/70 mt-4">{subtitle}</p>
          {/* Debug info for development */}
          {showDebugInfo && process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-400 mt-1">
              Debug: {services.length} services, {servicePages.length} pages, current: {currentSlide + 1}
            </div>
          )}
        </div>

        {services.length > 0 ? (
          <div className="relative overflow-hidden">
            {/* Navigation Arrows */}
            {servicePages.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    prevSlide();
                  }}
                  disabled={currentSlide === 0}
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
                    nextSlide();
                  }}
                  disabled={currentSlide >= servicePages.length - 1}
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
                  transform: `translateX(-${currentSlide * 100}%)`,
                }}
              >
                {servicePages.map((page, pageIndex) => (
                  <div
                    key={`page-${pageIndex}`}
                    className="w-full flex-none grid grid-cols-1 md:grid-cols-2 gap-6 px-4"
                  >
                    {page.map((service, serviceIndex) => (
                      <Card
                        key={service.id}
                        className="hover:shadow-xl transition-all duration-300 cursor-pointer border-border/50 hover:border-roam-light-blue/50 overflow-hidden w-full"
                      >
                        <div className="relative h-64">
                          <img
                            src={service.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&h=300&fit=crop'}
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-4 left-4">
                            <Badge
                              className={`${getCategoryColor(service.category)} text-white border-0`}
                              icon={getCategoryIcon(service.category)}
                            >
                              {service.category}
                            </Badge>
                          </div>
                          <div className="absolute top-4 right-4 flex gap-2">
                            <FavoriteButton
                              type="service"
                              itemId={service.id}
                              size="sm"
                              variant="ghost"
                              className="bg-white/90 hover:bg-white"
                            />
                            <Badge
                              variant="secondary"
                              className="bg-white/90 text-gray-800"
                            >
                              <Star className="w-3 h-3 mr-1 text-roam-warning fill-current" />
                              {service.rating || 4.8}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-6">
                          <h3 className="text-xl font-semibold mb-2">
                            {service.name}
                          </h3>
                          <div className="mb-4">
                            <p className="text-foreground/70">
                              {getDisplayDescription(service.description, service.id)}
                            </p>
                            {service.description.length > 200 && (
                              <button
                                onClick={() => toggleDescription(service.id)}
                                className="md:hidden text-roam-blue text-sm font-medium hover:underline mt-1"
                              >
                                {expandedDescriptions.has(service.id)
                                  ? "Show less"
                                  : "Read more"}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold text-roam-blue">
                                Starting at ${service.price_min || 50}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="border-roam-blue text-roam-blue"
                            >
                              {service.duration}
                            </Badge>
                          </div>
                          <Button
                            asChild
                            className="w-full bg-roam-blue hover:bg-roam-blue/90"
                          >
                            <Link to={`/book-service/${service.id}`}>
                              <Calendar className="w-4 h-4 mr-2" />
                              Book This Service
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              No Services Found
            </h3>
            <p className="text-foreground/60 mb-4">
              No services match the selected category. Try selecting a different category.
            </p>
            <Button
              onClick={() => onCategorySelect("all")}
              variant="outline"
              className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
            >
              View All Services
            </Button>
          </div>
        )}

        {/* Carousel indicators - only show when there are multiple pages */}
        {servicePages.length > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            {servicePages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentSlide
                    ? "bg-roam-blue"
                    : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};