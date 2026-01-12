import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth/AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = "/provider-portal",
  fallback = null,
  allowedRoles,
}) => {
  const { customer, provider, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <div className="w-8 h-8 bg-white rounded-full"></div>
            </div>
            <h2 className="text-xl font-semibold text-roam-blue mb-2">
              Loading...
            </h2>
            <p className="text-foreground/60">
              Please wait while we verify your session.
            </p>
          </div>
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check if provider account is active
  if (provider?.provider && !provider.provider.is_active) {
    return <Navigate to="/account-pending" replace />;
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles && provider?.provider) {
    const userRole = provider.provider.provider_role;
    if (!allowedRoles.includes(userRole)) {
      // Redirect to appropriate dashboard for their role
      return <RoleBasedRedirect />;
    }
  }

  return <>{children}</>;
};

// Role-based redirect for provider app
export const RoleBasedRedirect: React.FC = () => {
  const { provider } = useAuth();
  
  if (!provider?.provider) {
    return <Navigate to="/provider-portal" replace />;
  }

  // Redirect based on provider role
  switch (provider.provider.provider_role) {
    case "owner":
      return <Navigate to="/owner/dashboard" replace />;
    case "dispatcher":
      return <Navigate to="/dispatcher/dashboard" replace />;
    case "provider":
      // Providers should not access dashboard - redirect to bookings instead
      return <Navigate to="/provider/bookings" replace />;
    default:
      return <Navigate to="/provider/bookings" replace />;
  }
};
