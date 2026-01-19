import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  MapPin,
  Mail,
  HeartHandshake,
  CheckCircle2,
  Smartphone,
  Home,
  CalendarCheck2,
  BadgeDollarSign,
  Users,
  Activity,
  Droplets,
  Sparkles,
  Leaf,
  Trophy,
  Zap,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { ServiceIconPattern } from "@/components/ServiceIconPattern";

export default function About() {
  return (
    <div className="bg-background">
      <Hero />
      <AtAGlance />
      <Story />
      <MissionValues />
      <Different />
      <ServiceArea />
      <ServicesPreview />
      <Impact />
      <Testimonials />
      <ForProviders />
      <FinalCTA />
    </div>
  );
}

function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-roam-blue to-roam-light-blue text-white min-h-[500px] md:min-h-[600px] flex items-center">
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
      
      <div className="container py-20 md:py-28 relative">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium mb-6">
            <HeartHandshake className="w-4 h-4" />
            About ROAM
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Your Best Life. Everywhere
          </h1>
          <p className="text-xl text-white/90 mb-4">
            Bringing Premium Wellness Services to the 30A Community
          </p>
          <p className="text-lg text-white/80 max-w-3xl mx-auto mb-8">
            ROAM is more than a wellness platform—we're your partner in living your best life, right where you are. From
            the sugar-white beaches of 30A to your doorstep, we connect you with exceptional wellness professionals who
            share your commitment to health, balance, and vitality.
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

function AtAGlance() {
  const stats = [
    { label: "Wellness Services", value: "50+", icon: Activity },
    { label: "Verified Providers", value: "30+", icon: Users },
    { label: "Happy Customers", value: "10,000+", icon: HeartHandshake },
    { label: "Region", value: "30A", icon: MapPin },
  ];
  
  return (
    <div className="container py-20">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div 
              key={s.label} 
              className="rounded-2xl border bg-card p-6 text-center shadow-lg card-hover"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-roam-blue to-roam-light-blue text-white mb-3 mx-auto">
                <Icon className="w-6 h-6" />
              </div>
              <div className="text-3xl font-extrabold tracking-tight gradient-text">{s.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function Story() {
  return (
    <div className="bg-gradient-to-b from-roam-light-blue/10 to-transparent py-20">
      <div className="container">
        <div className="max-w-4xl mx-auto bg-card rounded-3xl p-8 md:p-12 shadow-lg border">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Our Story</h2>
          <p className="text-lg text-muted-foreground mb-6">Born from the 30A Lifestyle</p>
          <div className="prose prose-neutral max-w-none dark:prose-invert space-y-4 text-foreground/80">
          <p>
            ROAM - Your Best Life. Everywhere was born from a simple observation: the 30A coastal lifestyle embodies
            wellness, balance, and living your best life. But finding and booking quality wellness services shouldn't be
            a challenge—it should be as effortless as a beach day.
          </p>
          <p>
            Founded in the heart of Florida's beautiful 30A region, ROAM was created to bridge the gap between busy
            lifestyles and essential self-care. We saw locals and visitors alike struggling to find reliable massage
            therapists, IV therapy providers, personal trainers, and beauty professionals. Booking appointments meant
            endless phone calls, uncertain availability, and no way to read reviews or compare services.
          </p>
          <p>We knew there had to be a better way.</p>
          <p>
            <strong>ROAM 30A LLC</strong> was founded with a clear mission: make wellness accessible, convenient, and
            trustworthy. We built a platform where customers can discover, book, and enjoy premium wellness services with
            just a few taps—whether you're at home, on vacation, or anywhere along the beautiful 30A corridor.
          </p>
          <p>
            Today, ROAM connects verified wellness professionals—from licensed physicians to certified massage
            therapists, IV therapy specialists to professional beauty experts—with thousands of customers throughout the
            30A region, making it easier than ever to prioritize your wellbeing without sacrificing convenience.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

function MissionValues() {
  const values = [
    {
      icon: HeartHandshake,
      title: "Wellness First",
      body: "Every service—from IV hydration to restorative yoga—enhances physical, mental, and emotional wellbeing.",
    },
    {
      icon: ShieldCheck,
      title: "Trust & Safety",
      body: "Background checks, license verification, and insurance confirmation for every provider.",
    },
    {
      icon: Users,
      title: "Community Focused",
      body: "We support local wellness professionals and the 30A community we call home.",
    },
    {
      icon: Zap,
      title: "Effortless Convenience",
      body: "Book in seconds, enjoy mobile, in-studio, or virtual service—wellness that fits your life.",
    },
    {
      icon: Trophy,
      title: "Excellence Always",
      body: "Highest standards for every provider and every customer experience—quality is non‑negotiable.",
    },
    {
      icon: Leaf,
      title: "Sustainable Growth",
      body: "We grow responsibly, supporting provider success while keeping a personal, local touch.",
    },
  ];
  
  return (
    <div className="container py-20">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 gradient-text">Our Mission</h2>
        <p className="text-lg text-muted-foreground">
          To make wellness accessible, convenient, and trustworthy for everyone in the 30A community—empowering people to
          live their best lives, everywhere.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        {values.map(({ icon: Icon, title, body }, idx) => (
          <div 
            key={title} 
            className="rounded-2xl border bg-card p-6 shadow-lg card-hover"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-roam-blue to-roam-light-blue text-white">
              <Icon className="w-6 h-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Different() {
  const items = [
    { icon: MapPin, title: "Truly Local", body: "Headquartered in the 30A region—we understand our community's needs." },
    { icon: CheckCircle2, title: "Verified Professionals", body: "Rigorous background checks, license verification, and insurance confirmation." },
    { icon: Smartphone, title: "Mobile‑First Experience", body: "Book in under 60 seconds. Manage everything from one beautiful app." },
    { icon: Home, title: "Service Your Way", body: "Mobile, in‑studio, or virtual—wellness that adapts to your lifestyle." },
    { icon: CalendarCheck2, title: "Flexible Scheduling", body: "Reschedule anytime with the same provider—no fees, no penalties." },
    { icon: BadgeDollarSign, title: "Transparent Pricing", body: "No hidden fees. See the total upfront, including our 12% service fee." },
  ];
  
  return (
    <div className="bg-gradient-to-b from-roam-light-blue/10 to-transparent py-20">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">What Makes ROAM Different</h2>
          <p className="text-muted-foreground">More Than Just a Booking Platform</p>
      </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {items.map(({ icon: Icon, title, body }, idx) => (
            <div 
              key={title} 
              className="rounded-2xl border bg-card p-6 shadow-lg card-hover"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-roam-blue to-roam-light-blue text-white">
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

function ServiceArea() {
  const primary = [
    "Inlet Beach",
    "Rosemary Beach",
    "Alys Beach",
    "Seacrest Beach",
    "Watersound",
    "Seagrove Beach",
    "Seaside",
    "WaterColor",
    "Grayton Beach",
    "Blue Mountain Beach",
    "Santa Rosa Beach",
    "Dune Allen Beach",
  ];
  const extended = ["Destin", "Miramar Beach", "Sandestin", "South Walton", "Panama City Beach (select areas)"];
  
  return (
    <div className="container py-20">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 gradient-text">Serving the 30A Corridor</h2>
        <p className="text-muted-foreground">From Inlet Beach to Dune Allen</p>
      </div>
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div className="rounded-2xl border bg-card p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-roam-blue to-roam-light-blue flex items-center justify-center text-white">
              <MapPin className="w-5 h-5" />
            </div>
          <h3 className="text-lg font-semibold">Primary 30A Communities</h3>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
            {primary.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-roam-blue flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-roam-blue to-roam-light-blue flex items-center justify-center text-white">
              <MapPin className="w-5 h-5" />
            </div>
          <h3 className="text-lg font-semibold">Extended Service Areas</h3>
          </div>
          <ul className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
            {extended.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-roam-blue flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ServicesPreview() {
  const highlights = [
    {
      icon: Activity,
      title: "Massage & Bodywork",
      description:
        "On-demand Swedish, deep tissue, and recovery services brought to your home, rental, or studio of choice.",
    },
    {
      icon: Droplets,
      title: "IV Therapy & Recovery",
      description: "Licensed medical teams deliver hydration, immunity, and performance drips tailored to your goals.",
    },
    {
      icon: Sparkles,
      title: "Beauty & Aesthetics",
      description:
        "Professional stylists and aesthetic experts keep you camera-ready for every celebration and event.",
    },
  ];

  return (
    <div className="container py-20">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 gradient-text">Explore Our Services</h2>
        <p className="text-lg text-muted-foreground">
          Browse the full marketplace of wellness experiences—from medical care to beauty and fitness—designed for life on 30A.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
        {highlights.map(({ icon: Icon, title, description }, idx) => (
          <div 
            key={title} 
            className="rounded-2xl border bg-card p-6 shadow-lg text-center card-hover"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-roam-blue to-roam-light-blue text-white mb-4 mx-auto">
              <Icon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <Button asChild size="lg" className="bg-roam-blue text-white hover:bg-roam-blue/90 button-shine">
          <Link to="/services">View All Services</Link>
        </Button>
      </div>
    </div>
  );
}

function Impact() {
  const stats = [
    { value: "15,000+", label: "Services Delivered", note: "Wellness experiences that enhanced lives", icon: Activity },
    { value: "30+", label: "Local Providers", note: "Small businesses we support and empower", icon: Users },
    { value: "95%", label: "Customer Satisfaction", note: "Based on verified post-service reviews", icon: HeartHandshake },
    { value: "$2M+", label: "To Local Economy", note: "Supporting 30A wellness professionals", icon: DollarSign },
  ];
  
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-roam-blue to-roam-light-blue text-white py-20">
      {/* Service icon pattern overlay */}
      <ServiceIconPattern />
      
      <div className="container relative">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Our Impact</h2>
          <p className="text-white/90">Building a Healthier Community Together</p>
        </div>
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div 
                key={s.label} 
                className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur p-6 text-center hover:bg-white/20 transition-all"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-white mb-3 mx-auto">
                  <Icon className="w-5 h-5" />
                </div>
              <div className="text-3xl font-extrabold">{s.value}</div>
              <div className="mt-1 text-sm">{s.label}</div>
                <div className="mt-1 text-xs text-white/80">{s.note}</div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Testimonials() {
  const items = [
    {
      quote:
        "ROAM has transformed how I manage my wellness routine. I can book IV therapy during lunch and have a nurse at my vacation rental within hours. It's incredible.",
      author: "Sarah M., Seaside, FL",
    },
    {
      quote:
        "As a provider, ROAM has doubled my massage therapy bookings while letting me focus on what I do best—helping people feel their best. The platform handles everything else.",
      author: "Michael T., Licensed Massage Therapist, Rosemary Beach, FL",
    },
    {
      quote:
        "We vacation in 30A twice a year, and ROAM makes it so easy to maintain our wellness routine while we're here. IV therapy, personal trainers, yoga instructors—all vetted and professional.",
      author: "Jennifer & David K., WaterColor, FL",
    },
  ];
  
  return (
    <div className="container py-20">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight gradient-text">What Our Community Says</h2>
      </div>
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
        {items.map((t, idx) => (
          <blockquote 
            key={idx} 
            className="rounded-2xl border bg-card p-6 shadow-lg card-hover"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="text-roam-blue mb-2">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
              </svg>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t.quote}</p>
            <footer className="font-medium text-foreground">— {t.author}</footer>
          </blockquote>
        ))}
      </div>
    </div>
  );
}

function ForProviders() {
  const benefits = [
    { icon: TrendingUp, title: "Increase Bookings", body: "Average providers see 2–3x more bookings within 90 days." },
    { icon: DollarSign, title: "Get Paid Faster", body: "Automatic payments in 2 business days—no invoicing." },
    { icon: Users, title: "Reach More Customers", body: "Access thousands of locals and visitors seeking services." },
    { icon: CalendarCheck2, title: "Manage Your Schedule", body: "Control availability, pricing, and service areas." },
    { icon: Trophy, title: "Build Your Reputation", body: "Collect verified reviews and showcase expertise." },
    { icon: HeartHandshake, title: "Dedicated Support", body: "Our local team helps you succeed at every step." },
  ];
  
  return (
    <div className="bg-gradient-to-b from-roam-light-blue/10 to-transparent py-20">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 gradient-text">Why Choose ROAM?</h2>
          <p className="text-lg text-muted-foreground">
          For Providers, ROAM offers a comprehensive solution for growing your business and serving the 30A community.
        </p>
      </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {benefits.map(({ icon: Icon, title, body }, idx) => (
            <div 
              key={title} 
              className="rounded-2xl border bg-card p-6 shadow-lg card-hover"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-roam-blue to-roam-light-blue text-white">
                <Icon className="w-6 h-6" />
              </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
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
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
            Ready to Experience ROAM?
          </h2>
          <p className="text-lg text-white/90 mb-8">
          Join our community of wellness enthusiasts and providers today.
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
