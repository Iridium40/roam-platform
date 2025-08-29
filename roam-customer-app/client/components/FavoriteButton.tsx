import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";
import { logger } from '@/utils/logger';

interface FavoriteButtonProps {
  type: "service" | "business" | "provider";
  itemId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
  showText?: boolean;
}

export function FavoriteButton({
  type,
  itemId,
  className,
  size = "md",
  variant = "ghost",
  showText = false,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const {
    loading: isLoading,
    addFavorite,
    removeFavorite,
    isFavorite,
    customer,
  } = useFavorites();

  // Check if item is favorited on mount - only when customer is authenticated
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      // Don't check favorite status if customer is not authenticated
      if (!customer) {
        setIsFavorited(false);
        setIsCheckingStatus(false);
        return;
      }

      setIsCheckingStatus(true);
      try {
        // For now, treat all types as provider favorites since that's what the hook supports
        const favorited = isFavorite(itemId);
        setIsFavorited(favorited);
      } catch (error) {
        logger.error("Error checking favorite status:", error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkFavoriteStatus();
  }, [customer, itemId, isFavorite]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Don't allow favoriting if customer is not authenticated
    if (!customer) {
      // You could show a sign-in prompt here
      logger.warn("Customer must be authenticated to favorite items");
      return;
    }

    try {
      if (isFavorited) {
        // Remove from favorites
        await removeFavorite(itemId);
        setIsFavorited(false);
      } else {
        // Add to favorites
        await addFavorite(itemId);
        setIsFavorited(true);
      }
    } catch (error) {
      logger.error("Error toggling favorite:", error);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return showText ? "h-8 px-2 text-sm" : "h-8 w-8";
      case "lg":
        return showText ? "h-12 px-4 text-lg" : "h-12 w-12";
      default:
        return showText ? "h-10 px-3" : "h-10 w-10";
    }
  };

  const getIconSize = () => {
    switch (size) {
      case "sm":
        return "w-3 h-3";
      case "lg":
        return "w-6 h-6";
      default:
        return "w-4 h-4";
    }
  };

  const isWorking = isLoading || isCheckingStatus;
  const isAuthenticated = !!customer;

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleToggleFavorite}
      disabled={isWorking || !isAuthenticated}
      className={cn(
        getSizeClasses(),
        "transition-all duration-200",
        !isAuthenticated
          ? "text-gray-300 cursor-not-allowed"
          : isFavorited
          ? "text-red-500 hover:text-red-600"
          : "text-gray-400 hover:text-red-500",
        className,
      )}
      title={
        !isAuthenticated
          ? "Sign in to add favorites"
          : isFavorited
          ? `Remove from favorites`
          : `Add to favorites`
      }
    >
      <Heart
        className={cn(
          getIconSize(),
          isFavorited ? "fill-current" : "",
          showText ? "mr-2" : "",
        )}
      />
      {showText && (
        <span>{isFavorited ? "Favorited" : "Add to Favorites"}</span>
      )}
    </Button>
  );
}
