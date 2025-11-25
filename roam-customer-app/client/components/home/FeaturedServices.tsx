import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FavoriteButton } from '@/components/FavoriteButton';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Tag,
  Building,
  Share2,
  Calendar,
} from 'lucide-react';
import type {
  TransformedPromotion,
  FeaturedBusiness,
} from '@/types/index';

interface FeaturedServicesProps {
  promotions: TransformedPromotion[];
  businesses: FeaturedBusiness[];
  onBusinessShare: (business: FeaturedBusiness) => void;
}

export const FeaturedServices: React.FC<FeaturedServicesProps> = ({
  promotions,
  businesses,
  onBusinessShare,
}) => {
  const [currentPromotionSlide, setCurrentPromotionSlide] = useState(0);
  const [currentBusinessSlide, setCurrentBusinessSlide] = useState(0);

  // Format savings helper
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

  // Promotions pagination
  const promotionPages = useMemo(() => {
    const pages: TransformedPromotion[][] = [];
    for (let i = 0; i < promotions.length; i += 3) {
      pages.push(promotions.slice(i, i + 3));
    }
    return pages;
  }, [promotions]);

  // Business pagination  
  const businessPages = useMemo(() => {
    const pages: FeaturedBusiness[][] = [];
    for (let i = 0; i < businesses.length; i += 3) {
      pages.push(businesses.slice(i, i + 3));
    }
    return pages;
  }, [businesses]);

  const nextPromotionSlide = useCallback(() => {
    const maxPage = Math.max(0, promotionPages.length - 1);
    const newPage = Math.min(currentPromotionSlide + 1, maxPage);
    setCurrentPromotionSlide(newPage);
  }, [currentPromotionSlide, promotionPages.length]);

  const prevPromotionSlide = useCallback(() => {
    const newPage = Math.max(currentPromotionSlide - 1, 0);
    setCurrentPromotionSlide(newPage);
  }, [currentPromotionSlide]);

  const nextBusinessSlide = useCallback(() => {
    const maxPage = Math.max(0, businessPages.length - 1);
    const newPage = Math.min(currentBusinessSlide + 1, maxPage);
    setCurrentBusinessSlide(newPage);
  }, [currentBusinessSlide, businessPages.length]);

  const prevBusinessSlide = useCallback(() => {
    const newPage = Math.max(currentBusinessSlide - 1, 0);
    setCurrentBusinessSlide(newPage);
  }, [currentBusinessSlide]);

  return (
    <>
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
                      className="w-full flex-none grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4"
                    >
                      {page.map((promotion) => (
                        <Card
                          key={promotion.id}
                          className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-0 shadow-xl bg-white overflow-hidden rounded-3xl w-full"
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
                                type="service"
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

                            {/* End Date Badge - Bottom Left */}
                            {promotion.endDate && (
                              <div className="absolute bottom-4 left-4">
                                <div className="bg-white/95 text-roam-blue px-3 py-1.5 rounded-full shadow-lg font-medium text-sm backdrop-blur-sm">
                                  <Clock className="w-4 h-4 mr-1 inline" />
                                  Ends {new Date(promotion.endDate).toLocaleDateString()}
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

          {businesses.length > 0 ? (
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
                          className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-0 shadow-xl bg-white overflow-hidden rounded-3xl flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                        >
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

                              {/* Action Buttons - Top Right */}
                              {/* Favorite and Share Icons - Top Left (where rating badge was) */}
                              <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
                                <FavoriteButton
                                  type="business"
                                  itemId={business.id}
                                  size="sm"
                                  variant="ghost"
                                  className="w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-lg border-0 text-gray-600 hover:text-red-500 hover:scale-110 transition-all backdrop-blur-sm"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-lg border-0 text-gray-600 hover:text-roam-blue hover:scale-110 transition-all backdrop-blur-sm"
                                  onClick={() => onBusinessShare(business)}
                                >
                                  <Share2 className="w-4 h-4" />
                                </Button>
                              </div>

                              {/* Business Logo - Overlapping */}
                              <div className="absolute -bottom-8 left-6 z-20">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center overflow-hidden border-4 border-white group-hover:scale-110 transition-transform duration-300">
                                  {business.logo_url &&
                                  business.logo_url !==
                                    "/api/placeholder/80/80" ? (
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

                              {/* Business Stats */}
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
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel indicators */}
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
            <div className="text-center py-8">
              <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground/60 mb-2">
                No Featured Businesses
              </h3>
              <p className="text-foreground/50">
                Check back soon for new featured businesses!
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};