import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";
import { useServiceFavorites } from "@/hooks/useServiceFavorites";
import { useBusinessFavorites } from "@/hooks/useBusinessFavorites";
import { cn } from "@/lib/utils";
import { logger } from '@/utils/logger';
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // Call all hooks (React rules require hooks to be called unconditionally)
  // But we'll optimize by using useMemo to prevent unnecessary re-renders
  const providerHook = useFavorites();
  const serviceHook = useServiceFavorites();
  const businessHook = useBusinessFavorites();

  // Select the correct hook based on type
  const currentHook = type === "provider" ? providerHook : type === "service" ? serviceHook : businessHook;
  const { loading: isLoading, addFavorite, removeFavorite, isFavorite, customer } = currentHook;

  // Check if item is favorited on mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!customer) {
        setIsFavorited(false);
        setIsCheckingStatus(false);
        return;
      }

      setIsCheckingStatus(true);
      try {
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

    if (!customer) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add favorites",
        variant: "destructive",
      });
      return;
    }

    if (isToggling) return;

    try {
      setIsToggling(true);
      
      if (isFavorited) {
        await removeFavorite(itemId);
        setIsFavorited(false);
        toast({
          title: "Removed from favorites",
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} removed from your favorites`,
        });
      } else {
        await addFavorite(itemId);
        setIsFavorited(true);
        toast({
          title: "Added to favorites",
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} added to your favorites`,
        });
      }
    } catch (error) {
      logger.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsToggling(false);
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

  const isWorking = isLoading || isCheckingStatus || isToggling;
  const isAuthenticated = !!customer;

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleToggleFavorite}
      disabled={isWorking || !isAuthenticated}
      className={cn(
        getSizeClasses(),
        "transition-all duration-200 rounded-lg",
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
          ? `Remove ${type} from favorites`
          : `Add ${type} to favorites`
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
