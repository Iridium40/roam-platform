import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Shield,
  CheckCircle,
  ArrowLeft,
  Star,
  DollarSign,
  Calendar,
  Home,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useProviderAuth } from "@/contexts/auth/ProviderAuthContext";

export default function ProviderSignup() {
  const navigate = useNavigate();
  const { isAuthenticated } = useProviderAuth();

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if (isAuthenticated) {
      navigate("/provider-dashboard");
    }
  }, [isAuthenticated, navigate]);

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
            {/* Left Side - Benefits & Info */}
            <div className="text-center lg:text-left space-y-8">
              <div>
                <h1 className="text-2xl sm:text-4xl lg:text-6xl font-bold mb-4 sm:mb-6 text-roam-blue">
                  Become a Provider
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-gray-600 leading-relaxed mb-6 sm:mb-8">
                  Join thousands of service professionals growing their business on ROAM
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-roam-blue/10 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-roam-blue" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Earn More</h4>
                    <p className="text-sm text-foreground/70">Keep 80% of your earnings with our competitive commission structure</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-roam-blue/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-roam-blue" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Flexible Schedule</h4>
                    <p className="text-sm text-foreground/70">Work on your own terms and manage your availability</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-roam-blue/10 flex items-center justify-center flex-shrink-0">
                    <Star className="w-4 h-4 text-roam-blue" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Build Your Brand</h4>
                    <p className="text-sm text-foreground/70">Grow your reputation with verified reviews and ratings</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-roam-blue/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-roam-blue" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Access New Customers</h4>
                    <p className="text-sm text-foreground/70">Connect with customers actively looking for your services</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Signup CTA */}
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
                  <CardTitle className="text-2xl">Start Your Application</CardTitle>
                  <p className="text-sm text-foreground/60 mt-2">
                    Get approved in as little as 24 hours
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* New Onboarding Process */}
                  <div className="bg-roam-light-blue/10 border border-roam-light-blue/30 rounded-lg p-6">
                    <h4 className="font-semibold text-roam-blue mb-3 text-lg">
                      Streamlined Two-Phase Onboarding
                    </h4>
                    
                    {/* Phase 1 */}
                    <div className="mb-4">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-6 h-6 rounded-full bg-roam-blue text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                          1
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-foreground mb-1">Business Information</h5>
                          <p className="text-sm text-foreground/70">
                            Tell us about your business, services, and experience
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Phase 2 */}
                    <div className="mb-6">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-6 h-6 rounded-full bg-roam-blue text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                          2
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-foreground mb-1">Verification & Setup</h5>
                          <p className="text-sm text-foreground/70">
                            Complete identity verification and payment setup
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => navigate("/become-a-provider")}
                      className="w-full bg-roam-blue hover:bg-roam-blue/90"
                      size="lg"
                    >
                      Start New Business Application
                    </Button>
                  </div>

                  {/* What You'll Need */}
                  <div className="border border-border/50 rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-3">What You'll Need:</h4>
                    <ul className="space-y-2 text-sm text-foreground/70">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Government-issued ID for verification</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Business information and licenses</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Bank account for payments</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Professional photos (optional)</span>
                      </li>
                    </ul>
                  </div>

                  {/* Already Have Account */}
                  <div className="text-center pt-4 border-t border-border/50">
                    <p className="text-sm text-foreground/60 mb-3">
                      Already have a provider account?
                    </p>
                    <Link to="/provider-login">
                      <Button
                        variant="outline"
                        className="w-full border-roam-blue text-roam-blue hover:bg-roam-blue/10"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Sign In to Your Account
                      </Button>
                    </Link>
                  </div>

                  <div className="text-center text-sm text-foreground/60">
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

