import { Button } from "@/components/ui/button";
import EarningsCalculator from "@/components/marketing/EarningsCalculator";
import {
  ValueProps,
  HowItWorks,
  Comparison,
  FAQ,
} from "@/components/marketing/Sections";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="bg-background">
      <Hero />
      <Comparison />
      <EarningsCalculator />
      <ValueProps />
      <HowItWorks />
      <CTA />
      <FAQ />
    </div>
  );
}

function Hero() {
  const bullets = [
    "You Keep 100% of Your Service Price",
    "Customers Pay All Platform Fees",
    "Get Paid for Confirmed Bookings Only",
    "Join 400+ Successful Providers",
    "Free Marketing & Customer Acquisition",
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1000px_400px_at_10%_-20%,theme(colors.primary/0.15),transparent),radial-gradient(800px_400px_at_90%_10%,theme(colors.secondary/0.2),transparent)]" />
      <div className="container grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Keep 100% of Your Rates.
            <br className="hidden sm:block" /> We'll Bring You the Customers.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Join Florida's newest wellness marketplace. Serious, prepaid customers. No commissions on your earnings. No hassle.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="min-w-40">
              <Link to="/provider-portal">Become a Provider</Link>
            </Button>
            <Button
              asChild
              className="min-w-40 bg-[#f88221] text-white hover:bg-[#f88221]/90"
            >
              <Link to="/how-it-works">See How It Works</Link>
            </Button>
          </div>
          <ul className="mt-8 grid gap-2 sm:grid-cols-2">
            {bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2 text-sm text-foreground/80"
              >
                <Check className="mt-0.5 h-4 w-4 text-primary" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl border bg-white">
            <img
              src="/landing-dashboard-preview.png"
              alt="ROAM provider dashboard example"
              className="w-full h-auto"
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Provider Dashboard
          </p>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative">
      <div className="container">
        <div className="mx-auto my-16 overflow-hidden rounded-3xl border bg-gradient-to-br from-primary to-secondary p-8 text-primary-foreground md:my-24 md:p-14">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-3xl font-bold tracking-tight">
                Ready to Keep What You Earn?
              </h3>
              <p className="mt-2 text-primary-foreground/90">
                Join our successful providers building their business on ROAM's zero-commission platform.
              </p>
            </div>
            <div className="flex gap-3 md:justify-end">
              <Button
                asChild
                variant="secondary"
                className="bg-white text-foreground hover:bg-white/90"
              >
                <Link to="/become-a-provider">Create Provider Profile</Link>
              </Button>
              <Button
                asChild
                className="bg-[#f88221] text-white hover:bg-[#f88221]/90"
              >
                <Link to="/contact">Schedule Demo Call</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
