import { Button } from "@/components/ui/button";
import EarningsCalculator from "@/components/marketing/EarningsCalculator";
import {
  ActivityProof,
  ValueProps,
  HowItWorks,
  Comparison,
  FAQ,
  ProviderTestimonials,
  FoundingProvider,
  PerfectFor,
  ClientTypes,
  ProviderTypes,
} from "@/components/marketing/Sections";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="bg-background">
      <Hero />
      <ActivityProof />
      <ProviderTestimonials />
      <ProviderTypes />
      <ValueProps />
      <ClientTypes />
      <PerfectFor />
      <HowItWorks />
      <FoundingProvider />
      <Comparison />
      <EarningsCalculator />
      <CTA />
      <FAQ />
    </div>
  );
}

function Hero() {
  const bullets = [
    "Travelers book at your salon or spa",
    "Mobile bookings at vacation rentals",
    "Bridal parties & special events",
    "Premium clients who value quality",
    "Zero commission — Keep 100%",
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1000px_400px_at_10%_-20%,theme(colors.primary/0.15),transparent),radial-gradient(800px_400px_at_90%_10%,theme(colors.secondary/0.2),transparent)]" />
      <div className="container grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-roam-yellow/20 px-4 py-1.5 text-sm font-medium text-roam-blue mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Now Accepting Providers in 30A & Emerald Coast
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Grow Your Client Base
            <br className="hidden sm:block" /> on the Emerald Coast
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Whether clients visit your location or you go to them — ROAM connects you with travelers, bridal parties, and premium guests who value quality over price.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="min-w-40">
              <Link to="/provider-portal">Apply Now — Limited Spots</Link>
            </Button>
            <Button
              asChild
              className="min-w-40 bg-[#f88221] text-white hover:bg-[#f88221]/90"
            >
              <Link to="/how-it-works">See How It Works</Link>
            </Button>
          </div>
          <div className="mt-8">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">How You Get Clients:</p>
            <ul className="grid gap-2 sm:grid-cols-2">
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
        </div>
        <div className="relative">
          <div className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-xl">
            <img
              src="/landing-dashboard-preview.png"
              alt="ROAM provider dashboard example"
              className="w-full h-auto"
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Your Business Command Center
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
