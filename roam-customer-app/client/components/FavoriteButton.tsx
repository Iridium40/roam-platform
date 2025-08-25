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
    isLoading,
    addServiceToFavorites,
    removeServiceFromFavorites,
    isServiceFavorited,
    addBusinessToFavorites,
    removeBusinessFromFavorites,
    isBusinessFavorited,
    addProviderToFavorites,
    removeProviderFromFavorites,
    isProviderFavorited,
  } = useFavorites();

  // Check if item is favorited on mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      setIsCheckingStatus(true);
      try {
        let favorited = false;
        switch (type) {
          case "service":
            favorited = await isServiceFavorited(itemId);
            break;
          case "business":
            favorited = await isBusinessFavorited(itemId);
            break;
          case "provider":
            favorited = await isProviderFavorited(itemId);
            break;
        }
        setIsFavorited(favorited);
      } catch (error) {
        logger.error("Error checking favorite status:", error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkFavoriteStatus();
  }, [
    type,
    itemId,
    isServiceFavorited,
    isBusinessFavorited,
    isProviderFavorited,
  ]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      let success = false;

      if (isFavorited) {
        // Remove from favorites
        switch (type) {
          case "service":
            success = await removeServiceFromFavorites(itemId);
            break;
          case "business":
            success = await removeBusinessFromFavorites(itemId);
            break;
          case "provider":
            success = await removeProviderFromFavorites(itemId);
            break;
        }
      } else {
        // Add to favorites
        switch (type) {
          case "service":
            success = await addServiceToFavorites(itemId);
            break;
          case "business":
            success = await addBusinessToFavorites(itemId);
            break;
          case "provider":
            success = await addProviderToFavorites(itemId);
            break;
        }
      }

      if (success) {
        setIsFavorited(!isFavorited);
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

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleToggleFavorite}
      disabled={isWorking}
      className={cn(
        getSizeClasses(),
        "transition-all duration-200",
        isFavorited
          ? "text-red-500 hover:text-red-600"
          : "text-gray-400 hover:text-red-500",
        className,
      )}
      title={isFavorited ? `Remove from favorites` : `Add to favorites`}
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
