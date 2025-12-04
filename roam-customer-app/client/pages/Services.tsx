import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { Header } from "@/components/Header";

export default function Services() {
  return (
    <div className="bg-background">
      <Header />
      <Hero />
      <ServiceHighlights />
      <DeliveryOptions />
      <ExperienceSteps />
    </div>
  );
}

function SectionWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`container py-12 md:py-20 ${className}`}>{children}</section>;
}

function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-roam-blue via-roam-blue/90 to-roam-light-blue text-white">
      <SectionWrapper className="relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-6 text-sm px-4 py-2 bg-white/20 text-white border-white/30 backdrop-blur-sm animate-fade-in">
            Our Services
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 animate-slide-up flex items-center justify-center gap-4 flex-wrap">
            <img src="/logo-white-notagline.png" alt="ROAM" className="h-[2.7rem] md:h-[3.375rem] w-auto inline-block" />
            <span>Without Boundaries</span>
          </h1>
          <p className="mt-3 text-xl md:text-2xl text-white/90 leading-relaxed animate-fade-in">
            Discover a curated marketplace of mobile, in-studio, and virtual services created for the 30A lifestyle.
          </p>
          <p className="mt-6 text-lg text-white/90 leading-relaxed animate-scale-in">
            From IV therapy and massage to aesthetics and performance coaching, every experience is delivered by a licensed professional vetted by our local team.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-in">
            <Button asChild size="lg" className="bg-white text-roam-blue hover:bg-white/90 button-shine shadow-lg hover-scale">
              <Link to="/booknow">Book a Service</Link>
            </Button>
            <Button asChild size="lg" className="bg-roam-yellow text-roam-blue hover:bg-roam-yellow/90 font-semibold shadow-lg">
              <Link to="/contact">Talk to Our Team</Link>
            </Button>
          </div>
        </div>
      </SectionWrapper>
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
    <SectionWrapper>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Signature Service Categories</h2>
        <p className="mt-3 text-lg text-muted-foreground">
          Choose from curated offerings designed to keep you, your family, and your guests at peak wellness all year long.
        </p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {categories.map(({ icon: Icon, title, description, services }) => (
          <div key={title} className="rounded-2xl border-0 bg-white p-8 shadow-lg card-hover">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-roam-blue to-roam-light-blue text-white shadow-md">
              <Icon className="h-7 w-7" />
            </div>
            <h3 className="mt-6 text-xl font-bold">{title}</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{description}</p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {services.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-roam-blue flex-shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionWrapper>
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
    <SectionWrapper className="rounded-3xl bg-gradient-to-br from-roam-blue/5 via-background to-roam-light-blue/5">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Designed Around Your Lifestyle</h2>
        <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
          Every booking adapts to how you want to experience 30A—on the beach, at home, in studio, or entirely online.
        </p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {options.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-2xl border-0 bg-white p-6 text-left shadow-lg card-hover">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-roam-blue to-roam-light-blue text-white shadow-md">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

function ExperienceSteps() {
  const steps = [
    {
      title: "Browse and Select",
      description: "Filter by service type, delivery method, and provider availability to find the perfect match in seconds.",
    },
    {
      title: "Confirm Effortlessly",
      description: "See real-time pricing, review add-ons, and reserve with secure checkout. You can message providers instantly.",
    },
    {
      title: "Enjoy & Review",
      description: "Relax while your provider handles the rest. After the session, share feedback to help our community thrive.",
    },
  ];

  return (
    <SectionWrapper>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Booking in Three Simple Steps</h2>
        <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
          Thoughtful technology keeps every interaction personal, transparent, and stress-free.
        </p>
      </div>
      <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
        {steps.map(({ title, description }, index) => (
          <div key={title} className="rounded-2xl border-0 bg-white p-8 text-center shadow-lg card-hover">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-roam-blue to-roam-light-blue text-white text-2xl font-bold shadow-md">
              {index + 1}
            </div>
            <h3 className="mt-6 text-lg font-bold">{title}</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
