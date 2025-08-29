import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    businessId?: string;
  };
}

export const requireAuth = (allowedRoles?: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');

      console.log('Auth debug:', {
        hasAuthHeader: !!authHeader,
        tokenLength: token?.length,
        tokenPrefix: token?.substring(0, 20) + '...',
        allowedRoles,
        url: req.url
      });

      if (!token) {
        console.log('No token provided');
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Verify JWT token
      const jwtSecret = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
      if (!jwtSecret) {
        console.error('JWT_SECRET not configured');
        return res.status(500).json({ 
          error: 'Server configuration error',
          code: 'CONFIG_ERROR'
        });
      }

      let decoded: any;
      try {
        decoded = jwt.verify(token, jwtSecret);
      } catch (jwtError) {
        // Try Supabase token verification as fallback
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
          return res.status(401).json({ 
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
          });
        }
        
        decoded = { user_id: user.id, email: user.email };
      }

      // Get user roles
      const userId = decoded.user_id || decoded.sub;
      console.log('Fetching roles for user:', userId);

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role, business_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      console.log('User roles query result:', {
        userId,
        userRoles: userRoles?.length || 0,
        roles: userRoles?.map(r => r.role),
        error: rolesError?.message
      });

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        return res.status(500).json({
          error: 'Failed to verify user permissions',
          code: 'ROLES_ERROR'
        });
      }

      const userRole = userRoles?.[0]?.role || 'customer';
      const businessId = userRoles?.[0]?.business_id;

      console.log('Role permission check:', {
        userRole,
        businessId,
        allowedRoles,
        hasPermission: !allowedRoles || allowedRoles.includes(userRole)
      });

      // Check role permissions
      if (allowedRoles && !allowedRoles.includes(userRole)) {
        console.log('Access denied: User role not in allowed roles');
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredRoles: allowedRoles,
          userRole
        });
      }

      // Attach user info to request
      req.user = {
        id: decoded.user_id || decoded.sub,
        email: decoded.email,
        role: userRole,
        businessId
      };

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ 
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      });
    }
  };
};

export const requireBusinessAccess = (businessIdParam: string = 'businessId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const businessId = req.params[businessIdParam] || req.body.business_id;
      
      if (!businessId) {
        return res.status(400).json({ 
          error: 'Business ID required',
          code: 'BUSINESS_ID_REQUIRED'
        });
      }

      // Admin can access any business
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user has access to this business
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('role, business_id')
        .eq('user_id', req.user.id)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .single();

      if (error || !userRoles) {
        return res.status(403).json({ 
          error: 'Access denied to this business',
          code: 'BUSINESS_ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Business access middleware error:', error);
      return res.status(500).json({ 
        error: 'Authorization check failed',
        code: 'AUTHZ_ERROR'
      });
    }
  };
};
