import { Badge } from "@/components/ui/badge";

import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t bg-background/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center mb-4">
              <div className="w-24 h-24 rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800"
                  alt="ROAM Logo"
                  className="w-24 h-24 object-contain"
                />
              </div>
            </Link>
            <p className="text-foreground/70 mb-4 max-w-md">
              Florida's premier on-demand services marketplace. Connecting
              customers with verified professionals for premium services
              delivered anywhere.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="border-roam-blue text-roam-blue"
              >
                🛡️ Verified Providers
              </Badge>
              <Badge
                variant="outline"
                className="border-roam-blue text-roam-blue"
              >
                ⭐ 5-Star Quality
              </Badge>
              <Badge
                variant="outline"
                className="border-roam-blue text-roam-blue"
              >
                📍 Florida-Wide
              </Badge>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-roam-blue">Services</h4>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li>
                <a href="#" className="hover:text-roam-blue transition-colors">
                  Beauty & Wellness
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-roam-blue transition-colors">
                  Personal Training
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-roam-blue transition-colors">
                  Massage Therapy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-roam-blue transition-colors">
                  Home Services
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-roam-blue transition-colors">
                  Healthcare
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-roam-blue transition-colors">
                  Wellness Coaching
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-roam-blue">Company</h4>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li>
                <Link
                  to="/about"
                  className="hover:text-roam-blue transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/providers"
                  className="hover:text-roam-blue transition-colors"
                >
                  Become a Provider
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="hover:text-roam-blue transition-colors"
                >
                  Support
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-roam-blue transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-roam-blue transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-roam-blue transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 mt-8 flex flex-col md:flex-row justify-between items-center text-sm text-foreground/60">
          <p>
            &copy; 2024 ROAM. All rights reserved. Proudly serving Florida with
            premium on-demand services.
          </p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <span className="text-roam-blue font-medium">
              �� Made in Florida
            </span>
            <span>•</span>
            <span>Available statewide</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
