import {
  CheckCircle2,
  ShieldCheck,
  BarChart3,
  Users,
  Wallet,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export function ValueProps() {
  const items = [
    {
      title: "Keep What You Earn",
      body: "Zero commission. Customers pay the platform fee so you keep 100% of your service price.",
      icon: Wallet,
    },
    {
      title: "Serious Customers Only",
      body: "Every booking is prepaid. Fewer cancellations, more time doing what you love.",
      icon: CheckCircle2,
    },
    {
      title: "We Handle the Hard Stuff",
      body: "Marketing, payments, cancellations, and scheduling – handled. You focus on your craft.",
      icon: BarChart3,
    },
  ];

  return (
    <section id="benefits" className="container py-12 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Why Providers Choose ROAM
        </h2>
        <p className="mt-3 text-muted-foreground">
          Built for growth, fairness, and freedom.
        </p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ title, body, icon: Icon }) => (
          <div key={title} className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
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
      q: "Is there really no commission on my services?",
      a: "Yes. You keep 100% of your rate. Customers pay a separate platform fee to ROAM for convenience and security.",
    },
    {
      q: "When do I get paid?",
      a: "You set your payout schedule in Stripe Express. You can also choose an instant payout (minutes).",
    },
    {
      q: "Do I have to give customers my phone number?",
      a: "No. All communication happens via secure in-app messaging to protect your privacy.",
    },
    {
      q: "How can I become a service partner on ROAM?",
      a: "If you are a service provider interested in joining the ROAM Team, download the app and submit the requested information for review.",
    },
    {
      q: "What kind of support does ROAM offer?",
      a: (
        <span>
          Learn more about the resources ROAM offers {""}
          <a
            href="https://roamyourbestlife.com/wp-content/uploads/2024/06/Service-Partner-Resources.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            here
          </a>
          .
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
      q: "How do I contact customer support?",
      a: (
        <span>
          You can contact 24 hour customer support via the app or submit any
          inquiries or concerns you may have via {""}
          <a
            href="https://roamyourbestlife.com/providers/#link-popup"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            email here
          </a>
          .
        </span>
      ),
    },
    {
      q: "Can I receive a tip from clients?",
      a: "Yes, ROAM allows the clients to leave a tip after the session is completed via the app.",
    },
    {
      q: "Can I choose the services I offer on ROAM?",
      a: "Yes, ROAM provides a list of services supported on the app. As a service provider, you decide what service you wish to offer to your clients.",
    },
    {
      q: "Who sets the prices for services on ROAM?",
      a: "Our service providers set their own prices for the services they offer.",
    },
    {
      q: "How can I learn about ROAM's latest news and partner events?",
      a: (
        <span>
          Sign up for our {""}
          <a
            href="https://roamyourbestlife.com/providers/#link-newsletter"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            emails
          </a>{" "}
          and check our app and website regularly to stay in the loop on the
          latest news and events.
        </span>
      ),
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
