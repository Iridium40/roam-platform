import { ShieldCheck, Star, CreditCard, Lock } from "lucide-react";

export default function TrustSafety() {
  const items = [
    {
      icon: <ShieldCheck className="text-primary" />,
      title: "🛡️ Verified Professionals",
      subtitle: "Every Provider Background-Checked",
      bullets: [
        "Comprehensive background screening",
        "License and certification verification",
        "Insurance coverage confirmed",
        "Ongoing quality monitoring",
      ],
    },
    {
      icon: <Star className="text-secondary" />,
      title: "⭐ Real Reviews, Real Results",
      subtitle: "Rated by Real Customers",
      bullets: [
        "Verified booking reviews only",
        "Transparent rating system",
        "Photo evidence from sessions",
        "Provider response to feedback",
      ],
    },
    {
      icon: <CreditCard className="text-accent" />,
      title: "💳 Secure Payments",
      subtitle: "Protected Transactions",
      bullets: [
        "Stripe-powered payment processing",
        "No upfront sharing of card details",
        "Automatic receipt generation",
        "Refund protection for cancellations",
      ],
    },
    {
      icon: <Lock className="text-primary" />,
      title: "🔒 Privacy Protected",
      subtitle: "Your Information, Safe",
      bullets: [
        "In-app messaging (no phone sharing)",
        "Encrypted personal data",
        "Controlled information access",
        "GDPR & privacy compliant",
      ],
    },
  ];
  return (
    <section className="container mx-auto py-16 lg:py-24">
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center">Your Safety is Our Priority</h2>
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {items.map((item) => (
          <div key={item.title} className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              {item.icon}
              <h3 className="text-lg font-semibold">{item.title}</h3>
            </div>
            <p className="mt-2 text-sm text-foreground/80">{item.subtitle}</p>
            <ul className="mt-3 text-sm list-disc pl-5 space-y-1 text-foreground/80">
              {item.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
