import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ShareMenu from "@/components/ShareMenu";
import { Footer } from "@/components/Footer";
import Hero from "@/components/roam/Hero";
import ValueProps from "@/components/roam/ValueProps";
import MarketingHowItWorks from "@/components/roam/HowItWorks";
import ServicesShowcase from "@/components/roam/ServicesShowcase";
import TrustSafety from "@/components/roam/TrustSafety";
import LocationBenefits from "@/components/roam/LocationBenefits";
import SocialProof from "@/components/roam/SocialProof";
import FAQ from "@/components/roam/FAQ";
import { ChevronDown, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import Turnstile from "react-turnstile";

export default function MarketingLanding() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLFormElement>(null);

  const handleSubscribe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get("email");
    if (!email || typeof email !== "string") return;

    // Check if Turnstile token exists
    if (!turnstileToken) {
      setMessage({
        type: "error",
        text: "Please verify you're not a robot",
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: turnstileToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to subscribe");
      }

      setMessage({
        type: "success",
        text: data.alreadySubscribed 
          ? "You're already subscribed! 🎉" 
          : "Successfully subscribed! Check your email for confirmation. 📧",
      });
      (form.elements.namedItem("email") as HTMLInputElement).value = "";
      setTurnstileToken(null);
    } catch (error) {
      console.error("Subscription failed", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to subscribe. Please try again.",
      });
      setTurnstileToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background">
      {/* Launch Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute top-6 left-6 z-30">
          <ShareMenu />
        </div>
        <div className="container relative z-20 mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-6 py-16 text-center">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2Fb039513f83c04be3b573c6e38287f9ab?format=webp&width=800"
            alt="ROAM logo"
            className="h-[6.75rem] w-auto object-contain md:h-[8.1rem]"
          />
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white">
            We’re launching soon.
          </h1>
          <p className="max-w-2xl text-white/90">
            The new ROAM experience is almost here. Stay tuned for premium wellness services delivered anywhere you are.
          </p>
          <form ref={turnstileRef} onSubmit={handleSubscribe} className="mx-auto mt-2 w-full max-w-md">
            <div className="flex items-center gap-2">
              <Input
                type="email"
                name="email"
                required
                placeholder="Enter your email for news & announcements"
                aria-label="Email address"
                className="bg-white/95"
                disabled={isLoading}
              />
              <Button type="submit" className="px-6" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register"
                )}
              </Button>
            </div>
            <div className="mt-3 flex justify-center">
              {import.meta.env.VITE_TURNSTILE_SITE_KEY ? (
                <Turnstile
                  sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => setTurnstileToken(null)}
                  onExpire={() => setTurnstileToken(null)}
                  theme="light"
                />
              ) : (
                <div className="rounded bg-yellow-100 px-4 py-2 text-sm text-yellow-800">
                  ⚠️ CAPTCHA not configured. Please restart the dev server after adding environment variables.
                </div>
              )}
            </div>
            {message && (
              <div
                className={`mt-3 flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
                  message.type === "success"
                    ? "bg-green-500/90 text-white"
                    : "bg-red-500/90 text-white"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}
            <p className="mt-2 text-xs text-white/90">
              By registering, you agree to our{" "}
              <Link to="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        </div>
        <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
          <div className="absolute inset-0 h-full w-full">
            <iframe
              src="https://www.youtube.com/embed/-g5P96JAif0?autoplay=1&mute=1&loop=1&playlist=-g5P96JAif0&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
              className="absolute left-1/2 top-1/2 h-auto min-h-full w-auto min-w-full"
              style={{
                filter: "brightness(0.85)",
                pointerEvents: "none",
                aspectRatio: "16/9",
                transform: "translate(-50%, -50%) scale(1.08)",
              }}
              frameBorder={0}
              allow="autoplay; encrypted-media"
              title="ROAM Coming Soon"
            />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 bg-black/30" />
        <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(600px_300px_at_20%_10%,hsl(var(--primary)/0.12),transparent),radial-gradient(600px_300px_at_80%_20%,hsl(var(--secondary)/0.1),transparent)]" />
        <div className="absolute left-1/2 bottom-6 z-20 -translate-x-1/2 text-white/90 animate-bounce" aria-hidden>
          <ChevronDown className="h-6 w-6" />
        </div>
      </section>

      {/* Marketing Sections */}
      <Hero />
      <ValueProps />
      <MarketingHowItWorks />
      <ServicesShowcase />
      <TrustSafety />
      <LocationBenefits />
      <SocialProof />
      <FAQ />
      <Footer />
    </div>
  );
}

