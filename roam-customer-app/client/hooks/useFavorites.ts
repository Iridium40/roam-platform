import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { logger } from '@/utils/logger';

export interface Favorite {
  id: string;
  customer_id: string;
  provider_id: string;
  created_at: string;
  providers: {
    id: string;
    first_name: string;
    last_name: string;
    business_name: string;
    image_url: string;
    rating: number;
    service_categories: string[];
  };
}

export const useFavorites = () => {
  const { customer } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = async () => {
    if (!customer) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("customer_favorites")
        .select(`
          id,
          customer_id,
          provider_id,
          created_at,
          providers (
            id,
            first_name,
            last_name,
            business_name,
            image_url,
            rating,
            service_categories
          )
        `)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setFavorites(data || []);
    } catch (err) {
      logger.error("Error loading favorites:", err);
      setError(err instanceof Error ? err.message : "Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  const addFavorite = async (providerId: string) => {
    if (!customer) {
      throw new Error("Customer not authenticated");
    }

    try {
      const { error: insertError } = await supabase
        .from("customer_favorites")
        .insert({
          customer_id: customer.id,
          provider_id: providerId,
        });

      if (insertError) {
        throw insertError;
      }

      await loadFavorites();
    } catch (err) {
      logger.error("Error adding favorite:", err);
      throw err;
    }
  };

  const removeFavorite = async (providerId: string) => {
    if (!customer) {
      throw new Error("Customer not authenticated");
    }

    try {
      const { error: deleteError } = await supabase
        .from("customer_favorites")
        .delete()
        .eq("customer_id", customer.id)
        .eq("provider_id", providerId);

      if (deleteError) {
        throw deleteError;
      }

      await loadFavorites();
    } catch (err) {
      logger.error("Error removing favorite:", err);
      throw err;
    }
  };

  const isFavorite = (providerId: string) => {
    return favorites.some((favorite) => favorite.provider_id === providerId);
  };

  const toggleFavorite = async (providerId: string) => {
    if (isFavorite(providerId)) {
      await removeFavorite(providerId);
    } else {
      await addFavorite(providerId);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [customer]);

  return {
    favorites,
    loading,
    error,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    refreshFavorites: loadFavorites,
  };
};
