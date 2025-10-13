import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

function Hero() {
  return (
    <div className="relative text-primary-foreground py-20 px-4">
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
          <iframe
            src="https://www.youtube.com/embed/Z0A84Ev5Waw?autoplay=1&mute=1&loop=1&playlist=Z0A84Ev5Waw&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
            className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto"
            style={{
              filter: "brightness(0.7)",
              pointerEvents: "none",
              aspectRatio: "16/9",
              transform: "translate(-50%, -50%) scale(1.1)",
            }}
            frameBorder="0"
            allow="autoplay; encrypted-media"
            title="Background Video"
          />
        </div>
      </div>
      <div className="relative z-10 max-w-7xl mx-auto text-center px-6 sm:px-8 md:px-12">
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F4b7dee81de554d3fb6de670e595f88d0?format=webp&width=800"
          alt="ROAM Provider Management"
          className="mx-auto block h-auto w-full max-w-[min(90%,520px)] object-contain"
        />
        <h1 className="sr-only">ROAM Provider Management</h1>
        <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90">
          Everything you need to grow and manage your wellness business
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link to="/apply">Get Started Today</Link>
          </Button>
          <Button
            asChild
            className="bg-[#f88221] text-white hover:bg-[#f88221]/90"
          >
            <Link to="/demo">Watch Demo</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Check({ className = "w-5 h-5 text-green-500 mr-2" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
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
      description:
        "Track revenue, bookings, conversations, and key performance metrics in real-time. Get insights that help you make smarter business decisions.",
      image:
        "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F46c0519ef20245b8a8c5be18abd7aec1?format=webp&width=800",
      fullImage:
        "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F46c0519ef20245b8a8c5be18abd7aec1?format=webp&width=1600",
      points: ["Real-time analytics", "Revenue tracking", "Performance metrics"],
    },
    {
      title: "My Bookings",
      description:
        "Manage booking acceptance, status updates, provider assignments, and scheduling with an intuitive calendar interface.",
      image:
        "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F0f92df2869a342e0b1d4d2f76c9eda2a?format=webp&width=800",
      fullImage:
        "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F0f92df2869a342e0b1d4d2f76c9eda2a?format=webp&width=1600",
      points: ["One-click acceptance", "Calendar sync", "Auto-reminders"],
    },
    {
      title: "Messages",
      description:
        "Communicate with customers who booked services with you without sharing personal contact information.",
      image:
        "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2Fc4985d154e364ada9b56af028fcbbefc?format=webp&width=800",
      fullImage:
        "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2Fc4985d154e364ada9b56af028fcbbefc?format=webp&width=1600",
      points: ["Secure messaging", "Privacy protected", "Real-time notifications"],
    },
    {
      title: "Services",
      description:
        "Manage services and add-ons, pricing, and delivery options (mobile, business location, virtual).",
      image:
        "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F6e8978f8e0ab4666900f2b76335979b5?format=webp&width=800",
      fullImage:
        "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F6e8978f8e0ab4666900f2b76335979b5?format=webp&width=1600",
      points: ["Custom pricing", "Add-on management", "Multi-delivery options"],
    },
    {
      title: "Staff",
      description:
        "Onboard staff like dispatchers or providers. Define their services, locations, and availability to scale your business.",
      image:
        "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2Fd4ce64c88b02411cafa59b32ed3dd8aa?format=webp&width=800",
      fullImage:
        "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2Fd4ce64c88b02411cafa59b32ed3dd8aa?format=webp&width=1600",
      points: ["Easy onboarding", "Role management", "Availability tracking"],
    },
    {
      title: "Business Profile",
      description:
        "Customize your brand, set business hours, and publish a dedicated services page.",
      image:
        "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38595d4c528d490ea6bc1d779d9c4fb8?format=webp&width=800",
      fullImage:
        "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38595d4c528d490ea6bc1d779d9c4fb8?format=webp&width=1600",
      points: ["Custom branding", "Business hours", "Dedicated page"],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          Powerful Features Built For You
        </h2>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mt-8">
          Everything you need to manage bookings, communicate with clients, and grow your revenue—all in one intuitive platform.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cards.map((card) => (
          <div key={card.title} className="rounded-2xl border bg-card p-8 shadow-sm transition">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">{card.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{card.description}</p>
            <div
              className="mt-4 overflow-hidden rounded-xl border bg-white cursor-zoom-in"
              role="button"
              tabIndex={0}
              onClick={() => open(card.fullImage, `ROAM Provider Management - ${card.title}`)}
              onKeyDown={(e) =>
                e.key === "Enter" && open(card.fullImage, `ROAM Provider Management - ${card.title}`)
              }
            >
              <img src={card.image} alt={`ROAM Provider Management - ${card.title}`} className="w-full h-auto" loading="lazy" />
            </div>
            <ul className="mt-4 space-y-2">
              {card.points.map((point) => (
                <li key={point} className="flex items-center text-sm text-foreground/80">
                  <Check /> {point}
                </li>
              ))}
            </ul>
          </div>
        ))}
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

export default function HowItWorks() {
  return (
    <div className="bg-background">
      <Hero />
      <Features />
    </div>
  );
}
