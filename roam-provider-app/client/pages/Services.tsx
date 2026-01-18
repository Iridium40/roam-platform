import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Activity,
  BadgeDollarSign,
  CalendarCheck2,
  Dumbbell,
  Droplets,
  HeartPulse,
  Home,
  MapPinned,
  Sparkles,
  Stethoscope,
  Users,
  CheckCircle2,
  ArrowRight,
  Zap,
} from "lucide-react";
import { ServiceIconPattern } from "@/components/ServiceIconPattern";

export default function Services() {
  return (
    <div className="bg-background">
      <Hero />
      <ServiceHighlights />
      <DeliveryOptions />
      <ExperienceSteps />
      <FinalCTA />
    </div>
  );
}

function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-roam-blue to-roam-light-blue text-white">
      {/* YouTube Video Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <iframe
          className="absolute top-1/2 left-1/2 w-[300%] h-[300%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          src="https://www.youtube.com/embed/-g5P96JAif0?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&modestbranding=1&playlist=-g5P96JAif0&rel=0&enablejsapi=1"
          title="ROAM Background Video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-roam-blue/80 to-roam-light-blue/80" />
      </div>

      {/* Service icon pattern overlay */}
      <ServiceIconPattern />
      
      <div className="container py-20 md:py-28 relative">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Wellness Services
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Wellness Without Boundaries
          </h1>
          <p className="text-xl text-white/90 mb-4">
            Discover a curated marketplace of mobile, in-studio, and virtual services created for the 30A lifestyle.
          </p>
          <p className="text-lg text-white/80 max-w-3xl mx-auto mb-8">
            From IV therapy and massage to aesthetics and performance coaching, every experience is delivered by a licensed professional vetted by our local team.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-white text-roam-blue hover:bg-white/90 button-shine">
              <Link to="/provider-portal">Become a Provider</Link>
            </Button>
            <Button asChild size="lg" className="bg-roam-yellow text-roam-blue hover:bg-roam-yellow/90 font-semibold">
              <Link to="/contact">Talk to Our Team</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceHighlights() {
  const categories = [
    {
      icon: Activity,
      title: "Massage & Bodywork",
      description:
        "Restore balance with on-demand Swedish, deep tissue, sports recovery, and prenatal massage treatments.",
      services: [
        "Therapeutic massage tailored to your goals",
        "Sports recovery sessions with targeted relief",
        "Prenatal and postpartum massage",
        "Couples and group experiences",
      ],
    },
    {
      icon: Droplets,
      title: "IV Therapy & Recovery",
      description: "Licensed medical teams deliver advanced hydration, immunity, and performance drips wherever you are.",
      services: [
        "Hydration, recovery, and immunity IVs",
        "Wellness blends including Myers Cocktail",
        "Migraine and headache relief",
        "Athletic performance protocols",
      ],
    },
    {
      icon: Stethoscope,
      title: "Medical & Health Services",
      description:
        "Concierge physicians, nurses, and health coaches provide personalized care in-home, in-office, or virtually.",
      services: [
        "Primary and urgent care visits",
        "House calls and telemedicine",
        "Sports medicine and injury support",
        "Preventive health assessments",
      ],
    },
    {
      icon: Sparkles,
      title: "Beauty & Aesthetics",
      description: "Professional stylists and aesthetic experts help you look and feel your best for every occasion.",
      services: [
        "Bridal and event hair & makeup",
        "Luxury spray tans and lash services",
        "Teeth whitening and skincare treatments",
        "Injectables from licensed professionals",
      ],
    },
    {
      icon: Dumbbell,
      title: "Fitness & Performance",
      description: "Certified trainers and instructors design custom sessions to match your pace, from beginners to pros.",
      services: [
        "Personal training and strength coaching",
        "Yoga, Pilates, and barre instruction",
        "On-the-beach group workouts",
        "Mind-body recovery sessions",
      ],
    },
    {
      icon: HeartPulse,
      title: "Lifestyle & Wellness",
      description:
        "Support your routine with nutrition coaching, mindfulness, and concierge wellness planning.",
      services: [
        "Nutrition and wellness coaching",
        "Mindfulness and meditation guidance",
        "Corporate and retreat wellness programs",
        "Special event wellness activations",
      ],
    },
  ];

  return (
    <div className="container py-20">
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 gradient-text">
          Signature Service Categories
        </h2>
        <p className="text-lg text-muted-foreground">
          Choose from curated offerings designed to keep you, your family, and your guests at peak wellness all year long.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-2 max-w-6xl mx-auto">
        {categories.map(({ icon: Icon, title, description, services }, idx) => (
          <div 
            key={title} 
            className="rounded-2xl border bg-card p-8 shadow-lg card-hover"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            {/* Gradient icon container */}
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-roam-blue to-roam-light-blue text-white mb-4">
              <Icon className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-3">{title}</h3>
            <p className="text-muted-foreground mb-4">{description}</p>
            <ul className="space-y-2">
              {services.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-roam-blue flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeliveryOptions() {
  const options = [
    {
      icon: Home,
      title: "Mobile Experiences",
      description:
        "From private residences to vacation rentals, providers arrive with everything needed for a five-star service.",
    },
    {
      icon: MapPinned,
      title: "In-Studio Appointments",
      description: "Prefer to travel? Book services at premium studios and partner locations across the 30A corridor.",
    },
    {
      icon: Users,
      title: "Group & Event Coverage",
      description:
        "Elevate celebrations, retreats, and corporate gatherings with tailored wellness activations for every guest.",
    },
    {
      icon: CalendarCheck2,
      title: "Flexible Scheduling",
      description: "Real-time availability, easy rescheduling, and provider messaging keep every experience seamless.",
    },
    {
      icon: BadgeDollarSign,
      title: "Transparent Pricing",
      description: "Review rates, travel fees, and add-ons upfront so you always know exactly what to expect.",
    },
  ];

  return (
    <div className="bg-gradient-to-b from-roam-light-blue/10 to-transparent py-20">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Designed Around Your Lifestyle
          </h2>
          <p className="text-lg text-muted-foreground">
          Every booking adapts to how you want to experience 30A—on the beach, at home, in studio, or entirely online.
        </p>
      </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {options.map(({ icon: Icon, title, description }, idx) => (
            <div 
              key={title} 
              className="rounded-2xl border bg-card p-6 shadow-lg card-hover"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-roam-blue to-roam-light-blue text-white mb-4">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
          </div>
      </div>
    </div>
  );
}

function ExperienceSteps() {
  const steps = [
    {
      title: "Browse and Select",
      description: "Filter by service type, delivery method, and provider availability to find the perfect match in seconds.",
      icon: Zap,
    },
    {
      title: "Confirm Effortlessly",
      description: "See real-time pricing, review add-ons, and reserve with secure checkout. You can message providers instantly.",
      icon: CheckCircle2,
    },
    {
      title: "Enjoy & Review",
      description: "Relax while your provider handles the rest. After the session, share feedback to help our community thrive.",
      icon: HeartPulse,
    },
  ];

  return (
    <div className="container py-20">
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 gradient-text">
          Booking in Three Simple Steps
        </h2>
        <p className="text-lg text-muted-foreground">
          Thoughtful technology keeps every interaction personal, transparent, and stress-free.
        </p>
      </div>
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
        {steps.map(({ title, description, icon: Icon }, index) => (
          <div key={title} className="relative">
            <div className="rounded-2xl border bg-card p-8 text-center shadow-lg card-hover h-full">
              {/* Gradient number badge */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-roam-blue to-roam-light-blue text-white mb-4">
                <Icon className="w-8 h-8" />
              </div>
              <div className="inline-flex items-center justify-center rounded-full bg-roam-light-blue/20 px-3 py-1 text-sm font-bold text-roam-blue mb-3">
                Step {index + 1}
              </div>
              <h3 className="text-xl font-bold mb-3">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            
            {/* Arrow between steps */}
            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                <ArrowRight className="w-8 h-8 text-roam-blue" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalCTA() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-roam-blue to-roam-light-blue text-white py-20">
      {/* Service icon pattern overlay */}
      <ServiceIconPattern />
      
      <div className="container relative">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Offer Your Services?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join ROAM today and connect with thousands of customers seeking your expertise in the 30A area.
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
