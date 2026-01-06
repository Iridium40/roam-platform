import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FavoriteButton } from '@/components/FavoriteButton';
import {
  Clock,
  Calendar,
  Share2,
  Sparkles,
} from 'lucide-react';
import type { FeaturedService } from '@/types/index';

interface ServiceCardProps {
  service: FeaturedService;
  onShare?: (service: FeaturedService) => void;
  showFavorite?: boolean;
  variant?: 'featured' | 'popular';
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onShare,
  showFavorite = true,
  variant = 'featured',
}) => {
  const categoryColors: Record<string, string> = {
    wellness: 'bg-green-100 text-green-700',
    beauty: 'bg-pink-100 text-pink-700',
    fitness: 'bg-orange-100 text-orange-700',
    health: 'bg-blue-100 text-blue-700',
    general: 'bg-gray-100 text-gray-700',
  };

  const categoryColor = categoryColors[service.category?.toLowerCase()] || categoryColors.general;

  return (
    <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-0 shadow-xl bg-white overflow-hidden rounded-lg w-full">
      {/* Hero Image Section */}
      <div className="relative h-64 bg-gradient-to-br from-roam-blue/20 via-roam-light-blue/10 to-roam-yellow/5 overflow-hidden">
        <img
          src={service.image}
          alt={service.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>

        {/* Action Buttons - Top Left */}
        <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
          {showFavorite && (
            <FavoriteButton
              type="service"
              itemId={service.id}
              size="sm"
              variant="ghost"
              className="w-10 h-10 rounded-lg bg-white/95 hover:bg-white shadow-lg border-0 text-gray-600 hover:text-red-500 hover:scale-110 transition-all backdrop-blur-sm"
            />
          )}
          {onShare && (
            <Button
              size="sm"
              variant="ghost"
              className="w-10 h-10 rounded-lg bg-white/95 hover:bg-white shadow-lg border-0 text-gray-600 hover:text-roam-blue hover:scale-110 transition-all backdrop-blur-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShare(service);
              }}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Category Badge - Top Right */}
        {service.category && (
          <div className="absolute top-4 right-4 z-10">
            <Badge className={`${categoryColor} border-0 px-3 py-1 text-xs font-semibold shadow-md`}>
              {service.category}
            </Badge>
          </div>
        )}

        {/* Price Badge - Bottom Right */}
        <div className="absolute bottom-4 right-4 z-10">
          <div className="bg-roam-blue text-white px-4 py-2 rounded-2xl shadow-lg font-bold text-lg">
            {service.price}+
          </div>
        </div>

        {/* Popular/Featured Badge */}
        {variant === 'popular' && (
          <div className="absolute bottom-4 left-4 z-10">
            <Badge className="bg-roam-yellow/90 text-gray-900 border-0 px-3 py-1 text-xs font-semibold shadow-md flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Popular
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-6">
        {/* Service Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-roam-blue transition-colors line-clamp-1">
          {service.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4">
          {service.description}
        </p>

        {/* Duration */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
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
  );
};

export default ServiceCard;
