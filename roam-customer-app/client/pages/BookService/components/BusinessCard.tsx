import React from "react";
import { Link } from "react-router-dom";
import { Building, Star, MapPin, CreditCard, Info, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDeliveryTypeIcon, getDeliveryTypeLabel } from "@/utils/deliveryTypeHelpers";
import type { Business } from '../types';

const BUSINESS_DESCRIPTION_PREVIEW_LEN = 150;

interface BusinessCardProps {
  business: Business;
  isSelected: boolean;
  onSelect: (business: Business) => void;
  expandedDescriptions: Set<string>;
  onToggleDescription: (businessId: string) => void;
  servicePrice?: number;
}

const getDeliveryTypes = (business: Business): string[] => {
  if (business.delivery_types && Array.isArray(business.delivery_types) && business.delivery_types.length > 0) {
    return business.delivery_types;
  }
  return ['business_location'];
};

export const BusinessCard = ({
  business,
  isSelected,
  onSelect,
  expandedDescriptions,
  onToggleDescription,
  servicePrice,
}: BusinessCardProps) => {
  const fullDescription =
    business.description ||
    "Professional service provider dedicated to delivering excellent results.";
  const isExpanded = expandedDescriptions.has(business.id);
  const shouldTruncate = fullDescription.length > BUSINESS_DESCRIPTION_PREVIEW_LEN;
  const displayDescription =
    isExpanded || !shouldTruncate
      ? fullDescription
      : fullDescription.slice(0, BUSINESS_DESCRIPTION_PREVIEW_LEN) + "...";

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isSelected
          ? 'ring-2 ring-roam-blue border-roam-blue bg-blue-50/50'
          : 'hover:shadow-md'
      }`}
      onClick={() => onSelect(business)}
    >
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {/* Business Logo */}
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
            {(business.logo_url || business.image_url) ? (
              <img
                src={business.logo_url || business.image_url}
                alt={`${business.business_name} logo`}
                className="w-full h-full object-cover rounded-xl"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <Building className="w-10 h-10 text-gray-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Business Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {business.business_name}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-1" />
                    {business.review_count > 0 ? (
                      <>
                        <span className="font-medium">{business.rating.toFixed(1)}</span>
                        <span className="ml-1">({business.review_count} {business.review_count === 1 ? 'review' : 'reviews'})</span>
                      </>
                    ) : (
                      <span className="text-gray-500">No reviews yet</span>
                    )}
                  </div>
                  {business.city && business.state && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{business.city}, {business.state}</span>
                    </div>
                  )}
                </div>

                {/* Service Pricing */}
                <div className="mt-2">
                  <div className="inline-flex items-center px-3 py-1 bg-roam-blue/10 rounded-full">
                    <CreditCard className="w-4 h-4 text-roam-blue mr-2" />
                    <span className="text-roam-blue font-semibold">
                      ${Number(business.service_price || servicePrice || 0).toFixed(2)}
                    </span>
                    <span className="text-gray-600 text-sm ml-1">for this service</span>
                  </div>
                </div>
              </div>

              {/* More Info Button */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="ml-4 flex-shrink-0"
              >
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="hover:bg-roam-blue hover:text-white"
                >
                  <Link to={`/business/${business.id}`} target="_blank">
                    <Info className="w-4 h-4 mr-1" />
                    More Info
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Business Description */}
            <div className="mb-3">
              <p className="text-sm text-gray-600 leading-relaxed">
                {displayDescription}
              </p>
              {shouldTruncate && (
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleDescription(business.id);
                  }}
                  className="text-roam-blue hover:text-roam-blue/80 text-sm font-medium mt-1"
                >
                  {isExpanded ? "Read less" : "Read more..."}
                </button>
              )}
            </div>

            {/* Delivery Types */}
            <div className="mb-3">
              <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Service Delivery Options
              </h4>
              <div className="flex flex-wrap gap-2">
                {getDeliveryTypes(business).map((deliveryType) => {
                  const Icon = getDeliveryTypeIcon(deliveryType);
                  return (
                    <Badge
                      key={deliveryType}
                      variant="outline"
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-white border-gray-200"
                    >
                      <Icon className="w-3.5 h-3.5 text-roam-blue" />
                      <span className="text-xs font-medium text-gray-700">
                        {getDeliveryTypeLabel(deliveryType)}
                      </span>
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Selection Indicator */}
            {isSelected && (
              <div className="flex items-center text-roam-blue text-sm font-medium">
                <div className="w-5 h-5 rounded-full bg-roam-blue text-white flex items-center justify-center mr-2">
                  ✓
                </div>
                Selected
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

BusinessCard.displayName = 'BusinessCard';

export default BusinessCard;
