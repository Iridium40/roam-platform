import {
  CheckCircle2,
  ShieldCheck,
  BarChart3,
  Users,
  Wallet,
  TrendingUp,
  Calendar,
  DollarSign,
  Sparkles,
  MapPin,
  Heart,
  Briefcase,
  Clock,
  Target,
  Zap,
  Building2,
  Car,
  Store,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export function ProviderTypes() {
  const locationBased = {
    title: "Have a Salon, Spa, or Studio?",
    subtitle: "Travelers discover and book at your location",
    icon: Store,
    benefits: [
      "New clients find you through ROAM",
      "Travelers book appointments at your location",
      "Fill slow days with vacation visitors",
      "No marketing effort required",
    ],
    example: {
      quote: "Tourists book blowouts at my salon before dinner reservations. ROAM brings me clients I'd never reach otherwise.",
      type: "Salon Owner",
    },
  };

  const mobileBased = {
    title: "Offer Mobile Services?",
    subtitle: "Go to clients at vacation rentals, homes, and events",
    icon: Car,
    benefits: [
      "Serve clients at vacation rentals & beach houses",
      "Bridal parties, corporate retreats, special events",
      "Premium rates for convenience",
      "Flexible schedule — you choose when and where",
    ],
    example: {
      quote: "I bring massage therapy to vacation homes along 30A. Travelers pay premium rates and tip generously.",
      type: "Mobile Therapist",
    },
  };

  return (
    <section className="container py-12 md:py-20">
      <div className="mx-auto max-w-3xl text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Two Ways to Grow with ROAM
        </h2>
        <p className="mt-3 text-muted-foreground">
          Whether clients come to you or you go to them — ROAM connects you with premium travelers visiting the Emerald Coast.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
        {[locationBased, mobileBased].map((type) => {
          const Icon = type.icon;
          return (
            <div
              key={type.title}
              className="rounded-2xl border-2 border-primary/20 bg-card p-6 shadow-lg hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{type.title}</h3>
                  <p className="text-sm text-muted-foreground">{type.subtitle}</p>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {type.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="p-4 rounded-xl bg-secondary/50 border">
                <p className="text-sm italic text-muted-foreground">"{type.example.quote}"</p>
                <p className="text-xs font-medium text-primary mt-2">— {type.example.type}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-roam-yellow/20 px-4 py-2 text-sm font-medium text-roam-blue">
          <Building2 className="h-4 w-4" />
          Many providers do BOTH — offer services at their location AND go mobile
        </div>
      </div>
    </section>
  );
}

export function ClientTypes() {
  const clientTypes = [
    {
      title: "Salon Seekers",
      description: "Travelers wanting a blowout, cut, or color before dinner or events",
      icon: "💇",
      avgBooking: "$85+",
      type: "location",
    },
    {
      title: "Vacation Rentals",
      description: "Guests at beach houses, condos, and Airbnbs looking for in-room services",
      icon: "🏖️",
      avgBooking: "$150+",
      type: "mobile",
    },
    {
      title: "Spa Day Visitors",
      description: "Tourists booking facials, massages, and treatments at your spa",
      icon: "🧖",
      avgBooking: "$120+",
      type: "location",
    },
    {
      title: "Bridal Parties",
      description: "Bachelorettes, wedding prep — at your studio or their rental",
      icon: "💍",
      avgBooking: "$300+",
      type: "both",
    },
    {
      title: "Luxury Travelers",
      description: "High-net-worth visitors who expect premium service",
      icon: "✨",
      avgBooking: "$200+",
      type: "both",
    },
    {
      title: "Corporate Retreats",
      description: "Team wellness events at your location or theirs",
      icon: "🏢",
      avgBooking: "$500+",
      type: "both",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-secondary/20 to-background">
      <div className="container py-12 md:py-20">
        <div className="mx-auto max-w-3xl text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your Premium Client Pipeline
          </h2>
          <p className="mt-3 text-muted-foreground">
            ROAM isn't just a booking app — it's your connection to the Emerald Coast's most valuable clientele. These are the clients actively searching for your services.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {clientTypes.map(({ title, description, icon, avgBooking, type }) => (
            <div
              key={title}
              className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow relative"
            >
              <div className="absolute top-3 right-3">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  type === "location" 
                    ? "bg-blue-100 text-blue-700" 
                    : type === "mobile" 
                    ? "bg-green-100 text-green-700"
                    : "bg-purple-100 text-purple-700"
                }`}>
                  {type === "location" ? "At Your Location" : type === "mobile" ? "Mobile" : "Both"}
                </span>
              </div>
              <div className="text-4xl mb-4">{icon}</div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs text-muted-foreground">Avg. booking value</div>
                <div className="text-lg font-bold text-primary">{avgBooking}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 max-w-2xl mx-auto text-center p-6 rounded-2xl bg-primary/5 border border-primary/20">
          <p className="text-lg font-medium text-foreground">
            "ROAM is a <strong>Destination Concierge Client Pipeline</strong> — connecting travelers with local businesses and mobile providers."
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            We market to travelers before they arrive, so they're ready to book — at your location or theirs.
          </p>
        </div>
      </div>
    </section>
  );
}

export function PerfectFor() {
  const idealFor = [
    {
      icon: Store,
      text: "Have a salon, spa, or studio",
      description: "Get discovered by travelers looking for local services",
    },
    {
      icon: MapPin,
      text: "Offer mobile services",
      description: "Serve clients at vacation rentals, homes, and events",
    },
    {
      icon: Calendar,
      text: "Have gaps in your schedule",
      description: "Fill slow days with high-paying vacation clients",
    },
    {
      icon: Heart,
      text: "Work weddings or tourism markets",
      description: "Bridal parties, bachelorettes, and special events",
    },
    {
      icon: DollarSign,
      text: "Want premium clientele",
      description: "Travelers who value quality over price",
    },
    {
      icon: Briefcase,
      text: "Hate marketing yourself",
      description: "We handle client acquisition so you can focus on your craft",
    },
  ];

  return (
    <section className="container py-12 md:py-20">
      <div className="mx-auto max-w-3xl text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Is ROAM Right for You?
        </h2>
        <p className="mt-3 text-muted-foreground">
          ROAM is perfect for wellness professionals who...
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {idealFor.map(({ icon: Icon, text, description }) => (
          <div
            key={text}
            className="flex gap-4 p-5 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all"
          >
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div>
              <div className="font-semibold text-foreground">{text}</div>
              <div className="text-sm text-muted-foreground mt-1">{description}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-10 text-center">
        <p className="text-muted-foreground mb-4">
          If you checked 2 or more, ROAM was built for you.
        </p>
        <a
          href="/provider-portal"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          See If You Qualify →
        </a>
      </div>
    </section>
  );
}

export function FoundingProvider() {
  const benefits = [
    {
      icon: TrendingUp,
      title: "Priority Listing Placement",
      description: "Appear at the top of search results in your service category",
    },
    {
      icon: Sparkles,
      title: "Featured Provider Badge",
      description: "Stand out with a verified founding provider badge on your profile",
    },
    {
      icon: Target,
      title: "Marketing Spotlight",
      description: "Get featured in our email campaigns and social media",
    },
    {
      icon: MapPin,
      title: "Area Priority",
      description: "First access to new service areas as we expand",
    },
  ];

  const openings = [
    { category: "Salons & Hair Studios", spots: 4, area: "Destin", type: "location" },
    { category: "Day Spas & Med Spas", spots: 3, area: "30A Corridor", type: "location" },
    { category: "Mobile Massage Therapists", spots: 5, area: "Emerald Coast", type: "mobile" },
    { category: "Hair & Makeup Artists", spots: 3, area: "30A Corridor", type: "both" },
    { category: "IV Therapy Providers", spots: 4, area: "Panama City Beach", type: "mobile" },
    { category: "Personal Trainers", spots: 6, area: "Santa Rosa Beach", type: "both" },
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-roam-yellow/10 via-transparent to-primary/10" />
      <div className="container py-12 md:py-20 relative">
        <div className="mx-auto max-w-3xl text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-roam-yellow/20 px-4 py-1.5 text-sm font-bold text-roam-blue mb-4">
            <Zap className="h-4 w-4" />
            Limited Time Opportunity
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Founding Provider Program
          </h2>
          <p className="mt-3 text-muted-foreground">
            Join now and lock in exclusive benefits as one of our founding providers. These perks are only available to early adopters.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
          {/* Benefits */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">Founding Provider Benefits:</h3>
            {benefits.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4 p-4 rounded-xl border bg-card">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{title}</div>
                  <div className="text-sm text-muted-foreground">{description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Openings */}
          <div className="rounded-2xl border-2 border-primary/20 bg-card p-6 shadow-lg">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Current Openings
            </h3>
            <div className="space-y-3">
              {openings.map((o) => (
                <div
                  key={o.category}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      {o.category}
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                        o.type === "location" 
                          ? "bg-blue-100 text-blue-700" 
                          : o.type === "mobile" 
                          ? "bg-green-100 text-green-700"
                          : "bg-purple-100 text-purple-700"
                      }`}>
                        {o.type === "location" ? "Location" : o.type === "mobile" ? "Mobile" : "Both"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{o.area}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">{o.spots} spots</div>
                    <div className="text-xs text-muted-foreground">remaining</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 rounded-lg bg-roam-yellow/10 border border-roam-yellow/30">
              <p className="text-sm text-center">
                <strong>Don't see your category?</strong> Apply anyway — we're always expanding.
              </p>
            </div>
            <a
              href="/provider-portal"
              className="mt-4 block w-full text-center bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Claim Your Founding Spot →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProviderTestimonials() {
  const testimonials = [
    {
      quote: "Travelers book appointments at my salon through ROAM before their beach vacations. I've added 25+ new clients this season without any marketing.",
      author: "Jennifer R.",
      role: "Salon Owner",
      location: "Destin",
      metric: "25+ new clients",
      type: "location",
    },
    {
      quote: "I bring massage therapy to vacation rentals along 30A. The clients are amazing — travelers who appreciate quality and tip generously.",
      author: "Michael T.",
      role: "Mobile Massage Therapist",
      location: "30A",
      metric: "40% higher tips",
      type: "mobile",
    },
    {
      quote: "Bridal parties book at my studio AND I go to their rentals. ROAM gives me both options and the clients are premium.",
      author: "Sarah L.",
      role: "Hair & Makeup Artist",
      location: "Santa Rosa Beach",
      metric: "$2,400/mo from bridal",
      type: "both",
    },
  ];

  return (
    <section className="container py-12 md:py-16">
      <div className="mx-auto max-w-3xl text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Providers Are Winning on ROAM
        </h2>
        <p className="mt-2 text-muted-foreground">
          Real results from real providers in your area
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
        {testimonials.map((t, idx) => (
          <div
            key={idx}
            className="rounded-2xl border bg-card p-6 shadow-sm relative"
          >
            <div className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
              {t.metric}
            </div>
            <div className="text-primary mb-3">
              <svg className="w-8 h-8 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
              </svg>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t.quote}</p>
            <div className="border-t pt-4">
              <div className="font-semibold text-foreground">{t.author}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-primary">{t.location}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  t.type === "location" 
                    ? "bg-blue-100 text-blue-700" 
                    : t.type === "mobile" 
                    ? "bg-green-100 text-green-700"
                    : "bg-purple-100 text-purple-700"
                }`}>
                  {t.type === "location" ? "Location" : t.type === "mobile" ? "Mobile" : "Both"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ActivityProof() {
  const stats = [
    {
      value: "500+",
      label: "Bookings This Month",
      sublabel: "And growing weekly",
      icon: Calendar,
    },
    {
      value: "$127",
      label: "Avg. Booking Value",
      sublabel: "Premium clientele",
      icon: DollarSign,
    },
    {
      value: "45+",
      label: "Providers Joined",
      sublabel: "This quarter",
      icon: Users,
    },
    {
      value: "24hrs",
      label: "Avg. First Booking",
      sublabel: "After going live",
      icon: Clock,
    },
  ];

  return (
    <section className="border-y bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
      <div className="container py-8">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live Platform Activity
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 w-full max-w-4xl">
            {stats.map(({ value, label, sublabel, icon: Icon }) => (
              <div key={label} className="text-center">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-foreground">{value}</div>
                <div className="text-sm font-medium text-foreground/80">{label}</div>
                <div className="text-xs text-muted-foreground">{sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ValueProps() {
  const items = [
    {
      title: "New Clients Find You — At Your Location or Theirs",
      body: "Travelers discover your salon, spa, or mobile services through ROAM. Whether they come to you or you go to them, you get booked.",
      icon: Target,
      highlight: "Zero marketing",
    },
    {
      title: "Premium Clients Who Value Quality",
      body: "Vacation travelers don't price shop. They're prepaid, pre-vetted, and ready to tip well for great service.",
      icon: DollarSign,
      highlight: "Higher tips",
    },
    {
      title: "Keep 100% of What You Charge",
      body: "Zero commission on your services. Customers pay a platform fee — you keep every dollar you earn.",
      icon: TrendingUp,
      highlight: "Keep 100%",
    },
  ];

  return (
    <section id="benefits" className="container py-12 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Why Providers Are Growing with ROAM
        </h2>
        <p className="mt-3 text-muted-foreground">
          Stop chasing clients. Let travelers find you.
        </p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ title, body, icon: Icon, highlight }) => (
          <div key={title} className="rounded-2xl border bg-card p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-roam-yellow text-roam-blue text-xs font-bold px-3 py-1 rounded-bl-lg">
              {highlight}
            </div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold leading-tight">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    {
      title: "Sign Up in Minutes",
      body: "Create your profile, set your prices and availability. Background check in 48 hours.",
      icon: Users,
    },
    {
      title: "Get Discovered",
      body: "We market to customers in your area. Your profile appears in search and listings.",
      icon: BarChart3,
    },
    {
      title: "Accept Bookings",
      body: "Instant notifications for prepaid bookings. Message customers in-app.",
      icon: ShieldCheck,
    },
    {
      title: "Get Paid Fast",
      body: "Weekly direct deposits with a clear earnings dashboard.",
      icon: Wallet,
    },
  ];

  return (
    <section
      id="how-it-works"
      className="bg-gradient-to-b from-background to-secondary/20"
    >
      <div className="container py-12 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From Sign-Up to Payday in 4 Steps
          </h2>
          <p className="mt-3 text-muted-foreground">
            No commission. No hassle.
          </p>
        </div>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ title, body, icon: Icon }, i) => (
            <li
              key={title}
              className="relative rounded-2xl border bg-card p-6 shadow-sm"
            >
              <div className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                {i + 1}
              </div>
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Comparison() {
  const rows = [
    {
      label: "Customer Pays",
      roam: "$120 (includes 20% ROAM service fee)",
      a: "$100",
      b: "$100",
    },
    {
      label: "Commission",
      roam: "$0 (20% paid by customer)",
      a: "-$30 (30%)",
      b: "-$20 (20%)",
    },
    { label: "You Receive", roam: "$100", a: "$70", b: "$80" },
  ];
  const color = (chartKey: "roam" | "a" | "b", idx: number) => {
    // Keep provider slice consistent (primary) across all charts.
    if (idx === 0) return "hsl(var(--primary))"; // Provider (You)
    // Second slice varies by scenario to convey meaning using site palette
    switch (chartKey) {
      case "roam":
        return "hsl(var(--accent))"; // ROAM service fee (paid by customer)
      case "a":
        return "hsl(var(--destructive))"; // 30% commission (bad)
      case "b":
        return "hsl(var(--destructive))"; // 20% commission (same red as Other A)
      default:
        return "hsl(var(--secondary))";
    }
  };

  const chartData = {
    roam: [
      { name: "Provider (You)", value: 100 },
      { name: "ROAM Service Fee (Customer pays)", value: 20 },
    ],
    a: [
      { name: "Provider (You)", value: 70 },
      { name: "Platform Commission", value: 30 },
    ],
    b: [
      { name: "Provider (You)", value: 80 },
      { name: "Platform Commission", value: 20 },
    ],
  } as const;

  return (
    <section className="container py-12 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          The Math That Makes Sense
        </h2>
        <p className="mt-3 text-muted-foreground">
          Other platforms take 20–30% from <strong>your</strong> earnings. With ROAM, <strong>customers</strong> pay the platform fee—you keep every dollar you charge.
        </p>
      </div>

      {/* Charts */}
      <div className="mx-auto mt-8 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            key: "roam",
            title: "ROAM (Customer pays $120)",
            data: chartData.roam,
          },
          {
            key: "a",
            title: "Other A (Customer pays $100)",
            data: chartData.a,
          },
          {
            key: "b",
            title: "Other B (Customer pays $100)",
            data: chartData.b,
          },
        ].map(({ key, title, data }) => (
          <div key={key} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-2 text-sm font-medium text-center">{title}</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip formatter={(v: number) => [`$${v}`, "Amount"]} />
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {data.map((_, i) => (
                      <Cell
                        key={i}
                        fill={color(key as "roam" | "a" | "b", i)}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {data.map((d, i) => (
                <li key={d.name} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: color(key as "roam" | "a" | "b", i) }}
                  />
                  {d.name}:{" "}
                  <span className="tabular-nums font-medium text-foreground">
                    ${d.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Clear statements */}
      <div className="mx-auto mt-6 max-w-5xl grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border-2 border-primary/30 bg-card p-4 shadow-sm">
          <div className="font-semibold text-primary">ROAM</div>
          <p className="mt-2 text-sm text-muted-foreground">
            You charge <span className="font-medium text-foreground">$100</span>{" "}
            → You keep{" "}
            <span className="font-medium text-primary">$100</span>.<br />
            Customer pays your rate + platform fee for the convenience of one-stop booking.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="font-semibold text-destructive">Other A (30% commission)</div>
          <p className="mt-2 text-sm text-muted-foreground">
            You charge <span className="font-medium text-foreground">$100</span>{" "}
            → You only get{" "}
            <span className="font-medium text-destructive">$70</span>.<br />
            Platform takes <span className="font-medium text-destructive">$30</span> from your earnings.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="font-semibold text-destructive">Other B (20% commission)</div>
          <p className="mt-2 text-sm text-muted-foreground">
            You charge <span className="font-medium text-foreground">$100</span>{" "}
            → You only get{" "}
            <span className="font-medium text-destructive">$80</span>.<br />
            Platform takes <span className="font-medium text-destructive">$20</span> from your earnings.
          </p>
        </div>
      </div>
    </section>
  );
}

export function FAQ() {
  const items = [
    {
      q: "How do I get paid?",
      a: "Payments are automatically transferred to your linked bank account once a week (Default Day is Thursday). You may go to the Financials page and click the Stripe Dashboard to change your day of the week in which you get paid. No invoicing required!",
    },
    {
      q: "What does ROAM charge?",
      a: "ROAM charges a 20% platform fee on each booking. This covers payment processing, marketing, customer support, and all platform features.",
    },
    {
      q: "Can I set my own prices?",
      a: "Yes! You have complete control over your service pricing fees. We don't list travel fees and it is expected that they are included into your service fees. You may update your service fees at anytime in your dashboard under business settings.",
    },
    {
      q: "How do I handle cancellations?",
      a: "Our straightforward cancellation policy is easy to understand for both providers and customers. Cancellations made more than 24 hours in advance receive a 100% refund of service fees (platform fees are not refunded). Cancellations within 24 hours receive no refund to the customer. Providers will be paid out for bookings that were canceled at a delayed date of 60 days due to banking regulations.",
    },
    {
      q: "Do I need insurance?",
      a: "Yes, all providers must maintain current liability insurance and provide proof during onboarding. This protects you, your customers, and the ROAM platform.",
    },
    {
      q: "How does scheduling work?",
      a: "You control your availability through the provider dashboard. Customers can only book days and times you've marked as available, and you can accept or decline any booking request.",
    },
    {
      q: "Is there really no commission on my services?",
      a: "Yes. You keep 100% of your service fees. Customers pay a separate platform fee to ROAM for convenience and security.",
    },
    {
      q: "Do I have to give customers my phone number?",
      a: "No, you are not required to provide your phone number or email to a customer. All communication may happen via our secure in-app messaging to protect your privacy.",
    },
    {
      q: "How can I become a service partner on ROAM?",
      a: (
        <span>
          If you are a service provider interested in joining the ROAM Team, go to{" "}
          <a
            href="https://roamprovider.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            roamprovider.com
          </a>
        </span>
      ),
    },
    {
      q: "Why does ROAM ask for specific information when applying to become a service partner?",
      a: "ROAM requires the information necessary to verify identity and vet the certifications and qualifications to deliver the services that our members expect and deserve.",
    },
    {
      q: "Why does ROAM control the services that are listed?",
      a: "ROAM provides a convenient and transparent connection to preferred services and providers to its members. Service sectors are offered based on demand and ROAM tracks and identifies the demand in our service areas. We want providers to have easy access to members and vice versa, so controlling the services offered ensures a more streamlined connection.",
    },
    {
      q: "How do I contact provider support?",
      a: (
        <span>
          You can contact provider support by email at:{" "}
          <a
            href="mailto:providersupport@roamyourbestlife.com"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            providersupport@roamyourbestlife.com
          </a>
        </span>
      ),
    },
    {
      q: "Can I receive a tip from clients?",
      a: "Yes, ROAM allows the clients to leave a tip after the session is completed via the app.",
    },
    {
      q: "What if a client requests more services during the booking?",
      a: "ROAM allows service providers to add to the client's balance to receive additional funds at anytime prior to completion of the booking.",
    },
    {
      q: "Can I choose the services I offer on ROAM?",
      a: (
        <span>
          Yes, ROAM provides a list of services supported on the app. As a service provider, you decide what service you wish to offer to your clients. If the service you wish to provide is not listed then request it by sending an email to:{" "}
          <a
            href="mailto:providersupport@roamyourbestlife.com"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            providersupport@roamyourbestlife.com
          </a>
        </span>
      ),
    },
    {
      q: "Who sets the prices for services on ROAM?",
      a: "Our service providers set their own prices for the services they offer.",
    },
  ];
  return (
    <section id="faq" className="container py-12 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Questions? We've Got Answers.
        </h2>
      </div>
      <div className="mx-auto mt-8 max-w-3xl divide-y rounded-xl border">
        {items.map(({ q, a }) => (
          <details key={q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-medium">
              {q}
              <span className="text-muted-foreground group-open:rotate-180 transition">
                ▾
              </span>
            </summary>
            <div className="px-6 pb-6 text-muted-foreground">{a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
