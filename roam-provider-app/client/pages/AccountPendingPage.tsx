import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  Mail,
  Shield,
  Home,
  LogOut,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AccountPendingPage() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/provider-login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Header */}
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
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/roampro" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="border-amber-200 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                  <Clock className="w-10 h-10 text-amber-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-amber-800">
                Account Pending Approval
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <p className="text-lg text-foreground/80">
                  Thank you for completing your provider application! Your account is currently under review.
                </p>
                <p className="text-foreground/60">
                  Our team is reviewing your application and verifying your information. This process typically takes 1-3 business days.
                </p>
              </div>

              {/* Status Info */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900">What happens next?</h4>
                    <ul className="text-sm text-amber-800 mt-2 space-y-2">
                      <li>• Our team will review your application and documents</li>
                      <li>• Background verification will be completed</li>
                      <li>• You'll receive an email notification once approved</li>
                      <li>• Then you can start accepting bookings!</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Contact Support */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Need Assistance?</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      If you have questions about your application status or need help, please contact our provider support team:
                    </p>
                    <a 
                      href="mailto:providersupport@roamyourbestlife.com"
                      className="inline-flex items-center gap-2 mt-2 text-blue-700 hover:text-blue-800 font-medium"
                    >
                      <Mail className="w-4 h-4" />
                      providersupport@roamyourbestlife.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/roampro">
                    <Home className="w-4 h-4 mr-2" />
                    Return to Home
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
