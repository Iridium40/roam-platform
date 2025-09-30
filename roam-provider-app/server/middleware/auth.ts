import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// Validate required environment variables
function validateEnvironment() {
  const requiredVars = [
    'VITE_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'VITE_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
}

// Validate environment on startup
validateEnvironment();

// Create admin client with service role key to bypass RLS
const supabaseAdmin = createClient(
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

// Create regular client for auth verification
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.VITE_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
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
      // Check if this is development mode
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           req.headers.host?.includes('localhost') ||
                           req.headers.host?.includes('127.0.0.1');
      
      // Allow development mode to bypass authentication
      if (isDevelopment) {
        console.log('Development mode: Bypassing authentication for:', req.url);
        req.user = {
          id: 'dev-user-id',
          email: 'dev@example.com',
          role: 'owner',
          businessId: 'dev-business-id'
        };
        return next();
      }

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
      console.log('Decoded token details:', {
        user_id: decoded.user_id,
        sub: decoded.sub,
        email: decoded.email,
        tokenKeys: Object.keys(decoded)
      });

      const { data: userRoles, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('role, business_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      console.log('User roles query result:', {
        userId,
        userRoles: userRoles?.length || 0,
        roles: userRoles?.map(r => r.role),
        rawUserRoles: userRoles,
        error: rolesError?.message,
        errorCode: rolesError?.code,
        fullError: rolesError
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
      // Check if this is development mode
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           req.headers.host?.includes('localhost') ||
                           req.headers.host?.includes('127.0.0.1');
      
      // Allow development mode to bypass business access checks
      if (isDevelopment) {
        console.log('Development mode: Bypassing business access check for:', req.url);
        return next();
      }

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
      const { data: userRoles, error } = await supabaseAdmin
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

// Phase 2 onboarding authentication - validates approval tokens instead of requiring login
export const requirePhase2Access = () => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Check if this is development mode
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           req.headers.host?.includes('localhost') ||
                           req.headers.host?.includes('127.0.0.1');
      
      // Allow development mode to bypass Phase 2 authentication
      if (isDevelopment) {
        console.log('Development mode: Bypassing Phase 2 authentication for:', req.url);
        req.user = {
          id: 'dev-user-id',
          email: 'dev@example.com',
          role: 'owner',
          businessId: 'dev-business-id'
        };
        return next();
      }

      // Check for Phase 2 approval token
      const token = req.headers['x-phase2-token'] || req.query.token || req.body.token;
      
      if (!token) {
        return res.status(401).json({
          error: 'Phase 2 approval token required',
          code: 'PHASE2_TOKEN_REQUIRED'
        });
      }

      // Validate the Phase 2 token (this would call the same logic as validate-phase2-token)
      try {
        // For now, we'll use a simple token format check
        // In production, this should validate against the database
        if (typeof token === 'string' && token.length > 10) {
          req.user = {
            id: 'phase2-user-id',
            email: 'phase2@example.com',
            role: 'owner',
            businessId: 'phase2-business-id'
          };
          return next();
        } else {
          throw new Error('Invalid token format');
        }
      } catch (tokenError) {
        return res.status(401).json({
          error: 'Invalid or expired Phase 2 token',
          code: 'INVALID_PHASE2_TOKEN'
        });
      }
    } catch (error) {
      console.error('Phase 2 auth middleware error:', error);
      return res.status(500).json({ 
        error: 'Phase 2 authentication failed',
        code: 'PHASE2_AUTH_ERROR'
      });
    }
  };
};
