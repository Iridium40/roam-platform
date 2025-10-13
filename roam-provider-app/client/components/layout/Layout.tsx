import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ShareMenu from "@/components/ShareMenu";
import { Instagram, Facebook } from "lucide-react";

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
}

function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/roampro" className="flex items-center">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F531be16729404882bb7cc0ddef6620dd?format=webp&width=800"
            alt="ROAM"
            className="h-10 w-auto"
          />
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/how-it-works" className="text-sm font-medium text-foreground/80 hover:text-foreground">
            How It Works
          </Link>
          <Link to="/about" className="text-sm font-medium text-foreground/80 hover:text-foreground">
            About Us
          </Link>
          <Link to="/services" className="text-sm font-medium text-foreground/80 hover:text-foreground">
            Our Services
          </Link>
          <Link to="/contact" className="text-sm font-medium text-foreground/80 hover:text-foreground">
            Contact Us
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="https://www.instagram.com/roamyourbestlife/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white hover:opacity-90"
          >
            <Instagram className="h-4 w-4" />
          </a>
          <a
            href="https://www.facebook.com/roamtheapp/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1877f2] text-white hover:bg-[#1877f2]/90"
          >
            <Facebook className="h-4 w-4" />
          </a>
          <ShareMenu />
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/provider-portal">Become a Provider</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container grid gap-10 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F531be16729404882bb7cc0ddef6620dd?format=webp&width=800"
              alt="ROAM"
              className="h-8 w-auto"
            />
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Grow your wellness business. Keep what you earn. Live your best life.
          </p>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">For Providers</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/provider-portal" className="hover:text-foreground">
                Provider Sign Up
              </Link>
            </li>
            <li>
              <Link to="/provider-portal" className="hover:text-foreground">
                Provider Login
              </Link>
            </li>
            <li>
              <a href="#calculator" className="hover:text-foreground">
                Fee Calculator
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/about" className="hover:text-foreground">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/services" className="hover:text-foreground">
                Our Services
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className="hover:text-foreground">
                How It Works
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/provider-agreement" className="hover:text-foreground">
                Provider Agreement
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-foreground">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/cancellation" className="hover:text-foreground">
                Cancellation Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ROAM Wellness. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/support" className="hover:text-foreground">
              Support
            </Link>
            <Link to="/press" className="hover:text-foreground">
              Press
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
