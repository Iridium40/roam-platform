import { Badge } from "@/components/ui/badge";

import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t bg-background/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col items-center text-center gap-6">
          <Link to="/" className="flex items-center justify-center">
            <div className="w-24 h-24 rounded-lg overflow-hidden flex items-center justify-center bg-white shadow-sm">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800"
                alt="ROAM Logo"
                className="w-24 h-24 object-contain"
              />
            </div>
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

        <div className="border-t pt-8 mt-12 flex flex-col gap-4 text-sm text-foreground/60 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <p>
            &copy; 2024 ROAM. All rights reserved. Proudly serving Florida with
            premium on-demand services.
          </p>
          <div className="flex items-center justify-center gap-4 text-foreground/70">
            <span className="text-roam-blue font-medium">Made in Florida</span>
            <span className="hidden md:inline">•</span>
            <span>Available statewide</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
