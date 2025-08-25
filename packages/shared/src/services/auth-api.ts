import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AuthActionHandler } from './auth';
import type { AuthService } from './auth';

// Auth API handler interface
export interface AuthAPI {
  handleRequest(req: VercelRequest, res: VercelResponse): Promise<void>;
}

// Shared auth API handler that can be used by all apps
export class SharedAuthAPI implements AuthAPI {
  private actionHandler: AuthActionHandler;

  constructor(authService: AuthService) {
    this.actionHandler = new AuthActionHandler(authService);
  }

  async handleRequest(req: VercelRequest, res: VercelResponse): Promise<void> {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      console.log('Auth API called with action:', req.body?.action);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const { action, ...data } = req.body;

      if (!action) {
        res.status(400).json({ 
          error: 'Missing action', 
          message: 'Action is required in request body' 
        });
        return;
      }

      // Handle the action using the action handler
      const result = await this.actionHandler.handleAction(action, data);

      if (result.success) {
        res.status(200).json(result);
      } else {
        // Map error codes to appropriate HTTP status codes
        const statusCode = this.getStatusCodeForError(result.code);
        res.status(statusCode).json(result);
      }

    } catch (error) {
      console.error('Auth API error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private getStatusCodeForError(errorCode?: string): number {
    switch (errorCode) {
      case 'email_exists':
      case 'user_already_registered':
        return 409; // Conflict
        
      case 'invalid_credentials':
      case 'email_not_verified':
        return 401; // Unauthorized
        
      case 'account_locked':
      case 'too_many_attempts':
        return 423; // Locked
        
      case 'weak_password':
      case 'invalid_email':
      case 'underage':
      case 'terms_not_agreed':
      case 'validation_error':
        return 400; // Bad Request
        
      case 'invalid_token':
      case 'token_expired':
        return 400; // Bad Request
        
      case 'insufficient_permissions':
      case 'role_not_found':
        return 403; // Forbidden
        
      case 'user_not_found':
        return 404; // Not Found
        
      case 'network_error':
        return 503; // Service Unavailable
        
      default:
        return 500; // Internal Server Error
    }
  }
}

// Factory function to create the API handler with proper configuration
export function createAuthAPI(authService: AuthService): AuthAPI {
  return new SharedAuthAPI(authService);
}

// Default export for easy importing
export default SharedAuthAPI;

// Utility function to validate auth configuration
export function validateAuthConfig(): boolean {
  try {
    const { SupabaseConfigHelper } = require('./auth');
    SupabaseConfigHelper.getEnvironmentConfig();
    return true;
  } catch (error) {
    console.error('Auth configuration validation failed:', error);
    return false;
  }
}

// Utility function to get auth configuration
export function getAuthConfig() {
  const { SupabaseConfigHelper } = require('./auth');
  return SupabaseConfigHelper.getEnvironmentConfig();
}

// Predefined actions for easy use
export const AUTH_ACTIONS = {
  // Core authentication
  SIGNUP: 'signup',
  SIGNIN: 'signin',
  LOGIN: 'login',
  SIGNOUT: 'signout',
  LOGOUT: 'logout',
  REFRESH_TOKEN: 'refresh_token',
  
  // User management
  GET_CURRENT_USER: 'get_current_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  
  // Password management
  RESET_PASSWORD: 'reset_password',
  CONFIRM_PASSWORD_RESET: 'confirm_password_reset',
  
  // Profile management
  CREATE_USER_PROFILE: 'create_user_profile',
  GET_USER_PROFILE: 'get_user_profile',
  UPDATE_USER_PROFILE: 'update_user_profile',
  
  // Role management
  ASSIGN_USER_ROLE: 'assign_user_role',
  GET_USER_ROLES: 'get_user_roles',
  HAS_PERMISSION: 'has_permission',
  
  // Social authentication
  SIGNIN_WITH_PROVIDER: 'signin_with_provider',
  LINK_PROVIDER: 'link_provider',
  UNLINK_PROVIDER: 'unlink_provider',
  
  // Validation
  VALIDATE_SIGNUP: 'validate_signup',
  VALIDATE_LOGIN: 'validate_login',
} as const;

// Middleware for protecting routes
export function requireAuth(handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'missing_token'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      // Verify token and get user
      const { AuthActionHandler } = require('./auth');
      const authService = require('./auth').getAuthService(); // This would need to be implemented
      const actionHandler = new AuthActionHandler(authService);
      
      const result = await actionHandler.handleAction('get_current_user', { token });
      
      if (!result.success) {
        return res.status(401).json({
          error: 'Invalid or expired token',
          code: 'invalid_token'
        });
      }

      // Add user to request object
      (req as any).user = result.data;
      
      return handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({
        error: 'Authentication failed',
        code: 'auth_failed'
      });
    }
  };
}

// TODO: Middleware temporarily disabled due to type issues

// Middleware for role-based access control
// export function requireRole(requiredRole: string) {
//   return function(handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) {
//     return requireAuth(async (req: VercelRequest, res: VercelResponse) => {
//       const user = (req as any).user;
//       
//       if (!user || !user.roles || !user.roles.includes(requiredRole)) {
//         return res.status(403).json({
//           error: 'Insufficient permissions',
//           code: 'insufficient_permissions',
//           requiredRole
//         });
//       }
//       
//       return handler(req, res);
//     });
//   };
// }

// TODO: Middleware functions will be implemented later
