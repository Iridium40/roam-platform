import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { ROAMLogo } from "@/components/ui/roam-logo";
import { AlertTriangle, Eye, EyeOff, Lock, Mail, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLogin() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Check for invalid session on page load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (
          error &&
          (error.message.includes("Invalid") ||
            error.message.includes("expired"))
        ) {
          await clearSessionData();
        }
      } catch (err) {
        console.error("Error checking session:", err);
      }
    };

    checkSession();
  }, []);

  // Clear any invalid session data
  const clearSessionData = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("admin_settings");
      localStorage.removeItem("supabase.auth.token");
      sessionStorage.clear();
      setLoginError(null);
      toast({
        title: "Session Cleared",
        description:
          "All session data has been cleared. Please try logging in again.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error clearing session:", error);
    }
  };

  // If user is already authenticated, redirect to admin dashboard
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/admin" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setLoginError(
        !email.trim()
          ? "Please enter your email address to continue"
          : "Please enter your password to continue",
      );
      return;
    }

    setLoading(true);
    setLoginError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.error("Login error:", error);

        let errorMessage = "Unable to sign in to admin panel";

        if (error.message.includes("Invalid login credentials")) {
          errorMessage =
            "Invalid email or password. Please check your credentials and try again.";
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage =
            "Please check your email and click the verification link before signing in.";
        } else if (error.message.includes("Too many requests")) {
          errorMessage =
            "Too many failed login attempts. Please wait a few minutes before trying again.";
        } else if (error.message.includes("User not found")) {
          errorMessage =
            "No admin account found with this email address. Please contact your administrator.";
        } else if (error.message.includes("Invalid email")) {
          errorMessage = "Please enter a valid email address.";
        }

        setLoginError(errorMessage);
        return;
      }

      if (data.user) {
        toast({
          title: "✅ Welcome Back!",
          description: "Successfully signed in to ROAM Admin Panel",
          variant: "default",
          duration: 3000,
        });
        // Navigation will happen automatically via the useAuth hook
      }
    } catch (err) {
      console.error("Unexpected login error:", err);
      setLoginError(
        "An unexpected error occurred. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <ROAMLogo size="lg" showText={true} />
          </div>
        </div>

        {/* Login Form */}
        <ROAMCard className="border-border shadow-lg">
          <ROAMCardHeader>
            <ROAMCardTitle className="text-center flex items-center justify-center gap-2">
              <Lock className="w-5 h-5" />
              Admin Login
            </ROAMCardTitle>
          </ROAMCardHeader>
          <ROAMCardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setLoginError(null);
                    }}
                    className="pl-10"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setLoginError(null);
                    }}
                    className="pl-10 pr-10"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email.trim() || !password.trim()}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In to Admin Panel"
                )}
              </Button>
            </form>
          </ROAMCardContent>
        </ROAMCard>

        {/* Custom Error Display */}
        {loginError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800 mb-1">
                  Login Failed
                </p>
                <p className="text-sm text-red-700">{loginError}</p>
                {(loginError.includes("Invalid") ||
                  loginError.includes("expired") ||
                  loginError.includes("Refresh Token")) && (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearSessionData}
                      className="text-red-700 border-red-300 hover:bg-red-100"
                    >
                      Clear Session Data
                    </Button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setLoginError(null)}
                className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-foreground font-medium mb-1">
              Admin Access Only
            </p>
            <p className="text-muted-foreground">
              This portal is restricted to authorized administrators. All login
              attempts are monitored and logged.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>© 2024 ROAM. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
