import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from '@/utils/logger';

export interface Favorite {
  id: string;
  customer_id: string;
  provider_id: string;
  created_at: string;
  providers: {
    id: string;
    user_id?: string;
    first_name: string;
    last_name: string;
    business_profiles: {
      business_name: string;
    };
    image_url: string | null;
  };
}

export const useFavorites = () => {
  const { customer } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
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
      const response = await fetch(`/api/favorites/provider?customerId=${customer.id}`, {
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
      const response = await fetch('/api/favorites/provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customer.id,
          providerId,
          action: 'add',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add favorite');
      }

      await loadFavorites(true); // Force reload after add
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
      const response = await fetch('/api/favorites/provider', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customer.id,
          providerId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove favorite');
      }

      await loadFavorites(true); // Force reload after remove
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
