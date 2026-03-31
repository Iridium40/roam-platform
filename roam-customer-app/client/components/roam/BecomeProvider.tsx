import { ArrowRight, DollarSign, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BecomeProvider() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-roam-blue via-roam-blue/95 to-blue-700">
      <div className="container mx-auto py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm mb-6">
              Now Accepting Providers
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Turn Your Skills Into a Thriving Business
            </h2>
            <p className="mt-4 text-lg text-white/85 max-w-xl">
              Join Florida's fastest-growing wellness marketplace. Set your own
              schedule, keep more of what you earn, and connect with clients
              who value quality.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Keep More</p>
                  <p className="text-xs text-white/70">Industry-low platform fees</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Your Schedule</p>
                  <p className="text-xs text-white/70">Work when you want</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Secure Pay</p>
                  <p className="text-xs text-white/70">Guaranteed payments</p>
                </div>
              </div>
            </div>
            <div className="mt-10">
              <Button
                asChild
                size="lg"
                className="bg-white text-roam-blue hover:bg-white/90 font-semibold text-base px-8 shadow-lg shadow-black/20"
              >
                <a href="https://roamprovider.com/roampro" target="_blank" rel="noopener noreferrer">
                  Become a Provider
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              <img
                src="https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg"
                alt="Professional wellness provider"
                className="aspect-[4/5] w-full rounded-xl object-cover shadow-lg"
              />
              <div className="flex flex-col gap-4">
                <img
                  src="https://images.pexels.com/photos/5794051/pexels-photo-5794051.jpeg"
                  alt="Provider delivering mobile service"
                  className="aspect-square w-full rounded-xl object-cover shadow-lg"
                />
                <img
                  src="https://images.pexels.com/photos/3764568/pexels-photo-3764568.jpeg"
                  alt="Independent professional at work"
                  className="aspect-square w-full rounded-xl object-cover shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_80%_20%,rgba(255,255,255,0.08),transparent)]" />
    </section>
  );
}
