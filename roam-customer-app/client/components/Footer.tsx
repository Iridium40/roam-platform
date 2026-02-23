import { Badge } from "@/components/ui/badge";

import { Link } from "react-router-dom";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col items-center text-center gap-6">
          <Link to="/" className="flex items-center justify-center">
            <img
              src="/logo.png"
              alt="ROAM Logo"
              className="h-16 w-auto object-contain"
            />
          </Link>

          <p className="text-foreground/70 max-w-2xl leading-relaxed">
            Florida's premier on-demand services marketplace. We connect
            customers with trusted professionals ready to deliver premium
            experiences anywhere you are.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
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

        <div className="border-t pt-8 mt-12 flex flex-col gap-4 text-sm text-foreground/60 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p>
              &copy; {currentYear} ROAM. All rights reserved. Proudly serving Florida with
              premium on-demand services.
            </p>
            <div className="flex items-center justify-center gap-4 text-foreground/70">
              <span className="text-roam-blue font-medium">Made in Florida</span>
              <span className="hidden md:inline">•</span>
              <span>Available statewide</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-6 text-foreground/70">
            <Link to="/terms-and-conditions" className="hover:text-roam-blue transition-colors">
              Terms & Conditions
            </Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-roam-blue transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/refund-policy" className="hover:text-roam-blue transition-colors">
              Refund Policy
            </Link>
            <span>•</span>
            <Link to="/cookie-policy" className="hover:text-roam-blue transition-colors">
              Cookie Policy
            </Link>
            <span>•</span>
            <Link to="/accessibility" className="hover:text-roam-blue transition-colors">
              Accessibility
            </Link>
          </div>

          {/* SMS Terms Disclosure */}
          <p className="text-xs text-foreground/40 mt-4 leading-relaxed">
            <strong>SMS Terms:</strong> By checking the optional marketing messages box during sign-up, 
            you consent to receive recurring automated promotional text messages from ROAM at the 
            number provided. Consent to receive marketing messages is not a condition of purchase 
            or use of our services. Msg frequency varies. Msg & data rates may apply. 
            Reply STOP to unsubscribe, HELP for help. View our{' '}
            <Link to="/terms-and-conditions" className="underline hover:text-roam-blue transition-colors">
              Terms
            </Link>{' '}&{' '}
            <Link to="/privacy" className="underline hover:text-roam-blue transition-colors">
              Privacy Policy
            </Link>. Manage preferences at{' '}
            <Link to="/customer/profile" className="underline hover:text-roam-blue transition-colors">
              roamyourbestlife.com/customer/profile
            </Link>.
          </p>
        </div>
      </div>
    </footer>
  );
}
