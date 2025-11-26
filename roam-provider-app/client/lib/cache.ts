/**
 * Simple in-memory cache with TTL (Time To Live)
 * Used for data that doesn't change frequently like Staff, Services, Profile
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

// Default cache TTL: 5 minutes
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * Get cached data if it exists and hasn't expired
 */
export function getCached<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  const entry = cache.get(key);
  
  if (!entry) {
    return null;
  }
  
  const now = Date.now();
  const isExpired = now - entry.timestamp > ttlMs;
  
  if (isExpired) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

/**
 * Set data in cache with current timestamp
 */
export function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Invalidate (remove) a specific cache entry
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache entries that start with a prefix
 * Useful for invalidating all entries for a specific business
 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear the entire cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Check if cache entry exists and is valid
 */
export function isCacheValid(key: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
  return getCached(key, ttlMs) !== null;
}

// Cache key generators for consistency
export const CacheKeys = {
  staff: (businessId: string) => `staff:${businessId}`,
  services: (businessId: string) => `services:${businessId}`,
  profile: (userId: string) => `profile:${userId}`,
};

