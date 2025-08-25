import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Tag } from "lucide-react";

interface SpecialPromotionsProps {
  isCustomer?: boolean;
  onAuthRequired?: () => void;
}

export function SpecialPromotions({
  isCustomer,
  onAuthRequired,
}: SpecialPromotionsProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const specialPromotions = useMemo(
    () => [
      {
        id: "special-1",
        title: "New Customer Special",
        subtitle: "50% OFF First Service",
        description:
          "Welcome to ROAM! Get 50% off your first booking with any of our premium service providers.",
        discount: "50% OFF",
        code: "WELCOME50",
        backgroundColor: "from-purple-500 to-blue-600",
        validUntil: "Limited Time Offer",
        ctaText: "Claim Offer",
      },
      {
        id: "special-2",
        title: "Weekend Wellness Deal",
        subtitle: "Book 2 Services, Get 1 Free",
        description:
          "Perfect for your weekend self-care routine. Book any two wellness services and get a third one completely free.",
        discount: "Buy 2 Get 1 FREE",
        code: "WEEKEND3",
        backgroundColor: "from-emerald-500 to-teal-600",
        validUntil: "Valid Weekends Only",
        ctaText: "Book Now",
      },
    ],
    [],
  );

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % specialPromotions.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) =>
        (prev - 1 + specialPromotions.length) % specialPromotions.length,
    );
  };

  const handleCtaClick = () => {
    if (isCustomer) {
      window.location.href = "/browse-services";
    } else if (onAuthRequired) {
      onAuthRequired();
    }
  };

  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Navigation Arrows */}
      {specialPromotions.length > 1 && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </>
      )}

      {/* Single Card Display */}
      <div className="overflow-hidden rounded-3xl">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentSlide * 100}%)`,
            width: `${specialPromotions.length * 100}%`,
          }}
        >
          {specialPromotions.map((promotion, index) => (
            <div key={promotion.id} className="w-full flex-none px-2">
              <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 shadow-xl bg-white overflow-hidden rounded-3xl">
                {/* Hero Section with Gradient Background */}
                <div
                  className={`relative h-80 bg-gradient-to-br ${promotion.backgroundColor} overflow-hidden`}
                >
                  {/* Decorative Elements */}
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="absolute top-8 right-8 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
                  <div className="absolute bottom-8 left-8 w-24 h-24 bg-white/20 rounded-full blur-lg"></div>

                  {/* Discount Badge */}
                  <div className="absolute top-6 right-6 z-10">
                    <div className="bg-white text-gray-900 px-6 py-3 rounded-2xl shadow-lg font-bold text-xl">
                      {promotion.discount}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 h-full flex flex-col justify-center items-center text-center text-white p-8">
                    <h3 className="text-4xl font-bold mb-4">
                      {promotion.title}
                    </h3>
                    <h4 className="text-2xl font-semibold mb-6 text-white/90">
                      {promotion.subtitle}
                    </h4>
                    <p className="text-lg leading-relaxed max-w-md">
                      {promotion.description}
                    </p>
                  </div>
                </div>

                <CardContent className="p-8 space-y-6">
                  {/* Promo Code Section */}
                  <div className="flex justify-between items-center py-4 px-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                    <span className="text-lg font-medium text-gray-700">
                      Promo Code
                    </span>
                    <span className="text-2xl font-bold text-roam-blue font-mono">
                      {promotion.code}
                    </span>
                  </div>

                  {/* Validity Info */}
                  <div className="text-center">
                    <span className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
                      {promotion.validUntil}
                    </span>
                  </div>

                  {/* Action Button */}
                  <div className="pt-4">
                    <Button
                      onClick={handleCtaClick}
                      className="w-full bg-gradient-to-r from-roam-blue to-roam-light-blue hover:from-roam-blue/90 hover:to-roam-light-blue/90 text-white font-bold py-4 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                    >
                      <Tag className="w-5 h-5 mr-2" />
                      {promotion.ctaText}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Carousel Indicators */}
      {specialPromotions.length > 1 && (
        <div className="flex justify-center mt-8 gap-3">
          {specialPromotions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-roam-blue scale-125"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SpecialPromotions;
