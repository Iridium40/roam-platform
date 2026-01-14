import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { logger } from '@/utils/logger';

export interface BusinessFavorite {
  id: string;
  customer_id: string;
  business_id: string;
  created_at: string;
  business_profiles: {
    id: string;
    business_name: string;
    business_description: string | null;
    image_url: string | null;
    logo_url: string | null;
  };
}

export const useBusinessFavorites = () => {
  const { customer } = useAuth();
  const [favorites, setFavorites] = useState<BusinessFavorite[]>([]);
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
        .from("customer_favorite_businesses")
        .select(`
          id,
          customer_id,
          business_id,
          created_at,
          business_profiles (
            id,
            business_name,
            business_description,
            image_url,
            logo_url
          )
        `)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setFavorites(data || []);
    } catch (err) {
      logger.error("Error loading business favorites:", err);
      setError(err instanceof Error ? err.message : "Failed to load business favorites");
    } finally {
      setLoading(false);
    }
  };

  const addFavorite = async (businessId: string) => {
    if (!customer) {
      throw new Error("Customer not authenticated");
    }

    try {
      const { error: insertError } = await supabase
        .from("customer_favorite_businesses")
        .insert({
          customer_id: customer.id,
          business_id: businessId,
        });

      if (insertError) {
        throw insertError;
      }

      await loadFavorites();
    } catch (err) {
      logger.error("Error adding business favorite:", err);
      throw err;
    }
  };

  const removeFavorite = async (businessId: string) => {
    if (!customer) {
      throw new Error("Customer not authenticated");
    }

    try {
      const { error: deleteError } = await supabase
        .from("customer_favorite_businesses")
        .delete()
        .eq("customer_id", customer.id)
        .eq("business_id", businessId);

      if (deleteError) {
        throw deleteError;
      }

      await loadFavorites();
    } catch (err) {
      logger.error("Error removing business favorite:", err);
      throw err;
    }
  };

  const isFavorite = (businessId: string) => {
    return favorites.some((favorite) => favorite.business_id === businessId);
  };

  const toggleFavorite = async (businessId: string) => {
    if (isFavorite(businessId)) {
      await removeFavorite(businessId);
    } else {
      await addFavorite(businessId);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [customer?.id]);

  return {
    favorites,
    loading,
    error,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    refreshFavorites: loadFavorites,
    customer,
  };
};
