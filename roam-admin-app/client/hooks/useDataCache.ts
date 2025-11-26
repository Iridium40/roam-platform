import { useState, useCallback, useRef } from 'react';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UseDataCacheOptions {
  cacheDuration?: number; // in milliseconds
}

/**
 * Custom hook for caching data with timestamp-based expiration
 * 
 * @param cacheDuration - Duration in milliseconds before cache expires (default: 5 minutes)
 * @returns Object with cache utilities
 * 
 * @example
 * const { getCachedData, setCachedData, shouldRefetch, clearCache } = useDataCache();
 * 
 * const fetchData = async (forceRefresh = false) => {
 *   if (!forceRefresh && !shouldRefetch('myKey')) {
 *     const cached = getCachedData('myKey');
 *     if (cached) {
 *       setData(cached);
 *       return;
 *     }
 *   }
 *   
 *   const result = await api.fetch();
 *   setCachedData('myKey', result);
 *   setData(result);
 * };
 */
export function useDataCache<T = any>(options: UseDataCacheOptions = {}) {
  const { cacheDuration = CACHE_DURATION } = options;
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const [lastFetchTime, setLastFetchTime] = useState<Map<string, number>>(new Map());

  /**
   * Check if data should be refetched based on cache age
   */
  const shouldRefetch = useCallback((key: string): boolean => {
    const entry = cacheRef.current.get(key);
    if (!entry) return true;
    
    const age = Date.now() - entry.timestamp;
    return age > cacheDuration;
  }, [cacheDuration]);

  /**
   * Get cached data if it exists and is still valid
   */
  const getCachedData = useCallback((key: string): T | null => {
    const entry = cacheRef.current.get(key);
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    if (age > cacheDuration) {
      cacheRef.current.delete(key);
      return null;
    }
    
    return entry.data;
  }, [cacheDuration]);

  /**
   * Set data in cache with current timestamp
   */
  const setCachedData = useCallback((key: string, data: T): void => {
    const timestamp = Date.now();
    cacheRef.current.set(key, { data, timestamp });
    setLastFetchTime(prev => new Map(prev).set(key, timestamp));
  }, []);

  /**
   * Clear specific cache entry or all cache
   */
  const clearCache = useCallback((key?: string): void => {
    if (key) {
      cacheRef.current.delete(key);
      setLastFetchTime(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
    } else {
      cacheRef.current.clear();
      setLastFetchTime(new Map());
    }
  }, []);

  /**
   * Get the age of cached data in milliseconds
   */
  const getCacheAge = useCallback((key: string): number | null => {
    const entry = cacheRef.current.get(key);
    if (!entry) return null;
    return Date.now() - entry.timestamp;
  }, []);

  /**
   * Check if cache has data for a key
   */
  const hasCache = useCallback((key: string): boolean => {
    return cacheRef.current.has(key);
  }, []);

  /**
   * Get formatted time since last fetch
   */
  const getTimeSinceLastFetch = useCallback((key: string): string | null => {
    const timestamp = lastFetchTime.get(key);
    if (!timestamp) return null;
    
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }, [lastFetchTime]);

  return {
    shouldRefetch,
    getCachedData,
    setCachedData,
    clearCache,
    getCacheAge,
    hasCache,
    getTimeSinceLastFetch,
  };
}

