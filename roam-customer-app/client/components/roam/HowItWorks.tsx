export default function HowItWorks() {
  return (
    <section className="container mx-auto py-16 lg:py-24">
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center">Book Wellness in 3 Simple Steps</h2>
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Step 1: Browse &amp; Choose</h3>
          <p className="mt-2 text-sm text-foreground/70">🔍 Discover Your Perfect Match</p>
          <ul className="mt-3 text-sm list-disc pl-5 space-y-1 text-foreground/80">
            <li>Search 400+ services across 4 categories</li>
            <li>Filter by location, price, and availability</li>
            <li>Read verified reviews from real customers</li>
            <li>View transparent pricing before you book</li>
          </ul>
          <p className="mt-3 text-sm text-foreground/70">No surprises. Ever.</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Step 2: Book with Confidence</h3>
          <p className="mt-2 text-sm text-foreground/70">📅 See Prices, Confirm Instantly</p>
          <ul className="mt-3 text-sm list-disc pl-5 space-y-1 text-foreground/80">
            <li>Real-time availability calendar</li>
            <li>Clear pricing breakdown displayed upfront</li>
            <li>Choose mobile or business location</li>
            <li>Secure payment with Stripe protection</li>
          </ul>
          <p className="mt-3 text-sm text-foreground/70">Know exactly what you're paying.</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Step 3: Enjoy &amp; Communicate</h3>
          <p className="mt-2 text-sm text-foreground/70">💆‍♀️ Relax &amp; Connect Safely</p>
          <ul className="mt-3 text-sm list-disc pl-5 space-y-1 text-foreground/80">
            <li>Receive instant booking confirmation</li>
            <li>Message your provider through secure chat</li>
            <li>Get service reminders and updates</li>
            <li>Rate your experience after completion</li>
          </ul>
          <p className="mt-3 text-sm text-foreground/70">Your privacy. Your experience. Your satisfaction.</p>
        </div>
      </div>
    </section>
  );
}
