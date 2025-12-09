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
  const [lastCustomerId, setLastCustomerId] = useState<string | null>(null);

  const loadFavorites = async (force = false) => {
    if (!customer) {
      setFavorites([]);
      setLoading(false);
      setLastCustomerId(null);
      return;
    }

    // Don't reload if we already have data for this customer and this isn't a forced refresh
    if (!force && favorites.length > 0 && !loading && lastCustomerId === customer.id) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use API endpoint to bypass RLS
      const response = await fetch(`/api/favorites/service?customerId=${customer.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load favorites');
      }

      setFavorites(result.data || []);
      setLastCustomerId(customer.id);
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
      const response = await fetch('/api/favorites/service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customer.id,
          serviceId,
          action: 'add',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add favorite');
      }

      await loadFavorites(true); // Force reload after add
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
      const response = await fetch('/api/favorites/service', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customer.id,
          serviceId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove favorite');
      }

      await loadFavorites(true); // Force reload after remove
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]); // Only depend on customer ID, not the entire customer object

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
