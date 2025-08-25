import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = "/",
  fallback = null,
}) => {
  const { customer, loading } = useAuth();

  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <div className="w-8 h-8 bg-white rounded-full"></div>
            </div>
            <h2 className="text-xl font-semibold text-blue-600 mb-2">
              Loading...
            </h2>
            <p className="text-muted-foreground">
              Please wait while we verify your session.
            </p>
          </div>
        </div>
      )
    );
  }

  if (!customer) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};
