import { Button } from "@/components/ui/button";
import { Menu, X, Calendar } from "lucide-react";
import { useState, useCallback, Suspense, lazy } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CustomerAvatarDropdown } from "@/components/CustomerAvatarDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemConfig } from "@/hooks/useSystemConfig";

// Lazy load the auth modal
const CustomerAuthModal = lazy(() =>
  import("@/components/CustomerAuthModal").then(module => ({
    default: module.CustomerAuthModal
  }))
);

const navLinks = [
  { to: "/how-it-works", label: "How It Works" },
  { to: "/about", label: "About Us" },
  { to: "/services", label: "Our Services" },
  { to: "/contact", label: "Contact Us" },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { customer, isAuthenticated } = useAuth();
  const { siteLogo } = useSystemConfig();
  const navigate = useNavigate();

  const handleSignInClick = useCallback(() => {
    if (isAuthenticated) {
      // Navigate to my bookings
      navigate("/my-bookings");
    } else {
      // Open sign-in modal
      setAuthModalOpen(true);
    }
  }, [isAuthenticated, navigate]);

  return (
    <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link to="/booknow" className="flex items-center">
              <img
                src={siteLogo || "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800"}
                alt="ROAM - Your Best Life. Everywhere."
                className="h-10 w-auto hover:opacity-80 transition-opacity"
                onError={(e) => {
                  // Fallback to default logo if dynamic logo fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800";
                }}
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex flex-1 items-center justify-center space-x-8">
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} className="text-foreground/70 hover:text-roam-blue transition-colors">
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  className="text-foreground hover:bg-foreground/10 border border-foreground/20"
                  onClick={handleSignInClick}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  My Bookings
                </Button>
                <CustomerAvatarDropdown />
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
                  onClick={handleSignInClick}
                >
                  Sign In
                </Button>
                <Button asChild className="bg-roam-blue hover:bg-roam-blue/90">
                  <a href="https://roamprovider.com" target="_blank" rel="noopener noreferrer">Become a Provider</a>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4 text-center">
              {navLinks.map(({ to, label }) => (
                <Link key={to} to={to} className="text-foreground/70 hover:text-roam-blue transition-colors">
                  {label}
                </Link>
              ))}
              
              {isAuthenticated ? (
                <>
                  <button
                    onClick={handleSignInClick}
                    className="text-foreground/70 hover:text-roam-blue transition-colors flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>My Bookings</span>
                  </button>
                  <Link
                    to="/customer/profile"
                    className="text-foreground/70 hover:text-roam-blue transition-colors"
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/customer/settings"
                    className="text-foreground/70 hover:text-roam-blue transition-colors"
                  >
                    Settings
                  </Link>
                </>
              ) : (
                <div className="flex flex-col space-y-2 pt-4">
                  <Button
                    variant="outline"
                    className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
                    onClick={handleSignInClick}
                  >
                    Sign In
                  </Button>
                  <Button asChild className="bg-roam-blue hover:bg-roam-blue/90">
                    <a href="https://roamprovider.com" target="_blank" rel="noopener noreferrer">Become a Provider</a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Customer Authentication Modal */}
      {authModalOpen && (
        <Suspense fallback={<div />}>
          <CustomerAuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            defaultTab="signin"
          />
        </Suspense>
      )}
    </nav>
  );
}
