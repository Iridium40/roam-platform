import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FavoriteButton } from '@/components/FavoriteButton';
import {
  Calendar,
  Share2,
  Building,
} from 'lucide-react';
import type { FeaturedBusiness } from '@/types/index';

interface BusinessCardProps {
  business: FeaturedBusiness;
  onShare?: (business: FeaturedBusiness) => void;
  showFavorite?: boolean;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({
  business,
  onShare,
  showFavorite = true,
}) => {
  return (
    <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-0 shadow-xl bg-white overflow-hidden rounded-lg w-full">
      <CardContent className="p-0">
        {/* Hero Cover Section */}
        <div
          className="relative h-64 bg-gradient-to-br from-roam-blue/20 via-roam-light-blue/10 to-roam-yellow/5"
          style={{
            backgroundImage: business.image_url
              ? `url(${business.image_url})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Cover overlay */}
          {business.image_url && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
          )}

          {/* Action Buttons - Top Left */}
          <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
            {showFavorite && (
              <FavoriteButton
                type="business"
                itemId={business.id}
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
                  onShare(business);
                }}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Business Logo - Overlapping */}
          <div className="absolute -bottom-8 left-6 z-20">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center overflow-hidden border-4 border-white group-hover:scale-110 transition-transform duration-300">
              {business.logo_url && business.logo_url !== "/api/placeholder/80/80" ? (
                <img
                  src={business.logo_url}
                  alt={business.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <Building className="w-8 h-8 text-roam-blue" />
              )}
            </div>
          </div>
        </div>

        {/* Business Content */}
        <div className="p-6 pt-12">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-roam-blue transition-colors">
              {business.name}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-2">
              {business.description}
            </p>
          </div>

          {/* Business Location */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <span>{business.location || 'Location TBD'}</span>
          </div>

          {/* Book Button */}
          <Button
            asChild
            className="w-full bg-gradient-to-r from-roam-blue to-roam-light-blue hover:from-roam-blue/90 hover:to-roam-light-blue/90 text-white font-semibold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
          >
            <Link to={`/business/${business.id}`}>
              <Calendar className="w-4 h-4 mr-2" />
              View Business
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessCard;
