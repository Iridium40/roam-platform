import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { logger } from '@/utils/logger';

export interface ServiceFavorite {
  id: string;
  customer_id: string;
  service_id: string;
  created_at: string;
  services: {
    id: string;
    name: string;
    description: string | null;
    min_price: number | null;
    image_url: string | null;
  };
}

export const useServiceFavorites = () => {
  const { customer } = useAuth();
  const [favorites, setFavorites] = useState<ServiceFavorite[]>([]);
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
        .from("customer_favorite_services")
        .select(`
          id,
          customer_id,
          service_id,
          created_at,
          services (
            id,
            name,
            description,
            min_price,
            image_url
          )
        `)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setFavorites(data || []);
    } catch (err) {
      logger.error("Error loading service favorites:", err);
      setError(err instanceof Error ? err.message : "Failed to load service favorites");
    } finally {
      setLoading(false);
    }
  };

  const addFavorite = async (serviceId: string) => {
    if (!customer) {
      throw new Error("Customer not authenticated");
    }

    try {
      const { error: insertError } = await supabase
        .from("customer_favorite_services")
        .insert({
          customer_id: customer.id,
          service_id: serviceId,
        });

      if (insertError) {
        throw insertError;
      }

      await loadFavorites();
    } catch (err) {
      logger.error("Error adding service favorite:", err);
      throw err;
    }
  };

  const removeFavorite = async (serviceId: string) => {
    if (!customer) {
      throw new Error("Customer not authenticated");
    }

    try {
      const { error: deleteError } = await supabase
        .from("customer_favorite_services")
        .delete()
        .eq("customer_id", customer.id)
        .eq("service_id", serviceId);

      if (deleteError) {
        throw deleteError;
      }

      await loadFavorites();
    } catch (err) {
      logger.error("Error removing service favorite:", err);
      throw err;
    }
  };

  const isFavorite = (serviceId: string) => {
    return favorites.some((favorite) => favorite.service_id === serviceId);
  };

  const toggleFavorite = async (serviceId: string) => {
    if (isFavorite(serviceId)) {
      await removeFavorite(serviceId);
    } else {
      await addFavorite(serviceId);
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
    customer,
  };
};
