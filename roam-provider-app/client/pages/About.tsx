import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  MapPin,
  Phone,
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
  Dumbbell,
  Leaf,
  Trophy,
  Zap,
} from "lucide-react";

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

function SectionWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`container py-12 md:py-20 ${className}`}>{children}</section>;
}

function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary to-secondary text-primary-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10" />
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Your Best Life. Everywhere</h1>
          <p className="mt-2 text-lg md:text-xl text-primary-foreground/90">
            Bringing Premium Wellness Services to the 30A Community
          </p>
          <p className="mt-6 text-primary-foreground/90">
            ROAM is more than a wellness platform—we're your partner in living your best life, right where you are. From
            the sugar-white beaches of 30A to your doorstep, we connect you with exceptional wellness professionals who
            share your commitment to health, balance, and vitality.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="bg-white text-foreground hover:bg-white/90">
              <Link to="/provider-portal">Become a Provider</Link>
            </Button>
            <Button asChild variant="secondary" className="bg-[#f88221] text-white hover:bg-[#f88221]/90">
              <Link to="/contact">Talk to Our Team</Link>
            </Button>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}

function AtAGlance() {
  const stats = [
    { label: "Wellness Services", value: "50+" },
    { label: "Verified Providers", value: "30+" },
    { label: "Happy Customers", value: "10,000+" },
    { label: "Region", value: "30A" },
  ];
  return (
    <SectionWrapper>
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-6 text-center shadow-sm">
            <div className="text-3xl font-extrabold tracking-tight">{s.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

function Story() {
  return (
    <SectionWrapper className="bg-secondary/10 rounded-3xl">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Our Story</h2>
        <p className="mt-2 text-muted-foreground text-lg">Born from the 30A Lifestyle</p>
        <div className="prose prose-neutral mt-6 max-w-none dark:prose-invert">
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
    </SectionWrapper>
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
    <SectionWrapper>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Our Mission</h2>
        <p className="mt-3 text-lg text-muted-foreground">
          To make wellness accessible, convenient, and trustworthy for everyone in the 30A community—empowering people to
          live their best lives, everywhere.
        </p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {values.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
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
    <SectionWrapper className="bg-secondary/10 rounded-3xl">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">What Makes ROAM Different</h2>
        <p className="mt-2 text-muted-foreground">More Than Just a Booking Platform</p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
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
    <SectionWrapper>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Serving the 30A Corridor</h2>
        <p className="mt-2 text-muted-foreground">From Inlet Beach to Dune Allen</p>
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Primary 30A Communities</h3>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {primary.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Extended Service Areas</h3>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {extended.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        </div>
      </div>
    </SectionWrapper>
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
    <SectionWrapper>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Explore Our Services</h2>
        <p className="mt-3 text-lg text-muted-foreground">
          Browse the full marketplace of wellness experiences—from medical care to beauty and fitness—designed for life on 30A.
        </p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {highlights.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-2xl border bg-card p-6 text-left shadow-sm">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <Button asChild variant="secondary" className="bg[#f88221] text-white hover:bg-[#f88221]/90">
          <Link to="/services">View All Services</Link>
        </Button>
      </div>
    </SectionWrapper>
  );
}

function Impact() {
  const stats = [
    { value: "15,000+", label: "Services Delivered", note: "Wellness experiences that enhanced lives" },
    { value: "30+", label: "Local Providers", note: "Small businesses we support and empower" },
    { value: "95%", label: "Customer Satisfaction", note: "Based on verified post-service reviews" },
    { value: "$2M+", label: "To Local Economy", note: "Supporting 30A wellness professionals" },
  ];
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary to secondary text-primary-foreground">
      <SectionWrapper>
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Our Impact</h2>
          <p className="mt-2 text-primary-foreground/90">Building a Healthier Community Together</p>
        </div>
        <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur">
              <div className="text-3xl font-extrabold">{s.value}</div>
              <div className="mt-1 text-sm">{s.label}</div>
              <div className="mt-1 text-xs text-primary-foreground/80">{s.note}</div>
            </div>
          ))}
        </div>
      </SectionWrapper>
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
    <SectionWrapper>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">What Our Community Says</h2>
      </div>
      <div className="mx-auto mt-8 grid max-w-5xl gap-6 md:grid-cols-3">
        {items.map((t, i) => (
          <blockquote key={i} className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground shadow-sm">
            <p>“{t.quote}”</p>
            <footer className="mt-3 font-medium text-foreground">— {t.author}</footer>
          </blockquote>
        ))}
      </div>
    </SectionWrapper>
  );
}

function ForProviders() {
  const benefits = [
    { title: "Increase Bookings", body: "Average providers see 2–3x more bookings within 90 days." },
    { title: "Get Paid Faster", body: "Automatic payments in 2 business days—no invoicing." },
    { title: "Reach More Customers", body: "Access thousands of locals and visitors seeking services." },
    { title: "Manage Your Schedule", body: "Control availability, pricing, and service areas." },
    { title: "Build Your Reputation", body: "Collect verified reviews and showcase expertise." },
    { title: "Dedicated Support", body: "Our local team helps you succeed at every step." },
  ];
  return (
    <SectionWrapper className="bg-secondary/10 rounded-3xl">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why Choose ROAM?</h2>
        <p className="mt-3 text-lg text-muted-foreground">
          For Providers, ROAM offers a comprehensive solution for growing your business and serving the 30A community.
        </p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map(({ title, body }) => (
          <div key={title} className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

function FinalCTA() {
  return (
    <SectionWrapper className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to Experience ROAM?</h2>
        <p className="mt-3 text-lg text-primary-foreground/90">
          Join our community of wellness enthusiasts and providers today.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="bg-white text-foreground hover:bg-white/90">
            <Link to="/provider-portal">Become a Provider</Link>
          </Button>
          <Button asChild variant="secondary" className="bg-[#f88221] text-white hover:bg-[#f88221]/90">
            <Link to="/contact">Talk to Our Team</Link>
          </Button>
        </div>
      </div>
    </SectionWrapper>
  );
}
