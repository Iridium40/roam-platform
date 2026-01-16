import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  X,
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Settings,
  Users,
  Building2,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { ServiceIconPattern } from "@/components/ServiceIconPattern";

export default function HowItWorks() {
  return (
    <div className="bg-background">
      <WhyChooseROAM />
      <HowItWorksSteps />
      <Features />
      <FinalCTA />
    </div>
  );
}

function Features() {
  const [lightbox, setLightbox] = useState<{ open: boolean; src: string; alt: string }>({
    open: false,
    src: "",
    alt: "",
  });
  const open = (src: string, alt: string) => setLightbox({ open: true, src, alt });
  const close = () => setLightbox({ open: false, src: "", alt: "" });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (lightbox.open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox.open]);

  const cards = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      description:
        "Track revenue, bookings, conversations, and key performance metrics in real-time. Get insights that help you make smarter business decisions.",
      image:
        "/dashboard-screenshot.png",
      fullImage:
        "/dashboard-screenshot.png",
      points: ["Real-time analytics", "Revenue tracking", "Performance metrics"],
    },
    {
      title: "Bookings",
      icon: Calendar,
      description:
        "Manage booking acceptance, status updates, provider assignments, and scheduling with an intuitive calendar interface.",
      image:
        "/bookings-screenshot.png",
      fullImage:
        "/bookings-screenshot.png",
      points: ["One-click acceptance", "Calendar sync", "Auto-reminders"],
    },
    {
      title: "Messages",
      icon: MessageSquare,
      description:
        "Communicate with customers who booked services with you without sharing personal contact information.",
      image:
        "/messages-screenshot.png",
      fullImage:
        "/messages-screenshot.png",
      points: ["Secure messaging", "Privacy protected", "Real-time notifications"],
    },
    {
      title: "Services",
      icon: Settings,
      description:
        "Manage services and add-ons, pricing, and delivery options (mobile, business location, virtual).",
      image:
        "/services-screenshot.png",
      fullImage:
        "/services-screenshot.png",
      points: ["Custom pricing", "Add-on management", "Multi-delivery options"],
    },
    {
      title: "Staff",
      icon: Users,
      description:
        "Onboard staff like dispatchers or providers. Define their services, locations, and availability to scale your business.",
      image:
        "/staff-screenshot.png",
      fullImage:
        "/staff-screenshot.png",
      points: ["Easy onboarding", "Role management", "Availability tracking"],
    },
    {
      title: "Financials",
      icon: TrendingUp,
      description:
        "View your earnings and payouts, update tax and banking information, and track business performance metrics.",
      image:
        "/financials-screenshot.png",
      fullImage:
        "/financials-screenshot.png",
      points: ["Earnings tracking", "Payout management", "Performance analytics"],
    },
  ];

  return (
    <div className="container py-12 md:py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          Powerful Features Built For You
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Everything you need to manage and grow your business
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.title} 
              className="rounded-2xl border bg-card p-6 shadow-lg card-hover group"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Gradient icon container */}
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-roam-blue to-roam-light-blue text-white mb-4 group-hover:scale-110 transition-transform">
                <Icon className="w-6 h-6" />
            </div>
              
              <h3 className="text-xl font-bold mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{card.description}</p>
              
            <div
                className="mt-4 overflow-hidden rounded-xl border bg-white cursor-zoom-in hover-scale"
              role="button"
              tabIndex={0}
              onClick={() => open(card.fullImage, `ROAM Provider Management - ${card.title}`)}
              onKeyDown={(e) =>
                e.key === "Enter" && open(card.fullImage, `ROAM Provider Management - ${card.title}`)
              }
            >
                <img 
                  src={card.image} 
                  alt={`ROAM Provider Management - ${card.title}`} 
                  className="w-full h-auto" 
                  loading="lazy" 
                />
            </div>
              
            <ul className="mt-4 space-y-2">
              {card.points.map((point) => (
                  <li key={point} className="flex items-center text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                    {point}
                </li>
              ))}
            </ul>
          </div>
          );
        })}
      </div>

      {lightbox.open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={close}
        >
          <button
            aria-label="Close"
            onClick={close}
            className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-foreground hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="max-h-[85vh] max-w-[95vw] w-auto rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function HowItWorksSteps() {
  const steps = [
    {
      number: "1",
      title: "Apply & Get Approved",
      description: "Submit your application with business details, licenses, and insurance. Our team reviews and approves within 2-3 business days.",
    },
    {
      number: "2",
      title: "Set Up Your Profile",
      description: "Add your services, pricing, availability, and service areas. Customize your business profile to showcase your brand.",
    },
    {
      number: "3",
      title: "Receive Bookings",
      description: "Accept or decline booking requests instantly. Manage your calendar and communicate with customers through the platform.",
    },
    {
      number: "4",
      title: "Deliver & Get Paid",
      description: "Provide your service, and get paid automatically within 2 business days. Build your reputation with reviews.",
    },
  ];

  return (
    <div className="bg-muted/30 py-12 md:py-16">
      <div className="container">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started in 4 simple steps
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => (
            <div key={step.number} className="relative">
              <div className="bg-card rounded-2xl p-6 shadow-lg border h-full card-hover">
                {/* Gradient number badge */}
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-roam-blue to-roam-light-blue text-white font-bold text-lg mb-4">
                  {step.number}
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              
              {/* Arrow between steps */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-6 h-6 text-roam-blue/60" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhyChooseROAM() {
  const benefits = [
    {
      icon: TrendingUp,
      title: "Grow Your Business",
      description: "Access thousands of customers actively seeking wellness services in the 30A area.",
    },
    {
      icon: Calendar,
      title: "Manage Everything",
      description: "Handle bookings, scheduling, messaging, and payments all from one platform.",
    },
    {
      icon: CheckCircle2,
      title: "Get Paid Fast",
      description: "Automatic payments deposited to your account within 2 business days—no invoicing required.",
    },
    {
      icon: Users,
      title: "Build Your Team",
      description: "Onboard staff members and scale your business with multi-provider support.",
    },
    {
      icon: MessageSquare,
      title: "Stay Connected",
      description: "Communicate securely with customers without sharing personal contact details.",
    },
    {
      icon: Building2,
      title: "Professional Presence",
      description: "Get a dedicated business page to showcase your services and build your brand.",
    },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Gradient header with page title */}
      <div className="bg-gradient-to-br from-roam-blue to-roam-light-blue text-white py-12 md:py-16">
        <ServiceIconPattern />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-3">
              Why Choose ROAM?
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Built specifically for wellness professionals who want to grow
            </p>
          </div>
        </div>
      </div>
      
      {/* Benefits grid */}
      <div className="container py-12 md:py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {benefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div 
                key={benefit.title} 
                className="bg-card rounded-2xl p-6 shadow-lg border card-hover"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-roam-blue to-roam-light-blue text-white mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            );
          })}
        </div>
        
        {/* Quick CTA inline */}
        <div className="text-center mt-10">
          <div className="inline-flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-roam-blue text-white hover:bg-roam-blue/90 button-shine">
              <Link to="/provider-portal">Get Started</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-roam-blue text-roam-blue hover:bg-roam-blue/10">
              <Link to="/contact">Talk to Our Team</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinalCTA() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-roam-blue to-roam-light-blue text-white py-12 md:py-16">
      {/* Service icon pattern overlay */}
      <ServiceIconPattern />
      
      <div className="container relative">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Grow Your Wellness Business?
          </h2>
          <p className="text-lg text-white/90 mb-6">
            Join ROAM today and start connecting with customers.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-white text-roam-blue hover:bg-white/90 button-shine">
              <Link to="/provider-portal">Apply Now</Link>
            </Button>
            <Button asChild size="lg" className="bg-roam-yellow text-roam-blue hover:bg-roam-yellow/90 font-semibold">
              <Link to="/contact">Contact Support</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
