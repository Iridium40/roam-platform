import { Dumbbell, Home, Lock } from "lucide-react";

export default function ValueProps() {
  return (
    <section className="container mx-auto py-16 lg:py-24">
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center">Wellness on Your Terms</h2>
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Home className="text-primary" />
            <h3 className="text-xl font-semibold">🏠 Services Come to You</h3>
          </div>
          <p className="mt-3 text-foreground/80">Mobile Wellness Revolution</p>
          <p className="mt-2 text-sm text-foreground/70">
            Whether you're vacationing in paradise or relaxing at home, our verified professionals bring their expertise to you.
          </p>
          <ul className="mt-3 text-sm list-disc pl-5 space-y-1 text-foreground/80">
            <li>In-home massage therapy</li>
            <li>Mobile personal training</li>
            <li>On-location hair &amp; beauty</li>
            <li>Beachside wellness sessions</li>
          </ul>
          <p className="mt-3 text-sm text-foreground/70">Your location. Your schedule. Your way.</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Dumbbell className="text-secondary" />
            <h3 className="text-xl font-semibold">🏢 Or Visit Their Space</h3>
          </div>
          <p className="mt-3 text-foreground/80">Premium Business Locations</p>
          <p className="mt-2 text-sm text-foreground/70">
            Prefer a professional environment? Visit our providers' fully-equipped studios and clinics.
          </p>
          <ul className="mt-3 text-sm list-disc pl-5 space-y-1 text-foreground/80">
            <li>State-of-the-art facilities</li>
            <li>Spa-quality experiences</li>
            <li>Professional equipment</li>
            <li>Convenient local locations</li>
          </ul>
          <p className="mt-3 text-sm text-foreground/70">The choice is always yours.</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Lock className="text-accent" />
            <h3 className="text-xl font-semibold">💬 Stay Connected, Stay Private</h3>
          </div>
          <p className="mt-3 text-foreground/80">Secure Communication</p>
          <p className="mt-2 text-sm text-foreground/70">
            Coordinate details without sharing personal contact info.
          </p>
          <ul className="mt-3 text-sm list-disc pl-5 space-y-1 text-foreground/80">
            <li>In-app messaging for every booking</li>
            <li>Real-time appointment updates</li>
            <li>Provider communication tools</li>
            <li>Your privacy, protected</li>
          </ul>
          <p className="mt-3 text-sm text-foreground/70">Book with confidence, communicate safely.</p>
        </div>
      </div>
    </section>
  );
}
