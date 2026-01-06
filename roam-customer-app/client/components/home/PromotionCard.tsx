import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tag,
  Building,
} from 'lucide-react';
import type { TransformedPromotion } from '@/types/index';

interface PromotionCardProps {
  promotion: TransformedPromotion;
}

// Helper to format savings
const formatSavings = (promotion: TransformedPromotion): string | null => {
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

// Helper to build promotion link
const getPromotionLink = (promotion: TransformedPromotion): string => {
  const baseParams = `promotion=${promotion.id}&promo_code=${promotion.promoCode}`;

  if (promotion.business && promotion.service) {
    return `/book-service/${promotion.service.id}?${baseParams}&business_id=${promotion.business.id}`;
  } else if (promotion.business) {
    return `/business/${promotion.business.id}?${baseParams}`;
  } else if (promotion.service) {
    return `/book-service/${promotion.service.id}?${baseParams}`;
  } else {
    return `/services?${baseParams}`;
  }
};

// Helper to get button text
const getButtonText = (promotion: TransformedPromotion): string => {
  if (promotion.business && promotion.service) return "Claim Offer";
  if (promotion.business) return "Book with Business";
  if (promotion.service) return "Book This Service";
  return "Claim Offer";
};

export const PromotionCard: React.FC<PromotionCardProps> = ({ promotion }) => {
  const savings = formatSavings(promotion);

  return (
    <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-0 shadow-xl bg-white overflow-hidden rounded-lg w-full">
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
            {promotion.business?.logo ? (
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

        {/* Savings Badge - Bottom Right */}
        {savings && (
          <div className="absolute bottom-4 right-4">
            <div className="bg-red-500 text-white px-4 py-2 rounded-2xl shadow-lg font-bold text-lg">
              {savings}
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
          <Link to={getPromotionLink(promotion)}>
            <Tag className="w-4 h-4 mr-2" />
            {getButtonText(promotion)}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default PromotionCard;
