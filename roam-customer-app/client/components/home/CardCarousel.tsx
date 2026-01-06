import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CardCarouselProps<T> {
  items: T[];
  renderCard: (item: T) => React.ReactNode;
  itemsPerPage?: number;
  mobileItemsPerPage?: number;
  keyExtractor: (item: T) => string;
  emptyState?: React.ReactNode;
  className?: string;
}

export function CardCarousel<T>({
  items,
  renderCard,
  itemsPerPage = 3,
  mobileItemsPerPage = 1,
  keyExtractor,
  emptyState,
  className = '',
}: CardCarouselProps<T>) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Create pages for carousel
  const pages = useMemo(() => {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += itemsPerPage) {
      result.push(items.slice(i, i + itemsPerPage));
    }
    return result;
  }, [items, itemsPerPage]);

  const nextSlide = useCallback(() => {
    const maxPage = Math.max(0, pages.length - 1);
    setCurrentSlide((prev) => Math.min(prev + 1, maxPage));
  }, [pages.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={className}>
      {/* Mobile View - Show all items stacked */}
      <div className="md:hidden grid grid-cols-1 gap-6 px-4">
        {items.map((item) => (
          <div key={keyExtractor(item)}>{renderCard(item)}</div>
        ))}
      </div>

      {/* Desktop View - Carousel */}
      <div className="hidden md:block relative">
        {/* Navigation Arrows */}
        {pages.length > 1 && (
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
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg disabled:opacity-50"
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
              disabled={currentSlide >= pages.length - 1}
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
              transform: `translateX(-${currentSlide * 100}%)`,
            }}
          >
            {pages.map((page, pageIndex) => (
              <div
                key={`page-${pageIndex}`}
                className="w-full flex-none grid grid-cols-2 lg:grid-cols-3 gap-6 px-4"
              >
                {page.map((item) => (
                  <div key={keyExtractor(item)}>{renderCard(item)}</div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Carousel indicators */}
        {pages.length > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            {pages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentSlide
                    ? "bg-roam-blue"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CardCarousel;
