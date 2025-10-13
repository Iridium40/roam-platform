export default function SocialProof() {
  const testimonials = [
    {
      quote:
        "Best vacation decision ever! Had a massage on our beachfront balcony while watching the sunset. The booking was instant, pricing was clear, and the therapist was incredibly professional.",
      name: "Sarah M.",
      meta: "Vacationing in Destin",
      tag: "⭐⭐⭐⭐⭐ Massage Therapy",
    },
    {
      quote:
        "As a busy mom, having my personal trainer come to my home is a game-changer. No gym commute, no childcare stress, just effective workouts on my schedule. ROAM made it so easy.",
      name: "Jennifer L.",
      meta: "Tampa Resident",
      tag: "⭐⭐⭐⭐⭐ Personal Training",
    },
    {
      quote:
        "I travel to Miami for work monthly. Being able to book a massage therapist to my hotel with clear pricing and secure communication is exactly what I needed. No awkward phone calls, just professional service.",
      name: "David K.",
      meta: "Business Traveler",
      tag: "⭐⭐⭐⭐⭐ Mobile Massage",
    },
    {
      quote:
        "I love that I can message my provider through the app without giving out my phone number. Book, coordinate, and pay all in one place - my privacy stays intact.",
      name: "Amanda R.",
      meta: "Clearwater",
      tag: "⭐⭐⭐⭐⭐ Beauty Services",
    },
  ];
  return (
    <section className="container mx-auto py-16 lg:py-24">
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center">Join Our Many Happy Customers</h2>
      <div className="mt-10 flex gap-6 overflow-x-auto pb-2 snap-x snap-mandatory">
        {testimonials.map((t) => (
          <figure
            key={t.name}
            className="snap-center min-w-[300px] max-w-md shrink-0 rounded-xl border bg-card p-6 shadow-sm"
          >
            <blockquote className="text-sm text-foreground/80">“{t.quote}”</blockquote>
            <figcaption className="mt-4 text-sm font-medium">{t.name} — {t.meta}</figcaption>
            <div className="text-xs text-foreground/70">{t.tag}</div>
          </figure>
        ))}
      </div>
    </section>
  );
}
