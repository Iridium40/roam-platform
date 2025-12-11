import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  onNext,
  onPrev,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Button
        variant="outline"
        size="icon"
        onClick={onPrev}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "ghost"}
            size="icon"
            className="w-8 h-8"
            onClick={() => onPageChange(page)}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Button>
        ))}
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};
