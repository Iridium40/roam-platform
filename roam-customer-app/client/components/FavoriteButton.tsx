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
  // Important perf fix:
  // Avoid mounting *all* favorites hooks for every FavoriteButton (each hook fetches on mount),
  // which causes an explosion of /api/favorites/* calls on pages with many buttons.
  if (type === "provider") {
    return (
      <ProviderFavoriteButton
        itemId={itemId}
        className={className}
        size={size}
        variant={variant}
        showText={showText}
      />
    );
  }
  if (type === "service") {
    return (
      <ServiceFavoriteButton
        itemId={itemId}
        className={className}
        size={size}
        variant={variant}
        showText={showText}
      />
    );
  }
  return (
    <BusinessFavoriteButton
      itemId={itemId}
      className={className}
      size={size}
      variant={variant}
      showText={showText}
    />
  );
}

type FavoriteButtonBaseProps = Omit<FavoriteButtonProps, "type">;

function FavoriteButtonBase({
  itemId,
  className,
  size = "md",
  variant = "ghost",
  showText = false,
  // Hook-provided:
  typeLabel,
  isLoading,
  isFavorite,
  addFavorite,
  removeFavorite,
  customer,
}: FavoriteButtonBaseProps & {
  typeLabel: string;
  isLoading: boolean;
  isFavorite: (id: string) => boolean;
  addFavorite: (id: string) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  customer: any;
}) {
  const { toast } = useToast();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (!customer) {
      setIsFavorited(false);
      setIsCheckingStatus(false);
      return;
    }
    setIsCheckingStatus(true);
    try {
      setIsFavorited(isFavorite(itemId));
    } catch (error) {
      logger.error("Error checking favorite status:", error);
    } finally {
      setIsCheckingStatus(false);
    }
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
          description: `${typeLabel} removed from your favorites`,
        });
      } else {
        await addFavorite(itemId);
        setIsFavorited(true);
        toast({
          title: "Added to favorites",
          description: `${typeLabel} added to your favorites`,
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
      disabled={isWorking}
      className={cn(
        getSizeClasses(),
        "transition-all duration-200 rounded-lg",
        !isAuthenticated
          ? "text-gray-400 hover:text-red-400 cursor-pointer"
          : isFavorited
            ? "text-red-500 hover:text-red-600"
            : "text-gray-400 hover:text-red-500",
        className,
      )}
      title={
        !isAuthenticated
          ? "Sign in to add favorites"
          : isFavorited
            ? `Remove ${typeLabel} from favorites`
            : `Add ${typeLabel} to favorites`
      }
    >
      <Heart
        className={cn(
          getIconSize(),
          isFavorited ? "fill-current" : "",
          showText ? "mr-2" : "",
        )}
      />
      {showText && <span>{isFavorited ? "Favorited" : "Add to Favorites"}</span>}
    </Button>
  );
}

function ProviderFavoriteButton(props: FavoriteButtonBaseProps) {
  const hook = useFavorites();
  return (
    <FavoriteButtonBase
      {...props}
      typeLabel="Provider"
      isLoading={hook.loading}
      isFavorite={hook.isFavorite}
      addFavorite={hook.addFavorite}
      removeFavorite={hook.removeFavorite}
      customer={hook.customer}
    />
  );
}

function ServiceFavoriteButton(props: FavoriteButtonBaseProps) {
  const hook = useServiceFavorites();
  return (
    <FavoriteButtonBase
      {...props}
      typeLabel="Service"
      isLoading={hook.loading}
      isFavorite={hook.isFavorite}
      addFavorite={hook.addFavorite}
      removeFavorite={hook.removeFavorite}
      customer={hook.customer}
    />
  );
}

function BusinessFavoriteButton(props: FavoriteButtonBaseProps) {
  const hook = useBusinessFavorites();
  return (
    <FavoriteButtonBase
      {...props}
      typeLabel="Business"
      isLoading={hook.loading}
      isFavorite={hook.isFavorite}
      addFavorite={hook.addFavorite}
      removeFavorite={hook.removeFavorite}
      customer={hook.customer}
    />
  );
}
