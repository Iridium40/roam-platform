import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  Home,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProviderAuth } from "@/contexts/auth/ProviderAuthContext";

export default function ProviderLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { isAuthenticated } = useProviderAuth();

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if (isAuthenticated) {
      navigate("/provider-dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Sign in with Supabase auth first
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Authentication failed");
      }

      // Check if user is a provider
      const { data: providerData, error: providerError } = await supabase
        .from("providers")
        .select("*")
        .eq("user_id", authData.user.id)
        .single();

      if (providerError || !providerData) {
        throw new Error("No provider account found for this email. Please sign up as a provider.");
      }

      // Check if provider account is active
      if (!providerData.is_active) {
        // Redirect to account pending page
        navigate("/account-pending");
        return;
      }

      // Check if user needs to change password (temporary password)
      if (authData.user.user_metadata?.must_change_password || authData.user.user_metadata?.temporary_password) {
        // Redirect to password change page
        navigate("/change-password");
        return;
      }

      // Success - redirect to provider dashboard
      navigate("/provider-dashboard");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during login",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Header with Back to Home */}
      <div className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/roampro" className="flex items-center gap-2">
              <img 
                src="/logo.png" 
                alt="ROAM" 
                className="h-8 w-auto"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  if (!target.dataset.triedAlt) {
                    target.dataset.triedAlt = 'true';
                    target.src = '/roam-icon.png';
                    target.style.display = 'block';
                  }
                }}
              />
            </Link>
            <Button asChild variant="ghost" size="sm">
              <Link to="/roampro" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                <span>Back to Home</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[60vh] lg:min-h-[80vh]">
            {/* Left Side - Branding */}
            <div className="text-center lg:text-left space-y-8">
              <div>
                <h1 className="text-2xl sm:text-4xl lg:text-6xl font-bold mb-4 sm:mb-6 text-roam-blue">
                  Provider Sign In
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-gray-600 leading-relaxed mb-6 sm:mb-8">
                  Access your provider dashboard and manage your services, bookings, and earnings
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-roam-blue/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-roam-blue" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Secure Access</h4>
                    <p className="text-sm text-foreground/70">Your account is protected with enterprise-grade security</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-roam-blue/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-roam-blue" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Manage Your Business</h4>
                    <p className="text-sm text-foreground/70">Control bookings, staff, and services all in one place</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full max-w-md sm:max-w-lg mx-auto lg:mx-0">
              <Card className="border-border/50 shadow-lg">
                <CardHeader className="text-center pb-4">
                  <div className="mb-4 flex justify-center">
                    <img
                      src="/logo.png"
                      alt="ROAM"
                      className="h-16 w-auto"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        if (!target.dataset.triedAlt) {
                          target.dataset.triedAlt = 'true';
                          target.src = '/roam-icon.png';
                          target.style.display = 'block';
                        }
                      }}
                    />
                  </div>
                  <CardTitle className="text-2xl">Provider Access</CardTitle>
                  <p className="text-sm text-foreground/60 mt-2">
                    Sign in to your provider account
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 text-red-600 mt-0.5">
                            ⚠️
                          </div>
                          <p className="text-sm text-red-800">{error}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="provider@example.com"
                          className="pl-10"
                          value={loginData.email}
                          onChange={(e) =>
                            setLoginData({
                              ...loginData,
                              email: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="pl-10 pr-10"
                          autoComplete="current-password"
                          value={loginData.password}
                          onChange={(e) =>
                            setLoginData({
                              ...loginData,
                              password: e.target.value,
                            })
                          }
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="remember" />
                        <Label
                          htmlFor="remember"
                          className="text-sm font-normal"
                        >
                          Remember me
                        </Label>
                      </div>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-roam-blue"
                      >
                        Forgot password?
                      </Button>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-roam-blue hover:bg-roam-blue/90"
                      size="lg"
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>

                  {/* Footer - Sign Up Link */}
                  <div className="mt-6 text-center">
                    <p className="text-sm text-foreground/60 mb-3">
                      Don't have a provider account?
                    </p>
                    <Link to="/provider-signup">
                      <Button
                        variant="outline"
                        className="w-full border-roam-blue text-roam-blue hover:bg-roam-blue/10"
                        size="lg"
                      >
                        Create New Account
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>

                  <div className="mt-4 text-center text-sm text-foreground/60">
                    <p>
                      Need help?{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto text-roam-blue"
                        asChild
                      >
                        <Link to="/contact">
                          Contact Support
                        </Link>
                      </Button>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Security Notice */}
              <Card className="mt-6 bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-1">
                        Secure & Verified
                      </h4>
                      <p className="text-sm text-green-800">
                        All provider applications undergo comprehensive
                        background checks and identity verification for the
                        safety of our customers and platform integrity.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

