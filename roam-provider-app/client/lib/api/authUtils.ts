/**
 * Authentication utilities for API calls
 * 
 * This module provides cached authentication tokens for API requests.
 * The token is cached in localStorage and memory during the user's session,
 * so we don't need to fetch it from Supabase on every API call.
 */

/**
 * Get the cached authentication token
 * 
 * Priority:
 * 1. localStorage (fast, already cached during login)
 * 2. Supabase session (fallback if localStorage is cleared or token expired)
 * 
 * @returns Promise<string | null> - The access token or null if not authenticated
 */
export async function getCachedAuthToken(): Promise<string | null> {
  // Fast path: Get from localStorage (set during login in ProviderAuthContext)
  const cachedToken = localStorage.getItem('roam_access_token');
  
  if (cachedToken) {
    // Check if token might be expired (basic check - tokens are JWTs)
    try {
      const tokenParts = cachedToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        const expiryTime = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        
        // If token expires in less than 1 minute, refresh it
        if (expiryTime - now < 60000) {
          console.log('Token expiring soon, fetching fresh token from Supabase');
          // Fall through to refresh logic below
        } else {
          // Token is still valid
          return cachedToken;
        }
      } else {
        // Token format looks valid, use it
        return cachedToken;
      }
    } catch (error) {
      // If we can't parse the token, still try to use it
      // The API will reject it if it's invalid
      return cachedToken;
    }
  }

  // Fallback: Get from Supabase session (slower, only if cache missed or token expiring)
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting Supabase session:', error);
      // Clear invalid cached token
      localStorage.removeItem('roam_access_token');
      return null;
    }
    
    if (session?.access_token) {
      // Cache the fresh token
      localStorage.setItem('roam_access_token', session.access_token);
      return session.access_token;
    }
  } catch (error) {
    console.error('Error fetching auth token:', error);
    // Clear potentially invalid token
    localStorage.removeItem('roam_access_token');
  }

  return null;
}

/**
 * Get headers with authentication for fetch requests
 * Uses cached token - much faster than fetching from Supabase each time
 * 
 * @returns Promise<HeadersInit> - Headers object with Authorization if authenticated
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getCachedAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Make an authenticated fetch request with cached token
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options (method, body, etc.)
 * @returns Promise<Response> - The fetch response
 * @throws Error if not authenticated
 */
export async function authenticatedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const headers = await getAuthHeaders();
  
  // Check if we have auth
  if (!(headers as Record<string, string>)['Authorization']) {
    throw new Error('Authentication required. Please sign in again.');
  }

  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });
}

/**
 * Check if user is currently authenticated (has cached token)
 * This is synchronous and very fast - just checks localStorage
 * 
 * @returns boolean - True if authenticated
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('roam_access_token');
}

