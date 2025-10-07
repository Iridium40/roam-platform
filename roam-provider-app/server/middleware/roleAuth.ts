import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Create supabase client for database operations
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

export type ProviderRole = 'owner' | 'dispatcher' | 'provider';

/**
 * Middleware to check if the authenticated user has the required role(s)
 * Usage: requireRole(['owner', 'dispatcher'])
 */
export const requireRole = (allowedRoles: ProviderRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user from request (should be set by requireAuth middleware)
      const userId = (req as any).user?.id || (req as any).user?.user_id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get provider record to check role
      const { data: provider, error } = await supabase
        .from('providers')
        .select('provider_role, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !provider) {
        console.error('Error fetching provider for role check:', error);
        return res.status(403).json({ error: 'Access denied: Provider not found' });
      }

      // Check if provider's role is in the allowed roles
      if (!allowedRoles.includes(provider.provider_role as ProviderRole)) {
        return res.status(403).json({ 
          error: 'Access denied: Insufficient permissions',
          requiredRoles: allowedRoles,
          currentRole: provider.provider_role
        });
      }

      // Attach provider role to request for use in route handlers
      (req as any).providerRole = provider.provider_role;
      
      next();
    } catch (error) {
      console.error('Error in requireRole middleware:', error);
      return res.status(500).json({ error: 'Internal server error during authorization' });
    }
  };
};

/**
 * Middleware to check if user is an owner
 */
export const requireOwner = requireRole(['owner']);

/**
 * Middleware to check if user is owner or dispatcher
 */
export const requireOwnerOrDispatcher = requireRole(['owner', 'dispatcher']);

/**
 * Middleware to check if user is any valid staff member
 */
export const requireStaff = requireRole(['owner', 'dispatcher', 'provider']);

/**
 * Get the provider role from the request (must be used after requireRole middleware)
 */
export const getProviderRole = (req: Request): ProviderRole | null => {
  return (req as any).providerRole || null;
};

/**
 * Check if the provider role has permission for a specific feature
 */
export const hasPermission = (role: ProviderRole, feature: string): boolean => {
  const permissions: Record<ProviderRole, string[]> = {
    owner: ['*'], // Full access
    dispatcher: ['dashboard', 'bookings', 'messages', 'staff_view', 'services_view'],
    provider: ['dashboard', 'my_bookings', 'messages', 'my_profile', 'my_services'],
  };

  const rolePermissions = permissions[role];
  return rolePermissions.includes('*') || rolePermissions.includes(feature);
};

